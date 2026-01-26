#!/usr/bin/env tsx
/**
 * Script de verificación del sistema de jobs
 *
 * Verifica que:
 * 1. node-cron está instalado
 * 2. Los archivos de jobs existen
 * 3. Los servicios tienen los métodos de cleanup
 * 4. El index.ts tiene el scheduler activado
 *
 * Uso:
 *   npx tsx scripts/verify-jobs-setup.ts
 */

import { existsSync } from 'fs';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

interface CheckResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
}

const results: CheckResult[] = [];

function check(name: string, status: 'PASS' | 'FAIL' | 'WARN', message: string) {
  results.push({ name, status, message });
}

async function verifyJobsSetup() {
  console.log('╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Jobs Setup Verification                                  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // 1. Verificar que node-cron está instalado
  console.log('[1/8] Checking node-cron installation...');
  try {
    const packageJson = JSON.parse(
      await readFile(resolve(ROOT, 'package.json'), 'utf-8')
    );
    if (packageJson.dependencies?.['node-cron']) {
      check(
        'node-cron',
        'PASS',
        `Installed: ${packageJson.dependencies['node-cron']}`
      );
    } else {
      check('node-cron', 'FAIL', 'Not found in dependencies');
    }

    if (packageJson.devDependencies?.['@types/node-cron']) {
      check(
        '@types/node-cron',
        'PASS',
        `Installed: ${packageJson.devDependencies['@types/node-cron']}`
      );
    } else {
      check('@types/node-cron', 'WARN', 'Not found in devDependencies');
    }
  } catch (error) {
    check('package.json', 'FAIL', 'Could not read package.json');
  }

  // 2. Verificar archivos de jobs
  console.log('[2/8] Checking job files...');
  const jobFiles = [
    'src/jobs/scheduler.cron.ts',
    'src/jobs/scheduler.ts',
    'src/jobs/cleanup-payments.job.ts',
  ];

  for (const file of jobFiles) {
    const filePath = resolve(ROOT, file);
    if (existsSync(filePath)) {
      check(file, 'PASS', 'File exists');
    } else {
      check(file, 'FAIL', 'File not found');
    }
  }

  // 3. Verificar que index.ts importa scheduler
  console.log('[3/8] Checking index.ts imports...');
  try {
    const indexContent = await readFile(resolve(ROOT, 'src/index.ts'), 'utf-8');

    if (indexContent.includes("from './jobs/scheduler")) {
      check('index.ts import', 'PASS', 'Scheduler import found');
    } else {
      check('index.ts import', 'FAIL', 'Scheduler import not found');
    }

    if (indexContent.includes('startCronScheduler()') || indexContent.includes('startScheduler()')) {
      const isCommented = indexContent
        .split('\n')
        .some((line) => line.includes('startCronScheduler()') && !line.trim().startsWith('//'));

      if (isCommented) {
        check('Scheduler activation', 'PASS', 'Scheduler is activated');
      } else {
        check('Scheduler activation', 'FAIL', 'Scheduler is commented out');
      }
    } else {
      check('Scheduler activation', 'FAIL', 'Scheduler call not found');
    }
  } catch (error) {
    check('index.ts', 'FAIL', 'Could not read index.ts');
  }

  // 4. Verificar métodos de limpieza en BookingService
  console.log('[4/8] Checking BookingService cleanup method...');
  try {
    const bookingServiceContent = await readFile(
      resolve(ROOT, 'src/services/booking.service.ts'),
      'utf-8'
    );

    if (bookingServiceContent.includes('async cleanupFailedBookings')) {
      check('BookingService.cleanupFailedBookings', 'PASS', 'Method found');
    } else {
      check('BookingService.cleanupFailedBookings', 'FAIL', 'Method not found');
    }

    if (bookingServiceContent.includes('PENDING_PAYMENT')) {
      check('Booking status check', 'PASS', 'Checks PENDING_PAYMENT status');
    } else {
      check('Booking status check', 'WARN', 'PENDING_PAYMENT check not found');
    }
  } catch (error) {
    check('booking.service.ts', 'FAIL', 'Could not read file');
  }

  // 5. Verificar métodos de limpieza en MarketplaceService
  console.log('[5/8] Checking MarketplaceService cleanup method...');
  try {
    const marketplaceServiceContent = await readFile(
      resolve(ROOT, 'src/services/marketplace.service.ts'),
      'utf-8'
    );

    if (marketplaceServiceContent.includes('async cleanupFailedOrders')) {
      check('MarketplaceService.cleanupFailedOrders', 'PASS', 'Method found');
    } else {
      check('MarketplaceService.cleanupFailedOrders', 'FAIL', 'Method not found');
    }

    if (marketplaceServiceContent.includes('updateProductWithLocking')) {
      check('Optimistic locking', 'PASS', 'Uses optimistic locking');
    } else {
      check('Optimistic locking', 'WARN', 'Not using optimistic locking');
    }
  } catch (error) {
    check('marketplace.service.ts', 'FAIL', 'Could not read file');
  }

  // 6. Verificar utilidades de optimistic locking
  console.log('[6/8] Checking optimistic locking utilities...');
  const lockingFile = resolve(ROOT, 'src/utils/optimistic-locking.ts');
  if (existsSync(lockingFile)) {
    try {
      const content = await readFile(lockingFile, 'utf-8');
      if (content.includes('updateTimeSlotWithLocking')) {
        check('updateTimeSlotWithLocking', 'PASS', 'Function found');
      }
      if (content.includes('updateProductWithLocking')) {
        check('updateProductWithLocking', 'PASS', 'Function found');
      }
      if (content.includes('withRetry')) {
        check('withRetry', 'PASS', 'Function found');
      }
    } catch (error) {
      check('optimistic-locking.ts', 'FAIL', 'Could not read file');
    }
  } else {
    check('optimistic-locking.ts', 'FAIL', 'File not found');
  }

  // 7. Verificar script de testing
  console.log('[7/8] Checking test script...');
  const testScript = resolve(ROOT, 'scripts/test-cleanup-job.ts');
  if (existsSync(testScript)) {
    check('test-cleanup-job.ts', 'PASS', 'Test script exists');
  } else {
    check('test-cleanup-job.ts', 'WARN', 'Test script not found');
  }

  // 8. Verificar documentación
  console.log('[8/8] Checking documentation...');
  const docs = [
    'docs/CLEANUP_JOBS.md',
    'JOBS_ACTIVATED.md',
  ];

  for (const doc of docs) {
    const docPath = resolve(ROOT, doc);
    if (existsSync(docPath)) {
      check(doc, 'PASS', 'Documentation exists');
    } else {
      check(doc, 'WARN', 'Documentation not found');
    }
  }

  // Resumen
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Verification Results                                     ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;

  for (const result of results) {
    const icon =
      result.status === 'PASS' ? '✓' : result.status === 'FAIL' ? '✗' : '⚠';
    const color =
      result.status === 'PASS'
        ? '\x1b[32m'
        : result.status === 'FAIL'
        ? '\x1b[31m'
        : '\x1b[33m';
    const reset = '\x1b[0m';

    console.log(`${color}${icon}${reset} ${result.name.padEnd(40)} ${result.message}`);
  }

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  Total: ${results.length.toString().padEnd(51)}║`);
  console.log(`║  Passed: ${passed.toString().padEnd(50)}║`);
  console.log(`║  Failed: ${failed.toString().padEnd(50)}║`);
  console.log(`║  Warnings: ${warned.toString().padEnd(48)}║`);
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  if (failed > 0) {
    console.log('❌ Some checks failed. Please review the errors above.\n');
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  All critical checks passed, but there are warnings.\n');
    process.exit(0);
  } else {
    console.log('✅ All checks passed! Jobs system is ready to use.\n');
    process.exit(0);
  }
}

verifyJobsSetup().catch((error) => {
  console.error('Fatal error during verification:', error);
  process.exit(1);
});
