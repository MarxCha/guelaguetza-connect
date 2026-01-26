/**
 * Prometheus Metrics Configuration
 *
 * Este modulo configura y exporta metricas para monitoreo con Prometheus.
 * Incluye metricas default de Node.js y metricas custom para la aplicacion.
 *
 * @module utils/metrics
 */

import client, {
  Registry,
  Counter,
  Histogram,
  Gauge,
  collectDefaultMetrics,
} from 'prom-client';

// Crear un registro personalizado
export const register = new Registry();

// Agregar metricas default de Node.js (CPU, memoria, event loop, etc.)
collectDefaultMetrics({
  register,
  prefix: 'guelaguetza_',
  labels: { app: 'guelaguetza-connect' },
});

// ============================================
// COUNTERS
// ============================================

/**
 * Total de bookings creados
 * Labels: status (pending, confirmed, cancelled, completed, payment_failed)
 */
export const bookingsCreatedTotal = new Counter({
  name: 'guelaguetza_bookings_created_total',
  help: 'Total number of bookings created',
  labelNames: ['status'] as const,
  registers: [register],
});

/**
 * Total de bookings cancelados
 */
export const bookingsCancelledTotal = new Counter({
  name: 'guelaguetza_bookings_cancelled_total',
  help: 'Total number of bookings cancelled',
  registers: [register],
});

/**
 * Total de ordenes creadas
 * Labels: status (pending, confirmed, shipped, delivered, cancelled, payment_failed)
 */
export const ordersCreatedTotal = new Counter({
  name: 'guelaguetza_orders_created_total',
  help: 'Total number of orders created',
  labelNames: ['status'] as const,
  registers: [register],
});

/**
 * Total de ordenes canceladas
 */
export const ordersCancelledTotal = new Counter({
  name: 'guelaguetza_orders_cancelled_total',
  help: 'Total number of orders cancelled',
  registers: [register],
});

/**
 * Total de pagos procesados
 * Labels: status (succeeded, failed, pending, refunded), type (booking, order)
 */
export const paymentsProcessedTotal = new Counter({
  name: 'guelaguetza_payments_processed_total',
  help: 'Total number of payments processed',
  labelNames: ['status', 'type'] as const,
  registers: [register],
});

/**
 * Total de conflictos de concurrencia (optimistic locking)
 * Labels: resource_type (time_slot, product)
 */
export const concurrencyConflictsTotal = new Counter({
  name: 'guelaguetza_concurrency_conflicts_total',
  help: 'Total number of concurrency conflicts (optimistic locking failures)',
  labelNames: ['resource_type'] as const,
  registers: [register],
});

/**
 * Total de jobs de limpieza ejecutados
 */
export const cleanupJobsExecutedTotal = new Counter({
  name: 'guelaguetza_cleanup_jobs_executed_total',
  help: 'Total number of cleanup jobs executed',
  labelNames: ['status'] as const,
  registers: [register],
});

/**
 * Total de items limpiados por cleanup jobs
 * Labels: type (booking, order)
 */
export const cleanupItemsTotal = new Counter({
  name: 'guelaguetza_cleanup_items_total',
  help: 'Total number of items cleaned by cleanup jobs',
  labelNames: ['type'] as const,
  registers: [register],
});

/**
 * Total de requests HTTP
 * Labels: method, route, status_code
 */
export const httpRequestsTotal = new Counter({
  name: 'guelaguetza_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'] as const,
  registers: [register],
});

/**
 * Total de errores de autenticacion
 * Labels: type (invalid_token, expired_token, missing_token)
 */
export const authErrorsTotal = new Counter({
  name: 'guelaguetza_auth_errors_total',
  help: 'Total number of authentication errors',
  labelNames: ['type'] as const,
  registers: [register],
});

/**
 * Total de logins exitosos
 * Labels: method (email, google, facebook)
 */
export const authLoginsTotal = new Counter({
  name: 'guelaguetza_auth_logins_total',
  help: 'Total number of successful logins',
  labelNames: ['method'] as const,
  registers: [register],
});

/**
 * Total de registros de usuarios
 * Labels: method (email, google, facebook)
 */
export const authRegistrationsTotal = new Counter({
  name: 'guelaguetza_auth_registrations_total',
  help: 'Total number of user registrations',
  labelNames: ['method'] as const,
  registers: [register],
});

/**
 * Total de bookings fallidos
 * Labels: reason (payment_failed, slot_unavailable, validation_error, concurrency_conflict)
 */
export const bookingsFailedTotal = new Counter({
  name: 'guelaguetza_bookings_failed_total',
  help: 'Total number of failed bookings',
  labelNames: ['reason'] as const,
  registers: [register],
});

/**
 * Total de ordenes fallidas
 * Labels: reason (payment_failed, out_of_stock, validation_error, concurrency_conflict)
 */
export const ordersFailedTotal = new Counter({
  name: 'guelaguetza_orders_failed_total',
  help: 'Total number of failed orders',
  labelNames: ['reason'] as const,
  registers: [register],
});

/**
 * Total de webhooks recibidos
 * Labels: type (payment_intent.succeeded, payment_intent.payment_failed, etc.)
 */
export const webhooksReceivedTotal = new Counter({
  name: 'guelaguetza_webhooks_received_total',
  help: 'Total number of webhooks received',
  labelNames: ['type', 'status'] as const,
  registers: [register],
});

/**
 * Revenue total procesado (en centavos)
 * Labels: type (booking, order)
 */
export const revenueProcessedTotal = new Counter({
  name: 'guelaguetza_revenue_processed_cents_total',
  help: 'Total revenue processed in cents',
  labelNames: ['type'] as const,
  registers: [register],
});

// ============================================
// HISTOGRAMS
// ============================================

/**
 * Duracion de creacion de bookings en segundos
 */
export const bookingCreationDuration = new Histogram({
  name: 'guelaguetza_booking_creation_duration_seconds',
  help: 'Duration of booking creation in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Duracion de creacion de ordenes en segundos
 */
export const orderCreationDuration = new Histogram({
  name: 'guelaguetza_order_creation_duration_seconds',
  help: 'Duration of order creation in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Duracion de llamadas a Stripe API en segundos
 * Labels: operation (create_payment_intent, get_status, refund, cancel)
 */
export const stripeApiDuration = new Histogram({
  name: 'guelaguetza_stripe_api_duration_seconds',
  help: 'Duration of Stripe API calls in seconds',
  labelNames: ['operation'] as const,
  buckets: [0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Duracion de queries a la base de datos en segundos
 * Labels: operation (select, insert, update, delete, transaction)
 */
export const dbQueryDuration = new Histogram({
  name: 'guelaguetza_db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['operation'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2],
  registers: [register],
});

/**
 * Duracion de requests HTTP en segundos
 * Labels: method, route
 */
export const httpRequestDuration = new Histogram({
  name: 'guelaguetza_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route'] as const,
  buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
  registers: [register],
});

/**
 * Duracion de jobs de limpieza en segundos
 */
export const cleanupJobDuration = new Histogram({
  name: 'guelaguetza_cleanup_job_duration_seconds',
  help: 'Duration of cleanup jobs in seconds',
  buckets: [0.5, 1, 2, 5, 10, 30],
  registers: [register],
});

// ============================================
// GAUGES
// ============================================

/**
 * Cantidad de bookings activos (PENDING o CONFIRMED)
 */
export const activeBookingsCount = new Gauge({
  name: 'guelaguetza_active_bookings_count',
  help: 'Number of active bookings (PENDING or CONFIRMED)',
  registers: [register],
});

/**
 * Cantidad de pagos pendientes
 * Labels: type (booking, order)
 */
export const pendingPaymentsCount = new Gauge({
  name: 'guelaguetza_pending_payments_count',
  help: 'Number of pending payments',
  labelNames: ['type'] as const,
  registers: [register],
});

/**
 * Cantidad de productos con bajo stock (stock < 10)
 */
export const productsLowStockCount = new Gauge({
  name: 'guelaguetza_products_low_stock_count',
  help: 'Number of products with low stock (< 10 units)',
  registers: [register],
});

/**
 * Cantidad de ordenes activas por estado
 * Labels: status
 */
export const activeOrdersCount = new Gauge({
  name: 'guelaguetza_active_orders_count',
  help: 'Number of active orders by status',
  labelNames: ['status'] as const,
  registers: [register],
});

/**
 * Cantidad de experiencias activas
 */
export const activeExperiencesCount = new Gauge({
  name: 'guelaguetza_active_experiences_count',
  help: 'Number of active experiences',
  registers: [register],
});

/**
 * Cantidad de usuarios conectados (WebSocket)
 */
export const connectedUsersCount = new Gauge({
  name: 'guelaguetza_connected_users_count',
  help: 'Number of connected users via WebSocket',
  registers: [register],
});

/**
 * Cantidad total de usuarios registrados
 */
export const totalUsersCount = new Gauge({
  name: 'guelaguetza_total_users_count',
  help: 'Total number of registered users',
  registers: [register],
});

/**
 * Cantidad total de productos activos
 */
export const totalProductsCount = new Gauge({
  name: 'guelaguetza_total_products_count',
  help: 'Total number of active products',
  registers: [register],
});

/**
 * Cantidad de cache hits/misses
 * Labels: operation (hit, miss)
 */
export const cacheOperationsCount = new Gauge({
  name: 'guelaguetza_cache_operations_count',
  help: 'Number of cache operations by type',
  labelNames: ['operation'] as const,
  registers: [register],
});

/**
 * Slots disponibles totales para experiencias
 */
export const availableSlotsTotal = new Gauge({
  name: 'guelaguetza_available_slots_total',
  help: 'Total number of available experience time slots',
  registers: [register],
});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Timer helper para medir duracion de operaciones
 *
 * @example
 * const timer = startTimer(bookingCreationDuration);
 * // ... operacion
 * timer(); // Registra la duracion
 */
export function startTimer(histogram: Histogram<string>): () => void {
  const end = histogram.startTimer();
  return end;
}

/**
 * Timer helper con labels para medir duracion de operaciones
 *
 * @example
 * const timer = startTimerWithLabels(stripeApiDuration);
 * // ... operacion
 * timer({ operation: 'create_payment_intent' });
 */
export function startTimerWithLabels<T extends string>(
  histogram: Histogram<T>
): (labels: Record<T, string>) => void {
  const startTime = process.hrtime.bigint();
  return (labels: Record<T, string>) => {
    const endTime = process.hrtime.bigint();
    const durationNs = Number(endTime - startTime);
    const durationSeconds = durationNs / 1e9;
    histogram.observe(labels, durationSeconds);
  };
}

/**
 * Incrementa un contador de forma segura
 */
export function incrementCounter(
  counter: Counter<string>,
  labels?: Record<string, string>
): void {
  if (labels) {
    counter.inc(labels);
  } else {
    counter.inc();
  }
}

/**
 * Actualiza un gauge de forma segura
 */
export function setGauge(
  gauge: Gauge<string>,
  value: number,
  labels?: Record<string, string>
): void {
  if (labels) {
    gauge.set(labels, value);
  } else {
    gauge.set(value);
  }
}

// ============================================
// METRICS COLLECTION UTILITIES
// ============================================

/**
 * Obtiene todas las metricas en formato Prometheus
 */
export async function getMetrics(): Promise<string> {
  return register.metrics();
}

/**
 * Obtiene el content type para las metricas
 */
export function getContentType(): string {
  return register.contentType;
}

/**
 * Resetea todas las metricas (util para testing)
 */
export function resetMetrics(): void {
  register.resetMetrics();
}

// Export del cliente para uso avanzado
export { client };
