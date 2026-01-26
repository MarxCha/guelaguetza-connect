import fp from 'fastify-plugin';
import { FastifyPluginAsync } from 'fastify';
import { CacheService, getCacheService } from '../services/cache.service.js';

// Extender tipos de Fastify
declare module 'fastify' {
  interface FastifyInstance {
    cache: CacheService;
  }
}

/**
 * Plugin de Redis para Fastify
 *
 * Registra el servicio de cache en la instancia de Fastify
 * y lo hace disponible en todos los handlers como `fastify.cache`
 */
const redisPlugin: FastifyPluginAsync = async (fastify) => {
  // Inicializar el servicio de cache
  const cache = getCacheService();

  // Decorar la instancia de Fastify
  fastify.decorate('cache', cache);

  // Hook para verificar el estado del cache al iniciar
  fastify.addHook('onReady', async () => {
    if (cache.isReady()) {
      fastify.log.info('[Redis] Cache service is ready');
    } else {
      fastify.log.warn('[Redis] Cache service is not available - running without cache');
    }
  });

  // Hook para cerrar la conexión al terminar
  fastify.addHook('onClose', async () => {
    await cache.disconnect();
    fastify.log.info('[Redis] Cache connection closed');
  });

  // Endpoint de health check para cache
  fastify.get('/health/cache', async (request, reply) => {
    const isReady = cache.isReady();
    const metrics = cache.getMetrics();
    const hitRate = cache.getHitRate();

    return {
      status: isReady ? 'healthy' : 'degraded',
      connected: isReady,
      metrics: {
        ...metrics,
        hitRate: `${hitRate.toFixed(2)}%`,
      },
    };
  });
};

export default fp(redisPlugin, {
  name: 'redis',
  fastify: '5.x',
});
