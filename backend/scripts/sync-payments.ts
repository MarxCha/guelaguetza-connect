#!/usr/bin/env node

/**
 * SCRIPT DE SINCRONIZACIÓN DE PAGOS
 *
 * Este script sincroniza el estado de bookings y órdenes con Stripe
 * en caso de que los webhooks fallen o se pierdan eventos.
 *
 * Uso:
 *   npm run sync:payments
 *   npm run sync:payments -- --booking=clxxx123
 *   npm run sync:payments -- --from=2025-01-20 --to=2025-01-25
 *   npm run sync:payments -- --dry-run
 */

import 'dotenv/config';
import { PrismaClient, BookingStatus, OrderStatus } from '@prisma/client';
import { stripeService } from '../src/services/stripe.service.js';
import Stripe from 'stripe';

const prisma = new PrismaClient();

interface SyncOptions {
  bookingId?: string;
  orderId?: string;
  from?: Date;
  to?: Date;
  dryRun?: boolean;
}

async function syncPayments(options: SyncOptions = {}) {
  console.log('🔄 Iniciando sincronización de pagos...\n');

  if (options.dryRun) {
    console.log('⚠️  MODO DRY-RUN: No se realizarán cambios en la BD\n');
  }

  let syncedCount = 0;
  let errorCount = 0;

  // Sincronizar bookings
  if (!options.orderId) {
    const bookingResult = await syncBookings(options);
    syncedCount += bookingResult.synced;
    errorCount += bookingResult.errors;
  }

  // Sincronizar órdenes
  if (!options.bookingId) {
    const orderResult = await syncOrders(options);
    syncedCount += orderResult.synced;
    errorCount += orderResult.errors;
  }

  console.log('\n✅ Sincronización completada');
  console.log(`   • ${syncedCount} pagos sincronizados`);
  console.log(`   • ${errorCount} errores`);

  await prisma.$disconnect();
}

async function syncBookings(options: SyncOptions) {
  console.log('📋 Sincronizando bookings...\n');

  let synced = 0;
  let errors = 0;

  // Construir filtro
  const where: any = {
    status: {
      in: ['PENDING', 'PENDING_PAYMENT'] as BookingStatus[],
    },
    stripePaymentId: {
      not: null,
    },
  };

  if (options.bookingId) {
    where.id = options.bookingId;
  }

  if (options.from || options.to) {
    where.createdAt = {};
    if (options.from) where.createdAt.gte = options.from;
    if (options.to) where.createdAt.lte = options.to;
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      experience: true,
      user: {
        select: { id: true, nombre: true, email: true },
      },
    },
  });

  console.log(`   Encontrados: ${bookings.length} bookings pendientes\n`);

  for (const booking of bookings) {
    try {
      console.log(`   🔍 Verificando booking ${booking.id}`);
      console.log(`      Payment Intent: ${booking.stripePaymentId}`);

      if (!booking.stripePaymentId) {
        console.log(`      ⚠️  Sin payment intent, skipping\n`);
        continue;
      }

      // Obtener estado del pago en Stripe
      const status = await stripeService.getPaymentStatus(booking.stripePaymentId);
      console.log(`      Estado en Stripe: ${status}`);

      let newStatus: BookingStatus | null = null;

      if (status === 'succeeded') {
        newStatus = 'CONFIRMED';
      } else if (status === 'canceled') {
        newStatus = 'CANCELLED';
      } else if (status === 'requires_payment_method') {
        newStatus = 'PAYMENT_FAILED';
      }

      if (newStatus && newStatus !== booking.status) {
        console.log(`      ✨ Actualizando: ${booking.status} → ${newStatus}`);

        if (!options.dryRun) {
          await prisma.booking.update({
            where: { id: booking.id },
            data: {
              status: newStatus,
              ...(newStatus === 'CONFIRMED' && { confirmedAt: new Date() }),
              ...(newStatus === 'CANCELLED' && { cancelledAt: new Date() }),
            },
          });
        }

        synced++;
      } else {
        console.log(`      ✓ Estado correcto`);
      }

      console.log('');
    } catch (error) {
      console.error(`      ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
      errors++;
    }
  }

  return { synced, errors };
}

async function syncOrders(options: SyncOptions) {
  console.log('🛒 Sincronizando órdenes...\n');

  let synced = 0;
  let errors = 0;

  // Construir filtro
  const where: any = {
    status: {
      in: ['PENDING', 'PENDING_PAYMENT'] as OrderStatus[],
    },
    stripePaymentId: {
      not: null,
    },
  };

  if (options.orderId) {
    where.id = options.orderId;
  }

  if (options.from || options.to) {
    where.createdAt = {};
    if (options.from) where.createdAt.gte = options.from;
    if (options.to) where.createdAt.lte = options.to;
  }

  const orders = await prisma.order.findMany({
    where,
    include: {
      seller: true,
      user: {
        select: { id: true, nombre: true, email: true },
      },
    },
  });

  console.log(`   Encontradas: ${orders.length} órdenes pendientes\n`);

  for (const order of orders) {
    try {
      console.log(`   🔍 Verificando orden ${order.id}`);
      console.log(`      Payment Intent: ${order.stripePaymentId}`);

      if (!order.stripePaymentId) {
        console.log(`      ⚠️  Sin payment intent, skipping\n`);
        continue;
      }

      // Obtener estado del pago en Stripe
      const status = await stripeService.getPaymentStatus(order.stripePaymentId);
      console.log(`      Estado en Stripe: ${status}`);

      let newStatus: OrderStatus | null = null;

      if (status === 'succeeded') {
        newStatus = 'PAID';
      } else if (status === 'canceled') {
        newStatus = 'CANCELLED';
      } else if (status === 'requires_payment_method') {
        newStatus = 'PAYMENT_FAILED';
      }

      if (newStatus && newStatus !== order.status) {
        console.log(`      ✨ Actualizando: ${order.status} → ${newStatus}`);

        if (!options.dryRun) {
          await prisma.order.update({
            where: { id: order.id },
            data: { status: newStatus },
          });
        }

        synced++;
      } else {
        console.log(`      ✓ Estado correcto`);
      }

      console.log('');
    } catch (error) {
      console.error(`      ❌ Error: ${error instanceof Error ? error.message : 'Unknown'}\n`);
      errors++;
    }
  }

  return { synced, errors };
}

// Parse command line arguments
function parseArgs(): SyncOptions {
  const args = process.argv.slice(2);
  const options: SyncOptions = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === '--booking' && args[i + 1]) {
      options.bookingId = args[++i];
    } else if (arg === '--order' && args[i + 1]) {
      options.orderId = args[++i];
    } else if (arg === '--from' && args[i + 1]) {
      options.from = new Date(args[++i]);
    } else if (arg === '--to' && args[i + 1]) {
      options.to = new Date(args[++i]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
Uso: npm run sync:payments [opciones]

Opciones:
  --booking <id>     Sincronizar solo el booking especificado
  --order <id>       Sincronizar solo la orden especificada
  --from <fecha>     Fecha desde (YYYY-MM-DD)
  --to <fecha>       Fecha hasta (YYYY-MM-DD)
  --dry-run          No realizar cambios, solo mostrar lo que se haría
  --help, -h         Mostrar esta ayuda

Ejemplos:
  npm run sync:payments
  npm run sync:payments -- --booking=clxxx123
  npm run sync:payments -- --from=2025-01-20 --to=2025-01-25
  npm run sync:payments -- --dry-run
      `);
      process.exit(0);
    }
  }

  return options;
}

// Main
const options = parseArgs();
syncPayments(options).catch((error) => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
