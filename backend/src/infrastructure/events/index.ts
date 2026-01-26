/**
 * Event Infrastructure - Setup y Exports
 *
 * Este archivo configura el EventBus global y registra todos los handlers.
 * Se debe llamar desde app.ts al inicio de la aplicación.
 */

import { PrismaClient } from '@prisma/client';
import { EventBus, getEventBus, setEventBus } from './EventBus.js';
import { NotificationHandler } from './handlers/NotificationHandler.js';
import { GamificationHandler } from './handlers/GamificationHandler.js';
import { AnalyticsHandler } from './handlers/AnalyticsHandler.js';

// Re-export everything for convenience
export * from './EventBus.js';
export * from './types.js';
export { NotificationHandler } from './handlers/NotificationHandler.js';
export { GamificationHandler } from './handlers/GamificationHandler.js';
export { AnalyticsHandler } from './handlers/AnalyticsHandler.js';

/**
 * Inicializa el EventBus y registra todos los handlers
 */
export function initializeEventBus(prisma: PrismaClient): EventBus {
  console.log('[EventBus] Initializing...');

  // Create EventBus instance
  const eventBus = new EventBus({
    logger: {
      info: (msg, meta) => console.log(`[EventBus] ${msg}`, meta || ''),
      error: (msg, meta) => console.error(`[EventBus ERROR] ${msg}`, meta || ''),
      warn: (msg, meta) => console.warn(`[EventBus WARN] ${msg}`, meta || ''),
      debug: (msg, meta) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug(`[EventBus DEBUG] ${msg}`, meta || '');
        }
      },
    },
    onError: (error, event, handlerName) => {
      console.error('[EventBus] Handler error:', {
        handler: handlerName,
        event: event.type,
        correlationId: event.correlationId,
        error: error.message,
      });

      // TODO: Send to error tracking service (Sentry, etc.)
      // Sentry.captureException(error, {
      //   tags: { handler: handlerName, eventType: event.type },
      //   extra: { correlationId: event.correlationId },
      // });
    },
  });

  // Set as global instance
  setEventBus(eventBus);

  // Initialize handlers
  const notificationHandler = new NotificationHandler(prisma);
  const gamificationHandler = new GamificationHandler(prisma, eventBus);
  const analyticsHandler = new AnalyticsHandler(prisma);

  // Register all handlers
  console.log('[EventBus] Registering handlers...');
  notificationHandler.register(eventBus);
  gamificationHandler.register(eventBus);
  analyticsHandler.register(eventBus);

  // Log stats
  const stats = eventBus.getStats();
  console.log('[EventBus] Initialized successfully', {
    totalEventTypes: stats.totalEventTypes,
    totalHandlers: stats.totalHandlers,
  });

  if (process.env.NODE_ENV === 'development') {
    console.log('[EventBus] Event types:', Object.keys(stats.eventTypes));
  }

  return eventBus;
}

/**
 * Helper para obtener el EventBus global
 * Lanza error si no ha sido inicializado
 */
export function requireEventBus(): EventBus {
  const eventBus = getEventBus();
  if (!eventBus) {
    throw new Error('EventBus not initialized. Call initializeEventBus() first.');
  }
  return eventBus;
}
