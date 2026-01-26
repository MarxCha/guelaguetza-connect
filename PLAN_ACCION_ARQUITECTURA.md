# Plan de Acción: Mejoras de Arquitectura
## Guelaguetza Connect

**Fecha:** 2026-01-25
**Versión:** 1.0
**Prioridad:** Crítico → Alta → Media → Baja

---

## Resumen Ejecutivo

Guelaguetza Connect es una plataforma multifuncional bien diseñada con arquitectura moderna (Fastify + Prisma + React PWA). El análisis reveló fortalezas significativas en validación, manejo de concurrencia, y separación de concerns, pero identificó áreas críticas que requieren atención antes de producción.

**Estado Actual:**
- 42 modelos de datos organizados en 11 dominios
- 17 servicios con lógica de negocio
- 17 routers con 100+ endpoints
- Optimistic locking implementado (bookings)
- Flujo de pago en 3 fases (mejor práctica)
- PWA completo con offline support

**Problemas Críticos:**
1. Jobs de limpieza desactivados → inventario no se libera
2. Sin webhooks de Stripe → confirmaciones manuales
3. Optimistic locking parcial → race conditions en stock
4. Sin rate limiting → vulnerable a abuso
5. Coverage de tests bajo

**Riesgo Técnico:** MEDIO-ALTO

---

## Plan de Acción por Sprints

### Sprint 1: Estabilización Crítica (Semana 1-2)

**Objetivo:** Eliminar riesgos de producción

#### 1.1 Activar Jobs de Limpieza
**Prioridad:** CRÍTICA
**Esfuerzo:** 4 horas
**Responsable:** Backend Lead

**Tareas:**
- [ ] Descomentar scheduler en `src/index.ts`
- [ ] Configurar intervalos (cada 15 minutos)
- [ ] Agregar logging de resultados
- [ ] Monitorear en producción por 1 semana
- [ ] Documentar métricas (cuántos bookings/orders limpió)

**Archivos:**
```
backend/src/index.ts (líneas 4, 13)
backend/src/jobs/scheduler.ts
backend/src/jobs/cleanup-payments.job.ts
```

**Código:**
```typescript
// En index.ts
import { startScheduler } from './jobs/scheduler.js';

async function main() {
  const app = await buildApp();

  // Activar scheduler
  startScheduler();
  app.log.info('Payment cleanup scheduler started');

  await app.listen({ port: PORT, host: HOST });
}
```

**Validación:**
- [ ] Logs muestran ejecución cada 15 min
- [ ] Bookings PENDING_PAYMENT > 30min → CANCELLED
- [ ] Slots recuperan capacidad
- [ ] No hay errores en logs

**Riesgo:** BAJO

---

#### 1.2 Implementar Rate Limiting
**Prioridad:** CRÍTICA
**Esfuerzo:** 6 horas
**Responsable:** Backend Lead

**Tareas:**
- [ ] Instalar `@fastify/rate-limit`
- [ ] Configurar globalmente (100 req/min)
- [ ] Configurar específicamente para endpoints sensibles:
  - Auth: 5 req/min
  - Checkout: 10 req/min
  - Create booking: 20 req/min
- [ ] Agregar headers de rate limit info
- [ ] Testing con curl/artillery

**Código:**
```typescript
// Global
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  cache: 10000,
  allowList: ['127.0.0.1'], // Localhost exento
  addHeaders: {
    'x-ratelimit-limit': true,
    'x-ratelimit-remaining': true,
    'x-ratelimit-reset': true
  }
});

// Específico para auth
app.post('/auth/login', {
  config: {
    rateLimit: {
      max: 5,
      timeWindow: '1 minute'
    }
  }
}, handler);
```

**Validación:**
- [ ] Request 101 en 1 minuto → 429 Too Many Requests
- [ ] Headers incluyen rate limit info
- [ ] Login: 6 intentos en 1 min → bloqueado

**Riesgo:** BAJO

---

#### 1.3 Agregar Optimistic Locking a Products
**Prioridad:** ALTA
**Esfuerzo:** 8 horas
**Responsable:** Backend Lead

**Tareas:**
- [ ] Migración: Agregar `version` a Product
- [ ] Actualizar `marketplace.service.ts`:
  - `createOrder()` usar `withRetry`
  - Actualizar stock con `updateMany` + version
- [ ] Crear helper `updateProductWithLocking()`
- [ ] Tests de concurrencia (2 órdenes simultáneas)
- [ ] Documentar en README

**Migración:**
```sql
-- prisma/migrations/xxx_add_version_to_product/migration.sql
ALTER TABLE "Product"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
```

**Código:**
```typescript
// utils/optimistic-locking.ts
export async function updateProductWithLocking(
  prisma: any,
  productId: string,
  currentVersion: number,
  data: {
    stock?: { increment?: number; decrement?: number };
  }
) {
  const result = await prisma.product.updateMany({
    where: { id: productId, version: currentVersion },
    data: {
      ...data,
      version: { increment: 1 }
    }
  });

  if (result.count === 0) {
    throw new ConcurrencyError('Product ha sido modificado');
  }
}

// En createOrder()
return withRetry(async () => {
  // Guardar versiones
  const productVersions = new Map();
  for (const item of items) {
    const p = await tx.product.findUnique({ where: { id: item.productId } });
    productVersions.set(item.productId, p.version);
  }

  // Actualizar con locking
  for (const item of items) {
    await updateProductWithLocking(
      tx,
      item.productId,
      productVersions.get(item.productId),
      { stock: { decrement: item.quantity } }
    );
  }
}, { maxRetries: 3 });
```

**Testing:**
```typescript
it('should prevent stock overbooking', async () => {
  // Product con stock = 5
  const promises = [
    marketplaceService.createOrder(user1, { items: [{ productId, qty: 3 }] }),
    marketplaceService.createOrder(user2, { items: [{ productId, qty: 3 }] })
  ];

  const results = await Promise.allSettled(promises);

  // Solo una debe tener éxito
  expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);

  const finalProduct = await prisma.product.findUnique({ where: { id: productId } });
  expect(finalProduct.stock).toBe(2); // 5 - 3 = 2
});
```

**Validación:**
- [ ] Tests de concurrencia pasan
- [ ] Órdenes concurrentes no causan stock negativo
- [ ] ConcurrencyError se maneja en route

**Riesgo:** MEDIO (requiere testing exhaustivo)

---

#### 1.4 Implementar Webhooks de Stripe
**Prioridad:** ALTA
**Esfuerzo:** 12 horas
**Responsable:** Backend Lead

**Tareas:**
- [ ] Crear endpoint `/api/webhooks/stripe`
- [ ] Verificar signature con webhook secret
- [ ] Manejar eventos:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`
- [ ] Hacer idempotente (verificar estado antes de actualizar)
- [ ] Logging detallado
- [ ] Testing con Stripe CLI

**Código:**
```typescript
// routes/webhooks.ts
import { stripeService } from '../services/stripe.service.js';

const webhooksRoutes: FastifyPluginAsync = async (fastify) => {
  app.post('/stripe', {
    config: {
      rawBody: true // Necesario para verificar signature
    }
  }, async (request, reply) => {
    const signature = request.headers['stripe-signature'] as string;

    if (!signature) {
      return reply.status(400).send({ error: 'No signature' });
    }

    const event = stripeService.constructWebhookEvent(
      request.rawBody,
      signature
    );

    if (!event) {
      return reply.status(400).send({ error: 'Invalid event' });
    }

    fastify.log.info({ eventType: event.type }, 'Stripe webhook received');

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await handlePaymentSuccess(event.data.object);
          break;

        case 'payment_intent.payment_failed':
          await handlePaymentFailed(event.data.object);
          break;

        case 'charge.refunded':
          await handleRefund(event.data.object);
          break;

        default:
          fastify.log.warn({ eventType: event.type }, 'Unhandled webhook event');
      }

      return reply.send({ received: true });
    } catch (error) {
      fastify.log.error(error, 'Error processing webhook');
      return reply.status(500).send({ error: 'Processing failed' });
    }
  });
};

async function handlePaymentSuccess(paymentIntent: any) {
  const metadata = paymentIntent.metadata;

  // Buscar booking o orden
  if (metadata.bookingId) {
    const booking = await prisma.booking.findUnique({
      where: { id: metadata.bookingId }
    });

    // Idempotencia: Solo actualizar si no está ya confirmado
    if (booking && booking.status !== 'CONFIRMED') {
      await prisma.booking.update({
        where: { id: metadata.bookingId },
        data: {
          status: 'CONFIRMED',
          confirmedAt: new Date()
        }
      });

      // Notificar usuario y host
      await notificationService.create(booking.userId, {
        type: 'BOOKING_CONFIRMED',
        title: 'Reservación confirmada',
        body: 'Tu pago ha sido procesado exitosamente'
      });
    }
  }

  if (metadata.orderId) {
    const order = await prisma.order.findUnique({
      where: { id: metadata.orderId }
    });

    if (order && order.status !== 'PAID') {
      await prisma.order.update({
        where: { id: metadata.orderId },
        data: { status: 'PAID' }
      });

      // Notificar comprador y vendedor
    }
  }
}
```

**Testing:**
```bash
# Stripe CLI
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Trigger test events
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
```

**Validación:**
- [ ] Webhook verifica signature correctamente
- [ ] Payment success → Booking CONFIRMED
- [ ] Payment failed → Booking PAYMENT_FAILED
- [ ] Idempotencia: Doble webhook no causa errores
- [ ] Logs muestran eventos procesados

**Riesgo:** MEDIO (requiere configuración correcta de Stripe)

---

### Sprint 2: Testing y Calidad (Semana 3-4)

**Objetivo:** Aumentar confidence en código

#### 2.1 Tests de Integración
**Prioridad:** ALTA
**Esfuerzo:** 20 horas
**Responsable:** Backend + QA

**Coverage mínimo por servicio:**
- BookingService: 85%
- MarketplaceService: 85%
- AuthService: 90%
- StripeService: 70% (mocks)

**Tests críticos:**
```typescript
// booking.service.integration.test.ts
describe('BookingService Integration', () => {
  it('should create booking with payment intent', async () => {
    const result = await bookingService.createBooking(userId, {
      experienceId, timeSlotId, guestCount: 2
    });

    expect(result.booking.status).toBe('PENDING');
    expect(result.clientSecret).toBeDefined();

    // Verificar slot reservado
    const slot = await prisma.experienceTimeSlot.findUnique({
      where: { id: timeSlotId }
    });
    expect(slot.bookedCount).toBe(2);
  });

  it('should handle concurrent bookings correctly', async () => {
    const promises = Array(5).fill(null).map(() =>
      bookingService.createBooking(randomUser(), {
        experienceId, timeSlotId, guestCount: 2
      })
    );

    const results = await Promise.allSettled(promises);

    // Verificar que no hay overbooking
    const finalSlot = await prisma.experienceTimeSlot.findUnique({
      where: { id: timeSlotId }
    });
    expect(finalSlot.bookedCount).toBeLessThanOrEqual(finalSlot.capacity);
  });

  it('should cleanup failed bookings after timeout', async () => {
    // Crear booking fallido
    const booking = await createFailedBooking();

    // Simular timeout (30 min)
    await prisma.booking.update({
      where: { id: booking.id },
      data: { createdAt: new Date(Date.now() - 31 * 60 * 1000) }
    });

    // Ejecutar cleanup
    const result = await bookingService.cleanupFailedBookings(30);

    expect(result.cleaned).toBe(1);

    // Verificar slot restaurado
    const slot = await prisma.experienceTimeSlot.findUnique({
      where: { id: booking.timeSlotId }
    });
    expect(slot.bookedCount).toBe(0);
  });

  it('should cancel booking and refund', async () => {
    // Mock Stripe
    stripeMock.refunds.create.mockResolvedValue({ id: 'refund_123' });

    const result = await bookingService.cancelBooking(bookingId, userId);

    expect(result.status).toBe('CANCELLED');
    expect(stripeMock.refunds.create).toHaveBeenCalledWith({
      payment_intent: booking.stripePaymentId
    });
  });
});
```

**Herramientas:**
- Vitest (ya configurado)
- Docker Compose para test DB
- Stripe mocks

**Validación:**
- [ ] `npm run test:coverage` → >80% coverage
- [ ] Todos los tests pasan en CI
- [ ] Tests de concurrencia pasan 100 veces seguidas

**Riesgo:** BAJO

---

#### 2.2 Tests E2E de Flujos Críticos
**Prioridad:** MEDIA
**Esfuerzo:** 16 horas
**Responsable:** QA + Frontend

**Flujos a testear:**
1. **User Journey: Reservar experiencia**
   - Buscar experiencias
   - Ver detalle
   - Seleccionar horario
   - Crear booking
   - Procesar pago (mock)
   - Ver confirmación

2. **User Journey: Comprar productos**
   - Navegar tienda
   - Agregar al carrito (multi-seller)
   - Checkout
   - Procesar pago
   - Ver orden

3. **Admin Journey: Banear usuario**
   - Login como admin
   - Buscar usuario
   - Banear con razón
   - Verificar que usuario no puede acceder

**Herramientas:**
- Playwright o Cypress
- Test DB con seed data

**Validación:**
- [ ] E2E tests pasan en CI
- [ ] Screenshots de cada paso
- [ ] Video de test run

**Riesgo:** BAJO

---

### Sprint 3: DevOps y Deployment (Semana 5-6)

**Objetivo:** Preparar para producción

#### 3.1 Docker Compose
**Prioridad:** ALTA
**Esfuerzo:** 8 horas
**Responsable:** DevOps

**Tareas:**
- [ ] Crear `docker-compose.yml` para dev
- [ ] Crear `docker-compose.prod.yml` para producción
- [ ] Dockerfile para backend
- [ ] Dockerfile para frontend
- [ ] Setup volumes para persistencia
- [ ] Scripts de inicialización
- [ ] Documentar en README

**Archivos:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: guelaguetza
      POSTGRES_USER: guelaguetza
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U guelaguetza"]
      interval: 10s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

  backend:
    build:
      context: ./backend
      dockerfile: Dockerfile
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started
    environment:
      DATABASE_URL: postgresql://guelaguetza:${DB_PASSWORD}@postgres:5432/guelaguetza
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      STRIPE_SECRET_KEY: ${STRIPE_SECRET_KEY}
    ports:
      - "3001:3001"
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev

  frontend:
    build:
      context: .
      dockerfile: Dockerfile.frontend
    depends_on:
      - backend
    ports:
      - "5173:5173"
    volumes:
      - .:/app
      - /app/node_modules
    environment:
      VITE_API_URL: http://localhost:3001

volumes:
  postgres_data:
  redis_data:
```

**Validación:**
- [ ] `docker-compose up` inicia todo
- [ ] DB migraciones se aplican automáticamente
- [ ] Backend responde en http://localhost:3001
- [ ] Frontend responde en http://localhost:5173
- [ ] Hot reload funciona

**Riesgo:** BAJO

---

#### 3.2 CI/CD Pipeline
**Prioridad:** ALTA
**Esfuerzo:** 12 horas
**Responsable:** DevOps

**Tareas:**
- [ ] GitHub Actions workflow
- [ ] Stages: lint, test, build, deploy
- [ ] Test DB con Docker
- [ ] Deploy a staging
- [ ] Deploy a producción (manual approval)

**Archivo:**
```yaml
# .github/workflows/ci.yml
name: CI/CD

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run lint

  test-backend:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: cd backend && npm ci
      - run: cd backend && npx prisma migrate deploy
      - run: cd backend && npm run test:coverage
      - uses: codecov/codecov-action@v3

  test-frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run test:coverage

  build:
    needs: [lint, test-backend, test-frontend]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm ci
      - run: npm run build
      - run: cd backend && npm run build

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/develop'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Staging
        run: |
          # Deploy script (Railway, Vercel, etc.)
          echo "Deploying to staging..."

  deploy-production:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: production
    steps:
      - name: Deploy to Production
        run: |
          echo "Deploying to production..."
```

**Validación:**
- [ ] PR triggers CI checks
- [ ] Merge a develop → auto-deploy a staging
- [ ] Merge a main → requiere approval → auto-deploy a prod

**Riesgo:** MEDIO

---

### Sprint 4: Monitoring y Observabilidad (Semana 7-8)

**Objetivo:** Visibilidad completa del sistema

#### 4.1 Logging Estructurado
**Prioridad:** ALTA
**Esfuerzo:** 6 horas
**Responsable:** Backend Lead

**Tareas:**
- [ ] Configurar Pino logger (Fastify built-in)
- [ ] Agregar request IDs
- [ ] Log levels por environment
- [ ] Structured logging (JSON)
- [ ] Setup log aggregation (Loki o CloudWatch)

**Código:**
```typescript
// app.ts
const app = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: process.env.NODE_ENV === 'development' ? {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname'
      }
    } : undefined
  },
  genReqId: () => crypto.randomUUID() // Request ID
});

// En services
app.log.info({ bookingId, userId }, 'Booking created successfully');
app.log.error({ error, bookingId }, 'Failed to create booking');
app.log.warn({ timeSlotId, conflict: true }, 'Concurrency conflict detected');
```

**Validación:**
- [ ] Logs en formato JSON en producción
- [ ] Pretty logs en desarrollo
- [ ] Request ID en cada log
- [ ] Logs centralizados accesibles

**Riesgo:** BAJO

---

#### 4.2 Métricas con Prometheus
**Prioridad:** MEDIA
**Esfuerzo:** 12 hours
**Responsable:** DevOps

**Tareas:**
- [ ] Instalar `prom-client`
- [ ] Endpoint `/metrics`
- [ ] Instrumentar servicios críticos
- [ ] Setup Prometheus server
- [ ] Setup Grafana dashboards

**Métricas:**
```typescript
import { register, Counter, Histogram, Gauge } from 'prom-client';

// Counters
const bookingsCreated = new Counter({
  name: 'bookings_created_total',
  help: 'Total bookings created',
  labelNames: ['status']
});

const ordersCreated = new Counter({
  name: 'orders_created_total',
  help: 'Total orders created',
  labelNames: ['status']
});

// Histograms
const bookingDuration = new Histogram({
  name: 'booking_creation_duration_seconds',
  help: 'Time to create booking',
  buckets: [0.1, 0.5, 1, 2, 5]
});

// Gauges
const activeBookings = new Gauge({
  name: 'active_bookings',
  help: 'Number of active bookings'
});

// En service
async createBooking(userId, data) {
  const timer = bookingDuration.startTimer();

  try {
    const result = await withRetry(/* ... */);
    bookingsCreated.inc({ status: 'success' });
    return result;
  } catch (error) {
    bookingsCreated.inc({ status: 'error' });
    throw error;
  } finally {
    timer();
  }
}

// Endpoint
app.get('/metrics', async () => {
  return register.metrics();
});
```

**Dashboards:**
1. **API Overview**
   - Request rate
   - Error rate
   - Latency (p50, p95, p99)
   - Active connections

2. **Booking Metrics**
   - Bookings created/hour
   - Concurrency conflicts/hour
   - Cleanup job executions
   - Payment success rate

3. **Marketplace Metrics**
   - Orders created/hour
   - Revenue/hour
   - Stock alerts (products < 5)

**Validación:**
- [ ] `/metrics` retorna datos Prometheus
- [ ] Grafana muestra dashboards en tiempo real
- [ ] Alertas configuradas (error rate > 5%)

**Riesgo:** MEDIO

---

#### 4.3 Error Tracking con Sentry
**Prioridad:** MEDIA
**Esfuerzo:** 4 horas
**Responsable:** Backend + Frontend

**Tareas:**
- [ ] Setup cuenta Sentry
- [ ] Instalar `@sentry/node` (backend)
- [ ] Instalar `@sentry/react` (frontend)
- [ ] Configurar source maps
- [ ] Testing con error intencional

**Código:**
```typescript
// Backend: src/index.ts
import * as Sentry from '@sentry/node';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1 // 10% de requests
});

// Error handler
app.setErrorHandler((error, request, reply) => {
  Sentry.captureException(error, {
    contexts: {
      request: {
        url: request.url,
        method: request.method,
        userId: request.user?.userId
      }
    }
  });

  // ... resto del handler
});

// Frontend: main.tsx
import * as Sentry from '@sentry/react';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration()
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1
});
```

**Validación:**
- [ ] Errores aparecen en Sentry dashboard
- [ ] Stack traces completos
- [ ] User context incluido
- [ ] Alerts configurados

**Riesgo:** BAJO

---

### Sprint 5: Performance Optimization (Semana 9-10)

**Objetivo:** Mejorar latencia y throughput

#### 5.1 Database Optimization
**Prioridad:** MEDIA
**Esfuerzo:** 12 horas
**Responsable:** Backend Lead

**Tareas:**
- [ ] Audit de índices faltantes
- [ ] Optimizar queries N+1
- [ ] Connection pooling
- [ ] Query analysis con EXPLAIN
- [ ] Setup read replicas (staging)

**Índices a agregar:**
```prisma
model Booking {
  @@index([userId, status, createdAt])
  @@index([experienceId, status])
}

model Order {
  @@index([userId, status, createdAt])
  @@index([sellerId, status, createdAt])
}

model Product {
  @@index([category, status, createdAt])
}

model ActivityLog {
  @@index([userId, action, createdAt])
}
```

**Query optimization:**
```typescript
// ❌ Antes (N+1)
const bookings = await prisma.booking.findMany();
for (const b of bookings) {
  b.experience = await prisma.experience.findUnique({ where: { id: b.experienceId } });
}

// ✓ Después (1 query)
const bookings = await prisma.booking.findMany({
  include: { experience: true }
});
```

**Validación:**
- [ ] `EXPLAIN ANALYZE` muestra uso de índices
- [ ] Query time < 100ms para queries principales
- [ ] Connection pool estable (no leaks)

**Riesgo:** BAJO

---

#### 5.2 Caching Layer con Redis
**Prioridad:** MEDIA
**Esfuerzo:** 16 horas
**Responsable:** Backend Lead

**Tareas:**
- [ ] Setup Redis en Docker Compose
- [ ] Cache service wrapper
- [ ] Cache para queries frecuentes
- [ ] Cache invalidation strategy
- [ ] Monitoring de hit rate

**Datos a cachear:**
```typescript
// Badges (casi nunca cambian)
cache.set('badges:all', badges, { ttl: 3600 }); // 1 hora

// Events (cambian poco)
cache.set(`event:${id}`, event, { ttl: 600 }); // 10 min

// Leaderboard
cache.set('leaderboard:weekly', entries, { ttl: 300 }); // 5 min

// User profile (si no es propio)
cache.set(`user:${userId}:profile`, profile, { ttl: 60 }); // 1 min

// Experience listings
cache.set(`experiences:${hash(filters)}`, results, { ttl: 120 }); // 2 min
```

**Invalidación:**
```typescript
// Al crear booking
cache.del(`experience:${experienceId}:slots`);
cache.del(`experiences:*`); // Invalidar listings

// Al crear product
cache.del(`seller:${sellerId}:products`);
cache.del(`products:*`);
```

**Validación:**
- [ ] Cache hit rate > 70% para queries cacheados
- [ ] Latency reducida 50%+ en endpoints cacheados
- [ ] Invalidación correcta (no data stale)

**Riesgo:** MEDIO

---

#### 5.3 CDN para Assets
**Prioridad:** BAJA
**Esfuerzo:** 8 horas
**Responsable:** DevOps

**Tareas:**
- [ ] Setup S3 o Cloudflare R2
- [ ] Upload service para imágenes
- [ ] Migrate existing images
- [ ] Setup CloudFront o Cloudflare CDN
- [ ] Lazy loading en frontend

**Beneficios:**
- Latency reducida (edge locations)
- Bandwidth savings en backend
- Image optimization (resize, WebP)

**Validación:**
- [ ] Imágenes servidas desde CDN
- [ ] TTL configurado (1 año)
- [ ] Compress ratio >50%

**Riesgo:** BAJO

---

### Sprint 6: Refactoring Arquitectónico (Semana 11-14)

**Objetivo:** Clean Architecture

#### 6.1 Domain Layer
**Prioridad:** MEDIA
**Esfuerzo:** 40 horas
**Responsable:** Arquitecto + Backend Lead

**Estructura propuesta:**
```
backend/src/
├── domain/
│   ├── booking/
│   │   ├── entities/
│   │   │   ├── Booking.ts
│   │   │   ├── Experience.ts
│   │   │   └── TimeSlot.ts
│   │   ├── value-objects/
│   │   │   ├── Money.ts
│   │   │   ├── TimeRange.ts
│   │   │   └── Location.ts
│   │   ├── repositories/
│   │   │   ├── IBookingRepository.ts
│   │   │   └── IExperienceRepository.ts
│   │   └── services/
│   │       └── BookingDomainService.ts
│   │
│   └── marketplace/
│       ├── entities/
│       │   ├── Product.ts
│       │   ├── Order.ts
│       │   └── Cart.ts
│       └── ...
│
├── application/
│   ├── use-cases/
│   │   ├── CreateBookingUseCase.ts
│   │   ├── CancelBookingUseCase.ts
│   │   └── ProcessOrderUseCase.ts
│   └── dtos/
│
└── infrastructure/
    ├── repositories/
    │   ├── PrismaBookingRepository.ts
    │   └── PrismaProductRepository.ts
    ├── stripe/
    │   └── StripePaymentGateway.ts
    └── cache/
        └── RedisCache.ts
```

**Ejemplo de Domain Entity:**
```typescript
// domain/booking/entities/Booking.ts
export class Booking {
  private constructor(
    public readonly id: string,
    public status: BookingStatus,
    private guestCount: number,
    private totalPrice: Money,
    private timeSlot: TimeSlot
  ) {}

  static create(data: CreateBookingData): Booking {
    // Validar invariantes
    if (data.guestCount < 1) {
      throw new DomainError('Guest count must be positive');
    }

    if (data.guestCount > data.timeSlot.availableSpots()) {
      throw new DomainError('Not enough spots available');
    }

    return new Booking(
      generateId(),
      BookingStatus.PENDING_PAYMENT,
      data.guestCount,
      data.totalPrice,
      data.timeSlot
    );
  }

  confirm(): void {
    if (this.status !== BookingStatus.PENDING) {
      throw new DomainError('Cannot confirm booking in current status');
    }
    this.status = BookingStatus.CONFIRMED;
  }

  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new DomainError('Cannot cancel booking in current status');
    }
    this.status = BookingStatus.CANCELLED;
  }

  canBeCancelled(): boolean {
    return [
      BookingStatus.PENDING_PAYMENT,
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED
    ].includes(this.status);
  }
}
```

**Beneficios:**
- Lógica de negocio testeable sin DB
- Independiente de frameworks
- Reglas de negocio explícitas

**Validación:**
- [ ] Domain entities tienen tests unitarios (100% coverage)
- [ ] No dependencias de Prisma en domain/
- [ ] Business rules centralizadas

**Riesgo:** ALTO (refactor grande)

---

#### 6.2 Event-Driven Architecture
**Prioridad:** BAJA
**Esfuerzo:** 32 horas
**Responsable:** Arquitecto

**Implementación:**
```typescript
// infrastructure/events/EventBus.ts
export class EventBus {
  private handlers = new Map<string, Array<(data: any) => Promise<void>>>();

  on(event: string, handler: (data: any) => Promise<void>) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  async emit(event: string, data: any) {
    const handlers = this.handlers.get(event) || [];
    await Promise.all(handlers.map(h => h(data)));
  }
}

export const eventBus = new EventBus();

// Events
eventBus.on('booking.created', async (data) => {
  await notificationService.notifyHost(data.hostId, data.bookingId);
  await gamificationService.awardXP(data.userId, 10, 'CREATE_BOOKING');
  await analyticsService.trackBooking(data);
});

eventBus.on('booking.confirmed', async (data) => {
  await notificationService.notifyUser(data.userId, 'BOOKING_CONFIRMED');
});

eventBus.on('order.paid', async (data) => {
  await notificationService.notifyBuyer(data.userId, data.orderId);
  await notificationService.notifySeller(data.sellerId, data.orderId);
});

// En service
const booking = await prisma.booking.create({ data });
await eventBus.emit('booking.created', {
  bookingId: booking.id,
  userId: booking.userId,
  hostId: experience.hostId,
  experienceId: booking.experienceId
});
```

**Beneficios:**
- Desacoplamiento
- Fácil agregar features (listeners)
- Preparación para microservicios

**Validación:**
- [ ] Events disparan handlers correctamente
- [ ] Error en handler no afecta operación principal
- [ ] Events loggeados para debugging

**Riesgo:** MEDIO

---

### Backlog: Futuras Mejoras

#### Seguridad
- [ ] CSRF protection (`@fastify/csrf`)
- [ ] Helmet for security headers
- [ ] API key authentication para integraciones
- [ ] Regular security audits
- [ ] Dependency vulnerability scanning

#### Performance
- [ ] Database query caching (Redis)
- [ ] Response compression (`@fastify/compress`)
- [ ] GraphQL API (alternativa a REST)
- [ ] Server-side pagination por defecto
- [ ] Database sharding (si escala)

#### Developer Experience
- [ ] OpenAPI/Swagger documentation
- [ ] Postman/Insomnia collections
- [ ] E2E tests con Playwright
- [ ] Storybook para UI components
- [ ] VSCode snippets para common patterns

#### Features
- [ ] Webhooks para sellers (notificar nuevas órdenes)
- [ ] Email notifications (SendGrid)
- [ ] SMS notifications (Twilio)
- [ ] Scheduled events (cron jobs mejores)
- [ ] File upload optimization (S3 direct upload)

---

## Métricas de Éxito

### Por Sprint

**Sprint 1:**
- [ ] 0 bookings/orders sin limpiar después de 30 min
- [ ] Rate limit activo en todos los endpoints
- [ ] 0 stock negativo en products
- [ ] Webhooks procesando >95% de eventos

**Sprint 2:**
- [ ] Test coverage >80%
- [ ] CI pipeline verde
- [ ] 0 tests flaky

**Sprint 3:**
- [ ] Onboarding nuevo dev en <30 min con Docker
- [ ] CI/CD deploya automáticamente
- [ ] Rollback en <5 min

**Sprint 4:**
- [ ] Logs centralizados accesibles
- [ ] Dashboards Grafana operacionales
- [ ] Alertas en Slack/Email funcionando
- [ ] Error tracking con Sentry

**Sprint 5:**
- [ ] Latency p95 < 500ms
- [ ] Cache hit rate >70%
- [ ] CDN sirve >90% de assets

**Sprint 6:**
- [ ] Domain layer con 100% coverage
- [ ] 0 dependencias de infrastructure en domain/
- [ ] Event bus manejando >90% de side effects

### KPIs Generales

**Performance:**
- API latency p95 < 500ms
- DB query time p95 < 100ms
- Cache hit rate > 70%
- Error rate < 1%

**Reliability:**
- Uptime > 99.5%
- 0 data inconsistencies (integrity checks pasan)
- 0 payment discrepancies (Stripe vs DB)

**Development Velocity:**
- Time to deploy < 15 min
- New feature delivery time -30%
- Bug fix time -40%

---

## Riesgos y Mitigaciones

### Riesgo 1: Jobs de Limpieza Interfieren con Transacciones Activas
**Probabilidad:** BAJA
**Impacto:** ALTO

**Mitigación:**
- Cleanup solo marca CANCELLED, no elimina
- Verificar que status es estático antes de limpiar
- Usar exclusive locks si es necesario
- Monitoring de conflictos

### Riesgo 2: Webhooks Duplicados
**Probabilidad:** MEDIA
**Impacto:** MEDIO

**Mitigación:**
- Idempotencia: Verificar estado antes de actualizar
- Logging de eventos procesados
- Deduplication key en Redis (event.id)

### Riesgo 3: Migration Breaking Production
**Probabilidad:** BAJA
**Impacto:** CRÍTICO

**Mitigación:**
- Staging environment obligatorio
- Backward compatible migrations
- Rollback plan documentado
- Database backups antes de migración

### Riesgo 4: Cache Invalidation Bugs
**Probabilidad:** MEDIA
**Impacto:** MEDIO

**Mitigación:**
- TTL cortos al inicio (1-5 min)
- Manual invalidation endpoint para emergencias
- Monitoring de cache staleness
- Feature flag para desactivar cache

### Riesgo 5: Refactor de Domain Layer Rompe Código
**Probabilidad:** ALTA
**Impacto:** ALTO

**Mitigación:**
- Refactor incremental (un dominio a la vez)
- Feature flag para nuevo código
- 100% test coverage antes de refactor
- Parallel run (old + new code) por 1 semana

---

## Recursos Necesarios

### Equipo

**Sprint 1-2 (Crítico):**
- 1 Backend Lead (full-time)
- 1 DevOps (part-time, 50%)

**Sprint 3-4 (CI/CD + Monitoring):**
- 1 Backend Lead (full-time)
- 1 DevOps (full-time)
- 1 QA (part-time, 50%)

**Sprint 5-6 (Optimization + Refactor):**
- 1 Arquitecto (full-time)
- 1 Backend Lead (full-time)
- 1 Frontend (part-time, 25%)

### Infraestructura

**Desarrollo:**
- Docker Compose (local)
- GitHub Actions (free tier)

**Staging:**
- PostgreSQL (1 GB RAM, 10 GB storage) - $10/mes
- Redis (256 MB) - $5/mes
- Backend server (1 GB RAM) - $10/mes
- Total: ~$25/mes

**Producción:**
- PostgreSQL (4 GB RAM, 50 GB storage) - $50/mes
- Redis (1 GB) - $15/mes
- Backend server (2-4 GB RAM) - $30/mes
- Monitoring (Grafana Cloud) - $0-50/mes
- Sentry - $0-26/mes (Developer plan)
- Total: ~$120-170/mes

**Herramientas:**
- GitHub (free)
- Sentry (Developer: $26/mes)
- Grafana Cloud (free tier)
- Stripe (comisión por transacción)

### Timeline Total

```
Semana 1-2:  Sprint 1 (Crítico)
Semana 3-4:  Sprint 2 (Testing)
Semana 5-6:  Sprint 3 (DevOps)
Semana 7-8:  Sprint 4 (Monitoring)
Semana 9-10: Sprint 5 (Performance)
Semana 11-14: Sprint 6 (Refactor) - Opcional

TOTAL: 10-14 semanas para completar
MVP Production-Ready: 8 semanas
```

---

## Criterios de Go-Live

### Must-Have (Bloqueantes)

- [x] Jobs de limpieza activos y funcionando
- [x] Webhooks de Stripe implementados
- [x] Optimistic locking en Products
- [x] Rate limiting configurado
- [x] Test coverage >80%
- [x] CI/CD pipeline funcional
- [x] Monitoring básico (logs + métricas)
- [x] Error tracking (Sentry)
- [x] Docker Compose para deployment
- [x] Database backups configurados
- [x] Staging environment operacional
- [x] Security audit completado
- [x] Load testing aprobado (100 concurrent users)

### Nice-to-Have (No bloqueantes)

- [ ] Domain layer refactor
- [ ] Event-driven architecture
- [ ] Redis caching
- [ ] CDN setup
- [ ] GraphQL API
- [ ] Advanced analytics

---

## Conclusión

El proyecto está bien encaminado pero necesita 8-10 semanas de trabajo enfocado en estabilización, testing, y DevOps antes de producción.

**Prioridad inmediata:** Sprint 1 (2 semanas)
- Activar jobs
- Rate limiting
- Optimistic locking en products
- Webhooks

**Después:** Sprints 2-4 (6 semanas)
- Testing completo
- CI/CD
- Monitoring

**Opcional:** Sprints 5-6 (4 semanas)
- Performance
- Refactoring arquitectónico

**Costo estimado:** $500-1000/mes en infraestructura + 1-2 devs full-time.

**ROI:** Alta reliability, mejor developer experience, preparación para escala.

---

**Aprobación requerida:**
- [ ] Product Manager
- [ ] CTO/Tech Lead
- [ ] DevOps Lead

**Fecha de revisión:** 2026-02-01

---

**Autor:** Claude Code (Arquitecto de Software)
**Versión:** 1.0
**Última actualización:** 2026-01-25
