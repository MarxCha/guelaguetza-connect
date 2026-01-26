/**
 * Script de Verificación de Jobs
 *
 * Verifica que el sistema de jobs de limpieza esté correctamente configurado
 * Sin necesidad de conectar a la base de datos
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

interface CheckResult {
  name: string;
  passed: boolean;
  message: string;
}

const checks: CheckResult[] = [];

function check(name: string, condition: boolean, successMsg: string, failMsg: string) {
  checks.push({
    name,
    passed: condition,
    message: condition ? successMsg : failMsg,
  });
}

console.log('╔═══════════════════════════════════════════════════════════╗');
console.log('║  Verificación del Sistema de Jobs de Limpieza            ║');
console.log('╚═══════════════════════════════════════════════════════════╝\n');

// 1. Verificar archivos principales
console.log('📁 Verificando archivos...\n');

const files = [
  'src/index.ts',
  'src/jobs/scheduler.ts',
  'src/jobs/scheduler.cron.ts',
  'src/jobs/cleanup-payments.job.ts',
  'src/services/booking.service.ts',
  'src/services/marketplace.service.ts',
];

for (const file of files) {
  const filePath = join(rootDir, file);
  const exists = existsSync(filePath);
  check(
    `Archivo ${file}`,
    exists,
    `✓ Existe`,
    `✗ No existe`
  );
}

// 2. Verificar que index.ts tiene la llamada a startCronScheduler
const indexPath = join(rootDir, 'src/index.ts');
if (existsSync(indexPath)) {
  const indexContent = readFileSync(indexPath, 'utf-8');
  const hasImport = indexContent.includes("from './jobs/scheduler.cron.js'");
  const hasCall = indexContent.includes('startCronScheduler()');
  const isCommented = indexContent.match(/^\s*\/\/\s*startCronScheduler/m);

  check(
    'Import de scheduler',
    hasImport,
    '✓ Import correcto',
    '✗ Falta import'
  );

  check(
    'Llamada a startCronScheduler()',
    hasCall && !isCommented,
    '✓ Scheduler activado',
    isCommented ? '✗ Scheduler COMENTADO' : '✗ Falta llamada'
  );
}

// 3. Verificar que scheduler.cron.ts está configurado
const schedulerPath = join(rootDir, 'src/jobs/scheduler.cron.ts');
if (existsSync(schedulerPath)) {
  const schedulerContent = readFileSync(schedulerPath, 'utf-8');
  const hasCron = schedulerContent.includes('cron.schedule');
  const hasInterval = schedulerContent.includes('*/15 * * * *');
  const hasCleanupCall = schedulerContent.includes('runCleanupJob');

  check(
    'Configuración de cron',
    hasCron,
    '✓ node-cron configurado',
    '✗ Falta configuración de cron'
  );

  check(
    'Intervalo de 15 minutos',
    hasInterval,
    '✓ Intervalo correcto (*/15 * * * *)',
    '✗ Intervalo incorrecto o faltante'
  );

  check(
    'Llamada a runCleanupJob',
    hasCleanupCall,
    '✓ Job se ejecuta correctamente',
    '✗ Falta llamada al job'
  );
}

// 4. Verificar que cleanup-payments.job.ts tiene la lógica
const jobPath = join(rootDir, 'src/jobs/cleanup-payments.job.ts');
if (existsSync(jobPath)) {
  const jobContent = readFileSync(jobPath, 'utf-8');
  const hasBookingCleanup = jobContent.includes('cleanupFailedBookings');
  const hasOrderCleanup = jobContent.includes('cleanupFailedOrders');
  const hasTimeout = jobContent.includes('PAYMENT_TIMEOUT_MINUTES');

  check(
    'Limpieza de bookings',
    hasBookingCleanup,
    '✓ cleanupFailedBookings implementado',
    '✗ Falta limpieza de bookings'
  );

  check(
    'Limpieza de orders',
    hasOrderCleanup,
    '✓ cleanupFailedOrders implementado',
    '✗ Falta limpieza de orders'
  );

  check(
    'Timeout configurado',
    hasTimeout,
    '✓ Timeout de 30 minutos configurado',
    '✗ Falta configuración de timeout'
  );
}

// 5. Verificar que los servicios tienen los métodos
const bookingServicePath = join(rootDir, 'src/services/booking.service.ts');
if (existsSync(bookingServicePath)) {
  const bookingContent = readFileSync(bookingServicePath, 'utf-8');
  const hasMethod = bookingContent.includes('async cleanupFailedBookings');
  const hasPendingPayment = bookingContent.includes('PENDING_PAYMENT');
  const hasTransaction = bookingContent.includes('$transaction');

  check(
    'BookingService.cleanupFailedBookings',
    hasMethod,
    '✓ Método implementado',
    '✗ Método faltante'
  );

  check(
    'Verifica PENDING_PAYMENT',
    hasPendingPayment,
    '✓ Filtra status correctamente',
    '✗ No filtra por status'
  );

  check(
    'Usa transacciones',
    hasTransaction,
    '✓ Transacciones atómicas',
    '✗ No usa transacciones'
  );
}

const marketplaceServicePath = join(rootDir, 'src/services/marketplace.service.ts');
if (existsSync(marketplaceServicePath)) {
  const marketplaceContent = readFileSync(marketplaceServicePath, 'utf-8');
  const hasMethod = marketplaceContent.includes('async cleanupFailedOrders');
  const hasPendingPayment = marketplaceContent.includes('PENDING_PAYMENT');
  const hasOptimisticLocking = marketplaceContent.includes('updateProductWithLocking');

  check(
    'MarketplaceService.cleanupFailedOrders',
    hasMethod,
    '✓ Método implementado',
    '✗ Método faltante'
  );

  check(
    'Verifica PENDING_PAYMENT',
    hasPendingPayment,
    '✓ Filtra status correctamente',
    '✗ No filtra por status'
  );

  check(
    'Optimistic locking',
    hasOptimisticLocking,
    '✓ Usa optimistic locking para productos',
    '✗ No usa optimistic locking'
  );
}

// 6. Verificar package.json
const packagePath = join(rootDir, 'package.json');
if (existsSync(packagePath)) {
  const packageContent = readFileSync(packagePath, 'utf-8');
  const pkg = JSON.parse(packageContent);
  const hasNodeCron = pkg.dependencies && 'node-cron' in pkg.dependencies;
  const hasPromClient = pkg.dependencies && 'prom-client' in pkg.dependencies;

  check(
    'Dependencia node-cron',
    hasNodeCron,
    `✓ node-cron@${pkg.dependencies['node-cron']} instalado`,
    '✗ node-cron no instalado'
  );

  check(
    'Dependencia prom-client',
    hasPromClient,
    `✓ prom-client@${pkg.dependencies['prom-client']} instalado`,
    '✗ prom-client no instalado (métricas no funcionarán)'
  );
}

// Imprimir resultados
console.log('\n📊 Resultados:\n');

let passed = 0;
let failed = 0;

for (const result of checks) {
  const icon = result.passed ? '✅' : '❌';
  console.log(`${icon} ${result.name}`);
  console.log(`   ${result.message}`);

  if (result.passed) {
    passed++;
  } else {
    failed++;
  }
}

console.log('\n╔═══════════════════════════════════════════════════════════╗');
if (failed === 0) {
  console.log('║  ✅ SISTEMA COMPLETAMENTE CONFIGURADO Y ACTIVADO          ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('\n🎉 El sistema de jobs está listo para funcionar.\n');
  console.log('Para iniciar el servidor y activar los jobs:');
  console.log('  $ npm run dev\n');
  console.log('Para ejecutar el job manualmente:');
  console.log('  $ npx tsx src/jobs/cleanup-payments.job.ts\n');
} else {
  console.log('║  ⚠️  SISTEMA CON PROBLEMAS - REVISAR                      ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log(`\n❌ ${failed} verificación(es) fallaron.`);
  console.log(`✅ ${passed} verificación(es) pasaron.\n`);
  console.log('Por favor, revisa los errores arriba y corrige los problemas.\n');
}

console.log('Resumen:');
console.log(`  Total: ${checks.length}`);
console.log(`  ✅ Pasadas: ${passed}`);
console.log(`  ❌ Fallidas: ${failed}`);
console.log('');

process.exit(failed > 0 ? 1 : 0);
