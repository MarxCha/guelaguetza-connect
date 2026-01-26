/**
 * Job Scheduler
 *
 * Ejecuta jobs periódicos usando node-cron o setInterval
 *
 * Para producción, se recomienda usar:
 * - Bull (Redis-backed job queue)
 * - Agenda (MongoDB-backed job scheduler)
 * - AWS EventBridge / Google Cloud Scheduler
 */

import { runCleanupJob } from './cleanup-payments.job.js';

/**
 * Inicia el scheduler de jobs
 */
export function startScheduler() {
  console.log('[Scheduler] Starting job scheduler...');

  // Ejecutar cleanup job cada 15 minutos
  const INTERVAL_MS = 15 * 60 * 1000; // 15 minutos

  // Ejecutar inmediatamente al inicio
  runCleanupJob().catch((error) => {
    console.error('[Scheduler] Initial cleanup job failed:', error);
  });

  // Luego ejecutar cada 15 minutos
  const intervalId = setInterval(() => {
    runCleanupJob().catch((error) => {
      console.error('[Scheduler] Scheduled cleanup job failed:', error);
    });
  }, INTERVAL_MS);

  console.log(`[Scheduler] Cleanup job scheduled every ${INTERVAL_MS / 60000} minutes`);

  // Cleanup al hacer shutdown
  const shutdown = () => {
    console.log('[Scheduler] Shutting down...');
    clearInterval(intervalId);
    process.exit(0);
  };

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);

  return {
    stop: () => clearInterval(intervalId),
  };
}

/**
 * Ejecutar standalone
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  startScheduler();
}
