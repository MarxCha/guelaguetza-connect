# Event-Driven Architecture - Resumen de Implementación

## Implementación Completada ✅

Se ha implementado una **arquitectura basada en eventos completa y funcional** para desacoplar servicios en Guelaguetza Connect.

---

## Archivos Creados

### Core Infrastructure

```
backend/src/infrastructure/events/
├── EventBus.ts                          # Sistema pub/sub centralizado
├── EventBus.test.ts                     # Tests del EventBus
├── types.ts                             # Definición de todos los eventos del dominio
├── index.ts                             # Setup y exports
└── handlers/
    ├── NotificationHandler.ts           # Crea notificaciones
    ├── NotificationHandler.test.ts      # Tests del handler
    ├── GamificationHandler.ts           # Sistema de XP/badges
    └── AnalyticsHandler.ts              # Logging de actividad
```

### Plugins

```
backend/src/plugins/
└── eventBus.ts                          # Plugin de Fastify para EventBus
```

### Services con Eventos (Ejemplos)

```
backend/src/services/
├── booking-with-events.service.ts       # BookingService con eventos integrados
└── marketplace-with-events.service.ts   # MarketplaceService con eventos integrados
```

### Scripts

```
backend/scripts/
├── seed-badges.ts                       # Seed de badges para gamificación
└── check-eventbus.ts                    # Verificar estado del EventBus
```

### Documentación

```
backend/
├── EVENT_DRIVEN_ARCHITECTURE.md         # Documentación completa de la arquitectura
├── MIGRATION_GUIDE_EVENTS.md            # Guía paso a paso para migrar
└── EVENT_ARCHITECTURE_SUMMARY.md        # Este archivo
```

---

## Componentes Implementados

### 1. EventBus (Core)

Sistema pub/sub robusto con:
- ✅ Registro de handlers (`on/off`)
- ✅ Emisión síncrona (`emit`)
- ✅ Emisión asíncrona (`emitAsync`)
- ✅ Retry automático (`emitWithRetry`)
- ✅ Manejo de errores robusto
- ✅ Logging detallado
- ✅ Estadísticas (`getStats()`)
- ✅ Tests completos

**Ubicación:** `src/infrastructure/events/EventBus.ts`

### 2. Domain Events (Tipos)

15+ eventos del dominio definidos con tipado fuerte:

#### Booking Events (4)
- `BOOKING_CREATED` - Usuario crea reservación
- `BOOKING_CONFIRMED` - Pago confirmado
- `BOOKING_CANCELLED` - Reservación cancelada
- `BOOKING_COMPLETED` - Experiencia completada

#### Marketplace Events (4)
- `ORDER_CREATED` - Orden creada
- `ORDER_PAID` - Pago confirmado
- `ORDER_SHIPPED` - Orden enviada
- `ORDER_DELIVERED` - Orden entregada

#### Gamification Events (3)
- `XP_AWARDED` - XP otorgado
- `BADGE_UNLOCKED` - Badge desbloqueado
- `LEVEL_UP` - Usuario sube de nivel

#### User Events (2)
- `USER_REGISTERED` - Nuevo usuario
- `USER_BANNED` - Usuario baneado

#### Social/Review Events (2)
- `REVIEW_CREATED` - Nueva reseña
- `USER_FOLLOWED` - Nuevo seguidor

**Ubicación:** `src/infrastructure/events/types.ts`

### 3. Event Handlers

#### NotificationHandler ✅
Escucha 11+ tipos de eventos y crea notificaciones para usuarios.

**Funcionalidades:**
- Notificaciones para booking (created, confirmed, cancelled, completed)
- Notificaciones para marketplace (order created, paid, shipped)
- Notificaciones de gamificación (badge unlocked, level up)
- Notificaciones sociales (new follower, review created)

**Tests:** ✅ Completados

**Ubicación:** `src/infrastructure/events/handlers/NotificationHandler.ts`

#### GamificationHandler ✅
Sistema completo de XP y badges basado en eventos.

**XP Rewards:**
- `COMPLETE_BOOKING`: 50 XP
- `RECEIVE_ORDER`: 30 XP
- `CREATE_REVIEW`: 20 XP
- `RECEIVE_REVIEW`: 10 XP
- `CREATE_STORY`: 15 XP
- `GAIN_FOLLOWER`: 5 XP

**Badges:** 18 badges en 6 categorías
- Booking badges (4): FIRST_BOOKING, EXPLORER, ADVENTURER, CULTURE_LOVER
- Marketplace badges (3): FIRST_SALE, MERCHANT, MASTER_CRAFTSMAN
- Story badges (3): STORYTELLER, CONTENT_CREATOR, INFLUENCER
- Social badges (3): POPULAR, CELEBRITY, LEGEND
- Engagement badges (2): CRITIC, EXPERT_REVIEWER
- Level badges (2): LEVEL_5, LEVEL_10
- Special badges (2): EARLY_ADOPTER, COMMUNITY_BUILDER

**Niveles:** Sistema de 10 niveles con XP progresivo

**Ubicación:** `src/infrastructure/events/handlers/GamificationHandler.ts`

#### AnalyticsHandler ✅
Registra actividad del usuario en `ActivityLog` para análisis.

**Eventos rastreados:**
- Todas las acciones de booking
- Todas las acciones de marketplace
- Gamificación (XP, badges, levels)
- Social (follows, stories, reviews)

**Ubicación:** `src/infrastructure/events/handlers/AnalyticsHandler.ts`

---

## Integración en Servicios

### BookingService ✅

**Eventos emitidos:**
1. `BOOKING_CREATED` (línea ~502)
2. `BOOKING_CONFIRMED` (línea ~548)
3. `BOOKING_CANCELLED` (línea ~617)
4. `BOOKING_COMPLETED` (línea ~648)

**Archivo de referencia:** `src/services/booking-with-events.service.ts`

### MarketplaceService ✅

**Eventos emitidos:**
1. `ORDER_CREATED` (después de crear orden)
2. `ORDER_PAID` (al actualizar status a PAID)
3. `ORDER_SHIPPED` (al actualizar status a SHIPPED)
4. `ORDER_DELIVERED` (al actualizar status a DELIVERED)

**Archivo de referencia:** `src/services/marketplace-with-events.service.ts`

---

## Testing

### Tests Unitarios ✅

```bash
# Test del EventBus
npm test EventBus.test.ts

# Test de NotificationHandler
npm test NotificationHandler.test.ts
```

**Coverage:**
- EventBus: 14 tests
- NotificationHandler: 8 tests

### Tests de Integración

Para testear servicios con eventos:

```typescript
const mockEventBus = {
  emit: vi.fn().mockResolvedValue({ success: true }),
  emitAsync: vi.fn(),
};

const service = new BookingService(prisma, cache, mockEventBus);

// Verificar que se emitió el evento
expect(mockEventBus.emitAsync).toHaveBeenCalledWith(
  expect.objectContaining({
    type: EventTypes.BOOKING_CREATED,
  })
);
```

---

## Scripts Útiles

### Seed de Badges

```bash
npm run db:seed:badges
```

Crea/actualiza 18 badges en la base de datos con categorías, XP rewards, etc.

### Verificar EventBus

```bash
npm run check:eventbus
```

Muestra:
- Handlers registrados por evento
- Estadísticas del EventBus
- Badges en BD
- Test de emisión de eventos

---

## Ventajas de la Arquitectura

### 1. Desacoplamiento ✅
- Servicios no conocen notificaciones, gamificación, analytics
- Cada handler es independiente
- Fácil agregar nuevos handlers sin modificar servicios

### 2. Mantenibilidad ✅
- Lógica de negocio separada de side-effects
- Código más limpio (Single Responsibility)
- Fácil de testear (mock del eventBus)

### 3. Escalabilidad ✅
- Handlers ejecutan en paralelo
- `emitAsync` no bloquea requests
- Preparado para migrar a message queue (RabbitMQ/Kafka)

### 4. Observabilidad ✅
- Todos los eventos registrados
- CorrelationId para tracing
- Logging detallado para debugging

### 5. Robustez ✅
- Errores en handlers NO rompen la aplicación
- Retry automático disponible
- Estadísticas de handlers ejecutados/fallidos

---

## Cómo Usar

### 1. Inicialización (ya configurado)

El EventBus se inicializa automáticamente al arrancar Fastify:

```typescript
// En app.ts (ya configurado)
await app.register(eventBusPlugin);
```

### 2. Emitir Eventos desde Servicios

```typescript
import { EventBus, createEvent, EventTypes } from '../infrastructure/events/index.js';

class MyService {
  constructor(
    private prisma: PrismaClient,
    private eventBus?: EventBus  // Inyección de dependencia
  ) {}

  async doSomething() {
    // ... lógica de negocio ...

    // Emitir evento
    if (this.eventBus) {
      const event = createEvent(EventTypes.BOOKING_CREATED, {
        bookingId: '123',
        userId: 'user-1',
        // ... más datos con tipado fuerte
      });

      // Fire-and-forget (recomendado)
      this.eventBus.emitAsync(event);

      // O esperar resultado (si necesitas saber si tuvo éxito)
      const result = await this.eventBus.emit(event);
    }
  }
}
```

### 3. Pasar EventBus a Servicios en Routes

```typescript
// En routes/bookings.ts
async function bookingsRoutes(fastify: FastifyInstance) {
  const bookingService = new BookingService(
    fastify.prisma,
    fastify.cache,
    fastify.eventBus  // <-- Agregar esto
  );
}
```

---

## Estado de Migración

### ✅ Completado
- [x] EventBus implementado y testeado
- [x] 15+ eventos del dominio definidos
- [x] 3 handlers funcionales (Notification, Gamification, Analytics)
- [x] Plugin de Fastify
- [x] Servicios de ejemplo con eventos
- [x] Script de seed de badges
- [x] Script de verificación
- [x] Tests unitarios
- [x] Documentación completa

### ⏳ Pendiente (Migración)
- [ ] Reemplazar `BookingService` con versión con eventos
- [ ] Reemplazar `MarketplaceService` con versión con eventos
- [ ] Actualizar routes para pasar eventBus
- [ ] Ejecutar seed de badges
- [ ] Tests de integración end-to-end
- [ ] Agregar más eventos (Story, Social, etc.)

**Ver:** `MIGRATION_GUIDE_EVENTS.md` para guía paso a paso.

---

## Próximos Pasos (Post-Migración)

### Corto Plazo
1. Agregar eventos faltantes:
   - `STORY_CREATED`
   - `USER_FOLLOWED`
   - `REVIEW_CREATED` (para experiences y products)

2. Push Notifications:
   - Implementar en NotificationHandler
   - Usar Web Push API

3. Email Notifications:
   - Crear EmailHandler
   - Integrar SendGrid/AWS SES

### Mediano Plazo
4. Webhooks:
   - Crear WebhookHandler
   - Permitir a usuarios suscribirse a eventos

5. Dashboard de Admin:
   - Ver estadísticas de EventBus
   - Monitor de handlers fallidos
   - Métricas de eventos emitidos

### Largo Plazo
6. Message Queue:
   - Migrar de EventBus in-memory a RabbitMQ/Kafka
   - Para mayor escalabilidad y persistencia

7. Event Sourcing:
   - Guardar todos los eventos en BD
   - Reconstruir estado desde eventos

---

## Estructura de Archivos Final

```
backend/
├── src/
│   ├── infrastructure/
│   │   └── events/
│   │       ├── EventBus.ts
│   │       ├── EventBus.test.ts
│   │       ├── types.ts
│   │       ├── index.ts
│   │       └── handlers/
│   │           ├── NotificationHandler.ts
│   │           ├── NotificationHandler.test.ts
│   │           ├── GamificationHandler.ts
│   │           └── AnalyticsHandler.ts
│   ├── plugins/
│   │   └── eventBus.ts
│   └── services/
│       ├── booking-with-events.service.ts      # Ejemplo
│       └── marketplace-with-events.service.ts  # Ejemplo
├── scripts/
│   ├── seed-badges.ts
│   └── check-eventbus.ts
└── docs/
    ├── EVENT_DRIVEN_ARCHITECTURE.md
    ├── MIGRATION_GUIDE_EVENTS.md
    └── EVENT_ARCHITECTURE_SUMMARY.md
```

---

## Comandos Rápidos

```bash
# Seed badges
npm run db:seed:badges

# Verificar EventBus
npm run check:eventbus

# Tests
npm test EventBus.test.ts
npm test NotificationHandler.test.ts

# Development
npm run dev
```

---

## Soporte y Troubleshooting

### EventBus no se inicializa
1. Verificar que `eventBusPlugin` está registrado en `app.ts`
2. Revisar logs al startup: `[EventBus] Initializing...`

### Eventos no se procesan
1. Verificar que service recibe `eventBus` en constructor
2. Revisar logs de EventBus (nivel INFO/DEBUG)
3. Ejecutar: `npm run check:eventbus`

### Handlers fallan
1. Revisar logs de EventBus (nivel ERROR)
2. Los errores en handlers NO detienen la app (por diseño)
3. Verificar que badges existen en BD: `npm run db:seed:badges`

### Performance
- Usar `emitAsync` para operaciones no críticas
- Handlers deben ser rápidos (< 100ms)
- Para operaciones lentas, usar job queue (Bull, BullMQ)

---

## Referencias

- **Documentación completa:** `EVENT_DRIVEN_ARCHITECTURE.md`
- **Guía de migración:** `MIGRATION_GUIDE_EVENTS.md`
- **Event Sourcing:** https://martinfowler.com/eaaDev/EventSourcing.html
- **Domain Events:** https://leanpub.com/implementing-domain-driven-design

---

**Creado por:** Claude Opus 4.5
**Fecha:** 2026-01-25
**Versión:** 1.0.0
