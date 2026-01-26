# Implementación de Arquitectura Basada en Eventos

## Resumen

Se ha implementado una arquitectura completa basada en eventos para el proyecto Guelaguetza Connect. Esta arquitectura desacopla las operaciones principales de sus efectos secundarios (notificaciones, gamificación, analytics) mediante un sistema de eventos robusto.

## Arquitectura

### Componentes Principales

```
src/infrastructure/events/
├── EventBus.ts                          # Motor principal de eventos
├── types.ts                             # Definición de todos los eventos
├── index.ts                             # Inicialización y exports
└── handlers/
    ├── NotificationHandler.ts           # Maneja notificaciones
    ├── GamificationHandler.ts           # Maneja XP y badges
    └── AnalyticsHandler.ts              # Registra actividad
```

### EventBus

**Características:**
- Pub/Sub asíncrono con tipado fuerte
- Fire-and-forget para operaciones no críticas
- Manejo robusto de errores (errores en handlers NO afectan operación principal)
- Logging detallado con correlationId para tracing
- Soporte para retry automático
- Estadísticas y debugging

**Métodos principales:**
- `on(event, handler, name)` - Registrar un handler
- `emit(event)` - Emitir evento y esperar handlers (await)
- `emitAsync(event)` - Emitir evento sin esperar (fire-and-forget)
- `emitWithRetry(event, options)` - Emitir con retry automático
- `off(event, handler)` - Desregistrar handler
- `getStats()` - Obtener estadísticas

## Eventos Implementados

### Booking Events

```typescript
EventTypes.BOOKING_CREATED       // Cuando se crea una reservación
EventTypes.BOOKING_CONFIRMED     // Cuando se confirma el pago
EventTypes.BOOKING_CANCELLED     // Cuando se cancela
EventTypes.BOOKING_COMPLETED     // Cuando el host marca como completada
```

**Emisores:**
- `BookingService.createBooking()` → BOOKING_CREATED
- `BookingService.confirmBooking()` → BOOKING_CONFIRMED
- `webhooks.ts (payment_intent.succeeded)` → BOOKING_CONFIRMED
- `BookingService.cancelBooking()` → BOOKING_CANCELLED
- `BookingService.completeBooking()` → BOOKING_COMPLETED

**Handlers:**
- **NotificationHandler**: Notifica a usuarios y hosts
- **GamificationHandler**: Otorga 50 XP al completar
- **AnalyticsHandler**: Registra en ActivityLog

### Marketplace Events

```typescript
EventTypes.ORDER_CREATED         // Cuando se crea una orden
EventTypes.ORDER_PAID            // Cuando se confirma el pago
EventTypes.ORDER_SHIPPED         // Cuando el vendedor envía
EventTypes.ORDER_DELIVERED       // Cuando se marca como entregada
```

**Emisores:**
- `MarketplaceService.createOrder()` → ORDER_CREATED
- `webhooks.ts (payment_intent.succeeded)` → ORDER_PAID
- `MarketplaceService.updateOrderStatus()` → ORDER_SHIPPED, ORDER_DELIVERED

**Handlers:**
- **NotificationHandler**: Notifica a compradores y vendedores
- **GamificationHandler**: Otorga 30 XP al recibir orden
- **AnalyticsHandler**: Registra en ActivityLog

### Gamification Events

```typescript
EventTypes.XP_AWARDED           // Cuando se otorga XP
EventTypes.BADGE_UNLOCKED       // Cuando se desbloquea badge
EventTypes.LEVEL_UP             // Cuando el usuario sube de nivel
```

**Emisores:**
- `GamificationHandler` (emite sus propios eventos)

**Handlers:**
- **NotificationHandler**: Notifica logros al usuario
- **AnalyticsHandler**: Registra en ActivityLog

### Social Events

```typescript
EventTypes.USER_FOLLOWED        // Cuando alguien sigue a un usuario
EventTypes.STORY_CREATED        // Cuando se crea un story
EventTypes.REVIEW_CREATED       // Cuando se crea una review
EventTypes.USER_REGISTERED      // Cuando se registra un usuario
```

## Flujo de Ejemplo: Completar Booking

```
1. Host llama: POST /api/bookings/:id/complete

2. BookingService.completeBooking()
   ├─ Validar permisos
   ├─ Actualizar status en BD
   └─ Emitir evento BOOKING_COMPLETED (async)
       {
         bookingId, userId, userName,
         experienceId, experienceTitle,
         hostId, totalPrice, guestCount
       }

3. EventBus distribuye a handlers (en paralelo):

   NotificationHandler
   ├─ Crear notificación para el usuario
   └─ "¡Esperamos que hayas disfrutado 'Taller de Barro'!"

   GamificationHandler
   ├─ Otorgar 50 XP al usuario
   ├─ Verificar nivel (¿subió de nivel?)
   ├─ Verificar badges (¿desbloqueó "FIRST_BOOKING"?)
   └─ Emitir eventos secundarios:
       - XP_AWARDED
       - BADGE_UNLOCKED (si aplica)
       - LEVEL_UP (si aplica)

   AnalyticsHandler
   ├─ Registrar actividad del usuario
   └─ Registrar actividad del host

4. Los eventos secundarios también tienen handlers:

   BADGE_UNLOCKED
   └─ NotificationHandler
       └─ "¡Insignia desbloqueada: Primera Reservación!"

   LEVEL_UP
   └─ NotificationHandler
       └─ "¡Nivel 2! Siguiente nivel: 250 XP"
```

**Características clave:**
- ✅ La operación principal (update BD) se completa primero
- ✅ Los side effects se ejecutan de forma asíncrona
- ✅ Si un handler falla, no afecta a los demás
- ✅ Todos los eventos tienen correlationId para tracing
- ✅ Los datos están completos en el evento (no requieren queries adicionales)

## Integración en Servicios

### BookingService

```typescript
export class BookingService {
  constructor(
    private prisma: PrismaClient,
    private cache?: CacheService,
    private eventBus?: EventBus  // ← Inyectado
  ) {}

  async createBooking(userId: string, data: CreateBookingInput) {
    // ... lógica de negocio ...

    // Emitir evento (fire-and-forget)
    if (this.eventBus) {
      this.eventBus.emitAsync(
        createEvent(EventTypes.BOOKING_CREATED, {
          bookingId: booking.id,
          userId,
          userName: `${user.nombre} ${user.apellido || ''}`.trim(),
          experienceId,
          experienceTitle: experience.title,
          hostId: experience.hostId,
          hostName: `${host.nombre} ${host.apellido || ''}`.trim(),
          guestCount,
          totalPrice,
          timeSlot: {
            date: timeSlot.date.toISOString().split('T')[0],
            startTime: timeSlot.startTime,
            endTime: timeSlot.endTime,
          },
        })
      );
    }

    return { booking, clientSecret };
  }
}
```

### Registro en Routes

```typescript
// src/routes/bookings.ts
const bookingService = new BookingService(
  fastify.prisma,
  fastify.cache,
  fastify.eventBus  // ← Pasar EventBus
);
```

## Handlers Implementados

### 1. NotificationHandler

**Responsabilidad:** Crear notificaciones en respuesta a eventos

**Eventos que escucha:**
- Booking: created, confirmed, cancelled, completed
- Order: created, paid, shipped
- Gamification: badge_unlocked, level_up
- Review: review_created
- Social: user_followed

**Qué hace:**
- Crea registros en la tabla `Notification`
- Los usuarios pueden verlas en `/api/notifications`
- Futuro: Enviar push notifications / emails

### 2. GamificationHandler

**Responsabilidad:** Sistema de XP y badges

**Eventos que escucha:**
- BOOKING_COMPLETED → +50 XP
- ORDER_DELIVERED → +30 XP (comprador y vendedor)
- REVIEW_CREATED → +20 XP (reviewer), +10 XP (reviewed)
- STORY_CREATED → +15 XP
- USER_FOLLOWED → +5 XP (seguido)

**Qué hace:**
- Otorgar XP al usuario
- Verificar si sube de nivel
- Verificar si desbloquea badges
- Emitir eventos secundarios (XP_AWARDED, BADGE_UNLOCKED, LEVEL_UP)

**Badges implementados:**
```typescript
FIRST_BOOKING       // 1 booking completado
EXPLORER            // 5 bookings completados
ADVENTURER          // 10 bookings completados
CULTURE_LOVER       // 25 bookings completados

FIRST_SALE          // 1 venta como vendedor
MERCHANT            // 10 ventas
MASTER_CRAFTSMAN    // 50 ventas

STORYTELLER         // 1 story creado
CONTENT_CREATOR     // 10 stories
INFLUENCER          // 50 stories

CRITIC              // 5 reviews escritas
EXPERT_REVIEWER     // 20 reviews

POPULAR             // 10 seguidores
CELEBRITY           // 50 seguidores
LEGEND              // 100 seguidores

LEVEL_5             // Alcanzar nivel 5
LEVEL_10            // Alcanzar nivel 10
```

### 3. AnalyticsHandler

**Responsabilidad:** Registrar actividad para métricas

**Eventos que escucha:**
- Todos los eventos principales

**Qué hace:**
- Crear registros en `ActivityLog`
- Almacenar metadata completa para análisis
- Permite queries como:
  - "Usuarios más activos"
  - "Eventos más frecuentes"
  - "Funnel de conversión"
  - "Comportamiento por segmento"

## Beneficios de esta Arquitectura

### 1. Desacoplamiento
- Los servicios principales NO dependen de notificaciones
- Los servicios principales NO dependen de gamificación
- Los servicios principales NO dependen de analytics
- Cada módulo puede evolucionar independientemente

### 2. Escalabilidad
- Los handlers se pueden ejecutar en workers separados
- Se puede agregar Redis Pub/Sub para distribuir eventos
- Se puede agregar message queue (RabbitMQ, SQS) para alta carga

### 3. Mantenibilidad
- Lógica de notificaciones centralizada en NotificationHandler
- Lógica de gamificación centralizada en GamificationHandler
- Fácil agregar nuevos handlers sin tocar servicios existentes

### 4. Observabilidad
- Todos los eventos tienen correlationId para tracing
- Logging centralizado en EventBus
- Estadísticas disponibles con `eventBus.getStats()`

### 5. Testabilidad
- Los servicios se pueden testear sin handlers
- Los handlers se pueden testear independientemente
- Se puede usar un EventBus mock para testing

## Cómo Agregar un Nuevo Evento

### 1. Definir el tipo en `types.ts`

```typescript
export interface MyNewEventPayload {
  entityId: string;
  userId: string;
  // ... otros campos necesarios
}

export const EventTypes = {
  // ... eventos existentes
  MY_NEW_EVENT: 'my.new.event',
} as const;

export type EventPayloadMap = {
  // ... mappings existentes
  [EventTypes.MY_NEW_EVENT]: MyNewEventPayload;
};
```

### 2. Emitir desde el servicio

```typescript
// En tu servicio
if (this.eventBus) {
  this.eventBus.emitAsync(
    createEvent(EventTypes.MY_NEW_EVENT, {
      entityId: entity.id,
      userId: user.id,
      // ... payload completo
    })
  );
}
```

### 3. Agregar handlers (opcional)

```typescript
// En NotificationHandler.ts
register(eventBus: any): void {
  // ... registros existentes
  eventBus.on(
    EventTypes.MY_NEW_EVENT,
    this.onMyNewEvent.bind(this),
    'NotificationHandler.onMyNewEvent'
  );
}

private async onMyNewEvent(event: DomainEvent<MyNewEventPayload>): Promise<void> {
  // Lógica del handler
}
```

## Debugging

### Ver estadísticas del EventBus

```typescript
// En cualquier parte del código donde tengas acceso a fastify
const stats = fastify.eventBus.getStats();
console.log(stats);

// Output:
{
  totalEventTypes: 15,
  totalHandlers: 42,
  eventTypes: {
    'booking.created': {
      handlerCount: 3,
      handlers: [
        'NotificationHandler.onBookingCreated',
        'AnalyticsHandler.onBookingCreated',
        'MetricsHandler.onBookingCreated'
      ]
    },
    // ...
  }
}
```

### Ver eventos en logs

Los eventos se loguean automáticamente:

```
[EventBus] Emitting event: booking.created { correlationId: '1706...-abc123', handlerCount: 3 }
[EventBus DEBUG] Handler completed: NotificationHandler.onBookingCreated
[EventBus DEBUG] Handler completed: AnalyticsHandler.onBookingCreated
[EventBus] Event processing completed: booking.created { duration: '45ms', success: 3, failed: 0 }
```

### Manejo de Errores

Si un handler falla:

```
[EventBus ERROR] Handler failed: NotificationHandler.onBookingCreated {
  eventType: 'booking.created',
  error: 'Database connection timeout',
  stack: '...'
}
[EventBus] Event processing completed: booking.created { duration: '120ms', success: 2, failed: 1 }
```

**Importante:** El error en un handler NO afecta:
- La operación principal (el booking ya se creó)
- Los demás handlers (siguen ejecutándose)

## Testing

### Testear sin eventos

```typescript
const service = new BookingService(prisma); // Sin eventBus
// Los eventos simplemente no se emiten
```

### Testear con mock EventBus

```typescript
const mockEventBus = {
  emitAsync: vi.fn(),
  emit: vi.fn(),
};

const service = new BookingService(prisma, cache, mockEventBus);

// Verificar que se emitió el evento
expect(mockEventBus.emitAsync).toHaveBeenCalledWith(
  expect.objectContaining({
    type: 'booking.created',
    payload: expect.objectContaining({
      bookingId: 'test-id',
    }),
  })
);
```

### Testear handlers

```typescript
const handler = new NotificationHandler(prisma);

const event = createEvent(EventTypes.BOOKING_CREATED, {
  bookingId: 'test-id',
  userId: 'user-id',
  // ... payload completo
});

await handler.onBookingCreated(event);

// Verificar que se creó la notificación
const notification = await prisma.notification.findFirst({
  where: { userId: 'user-id' },
});
expect(notification).toBeDefined();
```

## Próximos Pasos

### Corto plazo
- [ ] Agregar más badges
- [ ] Implementar notificaciones push (Firebase/OneSignal)
- [ ] Agregar eventos para Stories y Social features

### Mediano plazo
- [ ] Implementar Redis Pub/Sub para distribuir eventos entre instancias
- [ ] Agregar dead letter queue para eventos fallidos
- [ ] Dashboard de eventos en tiempo real (WebSocket)

### Largo plazo
- [ ] Migrar a message queue (RabbitMQ/SQS) para alta disponibilidad
- [ ] Implementar Event Sourcing para auditoría completa
- [ ] CQRS para separar lectura y escritura

## Conclusión

La arquitectura basada en eventos está completamente implementada y funcional. Proporciona:

✅ **Separación de responsabilidades** - Servicios limpios y enfocados
✅ **Fire-and-forget** - Side effects no bloquean operaciones principales
✅ **Manejo robusto de errores** - Un handler no puede romper el sistema
✅ **Observabilidad** - Logging detallado y correlationIds
✅ **Extensibilidad** - Fácil agregar nuevos eventos y handlers
✅ **Testabilidad** - Componentes independientes y testeables

El sistema está listo para producción y puede escalar según las necesidades del proyecto.
