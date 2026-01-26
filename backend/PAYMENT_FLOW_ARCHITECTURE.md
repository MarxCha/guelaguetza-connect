# Arquitectura de Flujo de Pagos

## Problema Resuelto

Anteriormente, las llamadas a Stripe se realizaban **dentro** de las transacciones de base de datos, lo cual causaba:

1. **Timeouts de transacción**: Si Stripe es lento, la transacción DB puede hacer timeout
2. **Payment intents huérfanos**: Si la transacción falla después de crear el payment intent, quedan registros en Stripe sin booking/orden asociada
3. **Estados inconsistentes**: Rollback de DB con pagos creados en Stripe
4. **Bloqueos prolongados**: Transacciones manteniendo locks mientras esperan respuestas HTTP externas

## Solución: Flujo en 3 Fases

### Fase 1: Validación y Reserva en BD
- Validar disponibilidad (slots, stock)
- Crear booking/orden en estado `PENDING_PAYMENT`
- Reservar inventario (decrementar capacidad/stock) con **optimistic locking**
- Todo en una transacción atómica y rápida

### Fase 2: Llamada a Stripe (Fuera de Transacción)
- Crear payment intent en Stripe
- Si falla: marcar booking/orden como `PAYMENT_FAILED`
- No se restaura inventario inmediatamente (permite reintentos)

### Fase 3: Actualización Final
- Actualizar booking/orden con `stripePaymentId`
- Cambiar estado a `PENDING` (listo para pago)

## Diagrama de Flujo

```
┌─────────────────────────────────────────────────────────────┐
│ FASE 1: Transacción DB (< 100ms)                            │
├─────────────────────────────────────────────────────────────┤
│ 1. Validar disponibilidad                                   │
│ 2. Crear booking/orden (status: PENDING_PAYMENT)            │
│ 3. Reservar inventario (optimistic locking)                 │
│ 4. COMMIT                                                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 2: Stripe API (1-3s)                                   │
├─────────────────────────────────────────────────────────────┤
│ 5. Crear Payment Intent                                     │
│    ├─ Success → continuar                                   │
│    └─ Error → marcar PAYMENT_FAILED, lanzar error           │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ FASE 3: Actualización (< 50ms)                              │
├─────────────────────────────────────────────────────────────┤
│ 6. Actualizar con stripePaymentId                           │
│ 7. Cambiar estado a PENDING                                 │
└─────────────────────────────────────────────────────────────┘
```

## Estados del Sistema

### BookingStatus
```typescript
enum BookingStatus {
  PENDING_PAYMENT  // Inventario reservado, esperando creación de payment intent
  PENDING          // Payment intent creado, esperando confirmación de pago
  PAYMENT_FAILED   // Error al crear payment intent
  CONFIRMED        // Pago confirmado
  CANCELLED        // Cancelado por usuario/host
  COMPLETED        // Experiencia completada
}
```

### OrderStatus
```typescript
enum OrderStatus {
  PENDING_PAYMENT  // Stock reservado, esperando creación de payment intent
  PENDING          // Payment intent creado, esperando confirmación de pago
  PAYMENT_FAILED   // Error al crear payment intent
  PAID             // Pago confirmado
  PROCESSING       // Orden siendo preparada
  SHIPPED          // Orden enviada
  DELIVERED        // Orden entregada
  CANCELLED        // Orden cancelada
  REFUNDED         // Pago reembolsado
}
```

## Transición de Estados

### Booking Flow
```
PENDING_PAYMENT → PENDING → CONFIRMED → COMPLETED
       │             │
       │             └─→ CANCELLED
       │
       └─→ PAYMENT_FAILED → (retry) → PENDING
```

### Order Flow
```
PENDING_PAYMENT → PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
       │             │        │
       │             │        └─→ REFUNDED
       │             └─→ CANCELLED
       │
       └─→ PAYMENT_FAILED → (retry) → PENDING
```

## Manejo de Errores

### Error en Fase 1 (Validación/BD)
- **Rollback automático** de transacción
- Inventario no se reserva
- Usuario recibe error inmediato

### Error en Fase 2 (Stripe)
- Inventario **YA ESTÁ RESERVADO**
- Booking/orden marcado como `PAYMENT_FAILED`
- Error propagado al usuario
- Usuario puede reintentar sin perder su reserva (por un tiempo limitado)

### Error en Fase 3 (Actualización)
- **Muy improbable** (operación simple)
- Si falla: payment intent creado pero no vinculado
- Webhook de Stripe puede reconciliar usando metadata

## Limpieza de Registros Fallidos

### Método: `cleanupFailedBookings()` / `cleanupFailedOrders()`

Limpia automáticamente registros en estado `PENDING_PAYMENT` o `PAYMENT_FAILED` que han superado un timeout (por defecto 30 minutos).

**Acciones:**
1. Restaurar inventario (capacidad de slots / stock de productos)
2. Marcar como `CANCELLED`

**Ejecución recomendada:**
- Cron job cada 15 minutos
- Job scheduler (Bull, Agenda, etc.)

```typescript
// Ejemplo de cron job
import { bookingService } from './services/booking.service';
import { marketplaceService } from './services/marketplace.service';

// Ejecutar cada 15 minutos
setInterval(async () => {
  await bookingService.cleanupFailedBookings(30);
  await marketplaceService.cleanupFailedOrders(30);
}, 15 * 60 * 1000);
```

## Ventajas de esta Arquitectura

### 1. Transacciones Rápidas
- Las transacciones DB solo contienen operaciones de BD
- Duración típica: < 100ms
- Reduce contención y bloqueos

### 2. Idempotencia
- Crear payment intent es idempotente (Stripe usa idempotency keys)
- Si falla la actualización, webhook puede reconciliar

### 3. Mejor UX
- Usuario recibe feedback inmediato sobre disponibilidad
- Inventario reservado durante el proceso de pago
- Puede reintentar pago sin perder su reserva

### 4. Auditabilidad
- Cada estado tiene significado claro
- Fácil identificar dónde falló el proceso
- Logs detallados de cada fase

### 5. Recuperación Automática
- Cleanup jobs restauran inventario de registros abandonados
- No requiere intervención manual

## Consideraciones de Implementación

### Optimistic Locking
- Usado en actualización de slots/stock
- Previene race conditions en inventario
- Retry automático si hay conflicto

### Retry Logic
```typescript
withRetry(
  async () => {
    // Operación con optimistic locking
  },
  { maxRetries: 3, retryDelay: 100 }
);
```

### Metadata en Stripe
```typescript
{
  bookingId: string,      // Para vincular payment intent con booking
  experienceId: string,   // Para auditoría
  timeSlotId: string,     // Para restaurar capacidad si es necesario
  userId: string,         // Para soporte
  guestCount: string      // Para verificación
}
```

### Webhooks de Stripe
Los webhooks deben manejar:
- `payment_intent.succeeded` → Confirmar booking/orden
- `payment_intent.payment_failed` → Marcar como `PAYMENT_FAILED`
- `charge.refunded` → Procesar reembolso

## Migración

### Base de Datos
```sql
-- Agregar nuevos estados a enums
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_FAILED';

ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_FAILED';
```

### Código Existente
1. Actualizar validaciones de estado en endpoints
2. Agregar manejo de nuevos estados en UI
3. Implementar cleanup job
4. Configurar webhooks de Stripe

## Testing

### Unit Tests
```typescript
describe('createBooking', () => {
  it('should create booking in PENDING_PAYMENT state', async () => {
    // Mock Stripe para que falle
    const result = await bookingService.createBooking(userId, data);
    expect(result.booking.status).toBe('PAYMENT_FAILED');
  });

  it('should rollback slot reservation if validation fails', async () => {
    // Validar que el slot no se reserva si falla early
  });
});
```

### Integration Tests
```typescript
describe('Payment Flow', () => {
  it('should complete full payment flow', async () => {
    // 1. Crear booking
    // 2. Simular pago exitoso via webhook
    // 3. Verificar estado CONFIRMED
  });

  it('should cleanup failed bookings after timeout', async () => {
    // 1. Crear booking que falla
    // 2. Avanzar tiempo 31 minutos
    // 3. Ejecutar cleanup
    // 4. Verificar slot restaurado
  });
});
```

## Monitoreo

### Métricas Clave
- Tasa de `PAYMENT_FAILED` (debe ser < 1%)
- Tiempo promedio en cada fase
- Cantidad de registros limpiados por cleanup jobs
- Discrepancias entre Stripe y BD

### Alertas
- Alta tasa de `PAYMENT_FAILED` (problema con Stripe)
- Transacciones DB > 500ms (problema de performance)
- Muchos registros en cleanup (usuarios abandonando proceso)

## Referencias

- [Stripe Best Practices](https://stripe.com/docs/payments/payment-intents)
- [Database Transaction Patterns](https://martinfowler.com/articles/patterns-of-distributed-systems/)
- [Optimistic Locking](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
