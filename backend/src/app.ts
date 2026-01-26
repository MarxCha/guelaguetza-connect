import Fastify, { FastifyInstance, FastifyError } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import rawBody from 'fastify-raw-body';
import {
  serializerCompiler,
  validatorCompiler,
  ZodTypeProvider,
} from 'fastify-type-provider-zod';
import prismaPlugin from './plugins/prisma.js';
import authPlugin from './plugins/auth.js';
import redisPlugin from './plugins/redis.js';
import eventBusPlugin from './plugins/eventBus.js';
import rateLimitPlugin from './plugins/rate-limit.js';
import authRoutes from './routes/auth.js';
import storiesRoutes from './routes/stories.js';
import transportRoutes from './routes/transport.js';
import chatRoutes from './routes/chat.js';
import pushRoutes from './routes/push.js';
import socialRoutes from './routes/social.js';
import gamificationRoutes from './routes/gamification.js';
import notificationsRoutes from './routes/notifications.js';
import dmRoutes from './routes/dm.js';
import searchRoutes from './routes/search.js';
import eventsRoutes from './routes/events.js';
import analyticsRoutes from './routes/analytics.js';
import adminRoutes from './routes/admin.js';
import communitiesRoutes from './routes/communities.js';
import bookingsRoutes from './routes/bookings.js';
import poiRoutes from './routes/poi.js';
import marketplaceRoutes from './routes/marketplace.js';
import uploadRoutes from './routes/upload.js';
import streamsRoutes from './routes/streams.js';
import webhooksRoutes from './routes/webhooks.js';
import metricsRoutes from './routes/metrics.js';
import { ZodError } from 'zod';
import {
  httpRequestsTotal,
  httpRequestDuration,
  startTimerWithLabels,
} from './utils/metrics.js';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: {
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // Set up Zod validation
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register CORS
  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  // Register multipart support for file uploads
  await app.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
      files: 5,
    },
  });

  // Register raw body support for webhooks (must be before routes)
  await app.register(rawBody, {
    field: 'rawBody',
    global: false, // Solo para rutas que lo soliciten
    encoding: 'utf8',
    runFirst: true,
  });

  // Register WebSocket support
  await app.register(websocket);

  // Register plugins
  await app.register(prismaPlugin);
  await app.register(redisPlugin);
  await app.register(eventBusPlugin);
  await app.register(rateLimitPlugin);
  await app.register(authPlugin);

  // HTTP request metrics middleware
  app.addHook('onRequest', async (request, reply) => {
    // Store start time for duration tracking
    (request as any).metricsStartTime = process.hrtime.bigint();
  });

  app.addHook('onResponse', async (request, reply) => {
    const startTime = (request as any).metricsStartTime;
    if (startTime) {
      const endTime = process.hrtime.bigint();
      const durationNs = Number(endTime - startTime);
      const durationSeconds = durationNs / 1e9;

      // Normalize route for metrics (replace IDs with :id)
      const route = request.routeOptions?.url || request.url;
      const normalizedRoute = route
        .replace(/\/[a-f0-9-]{36}/gi, '/:id') // UUID
        .replace(/\/[a-z0-9]{24,25}/gi, '/:id') // CUID
        .replace(/\/\d+/g, '/:id'); // Numeric IDs

      // Record metrics
      httpRequestsTotal.inc({
        method: request.method,
        route: normalizedRoute,
        status_code: String(reply.statusCode),
      });

      httpRequestDuration.observe(
        { method: request.method, route: normalizedRoute },
        durationSeconds
      );
    }
  });

  // Register routes
  await app.register(authRoutes, { prefix: '/api/auth' });
  await app.register(storiesRoutes, { prefix: '/api/stories' });
  await app.register(transportRoutes, { prefix: '/api/transport' });
  await app.register(chatRoutes, { prefix: '/api/chat' });
  await app.register(pushRoutes, { prefix: '/api/push' });
  await app.register(socialRoutes, { prefix: '/api' });
  await app.register(gamificationRoutes, { prefix: '/api/gamification' });
  await app.register(notificationsRoutes, { prefix: '/api/notifications' });
  await app.register(dmRoutes, { prefix: '/api/dm' });
  await app.register(searchRoutes, { prefix: '/api/search' });
  await app.register(eventsRoutes, { prefix: '/api/events' });
  await app.register(analyticsRoutes, { prefix: '/api/analytics' });
  await app.register(adminRoutes, { prefix: '/api/admin' });
  await app.register(communitiesRoutes, { prefix: '/api/communities' });
  await app.register(bookingsRoutes, { prefix: '/api/bookings' });
  await app.register(poiRoutes, { prefix: '/api/poi' });
  await app.register(marketplaceRoutes, { prefix: '/api/marketplace' });
  await app.register(uploadRoutes, { prefix: '/api/upload' });
  await app.register(streamsRoutes, { prefix: '/api/streams' });

  // Webhooks (must NOT use auth middleware)
  await app.register(webhooksRoutes, { prefix: '/api/webhooks' });

  // Metrics endpoint (no prefix, accessed as /metrics)
  await app.register(metricsRoutes);

  // Health check
  app.get('/health', async () => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  });

  // Root endpoint
  app.get('/', async () => {
    return {
      name: 'Guelaguetza Connect API',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        stories: '/api/stories',
        transport: '/api/transport',
        chat: '/api/chat',
        push: '/api/push',
        social: '/api/users, /api/feed',
        gamification: '/api/gamification',
        notifications: '/api/notifications',
        dm: '/api/dm',
        search: '/api/search',
        events: '/api/events',
        analytics: '/api/analytics',
        admin: '/api/admin',
        communities: '/api/communities',
        bookings: '/api/bookings',
        poi: '/api/poi',
        marketplace: '/api/marketplace',
        upload: '/api/upload',
        streams: '/api/streams',
        webhooks: '/api/webhooks',
        metrics: '/metrics',
      },
    };
  });

  // Global error handler
  app.setErrorHandler((error: FastifyError, request, reply) => {
    app.log.error(error);

    // Zod validation errors
    if (error instanceof ZodError) {
      return reply.status(422).send({
        error: 'Error de validación',
        details: error.errors.map((e) => ({
          field: e.path.join('.'),
          message: e.message,
        })),
      });
    }

    // Default error response
    const statusCode = error.statusCode || 500;
    const message = statusCode === 500 ? 'Error interno del servidor' : error.message;

    return reply.status(statusCode).send({ error: message });
  });

  return app;
}
