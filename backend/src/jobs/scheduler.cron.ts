/**
 * Job Scheduler con node-cron
 *
 * Versión alternativa usando node-cron para mejor expresividad
 *
 * Instalación:
 *   npm install node-cron
 *   npm install -D @types/node-cron
 *
 * Sintaxis cron:
 *   * * * * * *
 *   | | | | | |
 *   | | | | | └─ day of week (0 - 7) (0 or 7 is Sunday)
 *   | | | | └─── month (1 - 12)
 *   | | | └───── day of month (1 - 31)
 *   | | └─────── hour (0 - 23)
 *   | └───────── minute (0 - 59)
 *   └─────────── second (0 - 59, optional)
 */

import cron from 'node-cron';
import { runCleanupJob } from './cleanup-payments.job.js';

/**
 * Inicia el scheduler de jobs con node-cron
 */
export function startCronScheduler() {
  console.log('[Cron Scheduler] Starting job scheduler...');

  // Cleanup de pagos fallidos - cada 15 minutos
  const cleanupTask = cron.schedule('*/15 * * * *', async () => {
    const timestamp = new Date().toISOString();
    console.log(`\n[Cron Scheduler ${timestamp}] Running cleanup job...`);
    try {
      const result = await runCleanupJob();
      if (result.success) {
        console.log(`[Cron Scheduler] ✓ Job completed successfully`);
        console.log(`  - Bookings cleaned: ${result.bookingsCleaned}`);
        console.log(`  - Orders cleaned: ${result.ordersCleaned}`);
        console.log(`  - Duration: ${result.duration}ms`);
      } else {
        console.error(`[Cron Scheduler] ✗ Job failed:`, result.error);
      }
    } catch (error) {
      console.error('[Cron Scheduler] Cleanup job failed with exception:', error);
    }
  });

  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  Cron Scheduler Started                                   ║');
  console.log('╚═══════════════════════════════════════════════════════════╝');
  console.log('  Scheduled Jobs:');
  console.log('  • Payment Cleanup: Every 15 minutes (*/15 * * * *)');
  console.log('    - Timeout: 30 minutes');
  console.log('    - Actions: Restore inventory, cancel failed payments');
  console.log('');

  // Ejecutar inmediatamente al inicio
  console.log('[Cron Scheduler] Running initial cleanup job...');
  runCleanupJob()
    .then((result) => {
      if (result.success) {
        console.log(`[Cron Scheduler] ✓ Initial cleanup completed`);
        console.log(`  - Bookings cleaned: ${result.bookingsCleaned}`);
        console.log(`  - Orders cleaned: ${result.ordersCleaned}`);
      }
    })
    .catch((error) => {
      console.error('[Cron Scheduler] Initial cleanup job failed:', error);
    });

  // Cleanup al hacer shutdown
  const shutdown = () => {
    console.log('[Cron Scheduler] Shutting down...');
    cleanupTask.stop();
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return {
    stop: () => cleanupTask.stop(),
    cleanupTask,
  };
}

/**
 * Ejecutar standalone
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  startCronScheduler();
}
