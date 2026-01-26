/**
 * Metrics Endpoint for Prometheus
 *
 * Expone las metricas de la aplicacion en formato Prometheus.
 * Este endpoint NO requiere autenticacion por defecto, pero puede
 * configurarse con un token especifico para mayor seguridad.
 *
 * @module routes/metrics
 */

import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import {
  register,
  getMetrics,
  getContentType,
  activeBookingsCount,
  pendingPaymentsCount,
  productsLowStockCount,
  activeOrdersCount,
  activeExperiencesCount,
  availableSlotsTotal,
  totalUsersCount,
  totalProductsCount,
} from '../utils/metrics.js';

// Token opcional para proteger el endpoint de metricas
const METRICS_TOKEN = process.env.METRICS_TOKEN;

/**
 * Hook para verificar token de metricas (si esta configurado)
 */
async function checkMetricsAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (!METRICS_TOKEN) {
    // Sin token configurado, endpoint es publico
    return;
  }

  const authHeader = request.headers.authorization;

  if (!authHeader) {
    return reply.status(401).send({ error: 'Missing authorization header' });
  }

  const token = authHeader.replace('Bearer ', '');

  if (token !== METRICS_TOKEN) {
    return reply.status(403).send({ error: 'Invalid metrics token' });
  }
}

/**
 * Actualiza los gauges que requieren consultas a la base de datos
 */
async function updateDatabaseGauges(prisma: any): Promise<void> {
  try {
    // Ejecutar todas las consultas en paralelo
    const [
      activeBookings,
      pendingBookingPayments,
      pendingOrderPayments,
      lowStockProducts,
      ordersByStatus,
      activeExperiences,
      availableSlots,
      totalUsers,
      totalActiveProducts,
    ] = await Promise.all([
      // Active bookings (PENDING or CONFIRMED)
      prisma.booking.count({
        where: {
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      }),

      // Pending booking payments
      prisma.booking.count({
        where: {
          status: { in: ['PENDING_PAYMENT', 'PENDING'] },
        },
      }),

      // Pending order payments
      prisma.order.count({
        where: {
          status: { in: ['PENDING_PAYMENT', 'PENDING'] },
        },
      }),

      // Products with low stock (< 10)
      prisma.product.count({
        where: {
          stock: { lt: 10 },
          status: 'ACTIVE',
        },
      }),

      // Orders grouped by status
      prisma.order.groupBy({
        by: ['status'],
        _count: { id: true },
        where: {
          status: { notIn: ['CANCELLED', 'DELIVERED'] },
        },
      }),

      // Active experiences
      prisma.experience.count({
        where: { isActive: true },
      }),

      // Available time slots
      prisma.experienceTimeSlot.count({
        where: {
          isAvailable: true,
          date: { gte: new Date() },
        },
      }),

      // Total users
      prisma.user.count(),

      // Total active products
      prisma.product.count({
        where: { status: 'ACTIVE' },
      }),
    ]);

    // Actualizar gauges
    activeBookingsCount.set(activeBookings);
    totalUsersCount.set(totalUsers);
    totalProductsCount.set(totalActiveProducts);
    pendingPaymentsCount.set({ type: 'booking' }, pendingBookingPayments);
    pendingPaymentsCount.set({ type: 'order' }, pendingOrderPayments);
    productsLowStockCount.set(lowStockProducts);
    activeExperiencesCount.set(activeExperiences);
    availableSlotsTotal.set(availableSlots);

    // Reset all order status counts first
    activeOrdersCount.reset();

    // Set order counts by status
    for (const group of ordersByStatus) {
      activeOrdersCount.set({ status: group.status.toLowerCase() }, group._count.id);
    }
  } catch (error) {
    // Log error but don't fail the metrics endpoint
    console.error('[Metrics] Error updating database gauges:', error);
  }
}

const metricsRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * GET /metrics
   *
   * Retorna las metricas en formato Prometheus.
   * Si METRICS_TOKEN esta configurado, requiere autorizacion.
   *
   * @example
   * curl http://localhost:3001/metrics
   * curl -H "Authorization: Bearer your-token" http://localhost:3001/metrics
   */
  fastify.get(
    '/metrics',
    {
      onRequest: checkMetricsAuth,
    },
    async (request, reply) => {
      // Actualizar gauges de base de datos antes de responder
      await updateDatabaseGauges(fastify.prisma);

      // Obtener metricas en formato Prometheus
      const metrics = await getMetrics();

      reply.header('Content-Type', getContentType());
      return metrics;
    }
  );

  /**
   * GET /metrics/health
   *
   * Health check para el sistema de metricas.
   * Retorna informacion basica sin requerir autenticacion.
   */
  fastify.get('/metrics/health', async () => {
    return {
      status: 'ok',
      metricsEnabled: true,
      authRequired: !!METRICS_TOKEN,
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * GET /metrics/json
   *
   * Retorna metricas en formato JSON (util para debugging).
   * Requiere autenticacion si METRICS_TOKEN esta configurado.
   */
  fastify.get(
    '/metrics/json',
    {
      onRequest: checkMetricsAuth,
    },
    async (request, reply) => {
      // Actualizar gauges de base de datos
      await updateDatabaseGauges(fastify.prisma);

      const metricsJson = await register.getMetricsAsJSON();
      return {
        timestamp: new Date().toISOString(),
        metrics: metricsJson,
      };
    }
  );

  /**
   * GET /metrics/cache
   *
   * Retorna estadisticas del cache Redis.
   * Incluye hit rate, misses, y estado de conexion.
   */
  fastify.get('/metrics/cache', async (request, reply) => {
    const cacheMetrics = fastify.cache.getMetrics();
    const hitRate = fastify.cache.getHitRate();
    const isReady = fastify.cache.isReady();

    return {
      status: isReady ? 'connected' : 'disconnected',
      metrics: {
        hits: cacheMetrics.hits,
        misses: cacheMetrics.misses,
        sets: cacheMetrics.sets,
        deletes: cacheMetrics.deletes,
        errors: cacheMetrics.errors,
        hitRate: `${hitRate.toFixed(2)}%`,
        hitRateDecimal: hitRate / 100,
        totalRequests: cacheMetrics.hits + cacheMetrics.misses,
      },
      timestamp: new Date().toISOString(),
    };
  });
};

export default metricsRoutes;
