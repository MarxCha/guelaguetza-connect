# Guía de Migración - Event-Driven Architecture

Esta guía explica cómo integrar completamente el sistema de eventos en el proyecto.

## Estado Actual

### ✅ Completado
- EventBus implementado (`infrastructure/events/EventBus.ts`)
- Tipos de eventos definidos (`infrastructure/events/types.ts`)
- Handlers implementados:
  - NotificationHandler
  - GamificationHandler
  - AnalyticsHandler
- Plugin de EventBus (`plugins/eventBus.ts`)
- Tests para EventBus y handlers
- Documentación completa

### ⏳ Pendiente
- Integrar eventos en servicios existentes
- Actualizar rutas para pasar eventBus a servicios
- Seed de badges en la base de datos
- Tests de integración

## Pasos de Migración

### 1. Verificar EventBus está inicializado

El EventBus ya está registrado en `app.ts`:

```typescript
// Verifica que esto existe en app.ts
import eventBusPlugin from './plugins/eventBus.js';

await app.register(eventBusPlugin);
```

**Verificación:**
```bash
# Al iniciar el server deberías ver:
[EventBus] Initializing...
[EventBus] Registering handlers...
[EventBus] Initialized successfully
```

### 2. Actualizar BookingService

**Archivo:** `src/services/booking.service.ts`

**Opción A - Reemplazo completo:**
```bash
# Respaldar el archivo actual
cp src/services/booking.service.ts src/services/booking.service.backup.ts

# Copiar la versión con eventos
cp src/services/booking-with-events.service.ts src/services/booking.service.ts
```

**Opción B - Integración manual:**

1. Agregar EventBus al constructor:
```typescript
import { EventBus, createEvent, EventTypes } from '../infrastructure/events/index.js';

export class BookingService {
  constructor(
    private prisma: PrismaClient,
    private cache?: CacheService,
    private eventBus?: EventBus  // <-- Agregar esto
  ) {}
}
```

2. En `createBooking()`, después de crear booking y payment intent:
```typescript
// FASE 4: Emitir evento BookingCreated
if (this.eventBus) {
  const [user, host] = await Promise.all([
    this.prisma.user.findUnique({
      where: { id: userId },
      select: { nombre: true, apellido: true },
    }),
    this.prisma.user.findUnique({
      where: { id: experience.hostId },
      select: { nombre: true },
    }),
  ]);

  const event = createEvent(EventTypes.BOOKING_CREATED, {
    bookingId: booking.id,
    userId,
    userName: user ? `${user.nombre} ${user.apellido || ''}`.trim() : undefined,
    experienceId,
    experienceTitle: experience.title,
    hostId: experience.hostId,
    hostName: host?.nombre || 'Host',
    guestCount,
    totalPrice,
    timeSlot: {
      date: timeSlot.date.toISOString().split('T')[0],
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
    },
  });
  this.eventBus.emitAsync(event);
}
```

3. Similar para `confirmBooking()`, `cancelBooking()`, y `completeBooking()`

Ver `booking-with-events.service.ts` para referencia completa.

### 3. Actualizar MarketplaceService

**Archivo:** `src/services/marketplace.service.ts`

Seguir el mismo patrón que BookingService.

Ver `marketplace-with-events.service.ts` para referencia completa.

### 4. Actualizar Routes para pasar EventBus

**Archivo:** `src/routes/bookings.ts`

```typescript
async function bookingsRoutes(fastify: FastifyInstance) {
  // ANTES:
  const bookingService = new BookingService(fastify.prisma, fastify.cache);

  // DESPUÉS:
  const bookingService = new BookingService(
    fastify.prisma,
    fastify.cache,
    fastify.eventBus  // <-- Agregar esto
  );

  // ... resto del código
}
```

**Archivo:** `src/routes/marketplace.ts`

```typescript
async function marketplaceRoutes(fastify: FastifyInstance) {
  // ANTES:
  const marketplaceService = new MarketplaceService(fastify.prisma);

  // DESPUÉS:
  const marketplaceService = new MarketplaceService(
    fastify.prisma,
    fastify.eventBus  // <-- Agregar esto
  );

  // ... resto del código
}
```

### 5. Seed de Badges en la Base de Datos

**Crear archivo:** `backend/prisma/seeds/badges.ts`

```typescript
import { PrismaClient } from '@prisma/client';

const badges = [
  // Booking Badges
  {
    code: 'FIRST_BOOKING',
    name: 'Primera Reservación',
    description: 'Completaste tu primera reservación',
    icon: '🎉',
    category: 'ENGAGEMENT',
    xpReward: 25,
    threshold: 1,
  },
  {
    code: 'EXPLORER',
    name: 'Explorador',
    description: 'Completaste 5 reservaciones',
    icon: '🗺️',
    category: 'ENGAGEMENT',
    xpReward: 50,
    threshold: 5,
  },
  {
    code: 'ADVENTURER',
    name: 'Aventurero',
    description: 'Completaste 10 reservaciones',
    icon: '⛰️',
    category: 'ENGAGEMENT',
    xpReward: 100,
    threshold: 10,
  },
  {
    code: 'CULTURE_LOVER',
    name: 'Amante de la Cultura',
    description: 'Completaste 25 reservaciones',
    icon: '🎭',
    category: 'ENGAGEMENT',
    xpReward: 250,
    threshold: 25,
  },

  // Marketplace Badges
  {
    code: 'FIRST_SALE',
    name: 'Primera Venta',
    description: 'Realizaste tu primera venta',
    icon: '🛒',
    category: 'ENGAGEMENT',
    xpReward: 25,
    threshold: 1,
  },
  {
    code: 'MERCHANT',
    name: 'Comerciante',
    description: 'Realizaste 10 ventas',
    icon: '🏪',
    category: 'ENGAGEMENT',
    xpReward: 100,
    threshold: 10,
  },
  {
    code: 'MASTER_CRAFTSMAN',
    name: 'Maestro Artesano',
    description: 'Realizaste 50 ventas',
    icon: '👨‍🎨',
    category: 'ENGAGEMENT',
    xpReward: 500,
    threshold: 50,
  },

  // Story Badges
  {
    code: 'STORYTELLER',
    name: 'Narrador',
    description: 'Publicaste tu primera historia',
    icon: '📖',
    category: 'STORIES',
    xpReward: 10,
    threshold: 1,
  },
  {
    code: 'CONTENT_CREATOR',
    name: 'Creador de Contenido',
    description: 'Publicaste 10 historias',
    icon: '📸',
    category: 'STORIES',
    xpReward: 50,
    threshold: 10,
  },
  {
    code: 'INFLUENCER',
    name: 'Influencer',
    description: 'Publicaste 50 historias',
    icon: '⭐',
    category: 'STORIES',
    xpReward: 200,
    threshold: 50,
  },

  // Social Badges
  {
    code: 'POPULAR',
    name: 'Popular',
    description: 'Tienes 10 seguidores',
    icon: '👥',
    category: 'SOCIAL',
    xpReward: 25,
    threshold: 10,
  },
  {
    code: 'CELEBRITY',
    name: 'Celebridad',
    description: 'Tienes 50 seguidores',
    icon: '🌟',
    category: 'SOCIAL',
    xpReward: 100,
    threshold: 50,
  },
  {
    code: 'LEGEND',
    name: 'Leyenda',
    description: 'Tienes 100 seguidores',
    icon: '👑',
    category: 'SOCIAL',
    xpReward: 250,
    threshold: 100,
  },

  // Engagement Badges
  {
    code: 'CRITIC',
    name: 'Crítico',
    description: 'Escribiste 5 reseñas',
    icon: '✍️',
    category: 'ENGAGEMENT',
    xpReward: 25,
    threshold: 5,
  },
  {
    code: 'EXPERT_REVIEWER',
    name: 'Experto Revisor',
    description: 'Escribiste 20 reseñas',
    icon: '🏆',
    category: 'ENGAGEMENT',
    xpReward: 100,
    threshold: 20,
  },

  // Level Badges
  {
    code: 'LEVEL_5',
    name: 'Nivel 5',
    description: 'Alcanzaste el nivel 5',
    icon: '🎖️',
    category: 'SPECIAL',
    xpReward: 50,
    threshold: 1,
  },
  {
    code: 'LEVEL_10',
    name: 'Nivel 10',
    description: 'Alcanzaste el nivel 10',
    icon: '🏅',
    category: 'SPECIAL',
    xpReward: 150,
    threshold: 1,
  },
];

export async function seedBadges(prisma: PrismaClient) {
  console.log('Seeding badges...');

  for (const badge of badges) {
    await prisma.badge.upsert({
      where: { code: badge.code },
      update: badge,
      create: badge,
    });
  }

  console.log(`✅ Seeded ${badges.length} badges`);
}
```

**Ejecutar seed:**
```typescript
// En prisma/seed.ts (o crear si no existe)
import { PrismaClient } from '@prisma/client';
import { seedBadges } from './seeds/badges.js';

const prisma = new PrismaClient();

async function main() {
  await seedBadges(prisma);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

```bash
# Ejecutar seed
npx tsx prisma/seed.ts
```

### 6. Verificación y Testing

#### 6.1 Verificar Inicialización

```bash
# Iniciar servidor
npm run dev

# Deberías ver en los logs:
[EventBus] Initializing...
[EventBus] Registering handlers...
[EventBus] Initialized successfully { totalEventTypes: X, totalHandlers: Y }
```

#### 6.2 Test Manual - Crear Booking

1. Crear una booking a través del API
2. Verificar en logs:
```
[EventBus] Emitting event: booking.created
[EventBus] Handler completed: NotificationHandler.onBookingCreated
[EventBus] Handler completed: AnalyticsHandler.onBookingCreated
[EventBus] Event processing completed: booking.created
```

3. Verificar en BD:
```sql
-- Debe haber una notificación para el host
SELECT * FROM "Notification" WHERE type = 'SYSTEM' ORDER BY "createdAt" DESC LIMIT 1;

-- Debe haber un log de actividad
SELECT * FROM "ActivityLog" WHERE action = 'CREATE_BOOKING' ORDER BY "createdAt" DESC LIMIT 1;
```

#### 6.3 Test de Gamificación

1. Completar una booking
2. Verificar XP otorgado:
```sql
SELECT * FROM "UserStats" WHERE "userId" = 'tu-user-id';
```

3. Verificar badge desbloqueado:
```sql
SELECT ub.*, b.name
FROM "UserBadge" ub
JOIN "Badge" b ON ub."badgeId" = b.id
WHERE ub."userId" = 'tu-user-id';
```

#### 6.4 Ejecutar Tests Unitarios

```bash
# Test del EventBus
npm test -- EventBus.test.ts

# Test de NotificationHandler
npm test -- NotificationHandler.test.ts
```

### 7. Monitoreo y Debugging

#### 7.1 Ver Estadísticas del EventBus

Crear endpoint temporal (o agregar a `/health`):

```typescript
// En app.ts o en una ruta de admin
app.get('/debug/eventbus', async (request, reply) => {
  return fastify.eventBus.getStats();
});
```

#### 7.2 Logs

Los logs del EventBus incluyen:
- Eventos emitidos
- Handlers ejecutados
- Errores en handlers
- Duración de procesamiento

Nivel `DEBUG` (solo en development):
```typescript
// En .env
NODE_ENV=development
```

### 8. Rollback (si algo falla)

Si necesitas revertir los cambios:

```bash
# Restaurar BookingService
cp src/services/booking.service.backup.ts src/services/booking.service.ts

# Comentar registro de eventBus en app.ts
# await app.register(eventBusPlugin);
```

Los handlers NO afectarán el funcionamiento si eventBus no está inicializado.

## Checklist de Migración

- [ ] EventBus inicializado en app.ts
- [ ] BookingService actualizado con eventos
- [ ] MarketplaceService actualizado con eventos
- [ ] Routes actualizadas para pasar eventBus
- [ ] Badges seeded en BD
- [ ] Tests manuales pasados (crear booking, verificar notificaciones)
- [ ] Tests unitarios pasados
- [ ] Logs verificados (no hay errores)
- [ ] EventBus stats muestran handlers registrados

## Próximos Pasos (Post-Migración)

1. **Agregar más eventos:**
   - Review created (cuando se crea una reseña)
   - Story created (cuando se publica una historia)
   - User followed (cuando alguien sigue a otro)

2. **Push Notifications:**
   - Implementar en NotificationHandler
   - Usar Web Push API

3. **Email Notifications:**
   - Agregar EmailHandler
   - Integrar con SendGrid/AWS SES

4. **Webhooks:**
   - Agregar WebhookHandler
   - Permitir a usuarios suscribirse a eventos

5. **Message Queue:**
   - Migrar de EventBus in-memory a RabbitMQ/Kafka
   - Para mayor escalabilidad

## Soporte

Si encuentras problemas:

1. Revisa logs del EventBus
2. Verifica que handlers están registrados (`/debug/eventbus`)
3. Asegúrate de que eventBus se pasa a servicios en routes
4. Revisa tests para ejemplos de uso

**Documentación completa:** `EVENT_DRIVEN_ARCHITECTURE.md`
