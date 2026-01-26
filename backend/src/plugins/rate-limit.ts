import fp from 'fastify-plugin';
import rateLimit from '@fastify/rate-limit';
import { FastifyPluginAsync } from 'fastify';
import { getCacheService } from '../services/cache.service.js';

/**
 * Rate Limiting Plugin para Guelaguetza Connect
 *
 * Protege la API de abuso mediante límites de tasa por IP
 *
 * Configuración:
 * - Global: 100 req/min por IP
 * - Auth endpoints: 5 req/min (prevención brute force)
 * - Bookings: 20 req/min
 * - Marketplace: 10 req/min
 */

// Store en memoria para rate limiting específico por ruta
const routeRateLimits = new Map<string, { count: number; resetTime: number }>();

/**
 * Incrementa el contador para una clave específica
 */
async function incrementRouteLimit(key: string, windowMs: number = 60000): Promise<{ current: number; ttl: number }> {
  const cache = getCacheService();
  const now = Date.now();
  const resetTime = now + windowMs;

  // Intentar usar Redis primero
  if (cache.isReady()) {
    try {
      const redisKey = `rate-limit:${key}`;
      const current = await cache.incr(redisKey, 1);

      if (current === 1) {
        await cache.expire(redisKey, Math.ceil(windowMs / 1000));
      }

      const ttl = await cache.ttl(redisKey);
      return {
        current: current || 1,
        ttl: ttl > 0 ? ttl * 1000 : windowMs,
      };
    } catch (error) {
      console.error('[RateLimit] Redis error, falling back to memory:', error);
    }
  }

  // Fallback a memoria
  const entry = routeRateLimits.get(key);

  if (!entry || now > entry.resetTime) {
    routeRateLimits.set(key, { count: 1, resetTime });
    return { current: 1, ttl: windowMs };
  }

  entry.count++;
  return { current: entry.count, ttl: entry.resetTime - now };
}

/**
 * Obtiene la IP del cliente
 */
function getClientIp(request: any): string {
  const forwarded = request.headers['x-forwarded-for'];
  const ip = forwarded
    ? (typeof forwarded === 'string' ? forwarded.split(',')[0].trim() : forwarded[0])
    : request.ip;
  return ip || 'unknown';
}

const rateLimitPlugin: FastifyPluginAsync = async (fastify) => {
  // Configuración global de rate limiting
  await fastify.register(rateLimit, {
    global: true,
    max: 100,
    timeWindow: '1 minute',

    allowList: (req) => {
      return req.url === '/health' || req.url === '/metrics';
    },

    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },

    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },

    keyGenerator: (request) => getClientIp(request),

    errorResponseBuilder: (_request, context) => {
      return {
        error: 'Demasiadas solicitudes',
        message: `Has excedido el límite de ${context.max} solicitudes por ${context.after}. Por favor, intenta de nuevo más tarde.`,
        statusCode: 429,
        retryAfter: context.ttl ? Math.ceil(context.ttl / 1000) : 60,
        limit: context.max,
        remaining: 0,
        resetTime: new Date(Date.now() + (context.ttl || 60000)).toISOString(),
      };
    },
  });

  // Rate limiting específico por ruta
  fastify.addHook('onRequest', async (request, reply) => {
    const url = request.url;
    const ip = getClientIp(request);

    // Límites estrictos para autenticación (5 req/min)
    if (url.startsWith('/api/auth/login') || url.startsWith('/api/auth/register')) {
      const key = `auth:${ip}:${url.split('?')[0]}`;
      const { current, ttl } = await incrementRouteLimit(key);
      const limit = 5;

      reply.header('X-RateLimit-Limit', limit);
      reply.header('X-RateLimit-Remaining', Math.max(0, limit - current));
      reply.header('X-RateLimit-Reset', Math.ceil((Date.now() + ttl) / 1000));

      if (current > limit) {
        return reply.status(429).send({
          error: 'Demasiados intentos de autenticación',
          message: 'Has excedido el límite de intentos. Por favor, espera antes de volver a intentar.',
          statusCode: 429,
          retryAfter: Math.ceil(ttl / 1000),
          limit,
          remaining: 0,
        });
      }
    }

    // Límite para creación de bookings (20 req/min)
    if (url.includes('/api/bookings') && request.method === 'POST') {
      const key = `bookings:${ip}`;
      const { current, ttl } = await incrementRouteLimit(key);
      const limit = 20;

      reply.header('X-RateLimit-Limit', limit);
      reply.header('X-RateLimit-Remaining', Math.max(0, limit - current));
      reply.header('X-RateLimit-Reset', Math.ceil((Date.now() + ttl) / 1000));

      if (current > limit) {
        return reply.status(429).send({
          error: 'Demasiadas solicitudes de reserva',
          message: 'Has excedido el límite de reservas por minuto.',
          statusCode: 429,
          retryAfter: Math.ceil(ttl / 1000),
          limit,
          remaining: 0,
        });
      }
    }

    // Límite para órdenes de marketplace (10 req/min)
    if (url.includes('/api/marketplace/orders') && request.method === 'POST') {
      const key = `marketplace:${ip}`;
      const { current, ttl } = await incrementRouteLimit(key);
      const limit = 10;

      reply.header('X-RateLimit-Limit', limit);
      reply.header('X-RateLimit-Remaining', Math.max(0, limit - current));
      reply.header('X-RateLimit-Reset', Math.ceil((Date.now() + ttl) / 1000));

      if (current > limit) {
        return reply.status(429).send({
          error: 'Demasiadas órdenes',
          message: 'Has excedido el límite de órdenes por minuto.',
          statusCode: 429,
          retryAfter: Math.ceil(ttl / 1000),
          limit,
          remaining: 0,
        });
      }
    }
  });

  const cache = getCacheService();
  fastify.log.info(`[RateLimit] Plugin registered (store: ${cache.isReady() ? 'Redis' : 'Memory'})`);
};

export default fp(rateLimitPlugin, {
  name: 'rate-limit',
  fastify: '5.x',
});
