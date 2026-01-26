# Optimistic Locking en Sistema de Reservaciones

## Descripción General

Este proyecto implementa **optimistic locking** (bloqueo optimista) para prevenir race conditions en las reservaciones concurrentes de experiencias. El bloqueo optimista es una estrategia de control de concurrencia que asume que múltiples transacciones pueden completarse sin afectarse entre sí, pero verifica conflictos antes de confirmar los cambios.

## Problema que Resuelve

### Race Condition sin Locking

Imagina dos usuarios (A y B) intentando reservar los últimos 2 espacios de una experiencia simultáneamente:

```
Time | User A Thread                    | User B Thread                    | DB State (bookedCount)
-----|----------------------------------|----------------------------------|------------------------
t0   | Lee slot: capacity=10, booked=8  |                                  | 8
t1   |                                  | Lee slot: capacity=10, booked=8  | 8
t2   | Calcula: 8 + 2 = 10 ✓           |                                  | 8
t3   |                                  | Calcula: 8 + 2 = 10 ✓           | 8
t4   | Actualiza: booked = 10           |                                  | 10
t5   |                                  | Actualiza: booked = 10           | 10 (DEBERÍA SER 12!)
```

**Resultado:** Ambos usuarios confirman su reserva, pero la cuenta final es incorrecta. Hay overbooking.

### Con Optimistic Locking

```
Time | User A Thread                          | User B Thread                          | DB State (booked, version)
-----|----------------------------------------|----------------------------------------|----------------------------
t0   | Lee slot: booked=8, version=1          |                                        | (8, 1)
t1   |                                        | Lee slot: booked=8, version=1          | (8, 1)
t2   | UPDATE WHERE version=1                 |                                        | (10, 2) ✓
     | SET booked=10, version=2               |                                        |
t3   |                                        | UPDATE WHERE version=1                 | (10, 2)
     |                                        | SET booked=10, version=2               | CONFLICTO! ❌
t4   |                                        | Detecta conflicto → Retry              | (10, 2)
t5   |                                        | Lee slot: booked=10, version=2         | (10, 2)
t6   |                                        | Verifica disponibilidad: 10 + 2 > 10   | (10, 2)
     |                                        | Rechaza: No hay espacio ✓              |
```

**Resultado:** La segunda transacción detecta el conflicto, reintenta, y correctamente rechaza la reserva porque ya no hay espacio.

## Implementación

### 1. Campo `version` en ExperienceTimeSlot

```prisma
model ExperienceTimeSlot {
  id          String   @id @default(cuid())
  // ... otros campos
  bookedCount Int      @default(0)
  version     Int      @default(1)  // ← Campo de versión
  // ...
}
```

### 2. Actualización Condicional

En lugar de hacer:

```typescript
// ❌ NO SEGURO - Race condition posible
await prisma.experienceTimeSlot.update({
  where: { id: timeSlotId },
  data: { bookedCount: { increment: guestCount } }
});
```

Hacemos:

```typescript
// ✓ SEGURO - Con optimistic locking
const result = await prisma.experienceTimeSlot.updateMany({
  where: {
    id: timeSlotId,
    version: currentVersion  // ← Condición de versión
  },
  data: {
    bookedCount: { increment: guestCount },
    version: { increment: 1 }  // ← Incrementar versión
  }
});

if (result.count === 0) {
  throw new ConcurrencyError('Conflicto detectado');
}
```

### 3. Retry Automático

El sistema implementa retry con backoff exponencial:

```typescript
return withRetry(
  async () => {
    // Operación de reserva...
  },
  { maxRetries: 3, retryDelay: 100 }
);
```

**Backoff exponencial:**
- Intento 1: Sin delay
- Intento 2: 100ms delay
- Intento 3: 200ms delay
- Intento 4: 400ms delay

Esto reduce la contención entre threads y mejora las probabilidades de éxito.

## API de Utilidades

### `updateTimeSlotWithLocking()`

Actualiza un time slot con verificación de versión:

```typescript
import { updateTimeSlotWithLocking } from '../utils/optimistic-locking.js';

await updateTimeSlotWithLocking(
  prisma,
  timeSlotId,
  currentVersion,
  {
    bookedCount: { increment: guestCount },
    isAvailable: false
  }
);
```

**Parámetros:**
- `prisma`: Cliente de Prisma (o transacción)
- `timeSlotId`: ID del time slot
- `currentVersion`: Versión esperada
- `data`: Cambios a aplicar

**Lanza:** `ConcurrencyError` si la versión no coincide.

### `withRetry()`

Ejecuta una operación con retry automático:

```typescript
import { withRetry } from '../utils/optimistic-locking.js';

const result = await withRetry(
  async () => {
    // Tu operación aquí
    return await someAsyncOperation();
  },
  {
    maxRetries: 3,    // Número máximo de intentos
    retryDelay: 100   // Delay base en ms
  }
);
```

**Comportamiento:**
- Solo reintenta en `ConcurrencyError`
- Otros errores se propagan inmediatamente
- Usa backoff exponencial: `delay * 2^attempt`

### `getTimeSlotWithVersion()`

Obtiene un time slot y valida la versión:

```typescript
import { getTimeSlotWithVersion } from '../utils/optimistic-locking.js';

const timeSlot = await getTimeSlotWithVersion(
  prisma,
  timeSlotId,
  expectedVersion  // Opcional
);
```

## Flujo de Reservación

### 1. Crear Reservación

```typescript
async createBooking(userId: string, data: CreateBookingInput) {
  return withRetry(async () => {
    // 1. Leer estado actual
    const timeSlot = await prisma.experienceTimeSlot.findUnique({
      where: { id: timeSlotId }
    });

    // 2. Validar disponibilidad
    const availableSpots = timeSlot.capacity - timeSlot.bookedCount;
    if (guestCount > availableSpots) {
      throw new AppError('No hay suficientes espacios');
    }

    // 3. Guardar versión actual
    const currentVersion = timeSlot.version;

    // 4. Transacción con locking optimista
    return prisma.$transaction(async (tx) => {
      // Actualizar con verificación de versión
      await updateTimeSlotWithLocking(
        tx,
        timeSlotId,
        currentVersion,
        {
          bookedCount: { increment: guestCount },
          isAvailable: timeSlot.bookedCount + guestCount < timeSlot.capacity
        }
      );

      // Crear booking
      return tx.booking.create({ ... });
    });
  }, { maxRetries: 3, retryDelay: 100 });
}
```

### 2. Cancelar Reservación

```typescript
async cancelBooking(id: string, userId: string) {
  return withRetry(async () => {
    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { timeSlot: true }
    });

    // Guardar versión actual
    const currentVersion = booking.timeSlot.version;

    return prisma.$transaction(async (tx) => {
      // Restaurar capacidad con locking
      await updateTimeSlotWithLocking(
        tx,
        booking.timeSlotId,
        currentVersion,
        {
          bookedCount: { decrement: booking.guestCount },
          isAvailable: true
        }
      );

      // Actualizar estado de booking
      return tx.booking.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() }
      });
    });
  }, { maxRetries: 3, retryDelay: 100 });
}
```

## Manejo de Errores

### ConcurrencyError (409 Conflict)

Indica que otro proceso modificó el recurso:

```typescript
try {
  await bookingService.createBooking(userId, data);
} catch (error) {
  if (error instanceof ConcurrencyError) {
    // El usuario debería recargar e intentar nuevamente
    return res.status(409).json({
      error: 'El horario ha sido modificado. Por favor, recarga e intenta nuevamente.'
    });
  }
  throw error;
}
```

**En el cliente:**
1. Mostrar mensaje al usuario
2. Recargar datos actualizados
3. Permitir al usuario reintentar si desea

## Testing

### Test de Concurrencia

```typescript
it('should handle concurrent bookings correctly', async () => {
  const promises = [
    bookingService.createBooking(user1, data),
    bookingService.createBooking(user2, data),
    bookingService.createBooking(user3, data)
  ];

  const results = await Promise.all(promises);

  // Verificar que todos tuvieron éxito
  expect(results.every(r => r.booking !== undefined)).toBe(true);

  // Verificar que el contador final es correcto
  const finalSlot = await prisma.experienceTimeSlot.findUnique({
    where: { id: timeSlotId }
  });
  expect(finalSlot.bookedCount).toBe(6); // 2 + 2 + 2
});
```

### Test de Prevención de Overbooking

```typescript
it('should prevent overbooking', async () => {
  // Slot con capacidad de 5
  const promises = [
    bookingService.createBooking(user1, { guestCount: 3 }),
    bookingService.createBooking(user2, { guestCount: 3 })
  ];

  const results = await Promise.allSettled(promises);

  // Solo una debería tener éxito
  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  expect(successful).toHaveLength(1);
  expect(failed).toHaveLength(1);

  // Verificar que no hubo overbooking
  const finalSlot = await prisma.experienceTimeSlot.findUnique({
    where: { id: timeSlotId }
  });
  expect(finalSlot.bookedCount).toBeLessThanOrEqual(5);
});
```

## Mejores Prácticas

### ✓ DO

1. **Usar dentro de transacciones** para garantizar atomicidad
2. **Guardar la versión antes de la transacción** para evitar lecturas inconsistentes
3. **Validar lógica de negocio antes de actualizar** para evitar retries innecesarios
4. **Usar `withRetry`** para operaciones críticas que puedan tener conflictos
5. **Manejar `ConcurrencyError` explícitamente** en tu código de presentación

### ✗ DON'T

1. **No usar `update()` sin verificación de versión** en operaciones concurrentes
2. **No ignorar `ConcurrencyError`** - siempre manejarlo apropiadamente
3. **No hacer retry infinito** - limitar el número de intentos
4. **No leer la versión dentro de la transacción** si ya la leíste antes
5. **No usar para todos los modelos** - solo para recursos con alta contención

## Monitoreo

### Métricas Importantes

1. **Tasa de conflictos:** Porcentaje de operaciones que requieren retry
2. **Número de retries por operación:** Promedio de intentos antes de éxito
3. **Tasa de fallo después de retries:** Operaciones que fallan incluso con retry

### Logging

```typescript
try {
  return await updateTimeSlotWithLocking(...);
} catch (error) {
  if (error instanceof ConcurrencyError) {
    logger.warn('Concurrency conflict detected', {
      timeSlotId,
      currentVersion,
      operation: 'createBooking'
    });
  }
  throw error;
}
```

## Migración

La migración ya fue creada:

```bash
# Aplicar migración
npx prisma migrate deploy

# En desarrollo
npx prisma migrate dev
```

**Archivo:** `prisma/migrations/20260125074152_add_optimistic_locking_to_time_slots/migration.sql`

```sql
ALTER TABLE "ExperienceTimeSlot" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
```

## Referencias

- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [Optimistic Locking Pattern](https://en.wikipedia.org/wiki/Optimistic_concurrency_control)
- [Database Concurrency Control](https://www.postgresql.org/docs/current/mvcc.html)

## Soporte

Para preguntas o problemas relacionados con el locking optimista, consulta:

- `/src/utils/optimistic-locking.ts` - Implementación
- `/test/integration/booking-concurrency.test.ts` - Tests de integración
- `/test/unit/optimistic-locking.test.ts` - Tests unitarios
