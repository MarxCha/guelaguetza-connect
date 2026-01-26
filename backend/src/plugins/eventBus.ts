import { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { EventBus, initializeEventBus } from '../infrastructure/events/index.js';

/**
 * EventBus Plugin
 *
 * Inicializa el EventBus global y lo hace disponible en Fastify
 */
async function eventBusPlugin(fastify: FastifyInstance) {
  const eventBus = initializeEventBus(fastify.prisma);

  // Make EventBus available in Fastify context
  fastify.decorate('eventBus', eventBus);

  // Cleanup on close
  fastify.addHook('onClose', async () => {
    fastify.log.info('EventBus cleanup...');
    // eventBus.clear(); // Optional: uncomment if you want to clear handlers on shutdown
  });
}

// Extend Fastify types
declare module 'fastify' {
  interface FastifyInstance {
    eventBus: EventBus;
  }
}

export default fp(eventBusPlugin, {
  name: 'eventBus',
  dependencies: ['prisma'],
});
