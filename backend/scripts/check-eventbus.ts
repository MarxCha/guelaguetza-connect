#!/usr/bin/env tsx

/**
 * Script para verificar el estado del EventBus
 *
 * Uso:
 * npx tsx scripts/check-eventbus.ts
 */

import { PrismaClient } from '@prisma/client';
import { initializeEventBus } from '../src/infrastructure/events/index.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando EventBus...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');

  try {
    // Initialize EventBus
    const eventBus = initializeEventBus(prisma);
    console.log('');

    // Get stats
    const stats = eventBus.getStats();

    console.log('📊 ESTADÍSTICAS DEL EVENTBUS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total de tipos de eventos: ${stats.totalEventTypes}`);
    console.log(`Total de handlers:          ${stats.totalHandlers}`);
    console.log('');

    console.log('📋 EVENTOS Y HANDLERS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Group by category
    const byCategory: Record<string, any[]> = {
      Booking: [],
      Marketplace: [],
      Gamification: [],
      User: [],
      Review: [],
      Social: [],
    };

    Object.entries(stats.eventTypes).forEach(([eventType, info]) => {
      if (eventType.startsWith('booking.')) {
        byCategory.Booking.push({ eventType, ...info });
      } else if (eventType.startsWith('order.')) {
        byCategory.Marketplace.push({ eventType, ...info });
      } else if (eventType.startsWith('gamification.')) {
        byCategory.Gamification.push({ eventType, ...info });
      } else if (eventType.startsWith('user.')) {
        byCategory.User.push({ eventType, ...info });
      } else if (eventType.startsWith('review.')) {
        byCategory.Review.push({ eventType, ...info });
      } else if (eventType.startsWith('social.')) {
        byCategory.Social.push({ eventType, ...info });
      }
    });

    Object.entries(byCategory).forEach(([category, events]) => {
      if (events.length === 0) return;

      console.log('');
      console.log(`🏷️  ${category}`);
      events.forEach(({ eventType, handlerCount, handlers }) => {
        console.log(`   ${eventType}`);
        console.log(`      Handlers (${handlerCount}): ${handlers.join(', ')}`);
      });
    });

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // Check badges
    const badgeCount = await prisma.badge.count();
    console.log('');
    console.log('🏅 BADGES EN BASE DE DATOS');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`Total de badges: ${badgeCount}`);

    if (badgeCount === 0) {
      console.log('');
      console.log('⚠️  ADVERTENCIA: No hay badges en la base de datos');
      console.log('   Ejecuta: npx tsx scripts/seed-badges.ts');
    } else {
      const badges = await prisma.badge.findMany({
        select: {
          code: true,
          name: true,
          category: true,
          xpReward: true,
        },
        orderBy: [{ category: 'asc' }, { code: 'asc' }],
      });

      const categoryCounts = badges.reduce((acc, badge) => {
        acc[badge.category] = (acc[badge.category] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      console.log('');
      console.log('Por categoría:');
      Object.entries(categoryCounts).forEach(([category, count]) => {
        console.log(`   ${category}: ${count}`);
      });

      console.log('');
      console.log('Primeros 5 badges:');
      badges.slice(0, 5).forEach((badge) => {
        console.log(`   ${badge.code.padEnd(20)} ${badge.name.padEnd(25)} (+${badge.xpReward} XP)`);
      });

      if (badges.length > 5) {
        console.log(`   ... y ${badges.length - 5} más`);
      }
    }

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Verificación completada');
    console.log('');

    // Test event emission
    console.log('🧪 TEST DE EMISIÓN DE EVENTO');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const testEvent = {
      type: 'test.event',
      payload: { test: 'data' },
      timestamp: new Date(),
      correlationId: 'test-123',
    };

    // Register a test handler
    let handlerCalled = false;
    eventBus.on(
      'test.event',
      async (event) => {
        handlerCalled = true;
      },
      'TestHandler'
    );

    const result = await eventBus.emit(testEvent);

    console.log(`Evento emitido: ${testEvent.type}`);
    console.log(`Resultado: ${result.success ? '✅ Success' : '❌ Failed'}`);
    console.log(`Handlers ejecutados: ${result.handlersExecuted}`);
    console.log(`Handlers fallidos: ${result.handlersFailed}`);
    console.log(`Duración: ${result.duration}ms`);
    console.log(`Handler llamado: ${handlerCalled ? '✅' : '❌'}`);

    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
