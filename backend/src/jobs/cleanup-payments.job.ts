/**
 * Cleanup Job for Failed Payments
 *
 * Este job limpia automáticamente bookings y órdenes que han fallado
 * o están en estado pendiente por más de 30 minutos.
 *
 * Acciones:
 * - Restaura inventario (capacidad de slots / stock de productos)
 * - Marca registros como CANCELLED
 *
 * Ejecución recomendada: Cada 15 minutos
 */

import { PrismaClient } from '@prisma/client';
import { BookingService } from '../services/booking.service.js';
import { MarketplaceService } from '../services/marketplace.service.js';
import {
  cleanupJobsExecutedTotal,
  cleanupItemsTotal,
  cleanupJobDuration,
  startTimer,
} from '../utils/metrics.js';

const prisma = new PrismaClient();
const bookingService = new BookingService(prisma);
const marketplaceService = new MarketplaceService(prisma);

// Timeout en minutos para considerar un pago como fallido
const PAYMENT_TIMEOUT_MINUTES = 30;

/**
 * Ejecuta el job de limpieza
 */
export async function runCleanupJob() {
  const startTime = Date.now();
  const timestamp = new Date().toISOString();
  const endTimer = startTimer(cleanupJobDuration);

  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log(`│ Cleanup Job Started: ${timestamp.split('T')[1].split('.')[0]}                     │`);
  console.log('└─────────────────────────────────────────────────────────┘');

  try {
    // Limpiar bookings fallidos
    console.log(`[Cleanup Job] Checking failed bookings (timeout: ${PAYMENT_TIMEOUT_MINUTES}min)...`);
    const bookingResult = await bookingService.cleanupFailedBookings(
      PAYMENT_TIMEOUT_MINUTES
    );

    if (bookingResult.cleaned > 0) {
      console.log(`  ✓ Cleaned ${bookingResult.cleaned} failed booking(s)`);
      console.log(`    - Status: PENDING_PAYMENT | PAYMENT_FAILED → CANCELLED`);
      console.log(`    - Action: Restored slot capacity (bookedCount decremented)`);
    } else {
      console.log(`  • No failed bookings found`);
    }

    // Limpiar órdenes fallidas
    console.log(`[Cleanup Job] Checking failed orders (timeout: ${PAYMENT_TIMEOUT_MINUTES}min)...`);
    const orderResult = await marketplaceService.cleanupFailedOrders(
      PAYMENT_TIMEOUT_MINUTES
    );

    if (orderResult.cleaned > 0) {
      console.log(`  ✓ Cleaned ${orderResult.cleaned} failed order(s)`);
      console.log(`    - Status: PENDING_PAYMENT | PAYMENT_FAILED → CANCELLED`);
      console.log(`    - Action: Restored product stock (stock incremented)`);
    } else {
      console.log(`  • No failed orders found`);
    }

    const duration = Date.now() - startTime;
    const totalCleaned = bookingResult.cleaned + orderResult.cleaned;

    // Record metrics
    endTimer();
    cleanupJobsExecutedTotal.inc({ status: 'success' });
    if (bookingResult.cleaned > 0) {
      cleanupItemsTotal.inc({ type: 'booking' }, bookingResult.cleaned);
    }
    if (orderResult.cleaned > 0) {
      cleanupItemsTotal.inc({ type: 'order' }, orderResult.cleaned);
    }

    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log(`│ Cleanup Job Completed                                   │`);
    console.log(`│ Total items cleaned: ${totalCleaned.toString().padEnd(36)}│`);
    console.log(`│ Duration: ${duration.toString().padEnd(44)}ms │`);
    console.log('└─────────────────────────────────────────────────────────┘\n');

    return {
      success: true,
      bookingsCleaned: bookingResult.cleaned,
      ordersCleaned: orderResult.cleaned,
      totalCleaned,
      duration,
      timestamp,
    };
  } catch (error) {
    const duration = Date.now() - startTime;

    // Record failure metrics
    endTimer();
    cleanupJobsExecutedTotal.inc({ status: 'failed' });

    console.error('┌─────────────────────────────────────────────────────────┐');
    console.error('│ Cleanup Job Failed                                      │');
    console.error('└─────────────────────────────────────────────────────────┘');
    console.error('[Cleanup Job] Error:', error);
    console.error(`[Cleanup Job] Failed after ${duration}ms\n`);

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      duration,
      timestamp,
    };
  }
}

/**
 * Inicia el job como proceso standalone
 * Útil para ejecutar manualmente o desde cron
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  runCleanupJob()
    .then((result) => {
      console.log('[Cleanup Job] Result:', result);
      process.exit(result.success ? 0 : 1);
    })
    .catch((error) => {
      console.error('[Cleanup Job] Fatal error:', error);
      process.exit(1);
    })
    .finally(() => {
      prisma.$disconnect();
    });
}
