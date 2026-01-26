# ✅ Sistema de Jobs de Limpieza Activado y Funcionando

## 🎯 Estado

**✅ COMPLETAMENTE ACTIVADO** - El sistema de limpieza de pagos fallidos está funcionando automáticamente desde el inicio del servidor.

## 📋 Resumen Ejecutivo

El sistema de jobs de limpieza se ejecuta automáticamente cada **15 minutos** (`*/15 * * * *`) para limpiar:

### Para Bookings:
- 🎫 Estados: `PENDING_PAYMENT` | `PAYMENT_FAILED`
- ⏱️ Antigüedad: Más de **30 minutos**
- ✅ Acción: Restaura capacidad de time slots (`bookedCount--`)
- 🚫 Status final: `CANCELLED`

### Para Orders:
- 🛒 Estados: `PENDING_PAYMENT` | `PAYMENT_FAILED`
- ⏱️ Antigüedad: Más de **30 minutos**
- ✅ Acción: Restaura stock de productos (`stock++`)
- 🚫 Status final: `CANCELLED`
- 🔒 Usa: Optimistic locking con retry logic

## 🔧 Verificación de Activación

El scheduler **YA ESTÁ ACTIVO** en el servidor. Verificado en:

**Archivo:** `/Users/marxchavez/Projects/guelaguetza-connect/backend/src/index.ts` (línea 12)

```typescript
// Iniciar jobs de limpieza de pagos fallidos
startCronScheduler();
```

**✅ Confirmado:** El scheduler se inicia automáticamente al arrancar el servidor.

## 📦 Dependencias Instaladas y Verificadas

```bash
✅ node-cron@4.2.1 - Instalado
✅ @types/node-cron@3.0.11 - Instalado
✅ prom-client@15.1.0 - Instalado (métricas)
```

## 📁 Archivos Clave del Sistema

### 1. `backend/src/index.ts` (Entrada Principal)
**Línea 12:** Activa el scheduler automáticamente
```typescript
startCronScheduler();
```

### 2. `backend/src/jobs/scheduler.cron.ts` (Scheduler)
**Responsabilidad:** Orquestación de jobs con node-cron

**Características:**
- ✅ Frecuencia: Cada 15 minutos (`*/15 * * * *`)
- ✅ Ejecución inmediata al inicio del servidor
- ✅ Logging detallado de resultados con formato visual
- ✅ Manejo de shutdown graceful (SIGTERM/SIGINT)
- ✅ Métricas Prometheus integradas

**Código Clave:**
```typescript
const cleanupTask = cron.schedule('*/15 * * * *', async () => {
  const result = await runCleanupJob();
  // Log results
});
```

### 3. `backend/src/jobs/cleanup-payments.job.ts` (Job Principal)
**Responsabilidad:** Ejecuta la lógica de limpieza

**Características:**
- ✅ Llama a `bookingService.cleanupFailedBookings(30)`
- ✅ Llama a `marketplaceService.cleanupFailedOrders(30)`
- ✅ Logging visual con cajas ASCII
- ✅ Métricas detalladas (duración, items limpiados)
- ✅ Manejo robusto de errores

**Retorna:**
```typescript
{
  success: boolean,
  bookingsCleaned: number,
  ordersCleaned: number,
  totalCleaned: number,
  duration: number,
  timestamp: string
}
```

### 4. `backend/src/services/booking.service.ts`
**Método:** `cleanupFailedBookings(timeoutMinutes: number = 30)` (línea 830)

**Lógica:**
1. Busca bookings con status `PENDING_PAYMENT` o `PAYMENT_FAILED` más viejos que `timeoutMinutes`
2. Agrupa por `timeSlotId` para optimizar updates
3. Ejecuta transacción atómica:
   - Decrementa `bookedCount` de cada slot
   - Marca slots como `isAvailable = true`
   - Cambia status de bookings a `CANCELLED`
   - Registra `cancelledAt` timestamp

**Retorna:**
```typescript
{
  cleaned: number,
  details: Array<{
    bookingId: string,
    experienceTitle: string,
    guestCount: number,
    status: string,
    createdAt: Date
  }>,
  slotsUpdated: number
}
```

### 5. `backend/src/services/marketplace.service.ts`
**Método:** `cleanupFailedOrders(timeoutMinutes: number = 30)` (línea 674)

**Lógica:**
1. Busca órdenes con status `PENDING_PAYMENT` o `PAYMENT_FAILED` más viejas que `timeoutMinutes`
2. Agrupa items por `productId` para optimizar updates
3. Ejecuta transacción atómica con **optimistic locking** y **retry logic**:
   - Incrementa `stock` de cada producto usando `updateProductWithLocking()`
   - Cambia status de órdenes a `CANCELLED`
   - Reintentos automáticos (max 3) en caso de conflicto de versión

**Retorna:**
```typescript
{
  cleaned: number,
  details: Array<{
    orderId: string,
    itemCount: number,
    totalAmount: number,
    status: string,
    createdAt: Date
  }>,
  productsUpdated: number
}
```

### 3. Archivos Creados

#### `backend/scripts/test-cleanup-job.ts`
Script de testing manual para probar el job sin esperar 15 minutos:

```bash
npx tsx scripts/test-cleanup-job.ts
```

#### `backend/docs/CLEANUP_JOBS.md`
Documentación completa del sistema de jobs:
- Arquitectura
- Configuración
- Formato de logs
- Uso y testing
- Troubleshooting
- Escalabilidad

## Funcionamiento

### Inicio del Servidor

Cuando inicias el servidor (`npm run dev` o `npm start`), verás:

```
╔═══════════════════════════════════════════════════════════╗
║  Cron Scheduler Started                                   ║
╚═══════════════════════════════════════════════════════════╝
  Scheduled Jobs:
  • Payment Cleanup: Every 15 minutes (*/15 * * * *)
    - Timeout: 30 minutes
    - Actions: Restore inventory, cancel failed payments

[Cron Scheduler] Running initial cleanup job...
```

### Ejecución del Job

Cada 15 minutos (o al iniciar), verás:

```
┌─────────────────────────────────────────────────────────┐
│ Cleanup Job Started: 14:30:00                           │
└─────────────────────────────────────────────────────────┘
[Cleanup Job] Checking failed bookings (timeout: 30min)...
  ✓ Cleaned 3 failed booking(s)
    - Status: PENDING_PAYMENT | PAYMENT_FAILED → CANCELLED
    - Action: Restored slot capacity (bookedCount decremented)
[Cleanup Job] Checking failed orders (timeout: 30min)...
  ✓ Cleaned 2 failed order(s)
    - Status: PENDING_PAYMENT | PAYMENT_FAILED → CANCELLED
    - Action: Restored product stock (stock incremented)
┌─────────────────────────────────────────────────────────┐
│ Cleanup Job Completed                                   │
│ Total items cleaned: 5                                  │
│ Duration: 245ms                                         │
└─────────────────────────────────────────────────────────┘
```

### Cuando No Hay Items para Limpiar

```
┌─────────────────────────────────────────────────────────┐
│ Cleanup Job Started: 14:45:00                           │
└─────────────────────────────────────────────────────────┘
[Cleanup Job] Checking failed bookings (timeout: 30min)...
  • No failed bookings found
[Cleanup Job] Checking failed orders (timeout: 30min)...
  • No failed orders found
┌─────────────────────────────────────────────────────────┐
│ Cleanup Job Completed                                   │
│ Total items cleaned: 0                                  │
│ Duration: 42ms                                          │
└─────────────────────────────────────────────────────────┘
```

## Configuración

### Cambiar Intervalo de Ejecución

Editar `backend/src/jobs/scheduler.cron.ts`:

```typescript
// Cada 15 minutos (actual)
const cleanupTask = cron.schedule('*/15 * * * *', ...);

// Cada 5 minutos
const cleanupTask = cron.schedule('*/5 * * * *', ...);

// Cada hora
const cleanupTask = cron.schedule('0 * * * *', ...);

// Diario a las 2 AM
const cleanupTask = cron.schedule('0 2 * * *', ...);
```

### Cambiar Timeout de Pagos

Editar `backend/src/jobs/cleanup-payments.job.ts`:

```typescript
// 30 minutos (actual)
const PAYMENT_TIMEOUT_MINUTES = 30;

// 15 minutos
const PAYMENT_TIMEOUT_MINUTES = 15;

// 1 hora
const PAYMENT_TIMEOUT_MINUTES = 60;
```

## Testing

### Prueba Manual Inmediata

```bash
cd backend
npx tsx scripts/test-cleanup-job.ts
```

### Crear Datos de Prueba

Para probar el cleanup, puedes crear manualmente bookings o órdenes en estado `PENDING_PAYMENT`:

```typescript
// En Prisma Studio o directamente en BD
await prisma.booking.create({
  data: {
    userId: "...",
    experienceId: "...",
    timeSlotId: "...",
    guestCount: 2,
    totalPrice: 100,
    status: 'PENDING_PAYMENT',
    createdAt: new Date(Date.now() - 40 * 60 * 1000) // 40 minutos atrás
  }
});
```

Luego ejecuta el job manualmente y verifica que el booking se cancela y el slot se restaura.

## Verificación

### Logs del Servidor

Revisa los logs cuando el servidor está corriendo:

```bash
npm run dev
```

Busca líneas que contengan:
- `[Cron Scheduler]`
- `[Cleanup Job]`

### Base de Datos

Verifica que los bookings/órdenes antiguos en `PENDING_PAYMENT` se cancelen:

```sql
-- Bookings cancelados por cleanup
SELECT id, status, createdAt, cancelledAt
FROM "Booking"
WHERE status = 'CANCELLED'
  AND cancelledAt IS NOT NULL
ORDER BY cancelledAt DESC;

-- Órdenes canceladas por cleanup
SELECT id, status, createdAt
FROM "Order"
WHERE status = 'CANCELLED'
ORDER BY "createdAt" DESC;
```

## Desactivar Jobs (si es necesario)

Si por alguna razón necesitas desactivar temporalmente los jobs:

1. Comentar la llamada en `backend/src/index.ts`:

```typescript
// Desactivar jobs de limpieza
// startCronScheduler();
```

2. Reiniciar el servidor

## Monitoreo en Producción

### Métricas Recomendadas

1. **Total de items limpiados por día**
   - Si es muy alto (>100/día), investigar problemas en flujo de pago

2. **Duración del job**
   - Debe ser <1 segundo normalmente
   - Si supera 5 segundos, optimizar queries

3. **Errores de cleanup**
   - Cualquier error debe ser alertado inmediatamente

### Logs Estructurados

Considera agregar logging estructurado (JSON) para producción:

```typescript
console.log(JSON.stringify({
  job: 'cleanup-payments',
  timestamp: new Date().toISOString(),
  bookingsCleaned: result.bookingsCleaned,
  ordersCleaned: result.ordersCleaned,
  duration: result.duration
}));
```

## Siguientes Pasos

### Mejoras Recomendadas

1. **Métricas en Prometheus/Grafana**
   - Cantidad de items limpiados
   - Duración de ejecución
   - Tasa de errores

2. **Alertas**
   - Slack/Discord cuando hay >50 items limpiados
   - Email cuando el job falla

3. **Dashboard de Monitoreo**
   - Gráficas de tendencias
   - Estado de salud del job

4. **Notificaciones a Usuarios**
   - Email cuando su booking/orden es cancelado
   - Incluir razón y opción de reintentar

## Recursos

- [Documentación Completa](./docs/CLEANUP_JOBS.md)
- [Implementación de Optimistic Locking](./OPTIMISTIC_LOCKING_IMPLEMENTATION.md)
- [Arquitectura de Pagos](./PAYMENT_FLOW_ARCHITECTURE.md)
- [node-cron GitHub](https://github.com/node-cron/node-cron)

## 🏗️ Arquitectura del Sistema

```
┌────────────────────────────────────────────────────────────────┐
│                    Backend Server (Fastify)                     │
│                                                                 │
│  ┌──────────────┐                                              │
│  │  index.ts    │  ← Punto de entrada                          │
│  │              │                                              │
│  │  startCronScheduler()  ← Línea 12 (YA ACTIVO)              │
│  └──────┬───────┘                                              │
│         │                                                       │
│         v                                                       │
│  ┌──────────────────────┐                                      │
│  │ scheduler.cron.ts    │                                      │
│  │                      │                                      │
│  │ • node-cron scheduler│                                      │
│  │ • Cron: */15 * * * * │  ← Cada 15 minutos                  │
│  │ • Timeout: 30 min    │                                      │
│  └──────┬───────────────┘                                      │
│         │                                                       │
│         │  cron.schedule()                                     │
│         v                                                       │
│  ┌────────────────────────────┐                                │
│  │ cleanup-payments.job.ts    │                                │
│  │                            │                                │
│  │ runCleanupJob()            │                                │
│  │ ├─ bookingService.cleanup()│                                │
│  │ └─ marketplace.cleanup()   │                                │
│  └────┬──────────────┬────────┘                                │
│       │              │                                         │
│       v              v                                         │
│  ┌──────────┐   ┌──────────────┐                              │
│  │ Booking  │   │ Marketplace  │                              │
│  │ Service  │   │  Service     │                              │
│  │          │   │              │                              │
│  │ cleanup  │   │  cleanup     │                              │
│  │ Failed   │   │  Failed      │                              │
│  │ Bookings │   │  Orders      │                              │
│  └────┬─────┘   └──────┬───────┘                              │
│       │                │                                       │
│       │  Transaction   │  Transaction + Optimistic Locking    │
│       v                v                                       │
│  ┌──────────────────────────────────┐                          │
│  │      PostgreSQL Database         │                          │
│  │                                  │                          │
│  │  ┌──────────┐   ┌─────────────┐ │                          │
│  │  │ Booking  │   │    Order    │ │                          │
│  │  │ PENDING  │   │   PENDING   │ │                          │
│  │  │  → CANC  │   │   → CANC    │ │                          │
│  │  └──────────┘   └─────────────┘ │                          │
│  │                                  │                          │
│  │  ┌──────────┐   ┌─────────────┐ │                          │
│  │  │TimeSlot  │   │   Product   │ │                          │
│  │  │booked--  │   │   stock++   │ │                          │
│  │  └──────────┘   └─────────────┘ │                          │
│  └──────────────────────────────────┘                          │
└────────────────────────────────────────────────────────────────┘
```

## 🧪 Cómo Verificar que Está Funcionando

### Opción 1: Verificación en Logs del Servidor

1. Inicia el servidor:
```bash
cd backend
npm run dev
```

2. Busca este mensaje al inicio:
```
╔═══════════════════════════════════════════════════════════╗
║  Cron Scheduler Started                                   ║
╚═══════════════════════════════════════════════════════════╝
  Scheduled Jobs:
  • Payment Cleanup: Every 15 minutes (*/15 * * * *)
    - Timeout: 30 minutes
    - Actions: Restore inventory, cancel failed payments

[Cron Scheduler] Running initial cleanup job...
[Cron Scheduler] ✓ Initial cleanup completed
  - Bookings cleaned: 0
  - Orders cleaned: 0
```

3. Cada 15 minutos verás:
```
[Cron Scheduler 2026-01-25T16:00:00.000Z] Running cleanup job...
┌─────────────────────────────────────────────────────────┐
│ Cleanup Job Started: 16:00:00                           │
└─────────────────────────────────────────────────────────┘
[Cleanup Job] Checking failed bookings (timeout: 30min)...
  • No failed bookings found
[Cleanup Job] Checking failed orders (timeout: 30min)...
  • No failed orders found
┌─────────────────────────────────────────────────────────┐
│ Cleanup Job Completed                                   │
│ Total items cleaned: 0                                  │
│ Duration: 42ms                                          │
└─────────────────────────────────────────────────────────┘
```

### Opción 2: Ejecución Manual

Ejecuta el job inmediatamente sin esperar:

```bash
cd backend
npx tsx src/jobs/cleanup-payments.job.ts
```

### Opción 3: Verificación en Base de Datos

Si hay datos antiguos, serán limpiados. Verifica con:

```sql
-- Ver bookings que serían limpiados
SELECT
  id,
  status,
  "createdAt",
  "guestCount",
  NOW() - "createdAt" as age
FROM "Booking"
WHERE status IN ('PENDING_PAYMENT', 'PAYMENT_FAILED')
  AND "createdAt" < NOW() - INTERVAL '30 minutes';

-- Ver órdenes que serían limpiadas
SELECT
  id,
  status,
  "createdAt",
  total,
  NOW() - "createdAt" as age
FROM "Order"
WHERE status IN ('PENDING_PAYMENT', 'PAYMENT_FAILED')
  AND "createdAt" < NOW() - INTERVAL '30 minutes';
```

### Opción 4: Métricas Prometheus

Si el servidor está corriendo, accede a:

```bash
curl http://localhost:3001/api/metrics | grep cleanup
```

Verás métricas como:
```
# HELP cleanup_jobs_executed_total Total cleanup jobs executed
# TYPE cleanup_jobs_executed_total counter
cleanup_jobs_executed_total{status="success"} 42

# HELP cleanup_items_total Total items cleaned up
# TYPE cleanup_items_total counter
cleanup_items_total{type="booking"} 15
cleanup_items_total{type="order"} 8

# HELP cleanup_job_duration_seconds Time spent in cleanup job
# TYPE cleanup_job_duration_seconds histogram
cleanup_job_duration_seconds_bucket{le="0.1"} 38
cleanup_job_duration_seconds_bucket{le="0.5"} 42
```

## 🎯 Checklist de Activación Completa

- [x] ✅ Dependencias instaladas (`node-cron`, `@types/node-cron`, `prom-client`)
- [x] ✅ Scheduler registrado en `index.ts` (línea 12)
- [x] ✅ `scheduler.cron.ts` configurado (cada 15 minutos)
- [x] ✅ `cleanup-payments.job.ts` implementado
- [x] ✅ `bookingService.cleanupFailedBookings()` implementado (línea 830)
- [x] ✅ `marketplaceService.cleanupFailedOrders()` implementado (línea 674)
- [x] ✅ Optimistic locking en productos (evita race conditions)
- [x] ✅ Transacciones atómicas (garantiza consistencia)
- [x] ✅ Retry logic en órdenes (3 intentos)
- [x] ✅ Logging detallado y visual
- [x] ✅ Métricas Prometheus integradas
- [x] ✅ Manejo de shutdown graceful

## 🚀 Comandos Útiles

```bash
# Iniciar servidor (jobs se activan automáticamente)
npm run dev

# Ejecutar job manualmente (testing)
npx tsx src/jobs/cleanup-payments.job.ts

# Ver métricas
curl http://localhost:3001/api/metrics | grep cleanup

# Ver logs en tiempo real (si usas PM2)
pm2 logs backend --lines 100 | grep -i cleanup
```

## 🔍 Troubleshooting

### Problema: No veo logs del scheduler

**Solución:** Verifica que el servidor se inició correctamente. Busca la línea:
```
Cron Scheduler Started
```

### Problema: El job falla con error de base de datos

**Solución:** Verifica que PostgreSQL esté corriendo y que `DATABASE_URL` sea correcta:
```bash
docker-compose up -d postgres
# O si usas otro setup
psql $DATABASE_URL -c "SELECT 1"
```

### Problema: Los bookings/órdenes no se cancelan

**Solución:** Verifica que tengan más de 30 minutos de antigüedad:
```sql
SELECT id, status, createdAt, NOW() - createdAt as age
FROM "Booking"
WHERE status = 'PENDING_PAYMENT';
```

### Problema: Error de optimistic locking en órdenes

**Solución:** Esto es normal en alta concurrencia. El sistema reintenta automáticamente hasta 3 veces.

## 📊 Monitoreo en Producción

### Métricas Recomendadas

| Métrica | Alerta Si | Acción |
|---------|-----------|--------|
| `cleanup_items_total` > 100/día | Investigar flujo de pago | Revisar tasa de fallos de Stripe |
| `cleanup_job_duration_seconds` > 5s | Optimizar queries | Agregar índices en BD |
| `cleanup_jobs_executed_total{status="failed"}` > 0 | Alerta inmediata | Revisar logs y BD |

### Dashboard Grafana (Sugerido)

```promql
# Total items limpiados por hora
rate(cleanup_items_total[1h])

# Tasa de éxito del job
rate(cleanup_jobs_executed_total{status="success"}[5m])
/ rate(cleanup_jobs_executed_total[5m])

# Duración p95 del job
histogram_quantile(0.95, cleanup_job_duration_seconds_bucket)
```

## Soporte

Si encuentras problemas:

1. **Revisar logs del servidor** - Busca `[Cron Scheduler]` o `[Cleanup Job]`
2. **Ejecutar job manualmente** - `npx tsx src/jobs/cleanup-payments.job.ts`
3. **Verificar estado de BD** - Queries SQL arriba
4. **Consultar documentación** - `docs/CLEANUP_JOBS.md`
5. **Revisar métricas** - `curl http://localhost:3001/api/metrics`

## 📚 Documentación Relacionada

- [Documentación Detallada](./docs/CLEANUP_JOBS.md)
- [Optimistic Locking](./OPTIMISTIC_LOCKING_IMPLEMENTATION.md)
- [Arquitectura de Pagos](./PAYMENT_FLOW_ARCHITECTURE.md)
- [node-cron Docs](https://github.com/node-cron/node-cron)
- [Prometheus Metrics](./docs/MONITORING.md)

---

**Última actualización**: 2026-01-25
**Estado**: ✅ **ACTIVADO Y FUNCIONANDO**
**Siguiente revisión**: Verificar métricas semanalmente
