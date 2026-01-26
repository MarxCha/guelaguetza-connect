# Event-Driven Architecture (EDA) - Guelaguetza Connect

## Visión General

Este proyecto implementa una arquitectura basada en eventos para desacoplar servicios y mejorar la escalabilidad, mantenibilidad y testabilidad del sistema.

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                      Application Layer                       │
│  (Routes / Controllers)                                      │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      Service Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │   Booking    │  │ Marketplace  │  │    Other     │      │
│  │   Service    │  │   Service    │  │  Services    │      │
│  └──────┬───────┘  └──────┬───────┘  └──────────────┘      │
│         │                  │                                 │
│         │ emits events     │ emits events                    │
│         └──────────────────┴────────────────┐                │
└───────────────────────────────────────────│─────────────────┘
                                            │
                                            ▼
                             ┌───────────────────────────┐
                             │        EventBus           │
                             │   (Pub/Sub System)        │
                             └───────┬───────────────────┘
                                     │ dispatches to handlers
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
          ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
          │Notification  │ │Gamification  │ │  Analytics   │
          │  Handler     │ │   Handler    │ │   Handler    │
          └──────────────┘ └──────────────┘ └──────────────┘
                 │                 │                 │
                 ▼                 ▼                 ▼
          Creates Notifs    Awards XP/Badges   Logs Activity
```

## Componentes Principales

### 1. EventBus (`infrastructure/events/EventBus.ts`)

Sistema pub/sub centralizado que gestiona el registro de handlers y la emisión de eventos.

**Características:**
- **Registro de handlers**: `on(eventType, handler, name)`
- **Emisión síncrona**: `emit(event)` - espera a todos los handlers
- **Emisión asíncrona**: `emitAsync(event)` - fire-and-forget
- **Retry automático**: `emitWithRetry(event, options)`
- **Manejo robusto de errores**: los errores en handlers no afectan otros handlers
- **Logging detallado**: para debugging y monitoreo
- **Estadísticas**: `getStats()` muestra eventos y handlers registrados

**Ejemplo de uso:**
```typescript
// Registrar un handler
eventBus.on('booking.created', async (event) => {
  console.log('Booking created:', event.payload);
}, 'MyHandler');

// Emitir evento (síncrono)
const result = await eventBus.emit({
  type: 'booking.created',
  payload: { bookingId: '123', userId: 'user-1' },
  timestamp: new Date(),
  correlationId: 'req-123',
});

// Emitir evento (asíncrono - no espera)
eventBus.emitAsync(event);
```

### 2. Domain Events (`infrastructure/events/types.ts`)

Define todos los eventos del dominio con tipado fuerte.

**Eventos implementados:**

#### Booking Events
- `BOOKING_CREATED` - Usuario crea una reservación
- `BOOKING_CONFIRMED` - Pago confirmado, reservación lista
- `BOOKING_CANCELLED` - Reservación cancelada (por usuario o host)
- `BOOKING_COMPLETED` - Experiencia completada

#### Marketplace Events
- `ORDER_CREATED` - Usuario crea una orden
- `ORDER_PAID` - Pago confirmado
- `ORDER_SHIPPED` - Orden enviada
- `ORDER_DELIVERED` - Orden entregada

#### User Events
- `USER_REGISTERED` - Nuevo usuario registrado
- `USER_BANNED` - Usuario baneado por admin

#### Gamification Events
- `XP_AWARDED` - XP otorgado a usuario
- `BADGE_UNLOCKED` - Insignia desbloqueada
- `LEVEL_UP` - Usuario sube de nivel

#### Review Events
- `REVIEW_CREATED` - Nueva reseña creada

#### Social Events
- `USER_FOLLOWED` - Usuario sigue a otro
- `STORY_CREATED` - Nueva historia publicada

**Ejemplo de tipo de evento:**
```typescript
export interface BookingCreatedPayload {
  bookingId: string;
  userId: string;
  experienceId: string;
  experienceTitle: string;
  hostId: string;
  hostName: string;
  guestCount: number;
  totalPrice: number;
  timeSlot: {
    date: string;
    startTime: string;
    endTime: string;
  };
}
```

### 3. Event Handlers

#### NotificationHandler (`handlers/NotificationHandler.ts`)

Escucha eventos del dominio y crea notificaciones para los usuarios.

**Responsabilidades:**
- Crear notificaciones en la BD
- Enviar push notifications (futuro)
- Notificar a múltiples usuarios según el evento

**Eventos que escucha:**
- Booking: created, confirmed, cancelled, completed
- Marketplace: order_created, order_paid, order_shipped
- Gamification: badge_unlocked, level_up
- Review: review_created
- Social: user_followed

**Ejemplo:**
```typescript
// Cuando se crea una booking, notifica al host
private async onBookingCreated(event: DomainEvent<BookingCreatedPayload>) {
  await this.createNotification({
    userId: event.payload.hostId,
    type: 'SYSTEM',
    title: 'Nueva reservación',
    body: `${event.payload.userName} reservó ${event.payload.guestCount} lugar(es)`,
    data: { bookingId: event.payload.bookingId }
  });
}
```

#### GamificationHandler (`handlers/GamificationHandler.ts`)

Sistema de XP y badges basado en eventos.

**Responsabilidades:**
- Otorgar XP por acciones
- Verificar y desbloquear badges
- Detectar level-ups
- Emitir eventos secundarios (XP_AWARDED, BADGE_UNLOCKED, LEVEL_UP)

**XP Rewards:**
- `COMPLETE_BOOKING`: 50 XP
- `RECEIVE_ORDER`: 30 XP
- `CREATE_REVIEW`: 20 XP
- `RECEIVE_REVIEW`: 10 XP
- `CREATE_STORY`: 15 XP
- `GAIN_FOLLOWER`: 5 XP

**Badges implementados:**
```typescript
Booking Badges:
  - FIRST_BOOKING (1 booking)
  - EXPLORER (5 bookings)
  - ADVENTURER (10 bookings)
  - CULTURE_LOVER (25 bookings)

Marketplace Badges:
  - FIRST_SALE (1 sale)
  - MERCHANT (10 sales)
  - MASTER_CRAFTSMAN (50 sales)

Story Badges:
  - STORYTELLER (1 story)
  - CONTENT_CREATOR (10 stories)
  - INFLUENCER (50 stories)

Social Badges:
  - POPULAR (10 followers)
  - CELEBRITY (50 followers)
  - LEGEND (100 followers)

Engagement Badges:
  - CRITIC (5 reviews)
  - EXPERT_REVIEWER (20 reviews)

Level Badges:
  - LEVEL_5
  - LEVEL_10
```

**Ejemplo:**
```typescript
// Cuando se completa una booking, otorga XP y verifica badges
private async onBookingCompleted(event: DomainEvent<BookingCompletedPayload>) {
  await this.awardXP(
    event.payload.userId,
    XP_REWARDS.COMPLETE_BOOKING,
    'COMPLETE_BOOKING',
    'BOOKING',
    event.payload.bookingId
  );

  await this.checkBookingBadges(event.payload.userId);
}
```

#### AnalyticsHandler (`handlers/AnalyticsHandler.ts`)

Registra actividad del usuario en ActivityLog para análisis.

**Responsabilidades:**
- Registrar todas las acciones importantes
- Crear métricas de uso
- Facilitar reportes y análisis de comportamiento

**Ejemplo:**
```typescript
private async onBookingCreated(event: DomainEvent<BookingCreatedPayload>) {
  await this.logActivity({
    userId: event.payload.userId,
    action: 'CREATE_BOOKING',
    targetType: 'BOOKING',
    targetId: event.payload.bookingId,
    metadata: {
      experienceId: event.payload.experienceId,
      guestCount: event.payload.guestCount,
      totalPrice: event.payload.totalPrice,
    },
  });
}
```

## Integración en Servicios

### BookingService

**Eventos emitidos:**
1. `BOOKING_CREATED` - Después de crear booking y payment intent
2. `BOOKING_CONFIRMED` - Después de confirmar pago
3. `BOOKING_CANCELLED` - Después de cancelar y procesar reembolso
4. `BOOKING_COMPLETED` - Después de completar experiencia

**Ejemplo de integración:**
```typescript
// En createBooking(), después de crear la booking y payment intent:
if (this.eventBus) {
  const event = createEvent(EventTypes.BOOKING_CREATED, {
    bookingId: booking.id,
    userId,
    experienceId,
    experienceTitle: experience.title,
    hostId: experience.hostId,
    // ... más datos
  });
  this.eventBus.emitAsync(event); // Fire-and-forget
}
```

### MarketplaceService

**Eventos emitidos:**
1. `ORDER_CREATED` - Después de crear orden y payment intent
2. `ORDER_PAID` - Cuando se actualiza status a PAID
3. `ORDER_SHIPPED` - Cuando se actualiza status a SHIPPED
4. `ORDER_DELIVERED` - Cuando se actualiza status a DELIVERED

## Ventajas de esta Arquitectura

### 1. Desacoplamiento
- Los servicios no necesitan conocer notificaciones, gamificación, analytics
- Cada handler es independiente y puede fallar sin afectar otros
- Fácil agregar nuevos handlers sin modificar servicios existentes

### 2. Mantenibilidad
- Lógica de negocio separada de side-effects
- Código más limpio y enfocado en una sola responsabilidad
- Fácil de testear (mock del eventBus)

### 3. Escalabilidad
- Handlers pueden ejecutarse en paralelo
- `emitAsync` no bloquea el request principal
- Fácil migrar a message queue (RabbitMQ, Kafka) en el futuro

### 4. Observabilidad
- Todos los eventos quedan registrados
- CorrelationId permite tracing de eventos relacionados
- Logging detallado para debugging

### 5. Testabilidad
```typescript
// Test de service sin handlers
const mockEventBus = {
  emitAsync: vi.fn(),
};
const service = new BookingService(prisma, cache, mockEventBus);

// Verificar que se emitió el evento correcto
expect(mockEventBus.emitAsync).toHaveBeenCalledWith(
  expect.objectContaining({
    type: EventTypes.BOOKING_CREATED,
  })
);
```

## Cómo Usar

### 1. Inicialización (ya configurado en app.ts)

```typescript
import { initializeEventBus } from './infrastructure/events/index.js';

// En app.ts, después de registrar Prisma
const eventBus = initializeEventBus(fastify.prisma);
fastify.decorate('eventBus', eventBus);
```

### 2. Emitir Eventos desde Servicios

```typescript
import { createEvent, EventTypes } from '../infrastructure/events/index.js';

class MyService {
  constructor(private prisma: PrismaClient, private eventBus?: EventBus) {}

  async doSomething() {
    // ... lógica de negocio ...

    // Emitir evento
    if (this.eventBus) {
      const event = createEvent(EventTypes.SOME_EVENT, {
        // payload con tipado fuerte
        userId: 'user-123',
        data: 'value',
      });

      // Fire-and-forget (recomendado para side-effects)
      this.eventBus.emitAsync(event);

      // O esperar a los handlers (si necesitas saber si tuvieron éxito)
      const result = await this.eventBus.emit(event);
      if (!result.success) {
        console.warn('Some handlers failed');
      }
    }
  }
}
```

### 3. Crear Nuevos Handlers

```typescript
export class MyCustomHandler {
  constructor(private prisma: PrismaClient) {}

  register(eventBus: EventBus): void {
    eventBus.on(EventTypes.BOOKING_CREATED, this.onBookingCreated.bind(this), 'MyCustomHandler.onBookingCreated');
  }

  private async onBookingCreated(event: DomainEvent<BookingCreatedPayload>): Promise<void> {
    // Tu lógica aquí
    console.log('Booking created:', event.payload.bookingId);
  }
}

// Registrar en infrastructure/events/index.ts
const myHandler = new MyCustomHandler(prisma);
myHandler.register(eventBus);
```

### 4. Crear Nuevos Eventos

1. Definir payload en `types.ts`:
```typescript
export interface MyNewEventPayload {
  id: string;
  userId: string;
  data: string;
}
```

2. Agregar a EventTypes:
```typescript
export const EventTypes = {
  // ...
  MY_NEW_EVENT: 'domain.my_new_event',
} as const;
```

3. Agregar al mapping:
```typescript
export type EventPayloadMap = {
  // ...
  [EventTypes.MY_NEW_EVENT]: MyNewEventPayload;
};
```

4. Emitir desde servicio:
```typescript
const event = createEvent(EventTypes.MY_NEW_EVENT, {
  id: '123',
  userId: 'user-1',
  data: 'test',
});
this.eventBus.emitAsync(event);
```

## Testing

### Test del EventBus
```bash
npm test EventBus.test.ts
```

### Test de Handlers
```bash
npm test NotificationHandler.test.ts
```

### Mock EventBus en Tests de Servicios
```typescript
const mockEventBus = {
  emit: vi.fn().mockResolvedValue({ success: true, handlersExecuted: 1 }),
  emitAsync: vi.fn(),
};

const service = new BookingService(prisma, cache, mockEventBus);
```

## Métricas y Monitoreo

El EventBus registra métricas útiles:

```typescript
const stats = eventBus.getStats();
console.log(stats);
// {
//   totalEventTypes: 15,
//   totalHandlers: 45,
//   eventTypes: {
//     'booking.created': {
//       handlerCount: 3,
//       handlers: ['NotificationHandler', 'AnalyticsHandler', ...]
//     }
//   }
// }
```

## Migración a Message Queue (Futuro)

Esta arquitectura facilita migrar a RabbitMQ/Kafka sin cambiar servicios:

```typescript
// En lugar de emitir directamente
class MessageQueueEventBus implements EventBus {
  async emit(event: DomainEvent) {
    // Publicar a RabbitMQ/Kafka
    await rabbitMQ.publish('events', event.type, event);
  }
}
```

## Troubleshooting

### Eventos no se procesan
1. Verificar que EventBus está inicializado en app.ts
2. Verificar que handlers están registrados (ver logs al startup)
3. Verificar que service recibe eventBus en constructor

### Handlers fallan silenciosamente
1. Revisar logs de EventBus (nivel ERROR)
2. Los errores en handlers NO detienen la aplicación (por diseño)
3. Configurar onError callback para tracking

### Performance
- Usar `emitAsync` para operaciones no críticas
- Handlers deben ser rápidos (< 100ms idealmente)
- Para operaciones lentas, usar job queue

## Próximos Pasos

1. ✅ EventBus implementado
2. ✅ Handlers básicos (Notification, Gamification, Analytics)
3. ✅ Integración en Booking y Marketplace services
4. ⏳ Agregar más eventos (Story, Social, Reviews)
5. ⏳ Push notifications desde NotificationHandler
6. ⏳ Email notifications
7. ⏳ Webhooks para integraciones externas
8. ⏳ Migración a message queue para escalabilidad

## Referencias

- **Event Sourcing**: https://martinfowler.com/eaaDev/EventSourcing.html
- **Domain Events**: https://leanpub.com/implementing-domain-driven-design
- **CQRS**: https://martinfowler.com/bliki/CQRS.html
