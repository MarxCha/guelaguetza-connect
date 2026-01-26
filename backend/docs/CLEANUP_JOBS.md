# Sistema de Jobs de Limpieza de Pagos

## Descripción

Sistema automatizado que limpia bookings y órdenes con pagos fallidos o pendientes que han superado el tiempo límite de 30 minutos.

## Características

### Job de Limpieza (`cleanup-payments.job.ts`)

Ejecuta automáticamente cada 15 minutos para:

1. **Limpiar Bookings Fallidos**
   - Busca bookings en estados: `PENDING_PAYMENT`, `PAYMENT_FAILED`
   - Timeout: 30 minutos desde creación
   - Acciones:
     - Restaura capacidad del slot (decrementa `bookedCount`)
     - Marca slot como disponible (`isAvailable = true`)
     - Actualiza booking a estado `CANCELLED`
     - Registra `cancelledAt` timestamp

2. **Limpiar Órdenes Fallidas**
   - Busca órdenes en estados: `PENDING_PAYMENT`, `PAYMENT_FAILED`
   - Timeout: 30 minutos desde creación
   - Acciones:
     - Restaura stock de productos (incrementa `stock`)
     - Actualiza orden a estado `CANCELLED`
     - Usa optimistic locking para evitar race conditions

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│  index.ts                                       │
│  └─ startCronScheduler()                        │
│     └─ Every 15 minutes                         │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│  scheduler.cron.ts                              │
│  └─ node-cron: '*/15 * * * *'                   │
│     └─ Ejecuta runCleanupJob()                  │
└─────────────┬───────────────────────────────────┘
              │
              ▼
┌─────────────────────────────────────────────────┐
│  cleanup-payments.job.ts                        │
│  └─ runCleanupJob()                             │
│     ├─ bookingService.cleanupFailedBookings()   │
│     └─ marketplaceService.cleanupFailedOrders() │
└─────────────────────────────────────────────────┘
```

## Configuración

### Variables de Entorno

No requiere variables adicionales. Usa la conexión a base de datos existente (`DATABASE_URL`).

### Configuración del Scheduler

En `src/jobs/scheduler.cron.ts`:

```typescript
// Intervalo: cada 15 minutos
const cleanupTask = cron.schedule('*/15 * * * *', async () => {
  await runCleanupJob();
});
```

### Timeout de Pagos

En `src/jobs/cleanup-payments.job.ts`:

```typescript
// Timeout en minutos para considerar un pago como fallido
const PAYMENT_TIMEOUT_MINUTES = 30;
```

## Logging

### Formato de Logs

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

### Información Registrada

- **Timestamp de ejecución**
- **Cantidad de bookings limpiados**
- **Cantidad de órdenes limpiadas**
- **Duración de la operación**
- **Detalles de cada item limpiado** (disponible en el objeto de retorno)

## Uso

### Activación Automática

El scheduler se inicia automáticamente con el servidor:

```bash
npm run dev   # Desarrollo
npm start     # Producción
```

### Ejecución Manual

Ejecutar el job una sola vez:

```bash
npx tsx src/jobs/cleanup-payments.job.ts
```

### Testing

Ejecutar el script de prueba:

```bash
npx tsx scripts/test-cleanup-job.ts
```

## Transacciones y Seguridad

### Optimistic Locking

- **Bookings**: Usa `version` en `ExperienceTimeSlot`
- **Orders**: Usa `version` en `Product`
- **Retry**: Hasta 3 intentos con backoff exponencial

### Transacciones Atómicas

Todas las operaciones de limpieza se ejecutan en transacciones Prisma:

```typescript
await prisma.$transaction(async (tx) => {
  // 1. Restaurar inventario (slots/stock)
  // 2. Cancelar bookings/orders
});
```

### Manejo de Errores

- **ConcurrencyError**: Reintento automático
- **Database Errors**: Log de error, no afecta otras operaciones
- **Partial Failures**: Continúa con el resto de items

## Monitoreo

### Métricas Disponibles

El job retorna las siguientes métricas:

```typescript
{
  success: boolean,
  bookingsCleaned: number,
  ordersCleaned: number,
  totalCleaned: number,
  duration: number, // milliseconds
  timestamp: string,
  details: Array<{
    // Información detallada de cada item
  }>
}
```

### Alertas Recomendadas

1. **Alta tasa de limpieza**: Si `totalCleaned > 50` por ejecución
   - Puede indicar problemas con el flujo de pago

2. **Jobs fallidos**: Si `success = false`
   - Revisar logs para errores de BD o conectividad

3. **Duración alta**: Si `duration > 5000ms`
   - Puede requerir optimización de queries

## Escalabilidad

### Para Alta Carga

Si el volumen de transacciones crece, considerar:

1. **Bull Queue** (Redis-backed)
   ```bash
   npm install bull @types/bull
   ```

2. **Agenda** (MongoDB-backed)
   ```bash
   npm install agenda
   ```

3. **Cloud Schedulers**
   - AWS EventBridge
   - Google Cloud Scheduler
   - Azure Functions Timer

### Batch Processing

Para volúmenes muy altos (>1000 items):

```typescript
// Procesar en lotes de 100
const BATCH_SIZE = 100;
for (let i = 0; i < failedBookings.length; i += BATCH_SIZE) {
  const batch = failedBookings.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
```

## Troubleshooting

### El job no se ejecuta

1. Verificar que `startCronScheduler()` está siendo llamado en `index.ts`
2. Revisar logs de inicio del servidor
3. Confirmar que node-cron está instalado: `npm list node-cron`

### Errores de concurrencia frecuentes

1. Aumentar `maxRetries` en `withRetry()`
2. Revisar si hay otros procesos modificando los mismos registros
3. Considerar incrementar el `retryDelay`

### Performance lenta

1. Agregar índices en BD:
   ```sql
   CREATE INDEX idx_booking_cleanup
   ON Booking(status, createdAt)
   WHERE status IN ('PENDING_PAYMENT', 'PAYMENT_FAILED');
   ```

2. Limitar cantidad de registros procesados por ejecución
3. Ejecutar job con más frecuencia pero menor ventana de tiempo

## Referencias

- [node-cron Documentation](https://github.com/node-cron/node-cron)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Optimistic Locking Pattern](../OPTIMISTIC_LOCKING_IMPLEMENTATION.md)
