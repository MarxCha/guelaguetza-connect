# Ejemplos de Uso - Arquitectura de Eventos

Este documento muestra ejemplos prácticos de cómo usar el sistema de eventos en Guelaguetza Connect.

## Ejemplo 1: Usuario Completa una Reservación

### Flujo Completo

```
Usuario → API → Service → EventBus → Handlers
```

### 1. Request del Usuario

```bash
POST /api/bookings/cm456abc/complete
Authorization: Bearer <token>
```

### 2. Service Emite Evento

```typescript
// src/services/booking.service.ts
async completeBooking(id: string, hostId: string) {
  // 1. Validar y actualizar en BD
  const updated = await this.prisma.booking.update({
    where: { id },
    data: { status: 'COMPLETED' },
    include: { experience: true, user: true },
  });

  // 2. Emitir evento (fire-and-forget, no bloquea)
  if (this.eventBus) {
    this.eventBus.emitAsync(
      createEvent(EventTypes.BOOKING_COMPLETED, {
        bookingId: id,
        userId: booking.userId,
        userName: 'Juan Pérez',
        experienceId: booking.experienceId,
        experienceTitle: 'Taller de Barro Negro',
        hostId,
        totalPrice: 500,
        guestCount: 2,
      })
    );
  }

  return updated; // Responde inmediatamente
}
```

### 3. EventBus Distribuye a Handlers

```
[EventBus] Emitting event: booking.completed {
  correlationId: '1706123456789-abc123',
  handlerCount: 3
}
```

### 4. NotificationHandler Actúa

```typescript
// src/infrastructure/events/handlers/NotificationHandler.ts
private async onBookingCompleted(event: DomainEvent<BookingCompletedPayload>) {
  await this.createNotification({
    userId: event.payload.userId, // Juan Pérez
    type: 'SYSTEM',
    title: 'Experiencia completada',
    body: '¡Esperamos que hayas disfrutado "Taller de Barro Negro"! ¿Qué te pareció?',
    data: {
      bookingId: event.payload.bookingId,
      experienceId: event.payload.experienceId,
      type: 'booking_completed',
      action: 'request_review',
    },
  });
}
```

**Resultado:**
```
Notification {
  userId: 'cm123user',
  title: 'Experiencia completada',
  body: '¡Esperamos que hayas disfrutado "Taller de Barro Negro"! ¿Qué te pareció?',
  read: false,
  createdAt: 2024-01-25T10:30:00Z
}
```

### 5. GamificationHandler Actúa

```typescript
// src/infrastructure/events/handlers/GamificationHandler.ts
private async onBookingCompleted(event: DomainEvent<BookingCompletedPayload>) {
  // Otorgar 50 XP
  await this.awardXP(
    event.payload.userId,
    50, // COMPLETE_BOOKING
    'COMPLETE_BOOKING',
    'BOOKING',
    event.payload.bookingId,
    event.correlationId
  );

  // Verificar badges
  await this.checkBookingBadges(event.payload.userId);
}
```

**Resultado:**
```
UserStats {
  userId: 'cm123user',
  xp: 150, // Era 100, ahora 150
  level: 2  // Subió de nivel!
}

Notification {
  userId: 'cm123user',
  type: 'LEVEL_UP',
  title: '¡Nivel 2!',
  body: '¡Felicidades! Has alcanzado el nivel 2. Siguiente nivel: 250 XP',
}

UserBadge {
  userId: 'cm123user',
  badgeId: 'cm789badge',
  badge: {
    code: 'FIRST_BOOKING',
    name: 'Primera Experiencia',
    description: 'Completaste tu primera experiencia cultural',
    icon: '🎉'
  }
}

Notification {
  userId: 'cm123user',
  type: 'BADGE_UNLOCKED',
  title: '¡Insignia desbloqueada: Primera Experiencia!',
  body: 'Completaste tu primera experiencia cultural (+25 XP)',
}
```

### 6. AnalyticsHandler Actúa

```typescript
// src/infrastructure/events/handlers/AnalyticsHandler.ts
private async onBookingCompleted(event: DomainEvent<BookingCompletedPayload>) {
  // Log para el usuario
  await this.logActivity({
    userId: event.payload.userId,
    action: 'COMPLETE_BOOKING',
    targetType: 'BOOKING',
    targetId: event.payload.bookingId,
    metadata: {
      experienceId: event.payload.experienceId,
      totalPrice: event.payload.totalPrice,
      correlationId: event.correlationId,
    },
  });

  // Log para el host
  await this.logActivity({
    userId: event.payload.hostId,
    action: 'HOST_COMPLETE_BOOKING',
    targetType: 'BOOKING',
    targetId: event.payload.bookingId,
    metadata: {
      experienceId: event.payload.experienceId,
      guestCount: event.payload.guestCount,
      totalPrice: event.payload.totalPrice,
      correlationId: event.correlationId,
    },
  });
}
```

**Resultado:**
```
ActivityLog {
  userId: 'cm123user',
  action: 'COMPLETE_BOOKING',
  targetType: 'BOOKING',
  targetId: 'cm456booking',
  metadata: {
    experienceId: 'cm789exp',
    totalPrice: 500,
    correlationId: '1706123456789-abc123'
  },
  timestamp: 2024-01-25T10:30:00Z
}

ActivityLog {
  userId: 'cm999host',
  action: 'HOST_COMPLETE_BOOKING',
  targetType: 'BOOKING',
  targetId: 'cm456booking',
  metadata: {
    experienceId: 'cm789exp',
    guestCount: 2,
    totalPrice: 500,
    correlationId: '1706123456789-abc123'
  },
  timestamp: 2024-01-25T10:30:01Z
}
```

### 7. Logs del EventBus

```
[EventBus] Emitting event: booking.completed {
  correlationId: '1706123456789-abc123',
  handlerCount: 3,
  userId: 'cm123user'
}

[EventBus DEBUG] Handler completed: NotificationHandler.onBookingCompleted
[EventBus DEBUG] Handler completed: GamificationHandler.onBookingCompleted
[EventBus DEBUG] Handler completed: AnalyticsHandler.onBookingCompleted

[EventBus] Event processing completed: booking.completed {
  correlationId: '1706123456789-abc123',
  duration: '45ms',
  success: 3,
  failed: 0
}

[EventBus] Emitting event: gamification.xp_awarded {
  correlationId: '1706123456789-abc123',
  handlerCount: 1,
  userId: 'cm123user'
}

[EventBus] Emitting event: gamification.level_up {
  correlationId: '1706123456789-abc123',
  handlerCount: 1,
  userId: 'cm123user'
}

[EventBus] Emitting event: gamification.badge_unlocked {
  correlationId: '1706123456789-abc123',
  handlerCount: 1,
  userId: 'cm123user'
}
```

### Resumen del Flujo

**Una sola operación (completar booking) desencadenó:**
- ✅ 1 actualización en BD (booking.status = COMPLETED)
- ✅ 3 notificaciones creadas (completada + level up + badge)
- ✅ 1 incremento de XP (50 XP)
- ✅ 1 subida de nivel (1 → 2)
- ✅ 1 badge desbloqueado (FIRST_BOOKING)
- ✅ 2 registros de actividad (usuario + host)
- ✅ 4 eventos emitidos (completed + xp_awarded + level_up + badge_unlocked)

**Todo esto sin que el usuario tenga que esperar:**
- Response time: ~50ms (solo la actualización de BD)
- Side effects: ejecutados de forma asíncrona
- Errores en handlers: no afectan la respuesta al usuario

---

## Ejemplo 2: Pago Exitoso via Webhook

### Flujo Webhook → Eventos

```
Stripe → Webhook → Service → EventBus → Handlers
```

### 1. Stripe Envía Webhook

```json
POST /api/webhooks/stripe
Stripe-Signature: t=1234567890,v1=abc123...

{
  "id": "evt_123",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_456",
      "amount": 50000,
      "metadata": {
        "bookingId": "cm789booking",
        "userId": "cm123user",
        "experienceId": "cm456exp"
      }
    }
  }
}
```

### 2. Webhook Handler Procesa

```typescript
// src/routes/webhooks.ts
async function handleBookingPaymentSucceeded(
  bookingId: string,
  paymentIntent: Stripe.PaymentIntent,
  fastify: any
) {
  // 1. Verificar idempotencia
  const booking = await fastify.prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (booking.status === 'CONFIRMED') {
    return; // Ya procesado
  }

  // 2. Confirmar en BD
  await fastify.prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    },
  });

  // 3. Emitir evento
  if (fastify.eventBus) {
    fastify.eventBus.emitAsync(
      createEvent(EventTypes.BOOKING_CONFIRMED, {
        bookingId,
        userId: booking.userId,
        userName: 'María López',
        experienceId: booking.experienceId,
        experienceTitle: 'Tour Mezcal',
        hostId: booking.experience.hostId,
        guestCount: 4,
        totalPrice: 500,
        timeSlot: {
          date: '2024-02-01',
          startTime: '10:00',
        },
      })
    );
  }
}
```

### 3. Handlers Procesan

**NotificationHandler:**
```typescript
// Notifica al usuario
Notification {
  userId: 'cm123user',
  title: 'Reservación confirmada',
  body: 'Tu reservación para "Tour Mezcal" el 2024-02-01 a las 10:00 ha sido confirmada',
}

// Notifica al host
Notification {
  userId: 'cm999host',
  title: 'Reservación confirmada',
  body: 'María López confirmó su reservación para "Tour Mezcal"',
}
```

**AnalyticsHandler:**
```typescript
ActivityLog {
  userId: 'cm123user',
  action: 'CONFIRM_BOOKING',
  targetType: 'BOOKING',
  targetId: 'cm789booking',
  metadata: {
    experienceId: 'cm456exp',
    totalPrice: 500,
    paymentMethod: 'stripe',
  }
}
```

---

## Ejemplo 3: Agregar un Nuevo Evento

### Caso: Queremos emitir evento cuando se crea un review

### Paso 1: Definir tipo en `types.ts`

```typescript
// src/infrastructure/events/types.ts

export interface ReviewCreatedPayload {
  reviewId: string;
  userId: string;
  userName: string;
  targetType: 'EXPERIENCE' | 'PRODUCT';
  targetId: string;
  targetName: string;
  ownerId: string; // host or seller
  rating: number;
  comment?: string;
}

export const EventTypes = {
  // ... eventos existentes
  REVIEW_CREATED: 'review.created',
} as const;

export type EventPayloadMap = {
  // ... mappings existentes
  [EventTypes.REVIEW_CREATED]: ReviewCreatedPayload;
};
```

### Paso 2: Emitir desde el servicio

```typescript
// src/services/booking.service.ts

async createReview(userId: string, experienceId: string, data: CreateReviewInput) {
  // 1. Validaciones
  const completedBooking = await this.prisma.booking.findFirst({
    where: { userId, experienceId, status: 'COMPLETED' },
  });

  if (!completedBooking) {
    throw new AppError('Solo puedes reseñar experiencias que hayas completado');
  }

  // 2. Crear review en BD
  const review = await this.prisma.experienceReview.create({
    data: {
      userId,
      experienceId,
      rating: data.rating,
      comment: data.comment,
    },
    include: {
      experience: true,
      user: true,
    },
  });

  // 3. Emitir evento (fire-and-forget)
  if (this.eventBus) {
    this.eventBus.emitAsync(
      createEvent(EventTypes.REVIEW_CREATED, {
        reviewId: review.id,
        userId,
        userName: `${review.user.nombre} ${review.user.apellido || ''}`.trim(),
        targetType: 'EXPERIENCE',
        targetId: experienceId,
        targetName: review.experience.title,
        ownerId: review.experience.hostId,
        rating: data.rating,
        comment: data.comment,
      })
    );
  }

  return review;
}
```

### Paso 3: Agregar handlers (opcional)

```typescript
// src/infrastructure/events/handlers/NotificationHandler.ts

register(eventBus: any): void {
  // ... registros existentes
  eventBus.on(
    EventTypes.REVIEW_CREATED,
    this.onReviewCreated.bind(this),
    'NotificationHandler.onReviewCreated'
  );
}

private async onReviewCreated(event: DomainEvent<ReviewCreatedPayload>): Promise<void> {
  const { ownerId, userName, targetType, targetName, rating } = event.payload;
  const stars = '⭐'.repeat(rating);

  await this.createNotification({
    userId: ownerId,
    type: 'SYSTEM',
    title: 'Nueva reseña',
    body: `${userName} calificó ${targetType === 'EXPERIENCE' ? 'tu experiencia' : 'tu producto'} "${targetName}" con ${stars}`,
    data: {
      reviewId: event.payload.reviewId,
      targetType,
      targetId: event.payload.targetId,
      rating,
      type: 'review_created',
    },
  });
}
```

```typescript
// src/infrastructure/events/handlers/GamificationHandler.ts

register(eventBus: any): void {
  // ... registros existentes
  eventBus.on(
    EventTypes.REVIEW_CREATED,
    this.onReviewCreated.bind(this),
    'GamificationHandler.onReviewCreated'
  );
}

private async onReviewCreated(event: DomainEvent<ReviewCreatedPayload>): Promise<void> {
  const { userId, ownerId } = event.payload;

  // XP para quien escribió la review
  await this.awardXP(userId, 20, 'CREATE_REVIEW', 'REVIEW', event.payload.reviewId);

  // XP para quien recibió la review
  await this.awardXP(ownerId, 10, 'RECEIVE_REVIEW', 'REVIEW', event.payload.reviewId);

  // Verificar badges
  await this.checkEngagementBadges(userId);
}
```

### Resultado

Cuando un usuario crea un review:
```
1. Review guardado en BD ✅
2. Evento REVIEW_CREATED emitido ✅
3. NotificationHandler:
   - Host recibe notificación "Nueva reseña: ⭐⭐⭐⭐⭐" ✅
4. GamificationHandler:
   - Usuario gana 20 XP ✅
   - Host gana 10 XP ✅
   - Verificar badge "CRITIC" (5 reviews) ✅
5. AnalyticsHandler:
   - Log de actividad "CREATE_REVIEW" ✅
```

---

## Ejemplo 4: Debugging de Eventos

### Ver estadísticas del EventBus

```typescript
// En cualquier ruta o servicio
app.get('/debug/events', async (request, reply) => {
  const stats = fastify.eventBus.getStats();
  return stats;
});
```

**Response:**
```json
{
  "totalEventTypes": 15,
  "totalHandlers": 42,
  "eventTypes": {
    "booking.created": {
      "handlerCount": 3,
      "handlers": [
        "NotificationHandler.onBookingCreated",
        "GamificationHandler.onBookingCreated",
        "AnalyticsHandler.onBookingCreated"
      ]
    },
    "booking.confirmed": {
      "handlerCount": 2,
      "handlers": [
        "NotificationHandler.onBookingConfirmed",
        "AnalyticsHandler.onBookingConfirmed"
      ]
    },
    "booking.completed": {
      "handlerCount": 3,
      "handlers": [
        "NotificationHandler.onBookingCompleted",
        "GamificationHandler.onBookingCompleted",
        "AnalyticsHandler.onBookingCompleted"
      ]
    }
  }
}
```

### Rastrear un evento con correlationId

Todos los logs tienen el mismo correlationId:

```bash
grep "1706123456789-abc123" logs/app.log
```

**Output:**
```
[EventBus] Emitting event: booking.completed { correlationId: '1706123456789-abc123' }
[NotificationHandler] Creating notification { correlationId: '1706123456789-abc123', userId: 'cm123user' }
[GamificationHandler] Awarding XP { correlationId: '1706123456789-abc123', userId: 'cm123user', amount: 50 }
[AnalyticsHandler] Logging activity { correlationId: '1706123456789-abc123', action: 'COMPLETE_BOOKING' }
[EventBus] Emitting event: gamification.xp_awarded { correlationId: '1706123456789-abc123' }
[EventBus] Emitting event: gamification.badge_unlocked { correlationId: '1706123456789-abc123' }
```

---

## Ejemplo 5: Testear con Eventos

### Test sin eventos

```typescript
describe('BookingService', () => {
  it('should complete booking without events', async () => {
    const service = new BookingService(prisma); // Sin eventBus

    const result = await service.completeBooking('booking-id', 'host-id');

    expect(result.status).toBe('COMPLETED');
    // Los eventos simplemente no se emiten
  });
});
```

### Test con mock EventBus

```typescript
import { vi } from 'vitest';

describe('BookingService', () => {
  it('should emit BOOKING_COMPLETED event', async () => {
    const mockEventBus = {
      emitAsync: vi.fn(),
      emit: vi.fn(),
    };

    const service = new BookingService(prisma, cache, mockEventBus);

    await service.completeBooking('booking-id', 'host-id');

    expect(mockEventBus.emitAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'booking.completed',
        payload: expect.objectContaining({
          bookingId: 'booking-id',
          userId: expect.any(String),
        }),
      })
    );
  });
});
```

### Test de handlers

```typescript
describe('NotificationHandler', () => {
  it('should create notification on booking completed', async () => {
    const handler = new NotificationHandler(prisma);

    const event = createEvent(EventTypes.BOOKING_COMPLETED, {
      bookingId: 'test-booking',
      userId: 'test-user',
      userName: 'Test User',
      experienceId: 'test-exp',
      experienceTitle: 'Test Experience',
      hostId: 'test-host',
      totalPrice: 100,
      guestCount: 2,
    });

    await handler['onBookingCompleted'](event);

    const notification = await prisma.notification.findFirst({
      where: { userId: 'test-user' },
    });

    expect(notification).toBeDefined();
    expect(notification?.title).toBe('Experiencia completada');
  });
});
```

---

## Buenas Prácticas

### 1. Siempre usar emitAsync para side effects

```typescript
// ✅ CORRECTO - Fire-and-forget
if (this.eventBus) {
  this.eventBus.emitAsync(event);
}

// ❌ INCORRECTO - Bloquea la respuesta
if (this.eventBus) {
  await this.eventBus.emit(event);
}
```

### 2. Payload completo (sin queries adicionales)

```typescript
// ✅ CORRECTO - Payload tiene todos los datos
{
  bookingId: booking.id,
  userId: booking.userId,
  userName: `${user.nombre} ${user.apellido}`, // ← Ya formateado
  experienceTitle: experience.title, // ← Ya cargado
  totalPrice: Number(booking.totalPrice), // ← Ya calculado
}

// ❌ INCORRECTO - Handler tiene que hacer query
{
  bookingId: booking.id,
  // Falta userName, experienceTitle, etc.
}
```

### 3. Verificar eventBus existe

```typescript
// ✅ CORRECTO - Verifica antes de usar
if (this.eventBus) {
  this.eventBus.emitAsync(event);
}

// ❌ INCORRECTO - Puede romper en tests
this.eventBus.emitAsync(event);
```

### 4. Handlers con manejo de errores

```typescript
// ✅ CORRECTO - Try-catch dentro del handler
private async onBookingCompleted(event: DomainEvent<BookingCompletedPayload>) {
  try {
    await this.createNotification({...});
  } catch (error) {
    // Log error pero no lanzar
    console.error('Error creating notification:', error);
  }
}

// ❌ INCORRECTO - Lanzar error rompe otros handlers
private async onBookingCompleted(event: DomainEvent<BookingCompletedPayload>) {
  await this.createNotification({...}); // Puede lanzar error
}
```

### 5. Usar correlationId para tracing

```typescript
// Los eventos relacionados comparten correlationId
const correlationId = generateId();

// Evento principal
this.eventBus.emit(
  createEvent(EventTypes.BOOKING_CREATED, payload, correlationId)
);

// Eventos secundarios usan el mismo correlationId
this.eventBus.emit(
  createEvent(EventTypes.XP_AWARDED, payload, correlationId)
);
```

---

## Conclusión

El sistema de eventos permite:
- ✅ Código limpio y desacoplado
- ✅ Side effects no bloquean operaciones principales
- ✅ Fácil agregar nuevas funcionalidades
- ✅ Testing independiente de componentes
- ✅ Observabilidad con logging detallado
- ✅ Escalabilidad futura (Redis, message queues)

Usa eventos para cualquier side effect:
- Notificaciones
- Gamificación
- Analytics
- Emails
- Push notifications
- Integraciones externas
- Logs de auditoría
