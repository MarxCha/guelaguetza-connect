# Ejemplo de Flujo de Eventos - End to End

Este documento ilustra el flujo completo de eventos desde que un usuario crea una booking hasta que recibe notificaciones, XP, y badges.

---

## Caso de Uso: Usuario Completa su Primera Booking

### Contexto
- Usuario: Juan Pérez (ID: user-123)
- Experiencia: "Tour de Oaxaca" (ID: exp-456)
- Host: María López (ID: host-789)
- Estado inicial: Usuario tiene 0 XP, nivel 1, sin badges

---

## Flujo Paso a Paso

### 1️⃣ Usuario Crea Booking

**Request:**
```http
POST /api/bookings
Authorization: Bearer <token>

{
  "experienceId": "exp-456",
  "timeSlotId": "slot-111",
  "guestCount": 2,
  "specialRequests": "Vegetariano"
}
```

**En BookingService.createBooking():**

```typescript
// 1. Validar y crear booking en BD
const booking = await prisma.$transaction(async (tx) => {
  // Actualizar slot con optimistic locking
  await updateTimeSlotWithLocking(tx, timeSlotId, currentVersion, {
    bookedCount: { increment: 2 },
  });

  // Crear booking en estado PENDING_PAYMENT
  return tx.booking.create({
    data: {
      userId: 'user-123',
      experienceId: 'exp-456',
      timeSlotId: 'slot-111',
      guestCount: 2,
      totalPrice: 1000,
      status: 'PENDING_PAYMENT',
    },
  });
});

// 2. Crear payment intent en Stripe
const payment = await stripeService.createPaymentIntent({
  amount: 100000, // $1000 en centavos
  description: 'Reservación: Tour de Oaxaca',
  metadata: { bookingId: booking.id },
});

// 3. Actualizar booking con payment ID
await prisma.booking.update({
  where: { id: booking.id },
  data: {
    stripePaymentId: payment.paymentIntentId,
    status: 'PENDING',
  },
});

// 4. EMITIR EVENTO BOOKING_CREATED
if (this.eventBus) {
  const event = createEvent(EventTypes.BOOKING_CREATED, {
    bookingId: booking.id,
    userId: 'user-123',
    userName: 'Juan Pérez',
    experienceId: 'exp-456',
    experienceTitle: 'Tour de Oaxaca',
    hostId: 'host-789',
    hostName: 'María',
    guestCount: 2,
    totalPrice: 1000,
    timeSlot: {
      date: '2024-12-01',
      startTime: '10:00',
      endTime: '12:00',
    },
  });

  // Fire-and-forget (no bloquea el response)
  this.eventBus.emitAsync(event);
}

return { booking, clientSecret: payment.clientSecret };
```

**EventBus procesa el evento:**

```
[EventBus] Async event queued: booking.created
[EventBus] Emitting event: booking.created { correlationId: 'req-abc-123', handlerCount: 2 }
[EventBus] Handler completed: NotificationHandler.onBookingCreated
[EventBus] Handler completed: AnalyticsHandler.onBookingCreated
[EventBus] Event processing completed: booking.created { duration: '15ms', success: 2, failed: 0 }
```

**NotificationHandler crea notificación para el host:**

```sql
INSERT INTO "Notification" (
  "userId",
  "type",
  "title",
  "body",
  "data"
) VALUES (
  'host-789',
  'SYSTEM',
  'Nueva reservación',
  'Juan Pérez reservó 2 lugar(es) para "Tour de Oaxaca" el 2024-12-01',
  '{"bookingId":"booking-123","type":"booking_created"}'::jsonb
);
```

**AnalyticsHandler registra actividad:**

```sql
INSERT INTO "ActivityLog" (
  "userId",
  "action",
  "targetType",
  "targetId",
  "metadata"
) VALUES (
  'user-123',
  'CREATE_BOOKING',
  'BOOKING',
  'booking-123',
  '{"experienceId":"exp-456","guestCount":2,"totalPrice":1000}'::jsonb
);
```

**Response al cliente:**
```json
{
  "booking": { "id": "booking-123", "status": "PENDING" },
  "clientSecret": "pi_xxx_secret_yyy"
}
```

---

### 2️⃣ Usuario Confirma Pago

**Request:**
```http
POST /api/bookings/booking-123/confirm
Authorization: Bearer <token>
```

**En BookingService.confirmBooking():**

```typescript
// 1. Verificar pago en Stripe
const status = await stripeService.getPaymentStatus(booking.stripePaymentId);
if (status !== 'succeeded') {
  throw new AppError('El pago no ha sido completado', 400);
}

// 2. Actualizar booking
const confirmed = await prisma.booking.update({
  where: { id: 'booking-123' },
  data: {
    status: 'CONFIRMED',
    confirmedAt: new Date(),
  },
});

// 3. EMITIR EVENTO BOOKING_CONFIRMED
if (this.eventBus) {
  const event = createEvent(EventTypes.BOOKING_CONFIRMED, {
    bookingId: 'booking-123',
    userId: 'user-123',
    userName: 'Juan Pérez',
    experienceId: 'exp-456',
    experienceTitle: 'Tour de Oaxaca',
    hostId: 'host-789',
    guestCount: 2,
    totalPrice: 1000,
    timeSlot: {
      date: '2024-12-01',
      startTime: '10:00',
    },
  });

  this.eventBus.emitAsync(event);
}
```

**NotificationHandler crea 2 notificaciones:**

Para el usuario:
```sql
INSERT INTO "Notification" VALUES (
  'user-123',
  'SYSTEM',
  'Reservación confirmada',
  'Tu reservación para "Tour de Oaxaca" el 2024-12-01 a las 10:00 ha sido confirmada',
  '{"bookingId":"booking-123","type":"booking_confirmed"}'::jsonb
);
```

Para el host:
```sql
INSERT INTO "Notification" VALUES (
  'host-789',
  'SYSTEM',
  'Reservación confirmada',
  'Juan Pérez confirmó su reservación para "Tour de Oaxaca"',
  '{"bookingId":"booking-123","type":"booking_confirmed_host"}'::jsonb
);
```

---

### 3️⃣ Host Completa la Booking

**Request:**
```http
POST /api/bookings/booking-123/complete
Authorization: Bearer <host-token>
```

**En BookingService.completeBooking():**

```typescript
// 1. Verificar permisos
if (booking.experience.hostId !== hostId) {
  throw new AppError('No tienes permiso', 403);
}

// 2. Actualizar booking
const completed = await prisma.booking.update({
  where: { id: 'booking-123' },
  data: { status: 'COMPLETED' },
});

// 3. EMITIR EVENTO BOOKING_COMPLETED
if (this.eventBus) {
  const event = createEvent(EventTypes.BOOKING_COMPLETED, {
    bookingId: 'booking-123',
    userId: 'user-123',
    userName: 'Juan Pérez',
    experienceId: 'exp-456',
    experienceTitle: 'Tour de Oaxaca',
    hostId: 'host-789',
    totalPrice: 1000,
    guestCount: 2,
  });

  this.eventBus.emitAsync(event);
}
```

**EventBus procesa el evento:**

```
[EventBus] Emitting event: booking.completed { correlationId: 'req-xyz-789' }
[EventBus] Handler completed: NotificationHandler.onBookingCompleted
[EventBus] Handler completed: GamificationHandler.onBookingCompleted
[EventBus] Handler completed: AnalyticsHandler.onBookingCompleted
```

**GamificationHandler otorga XP:**

```typescript
// En GamificationHandler.onBookingCompleted()
await this.awardXP(
  'user-123',
  50, // XP_REWARDS.COMPLETE_BOOKING
  'COMPLETE_BOOKING',
  'BOOKING',
  'booking-123'
);
```

**Base de datos - UserStats actualizado:**

```sql
-- ANTES
UserStats { userId: 'user-123', xp: 0, level: 1 }

-- DESPUÉS
UPDATE "UserStats"
SET "xp" = 50, "level" = 1
WHERE "userId" = 'user-123';

-- RESULTADO
UserStats { userId: 'user-123', xp: 50, level: 1 }
```

**GamificationHandler emite evento secundario:**

```typescript
// EventBus emite XP_AWARDED
const xpEvent = createEvent(EventTypes.XP_AWARDED, {
  userId: 'user-123',
  amount: 50,
  action: 'COMPLETE_BOOKING',
  previousXP: 0,
  newXP: 50,
  previousLevel: 1,
  newLevel: 1,
});
this.eventBus.emitAsync(xpEvent);
```

**GamificationHandler verifica badges:**

```typescript
// En GamificationHandler.checkBookingBadges()
const completedCount = await prisma.booking.count({
  where: { userId: 'user-123', status: 'COMPLETED' }
});
// completedCount = 1

if (completedCount >= 1) {
  await this.unlockBadge('user-123', 'FIRST_BOOKING');
}
```

**Badge desbloqueado:**

```sql
-- Crear UserBadge
INSERT INTO "UserBadge" ("userId", "badgeId")
VALUES ('user-123', 'badge-first-booking-id');

-- Otorgar XP bonus del badge (+25 XP)
UPDATE "UserStats"
SET "xp" = 75
WHERE "userId" = 'user-123';
```

**GamificationHandler emite evento de badge:**

```typescript
const badgeEvent = createEvent(EventTypes.BADGE_UNLOCKED, {
  userId: 'user-123',
  badgeId: 'badge-first-booking-id',
  badgeCode: 'FIRST_BOOKING',
  badgeName: 'Primera Reservación',
  badgeDescription: 'Completaste tu primera reservación',
  badgeIcon: '🎉',
  xpReward: 25,
  unlockedAt: new Date(),
});
this.eventBus.emit(badgeEvent);
```

**NotificationHandler (escuchando BADGE_UNLOCKED):**

```sql
INSERT INTO "Notification" VALUES (
  'user-123',
  'BADGE_UNLOCKED',
  '¡Insignia desbloqueada: Primera Reservación!',
  'Completaste tu primera reservación (+25 XP)',
  '{"badgeId":"badge-first-booking-id","badgeCode":"FIRST_BOOKING"}'::jsonb
);
```

**NotificationHandler (BOOKING_COMPLETED):**

```sql
INSERT INTO "Notification" VALUES (
  'user-123',
  'SYSTEM',
  'Experiencia completada',
  '¡Esperamos que hayas disfrutado "Tour de Oaxaca"! ¿Qué te pareció?',
  '{"bookingId":"booking-123","action":"request_review"}'::jsonb
);
```

**AnalyticsHandler registra 2 actividades:**

```sql
-- Para el usuario
INSERT INTO "ActivityLog" VALUES (
  'user-123',
  'COMPLETE_BOOKING',
  'BOOKING',
  'booking-123',
  '{"experienceId":"exp-456","totalPrice":1000}'::jsonb
);

-- Para el host
INSERT INTO "ActivityLog" VALUES (
  'host-789',
  'HOST_COMPLETE_BOOKING',
  'BOOKING',
  'booking-123',
  '{"guestCount":2,"totalPrice":1000}'::jsonb
);
```

---

## Estado Final

### Usuario (user-123)

**UserStats:**
```json
{
  "userId": "user-123",
  "xp": 75,
  "level": 1,
  "currentStreak": 1,
  "longestStreak": 1
}
```

**Badges desbloqueados:**
```json
[
  {
    "code": "FIRST_BOOKING",
    "name": "Primera Reservación",
    "unlockedAt": "2024-12-01T15:00:00Z"
  }
]
```

**Notificaciones recibidas:**
1. "Reservación confirmada" (SYSTEM)
2. "Experiencia completada" (SYSTEM)
3. "¡Insignia desbloqueada: Primera Reservación!" (BADGE_UNLOCKED)

**Activity logs:**
1. CREATE_BOOKING
2. CONFIRM_BOOKING
3. COMPLETE_BOOKING
4. EARN_XP (x2: booking + badge)
5. UNLOCK_BADGE

### Host (host-789)

**Notificaciones recibidas:**
1. "Nueva reservación" (SYSTEM)
2. "Reservación confirmada" (SYSTEM)

**Activity logs:**
1. HOST_COMPLETE_BOOKING
2. RECEIVE_PAYMENT (de Stripe webhook)

---

## Eventos Emitidos (Total: 4)

```
1. BOOKING_CREATED
   ├─> NotificationHandler: Notifica al host
   └─> AnalyticsHandler: Registra CREATE_BOOKING

2. BOOKING_CONFIRMED
   ├─> NotificationHandler: Notifica a usuario y host
   └─> AnalyticsHandler: Registra CONFIRM_BOOKING

3. BOOKING_COMPLETED
   ├─> NotificationHandler: Notifica al usuario
   ├─> GamificationHandler: Otorga 50 XP + verifica badges
   │   ├─> Emite XP_AWARDED (evento secundario)
   │   └─> Emite BADGE_UNLOCKED (evento secundario)
   └─> AnalyticsHandler: Registra COMPLETE_BOOKING

4. BADGE_UNLOCKED (evento secundario)
   └─> NotificationHandler: Notifica badge desbloqueado
```

---

## Handlers Ejecutados

| Evento | Handlers | Duración | Resultado |
|--------|----------|----------|-----------|
| BOOKING_CREATED | 2 | 15ms | ✅ Success |
| BOOKING_CONFIRMED | 2 | 12ms | ✅ Success |
| BOOKING_COMPLETED | 3 | 45ms | ✅ Success |
| BADGE_UNLOCKED | 1 | 8ms | ✅ Success |

---

## Logs del EventBus

```
[EventBus] Async event queued: booking.created
[EventBus] Emitting event: booking.created { correlationId: 'req-1', handlerCount: 2 }
[EventBus] Handler completed: NotificationHandler.onBookingCreated
[EventBus] Handler completed: AnalyticsHandler.onBookingCreated
[EventBus] Event processing completed: booking.created { duration: '15ms', success: 2, failed: 0 }

[EventBus] Async event queued: booking.confirmed
[EventBus] Emitting event: booking.confirmed { correlationId: 'req-2', handlerCount: 2 }
[EventBus] Handler completed: NotificationHandler.onBookingConfirmed
[EventBus] Handler completed: AnalyticsHandler.onBookingConfirmed
[EventBus] Event processing completed: booking.confirmed { duration: '12ms', success: 2, failed: 0 }

[EventBus] Async event queued: booking.completed
[EventBus] Emitting event: booking.completed { correlationId: 'req-3', handlerCount: 3 }
[EventBus] Handler completed: NotificationHandler.onBookingCompleted
[EventBus] Handler completed: GamificationHandler.onBookingCompleted
[EventBus] Handler completed: AnalyticsHandler.onBookingCompleted
[EventBus] Event processing completed: booking.completed { duration: '45ms', success: 3, failed: 0 }

[EventBus] Async event queued: gamification.badge_unlocked
[EventBus] Emitting event: gamification.badge_unlocked { correlationId: 'req-3' }
[EventBus] Handler completed: NotificationHandler.onBadgeUnlocked
[EventBus] Event processing completed: gamification.badge_unlocked { duration: '8ms', success: 1, failed: 0 }
```

---

## Base de Datos - Resumen de Cambios

### Tablas afectadas:

1. **Booking**: 1 row creada, actualizada 2 veces (PENDING → CONFIRMED → COMPLETED)
2. **Notification**: 5 rows creadas (3 para user, 2 para host)
3. **UserStats**: 1 row actualizada (0 XP → 75 XP)
4. **UserBadge**: 1 row creada (FIRST_BOOKING)
5. **ActivityLog**: 6 rows creadas
6. **ExperienceTimeSlot**: 1 row actualizada (bookedCount incrementado)

---

## Performance

**Total de tiempo para completar el flujo:**
- Request 1 (crear booking): ~200ms
- Request 2 (confirmar): ~150ms
- Request 3 (completar): ~180ms

**Tiempo de procesamiento de eventos (asíncrono, no bloquea):**
- Total: ~80ms (en background)

**Impacto en latencia del usuario:** 0ms
- Todos los eventos se procesan con `emitAsync` (fire-and-forget)

---

## Ventajas Demostradas

1. **Desacoplamiento**: BookingService no sabe nada de notificaciones o gamificación
2. **Performance**: Eventos se procesan asíncronamente sin bloquear requests
3. **Robustez**: Si un handler falla, los demás continúan
4. **Observabilidad**: Logs detallados de cada paso
5. **Escalabilidad**: Fácil agregar nuevos handlers sin modificar servicios

---

**Ver también:**
- `EVENT_DRIVEN_ARCHITECTURE.md` - Documentación completa
- `MIGRATION_GUIDE_EVENTS.md` - Guía de migración
- `EVENT_ARCHITECTURE_SUMMARY.md` - Resumen de implementación
