# Análisis Exhaustivo de Arquitectura y Lógica de Negocio
## Guelaguetza Connect

**Fecha de análisis:** 2026-01-25
**Versión:** 1.0.0
**Stack:** React + Fastify + Prisma + PostgreSQL + Stripe

---

## 📋 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Diagrama de Arquitectura](#diagrama-de-arquitectura)
3. [Modelo de Datos](#modelo-de-datos)
4. [Backend: Estructura y Servicios](#backend-estructura-y-servicios)
5. [Flujos de Negocio Críticos](#flujos-de-negocio-críticos)
6. [Patrones y Estrategias Implementadas](#patrones-y-estrategias-implementadas)
7. [Frontend: Arquitectura de Componentes](#frontend-arquitectura-de-componentes)
8. [Integraciones Externas](#integraciones-externas)
9. [Seguridad y Autenticación](#seguridad-y-autenticación)
10. [Deuda Técnica y Oportunidades](#deuda-técnica-y-oportunidades)
11. [Recomendaciones](#recomendaciones)

---

## 1. Resumen Ejecutivo

### Visión General

**Guelaguetza Connect** es una plataforma cultural multifuncional que combina:
- Red social (stories, likes, comentarios, followers)
- Marketplace de artesanías
- Sistema de reservaciones de experiencias culturales
- Transporte público en tiempo real
- Comunidades y eventos
- Streaming en vivo
- AR/Mapas con puntos de interés
- Gamificación (badges, XP, niveles)

### Características Clave

- **Arquitectura moderna**: REST API con Fastify, TypeScript strict, Prisma ORM
- **Validaciones robustas**: Zod schemas en todos los endpoints
- **Concurrencia manejada**: Optimistic locking para prevenir race conditions
- **Pagos seguros**: Integración con Stripe (PaymentIntents)
- **PWA completa**: Offline-first, notificaciones push, instalable
- **Roles y permisos**: USER, SELLER, MODERATOR, ADMIN
- **Real-time**: WebSockets para chat, streaming, notificaciones

### Tecnologías Principales

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Frontend | React | 19.2.3 |
| Backend | Fastify | 5.2.0 |
| ORM | Prisma | 6.2.1 |
| Base de Datos | PostgreSQL | - |
| Validación | Zod | 3.24.1 |
| Autenticación | JWT (@fastify/jwt) | 9.0.1 |
| Pagos | Stripe | 20.1.0 |
| Testing | Vitest | 4.0.18 |

---

## 2. Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (React PWA)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Components/                                                            │
│  ├─ HomeView, StoriesView, ProfileView                                 │
│  ├─ TiendaView, CartView, CheckoutView (Marketplace)                   │
│  ├─ ExperiencesView, MyBookingsView (Reservaciones)                    │
│  ├─ ARMapView, POIDetailView (AR/Maps)                                 │
│  ├─ CommunitiesView, StreamsView                                       │
│  └─ Admin Dashboards (UsersManagement, MetricsDashboard)               │
│                                                                         │
│  Contexts/                                                              │
│  ├─ AuthContext (login, logout, JWT)                                   │
│  └─ LanguageContext (i18n)                                             │
│                                                                         │
│  Services/                                                              │
│  └─ API clients (fetch wrappers)                                       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ HTTP/WebSocket
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                    BACKEND (Fastify + TypeScript)                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Routes/ (Controllers)                                                  │
│  ├─ /auth - Login, Register, Profile                                   │
│  ├─ /stories - CRUD Stories, Likes, Comments                           │
│  ├─ /marketplace - Products, Cart, Orders                              │
│  ├─ /bookings - Experiences, TimeSlots, Bookings                       │
│  ├─ /events - Guelaguetza Calendar, RSVPs                              │
│  ├─ /communities - Groups, Posts, Members                              │
│  ├─ /streams - Live Streaming                                          │
│  ├─ /poi - Points of Interest (AR)                                     │
│  ├─ /admin - User Management, Analytics                                │
│  └─ /transport - Bus Routes, Real-time Tracking                        │
│                                                                         │
│  Services/ (Business Logic)                                            │
│  ├─ AuthService - Authentication, Registration                         │
│  ├─ BookingService - Experience CRUD, Reservations                     │
│  ├─ MarketplaceService - Products, Orders, Cart                        │
│  ├─ StripeService - Payments, Refunds                                  │
│  ├─ NotificationService - Push Notifications                           │
│  ├─ GamificationService - Badges, XP, Leaderboard                      │
│  └─ 15+ more services...                                               │
│                                                                         │
│  Middleware/                                                            │
│  ├─ authenticate (JWT verification)                                    │
│  ├─ requireAdmin, requireModerator                                     │
│  └─ checkBanned                                                         │
│                                                                         │
│  Utils/                                                                 │
│  ├─ errors.ts - Custom error classes                                   │
│  └─ optimistic-locking.ts - Concurrency control                        │
│                                                                         │
│  Jobs/                                                                  │
│  └─ cleanup-payments.job.ts - Clean failed payments                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    │ Prisma ORM
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                       DATABASE (PostgreSQL)                             │
├─────────────────────────────────────────────────────────────────────────┤
│  Users, Stories, Likes, Comments, Follow                                │
│  Products, Orders, Cart, SellerProfile                                  │
│  Experiences, TimeSlots, Bookings, Reviews                              │
│  Events, Communities, Streams, POI                                      │
│  Badges, Notifications, ActivityLogs                                    │
│  BusRoutes, Stops, Buses (Transport)                                    │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                      ┌─────────────┴─────────────┐
                      ▼                           ▼
        ┌──────────────────────┐    ┌──────────────────────┐
        │   Stripe API         │    │   Google Gemini      │
        │   - Payments         │    │   - AI Chatbot       │
        │   - Refunds          │    │                      │
        │   - Connected Accts  │    │                      │
        └──────────────────────┘    └──────────────────────┘
```

---

## 3. Modelo de Datos

### 3.1 Entidades Principales

El schema de Prisma define **42 modelos** organizados en 11 dominios:

#### A. Usuarios y Social (7 modelos)
```prisma
User            - Usuario principal (email, password, role, avatar)
Story           - Historias (imagen/video, location, views)
Like            - Me gustas a stories
Comment         - Comentarios en stories
Follow          - Sistema de followers/following
UserStats       - XP, level, streaks
Badge/UserBadge - Gamificación
```

#### B. Marketplace (7 modelos)
```prisma
SellerProfile   - Perfil de vendedor (rating, stripeAccountId)
Product         - Productos artesanales (precio, stock, categoría)
Cart/CartItem   - Carrito de compras
Order           - Órdenes (status, stripePaymentId)
OrderItem       - Items de orden
ProductReview   - Reseñas de productos
```

#### C. Reservaciones (4 modelos)
```prisma
Experience           - Tours, talleres, degustaciones
ExperienceTimeSlot   - Horarios disponibles (con versioning)
Booking              - Reservaciones (status, guestCount)
ExperienceReview     - Reseñas de experiencias
```

#### D. Eventos (3 modelos)
```prisma
Event          - Calendario Guelaguetza (danzas, ceremonias)
EventRSVP      - Confirmaciones de asistencia
EventReminder  - Recordatorios
```

#### E. Comunidades (3 modelos)
```prisma
Community       - Grupos por región/interés
CommunityMember - Membresía (role: MEMBER, MODERATOR, ADMIN)
CommunityPost   - Posts dentro de comunidades
```

#### F. Streaming (2 modelos)
```prisma
LiveStream      - Transmisiones en vivo
StreamMessage   - Chat del stream
```

#### G. AR/Mapas (3 modelos)
```prisma
PointOfInterest - POIs culturales/turísticos
POIReview       - Reseñas de POIs
POIFavorite     - POIs favoritos
POICheckIn      - Check-ins en POIs
```

#### H. Transporte (3 modelos)
```prisma
BusRoute  - Rutas de transporte público
Stop      - Paradas (lat/lng, sequence)
Bus       - Buses en tiempo real (GPS tracking)
```

#### I. Notificaciones (2 modelos)
```prisma
Notification      - Notificaciones in-app
PushSubscription  - Suscripciones web push
```

#### J. Mensajería (3 modelos)
```prisma
DirectConversation - Conversaciones 1-1
DirectMessage      - Mensajes directos
Conversation       - Chat con IA (Gemini)
Message            - Mensajes del chat IA
```

#### K. Analytics (1 modelo)
```prisma
ActivityLog - Logs de acciones (CREATE_STORY, LIKE, etc.)
```

### 3.2 Enumeraciones Críticas

```typescript
// Roles de usuario
enum UserRole {
  USER, MODERATOR, ADMIN
}

// Estados de reservación (con flujo de pago en 3 fases)
enum BookingStatus {
  PENDING_PAYMENT  // Fase 1: Inventario reservado
  PENDING          // Fase 2: Payment intent creado
  PAYMENT_FAILED   // Error en Stripe
  CONFIRMED        // Pago confirmado
  CANCELLED
  COMPLETED
}

// Estados de orden
enum OrderStatus {
  PENDING_PAYMENT, PENDING, PAYMENT_FAILED,
  PAID, PROCESSING, SHIPPED, DELIVERED,
  CANCELLED, REFUNDED
}

// Categorías de productos
enum ProductCategory {
  ARTESANIA, MEZCAL, TEXTIL, CERAMICA,
  JOYERIA, GASTRONOMIA, OTRO
}

// Categorías de experiencias
enum ExperienceCategory {
  TOUR, TALLER, DEGUSTACION, CLASE, VISITA
}

// Tipos de notificación
enum NotificationType {
  NEW_FOLLOWER, LIKE, COMMENT, BADGE_UNLOCKED,
  LEVEL_UP, DIRECT_MESSAGE, EVENT_REMINDER, SYSTEM
}
```

### 3.3 Relaciones Clave

```
User (1) ──────< (N) Story
User (1) ──────< (N) Booking
User (1) ──────< (N) Order
User (1) ──────< (N) Experience (as host)
User (1) ──────< (N) Product (via SellerProfile)

Experience (1) ──< (N) ExperienceTimeSlot
Experience (1) ──< (N) Booking

Order (1) ──< (N) OrderItem ──> (1) Product

Community (1) ──< (N) CommunityMember
Community (1) ──< (N) CommunityPost
```

### 3.4 Campos Críticos para Concurrencia

```prisma
model ExperienceTimeSlot {
  bookedCount  Int  @default(0)
  capacity     Int
  version      Int  @default(1)  // ← OPTIMISTIC LOCKING
}

model Product {
  stock  Int  @default(0)
}
```

---

## 4. Backend: Estructura y Servicios

### 4.1 Estructura de Directorios

```
backend/src/
├── index.ts              # Entry point
├── app.ts                # Fastify app builder
│
├── plugins/
│   ├── prisma.ts         # Prisma plugin
│   └── auth.ts           # JWT authentication
│
├── middleware/
│   └── admin.ts          # Role-based access control
│
├── routes/              # 17 route files (controllers)
│   ├── auth.ts
│   ├── bookings.ts      # 14 endpoints
│   ├── marketplace.ts
│   ├── stories.ts
│   ├── events.ts
│   ├── communities.ts
│   ├── streams.ts
│   ├── poi.ts
│   ├── transport.ts
│   └── ...
│
├── services/            # 17 service files (business logic)
│   ├── auth.service.ts
│   ├── booking.service.ts     # 850 líneas
│   ├── marketplace.service.ts # 816 líneas
│   ├── stripe.service.ts
│   ├── story.service.ts
│   ├── gamification.service.ts
│   ├── notification.service.ts
│   └── ...
│
├── schemas/             # 14 Zod validation schemas
│   ├── booking.schema.ts
│   ├── marketplace.schema.ts
│   ├── auth.schema.ts
│   └── ...
│
├── utils/
│   ├── errors.ts              # Custom error classes
│   └── optimistic-locking.ts  # Concurrency utilities
│
└── jobs/
    ├── cleanup-payments.job.ts  # Cleanup failed payments
    └── scheduler.ts             # Job scheduler (cron)
```

### 4.2 Servicios Principales

#### BookingService (850 LOC)
**Responsabilidades:**
- CRUD de experiencias
- Gestión de time slots
- Crear/confirmar/cancelar reservaciones
- Cálculo de disponibilidad
- Reviews de experiencias
- Dashboard de host
- Limpieza de pagos fallidos

**Métodos clave:**
```typescript
getExperiences(query)           // Búsqueda con filtros
getExperienceById(id)           // Detalle con reviews
createExperience(hostId, data)
updateExperience(id, hostId, data)
getTimeSlots(experienceId, query)
createBooking(userId, data)     // ← Con optimistic locking
confirmBooking(id, userId)
cancelBooking(id, userId)       // ← Con refund de Stripe
completeBooking(id, hostId)
cleanupFailedBookings(timeout)  // ← Job de limpieza
```

**Flujo de Pago (3 fases):**
1. **Fase 1**: Validar + Crear booking (PENDING_PAYMENT) + Reservar slot
2. **Fase 2**: Llamar Stripe (fuera de transacción)
3. **Fase 3**: Actualizar con stripePaymentId (status: PENDING)

#### MarketplaceService (816 LOC)
**Responsabilidades:**
- CRUD de productos
- Gestión de carrito
- Creación de órdenes
- Gestión de perfil de vendedor
- Reviews de productos
- Actualización de stock

**Métodos clave:**
```typescript
getProducts(query)
createProduct(userId, data)
getCart(userId)
addToCart(userId, data)
createOrder(userId, data)        // ← Multi-seller orders
updateOrderStatus(id, userId, status)
createSellerProfile(userId, data)
cleanupFailedOrders(timeout)
```

**Flujo de Order (similar a bookings):**
1. Validar stock + Crear orden + Reservar stock
2. Crear payment intent(s) por vendedor
3. Actualizar con stripePaymentId

#### StripeService (Singleton)
**Responsabilidades:**
- Crear payment intents
- Consultar estado de pagos
- Crear refunds
- Gestión de connected accounts (vendedores)
- Webhooks

**Métodos:**
```typescript
createPaymentIntent({ amount, metadata })
getPaymentStatus(paymentIntentId)
createRefund(paymentIntentId, amount?)
createConnectedAccount(email)
constructWebhookEvent(payload, signature)
```

**Modo mock:** Si `STRIPE_SECRET_KEY` no existe, retorna mocks para desarrollo.

#### AuthService
**Responsabilidades:**
- Registro con bcrypt hash
- Login con validación de contraseña
- Obtener/actualizar perfil

```typescript
register(data: RegisterInput)
login(email, password)
getProfile(userId)
updateProfile(userId, data)
```

#### GamificationService
**Responsabilidades:**
- Otorgar XP por acciones
- Desbloquear badges
- Calcular niveles
- Actualizar streaks
- Leaderboard

```typescript
awardXP(userId, amount, action)
checkAndUnlockBadges(userId)
updateStreak(userId)
getLeaderboard(timeframe, limit)
```

### 4.3 Validación con Zod

Todos los endpoints usan **Zod schemas** para validación:

```typescript
// booking.schema.ts
export const CreateBookingSchema = z.object({
  experienceId: z.string().cuid(),
  timeSlotId: z.string().cuid(),
  guestCount: z.number().int().min(1),
  specialRequests: z.string().optional()
});

// En route
app.post('/bookings', {
  schema: { body: CreateBookingSchema }
}, async (request, reply) => {
  // request.body es type-safe
});
```

**Ventajas:**
- Validación automática antes de llegar al handler
- Tipos TypeScript inferidos
- Errores consistentes (422 Unprocessable Entity)
- Auto-documentación

### 4.4 Error Handling

#### Custom Error Classes

```typescript
class AppError extends Error {
  statusCode: number;
  details?: string;
}

class NotFoundError extends AppError {
  constructor(message = 'Recurso no encontrado') {
    super(message, 404);
  }
}

class ConcurrencyError extends AppError {
  constructor(message = 'Conflicto de concurrencia') {
    super(message, 409);
  }
}
```

#### Global Error Handler

```typescript
app.setErrorHandler((error, request, reply) => {
  // Zod validation errors
  if (error instanceof ZodError) {
    return reply.status(422).send({
      error: 'Error de validación',
      details: error.errors.map(e => ({
        field: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Custom errors
  const statusCode = error.statusCode || 500;
  reply.status(statusCode).send({ error: error.message });
});
```

---

## 5. Flujos de Negocio Críticos

### 5.1 Flujo de Reservación de Experiencia

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Usuario busca experiencias                               │
│    GET /api/bookings/experiences?category=TOUR              │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. Usuario selecciona experiencia                           │
│    GET /api/bookings/experiences/:id                        │
│    (incluye reviews, host info, rating)                     │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Usuario consulta horarios disponibles                    │
│    GET /api/bookings/experiences/:id/slots?startDate=...    │
│    Respuesta: [{ capacity: 10, bookedCount: 3, ... }]      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Usuario crea reservación                                 │
│    POST /api/bookings/bookings                              │
│    { experienceId, timeSlotId, guestCount: 2 }             │
│                                                             │
│    FASE 1: Transacción DB (< 100ms)                        │
│    ├─ Validar disponibilidad                               │
│    ├─ Crear booking (status: PENDING_PAYMENT)              │
│    └─ Reservar slot con optimistic locking                 │
│                                                             │
│    FASE 2: Stripe API (1-3s)                               │
│    ├─ Crear PaymentIntent                                  │
│    └─ Si error → marcar PAYMENT_FAILED                     │
│                                                             │
│    FASE 3: Actualización                                   │
│    └─ Actualizar con stripePaymentId (status: PENDING)     │
│                                                             │
│    Respuesta: { booking, clientSecret }                    │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Frontend procesa pago con Stripe Elements                │
│    (fuera del backend)                                      │
└─────────────────────────────────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Usuario confirma reservación                             │
│    POST /api/bookings/bookings/:id/confirm                  │
│    ├─ Verifica pago en Stripe                              │
│    └─ Actualiza status: CONFIRMED                          │
└─────────────────────────────────────────────────────────────┘
```

**Manejo de Race Conditions:**

Si dos usuarios intentan reservar los últimos espacios simultáneamente:

```typescript
// Thread A lee: bookedCount=8, capacity=10
// Thread B lee: bookedCount=8, capacity=10
// Ambos validan: 8 + 2 = 10 ✓

// Thread A ejecuta: UPDATE WHERE version=1 SET bookedCount=10, version=2
// Thread B ejecuta: UPDATE WHERE version=1 SET bookedCount=10, version=2
//   └─ FALLA porque version ya es 2

// Thread B reintenta:
//   Lee: bookedCount=10, capacity=10
//   Valida: 10 + 2 > 10 ✗
//   Rechaza: "No hay espacio disponible"
```

### 5.2 Flujo de Compra en Marketplace

```
1. Agregar al carrito
   POST /api/marketplace/cart/items
   { productId, quantity }

2. Ver carrito
   GET /api/marketplace/cart
   Respuesta: { items, subtotal, itemCount }

3. Checkout
   POST /api/marketplace/orders
   { shippingAddress }

   PROCESO:
   - Agrupar items por vendedor (multi-seller support)
   - Para cada vendedor:
     * Validar stock
     * Crear Order (status: PENDING_PAYMENT)
     * Reservar stock
     * Crear PaymentIntent
     * Actualizar con stripePaymentId
   - Vaciar carrito

   Respuesta: [{ order, clientSecret }, ...]

4. Confirmar pago (frontend con Stripe)

5. Actualizar estado
   PUT /api/marketplace/orders/:id/status
   { status: 'PAID' }
```

**Estados de orden:**
```
PENDING_PAYMENT → PENDING → PAID → PROCESSING → SHIPPED → DELIVERED
       │             │        └─→ REFUNDED
       │             └─→ CANCELLED
       └─→ PAYMENT_FAILED → (retry)
```

### 5.3 Flujo de Autenticación

```
REGISTRO:
POST /api/auth/register
{ email, password, nombre, apellido?, region? }
├─ Verificar email único
├─ Hashear password (bcrypt, 10 rounds)
├─ Crear usuario (role: USER por defecto)
└─ Generar JWT token

Respuesta: { user, token }

LOGIN:
POST /api/auth/login
{ email, password }
├─ Buscar usuario por email
├─ Comparar password hasheado
├─ Verificar si está baneado
└─ Generar JWT token

Respuesta: { user, token }

ACCESO A RECURSOS PROTEGIDOS:
GET /api/bookings/bookings
Header: Authorization: Bearer <token>
├─ Middleware: authenticate
│  ├─ Verificar JWT signature
│  ├─ Extraer userId del payload
│  ├─ Consultar usuario en DB (incluye role, bannedAt)
│  ├─ Si está baneado → 403 Forbidden
│  └─ Adjuntar request.user
└─ Handler accede a request.user.userId
```

### 5.4 Sistema de Gamificación

```
ACCIÓN DEL USUARIO → TRIGGERS XP

Ejemplos:
- Crear story      → awardXP(userId, 10, 'CREATE_STORY')
- Primer follower  → awardXP(userId, 5, 'FIRST_FOLLOWER')
- Like recibido    → awardXP(userId, 2, 'LIKE_RECEIVED')
- Story viral      → awardXP(userId, 50, 'VIRAL_STORY')

PROCESO:
1. Actualizar UserStats.xp
2. Calcular nuevo level (formula: level = √(xp / 100))
3. Verificar badges desbloqueables:
   - "Primer Relato" (1 story)
   - "Narrador Constante" (10 stories)
   - "Conectado" (50 followers)
4. Si desbloquea badge:
   - Crear UserBadge
   - Enviar notificación (BADGE_UNLOCKED)
   - Otorgar XP del badge
5. Si sube de nivel:
   - Enviar notificación (LEVEL_UP)
```

**Streaks (rachas):**
```typescript
updateStreak(userId) {
  const lastVisit = user.stats.lastVisitDate;
  const now = new Date();

  if (isYesterday(lastVisit)) {
    // Continuar racha
    stats.currentStreak++;
    if (stats.currentStreak > stats.longestStreak) {
      stats.longestStreak = stats.currentStreak;
    }
  } else if (!isToday(lastVisit)) {
    // Racha rota
    stats.currentStreak = 1;
  }

  stats.lastVisitDate = now;
}
```

### 5.5 Sistema de Notificaciones

```
TRIGGER DE EVENTO → CREAR NOTIFICACIÓN

Ejemplos:
- Nuevo follower:
  notificationService.create(followedUserId, {
    type: 'NEW_FOLLOWER',
    title: `${follower.nombre} te está siguiendo`,
    body: '',
    data: { followerId: follower.id }
  });

- Like en story:
  notificationService.create(story.userId, {
    type: 'LIKE',
    title: 'Te han dado me gusta',
    body: `A ${liker.nombre} le gustó tu historia`,
    data: { storyId, likerId }
  });

- Badge desbloqueado:
  notificationService.create(userId, {
    type: 'BADGE_UNLOCKED',
    title: '¡Insignia desbloqueada!',
    body: badge.name,
    data: { badgeId }
  });

ENTREGA:
1. Guardar en DB (Notification table)
2. Si hay PushSubscription activa:
   - Enviar web push notification
3. Si hay WebSocket conectado:
   - Enviar en tiempo real
```

---

## 6. Patrones y Estrategias Implementadas

### 6.1 Optimistic Locking

**Problema:** Race conditions en reservaciones concurrentes

**Solución:** Campo `version` en `ExperienceTimeSlot`

```typescript
// ❌ SIN LOCKING (inseguro)
await prisma.experienceTimeSlot.update({
  where: { id },
  data: { bookedCount: { increment: 2 } }
});

// ✓ CON LOCKING (seguro)
const currentVersion = timeSlot.version;
const result = await prisma.experienceTimeSlot.updateMany({
  where: { id, version: currentVersion },
  data: {
    bookedCount: { increment: 2 },
    version: { increment: 1 }
  }
});

if (result.count === 0) {
  throw new ConcurrencyError('Conflicto detectado');
}
```

**Ventajas:**
- No requiere locks pesados
- Permite alta concurrencia
- Detecta conflictos después del hecho
- Retry automático con backoff exponencial

**Implementación:**
```typescript
withRetry(
  async () => {
    // Operación con locking
  },
  { maxRetries: 3, retryDelay: 100 }
);
```

### 6.2 Three-Phase Payment Flow

**Motivación:** Evitar transacciones DB largas esperando respuestas de Stripe

**Fases:**

1. **Validación + Reserva (< 100ms)**
   - Transacción DB rápida
   - Crear booking/orden en PENDING_PAYMENT
   - Reservar inventario con optimistic locking

2. **Stripe API (1-3s, fuera de transacción)**
   - Crear PaymentIntent
   - Si falla → marcar PAYMENT_FAILED (inventario queda reservado)

3. **Actualización (< 50ms)**
   - Guardar stripePaymentId
   - Cambiar a estado PENDING

**Ventajas:**
- Transacciones DB rápidas (reduce locks)
- Inventario reservado durante pago
- Usuario puede reintentar sin perder reserva
- Cleanup job restaura inventario de pagos abandonados

**Cleanup Job:**
```typescript
// Ejecutar cada 15 minutos
cleanupFailedBookings(timeoutMinutes = 30) {
  // Buscar bookings en PENDING_PAYMENT o PAYMENT_FAILED > 30 min
  // Restaurar slot capacity
  // Marcar como CANCELLED
}
```

### 6.3 Service Layer Pattern

**Separación clara de responsabilidades:**

```
Route (Controller)
  ├─ Validación de entrada (Zod)
  ├─ Autenticación/Autorización (middleware)
  └─ Delegar a Service
      │
      ▼
Service (Business Logic)
  ├─ Validaciones de negocio
  ├─ Cálculos
  ├─ Orquestación de operaciones
  └─ Llamadas a Repository (Prisma)
```

**Beneficios:**
- Lógica de negocio testeable sin HTTP
- Reutilización entre endpoints
- Fácil refactorización
- Independiente del framework web

### 6.4 Repository Pattern (implícito con Prisma)

```typescript
class BookingService {
  constructor(private prisma: PrismaClient) {}

  async getExperienceById(id: string) {
    return this.prisma.experience.findUnique({
      where: { id },
      include: { host: true, reviews: true }
    });
  }
}
```

**Ventaja:** Prisma actúa como repository, pero service abstrae la lógica compleja.

### 6.5 Singleton Pattern (Stripe Service)

```typescript
export class StripeService {
  private static instance: StripeService;

  static getInstance() {
    if (!this.instance) {
      this.instance = new StripeService();
    }
    return this.instance;
  }
}

export const stripeService = StripeService.getInstance();
```

**Razón:** Una única instancia de cliente Stripe compartida.

### 6.6 Plugin Architecture (Fastify)

```typescript
// prisma.plugin.ts
export default fp(async (fastify) => {
  const prisma = new PrismaClient();
  fastify.decorate('prisma', prisma);
}, { name: 'prisma' });

// auth.plugin.ts
export default fp(async (fastify) => {
  await fastify.register(fastifyJwt, { secret });
  fastify.decorate('authenticate', async (req, reply) => {
    await req.jwtVerify();
    // Fetch user from DB
  });
}, { name: 'auth' });
```

**Ventajas:**
- Dependencias encapsuladas
- Inicialización controlada
- Decoradores type-safe

### 6.7 Schema-First Validation (Zod)

Todos los inputs validados antes de llegar al handler:

```typescript
const schema = {
  body: CreateBookingSchema,
  querystring: BookingQuerySchema,
  params: z.object({ id: z.string().cuid() })
};

app.post('/bookings', { schema }, handler);
```

**Ventajas:**
- Type safety automático
- Errores consistentes
- Auto-documentación
- Menos código boilerplate

---

## 7. Frontend: Arquitectura de Componentes

### 7.1 Estructura de Carpetas

```
frontend/
├── App.tsx                    # Main router
├── components/
│   ├── Navigation.tsx         # Sidebar + bottom nav
│   ├── HomeView.tsx
│   ├── StoriesView.tsx
│   ├── ProfileView.tsx
│   ├── TiendaView.tsx         # Marketplace
│   ├── ExperiencesView.tsx    # Reservaciones
│   ├── MyBookingsView.tsx
│   ├── ARMapView.tsx
│   ├── CommunitiesView.tsx
│   ├── StreamsView.tsx
│   ├── admin/
│   │   ├── AdminDashboard.tsx
│   │   ├── UsersManagement.tsx
│   │   └── MetricsDashboard.tsx
│   └── ui/                    # Design system
│       ├── Button.tsx
│       ├── Card.tsx
│       ├── Modal.tsx
│       ├── Toast.tsx
│       ├── LoadingSpinner.tsx
│       └── 40+ more...
│
├── contexts/
│   ├── AuthContext.tsx        # Authentication state
│   └── LanguageContext.tsx    # i18n
│
└── services/
    └── API clients (fetch wrappers)
```

### 7.2 State Management

**AuthContext (Global State):**

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isDemoMode: boolean;
  login(email, password): Promise<boolean>;
  loginWithFace(faceImage): Promise<boolean>;
  loginAsDemo(userType): Promise<boolean>;
  logout(): void;
}
```

**Local State:**
- Cada view usa `useState` para UI state
- No usa Redux/Zustand (app relativamente simple)
- Demo mode con localStorage fallback

**Demo Mode:**
```typescript
// Si backend no disponible, usa usuarios locales
const DEMO_USERS = {
  user: { email: 'demo@...', role: 'USER' },
  seller: { email: 'artesano@...', role: 'SELLER' },
  admin: { email: 'admin@...', role: 'ADMIN' }
};

loginAsDemo('seller');
// → Intenta backend primero
// → Si falla, usa localStorage
```

### 7.3 Routing Pattern

**Estado-based routing** (no React Router):

```typescript
enum ViewState {
  HOME, STORIES, PROFILE, LOGIN,
  TIENDA, PRODUCT_DETAIL, CART, CHECKOUT,
  EXPERIENCES, EXPERIENCE_DETAIL, MY_BOOKINGS,
  AR_MAP, POI_DETAIL,
  COMMUNITIES, COMMUNITY_DETAIL,
  STREAMS, STREAM_WATCH,
  ADMIN, SELLER_DASHBOARD
}

const [currentView, setCurrentView] = useState(ViewState.HOME);

const renderView = () => {
  switch (currentView) {
    case ViewState.TIENDA:
      return <TiendaView onNavigate={handleNavigate} />;
    // ...
  }
};
```

**Ventajas:**
- Navegación programática simple
- No depende de URLs (PWA offline-friendly)
- Estado de navegación persiste en memoria

**Desventajas:**
- No hay URLs compartibles
- No hay browser back/forward
- No es SEO-friendly (pero es PWA, no problema)

### 7.4 Design System (UI Components)

**40+ componentes reutilizables:**

```
ui/
├── Button.tsx            # Variantes: primary, secondary, ghost
├── Card.tsx              # Layout de contenido
├── Modal.tsx             # Overlays
├── Toast.tsx             # Notificaciones
├── LoadingButton.tsx     # Botón con spinner
├── LazyImage.tsx         # Lazy loading
├── InfiniteScroll.tsx    # Scroll infinito
├── VirtualList.tsx       # Virtualización
├── BottomSheet.tsx       # Modales móviles
├── DatePicker.tsx        # Selección de fechas
├── Rating.tsx            # Estrellas
└── ...
```

**Patrón común:**
```typescript
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  loading,
  disabled,
  onClick,
  children
}) => {
  const classes = cn(
    'btn',
    `btn-${variant}`,
    `btn-${size}`,
    loading && 'btn-loading',
    disabled && 'btn-disabled'
  );

  return (
    <button className={classes} onClick={onClick} disabled={disabled || loading}>
      {loading && <Spinner />}
      {children}
    </button>
  );
};
```

### 7.5 PWA Features

```typescript
// Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}

// Offline indicator
<OfflineIndicator />

// Install prompt
<UpdatePrompt />

// Push notifications
<NotificationPrompt />

// Manifest.json
{
  "name": "Guelaguetza Connect",
  "short_name": "Guelaguetza",
  "start_url": "/",
  "display": "standalone",
  "icons": [...]
}
```

### 7.6 Role-Based Views

```typescript
// Landing page detecta role y muestra dashboard apropiado
handleUserSelected(selectedRole) {
  if (role === 'ADMIN') {
    setCurrentView(ViewState.ADMIN);
  } else if (role === 'SELLER') {
    setCurrentView(ViewState.SELLER_DASHBOARD);
  } else {
    setCurrentView(ViewState.HOME);
  }
}

// Admin puede ver como usuario
const [adminViewingAsUser, setAdminViewingAsUser] = useState(false);
```

**Dashboards especializados:**
- `AdminDashboard`: Gestión de usuarios, moderación, analytics
- `SellerDashboard`: Gestión de productos, órdenes, experiencias
- `GuideDashboard`: Legacy, redirige a SellerDashboard

---

## 8. Integraciones Externas

### 8.1 Stripe (Pagos)

**Uso:**
- Payment Intents para bookings y órdenes
- Refunds para cancelaciones
- Connected Accounts para vendedores (marketplace)

**Configuración:**
```typescript
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-04-30.basil'
});
```

**Mock Mode:**
Si `STRIPE_SECRET_KEY` no existe, retorna valores mock:
```typescript
if (!stripe) {
  return {
    clientSecret: 'mock_client_secret',
    paymentIntentId: 'mock_pi_' + Date.now()
  };
}
```

**Metadata en Payment Intents:**
```typescript
metadata: {
  bookingId: string,
  experienceId: string,
  userId: string,
  guestCount: string
}
```

**Webhooks (pendiente implementar):**
- `payment_intent.succeeded` → Confirmar booking/orden
- `payment_intent.payment_failed` → Marcar PAYMENT_FAILED
- `charge.refunded` → Procesar reembolso

### 8.2 Google Gemini (AI Chatbot)

**Uso:** Asistente cultural con conocimiento de Oaxaca

**Implementación:**
```typescript
import { GoogleGenAI } from '@google/genai';

const genai = new GoogleGenAI(process.env.GEMINI_API_KEY);
const model = genai.getGenerativeModel({ model: 'gemini-pro' });

async function chat(userMessage: string, history: Message[]) {
  const chat = model.startChat({
    history: history.map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }))
  });

  const result = await chat.sendMessage(userMessage);
  return result.response.text();
}
```

**Features:**
- Contexto sobre Guelaguetza
- Recomendaciones de experiencias/productos
- Historial de conversación por usuario

**Endpoints:**
```
GET  /api/chat/conversations/:id        - Historial
POST /api/chat/conversations/:id/send   - Enviar mensaje
```

### 8.3 Web Push (Notificaciones)

**Implementación:**
```typescript
import webpush from 'web-push';

webpush.setVapidDetails(
  'mailto:contact@guelaguetza.mx',
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

async function sendPushNotification(subscription, payload) {
  await webpush.sendNotification(subscription, JSON.stringify(payload));
}
```

**Flujo:**
1. Frontend solicita permiso de notificaciones
2. Frontend envía subscription a backend
3. Backend guarda en `PushSubscription` table
4. Cuando hay evento, backend envía push a todos los subscriptions del usuario

### 8.4 Transporte Público (Datos en tiempo real)

**Nota:** No hay integración externa real, los datos están en BD.

**Modelos:**
```prisma
BusRoute (ruta, color, tipo: TRONCAL/ESPECIAL/PEATONAL)
Stop (nombre, lat/lng, sequence)
Bus (busCode, lat/lng, heading, speed, capacity, occupied)
```

**Endpoints:**
```
GET /api/transport/routes       - Todas las rutas
GET /api/transport/routes/:id   - Detalle con paradas
GET /api/transport/buses/:id    - Info de bus en tiempo real
```

**Potencial mejora:** Integrar con GPS real de autobuses si existe API.

---

## 9. Seguridad y Autenticación

### 9.1 JWT Authentication

**Flujo:**
```
1. Login → Backend valida credentials
2. Backend genera JWT:
   jwt.sign({ userId: user.id }, SECRET, { expiresIn: '7d' })
3. Frontend guarda token en localStorage
4. Frontend incluye en header:
   Authorization: Bearer <token>
5. Middleware verifica JWT en cada request protegido
```

**Plugin de autenticación:**
```typescript
fastify.decorate('authenticate', async (req, reply) => {
  const decoded = await req.jwtVerify();
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    select: { id, email, role, bannedAt }
  });

  if (!user || user.bannedAt) {
    reply.status(403).send({ error: 'Acceso denegado' });
  }

  req.user = user;
});
```

**Uso en routes:**
```typescript
app.get('/bookings', {
  onRequest: [fastify.authenticate]
}, handler);
```

### 9.2 Role-Based Access Control (RBAC)

**Roles:**
```typescript
enum UserRole {
  USER,       // Usuario normal
  MODERATOR,  // Moderador de comunidades
  ADMIN       // Administrador total
}
```

**Middlewares:**
```typescript
async function requireAdmin(req, reply) {
  if (req.user.role !== 'ADMIN') {
    reply.status(403).send({ error: 'Requiere permisos de admin' });
  }
}

async function requireModerator(req, reply) {
  if (!['ADMIN', 'MODERATOR'].includes(req.user.role)) {
    reply.status(403).send({ error: 'Requiere permisos de moderador' });
  }
}
```

**Uso:**
```typescript
app.delete('/admin/users/:id', {
  onRequest: [fastify.authenticate, requireAdmin]
}, handler);
```

### 9.3 Validación de Propiedad

**Patrón común en services:**
```typescript
async updateProduct(id, userId, data) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: { seller: true }
  });

  if (!product) {
    throw new NotFoundError('Producto no encontrado');
  }

  if (product.seller.userId !== userId) {
    throw new ForbiddenError('No tienes permiso para editar este producto');
  }

  // Continuar con actualización
}
```

### 9.4 Ban System

**Campo en User:**
```prisma
model User {
  bannedAt     DateTime?
  bannedReason String?
}
```

**Verificación en middleware:**
```typescript
if (user.bannedAt) {
  reply.status(403).send({ error: 'Tu cuenta ha sido suspendida' });
}
```

**Admin endpoint:**
```typescript
POST /api/admin/users/:id/ban
{ reason: string }

// Marca user.bannedAt = now()
// Invalida sesiones existentes
```

### 9.5 Input Sanitization

**Zod schemas previenen:**
- SQL injection (Prisma usa prepared statements)
- XSS (validación de tipos, longitudes)
- Type confusion

**Ejemplo:**
```typescript
const CreateProductSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(10).max(5000),
  price: z.number().positive().max(1000000),
  stock: z.number().int().min(0),
  images: z.array(z.string().url()).min(1).max(10)
});
```

### 9.6 Rate Limiting

**Pendiente implementar** (recomendación):
```typescript
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  max: 100,              // 100 requests
  timeWindow: '1 minute'
});
```

---

## 10. Deuda Técnica y Oportunidades

### 10.1 Deuda Técnica Identificada

#### A. Backend

1. **Jobs de limpieza deshabilitados**
   ```typescript
   // TODO: Descomentar cuando se quiera activar
   // import { startScheduler } from './jobs/scheduler.js';
   // startScheduler();
   ```
   - **Impacto:** Bookings/órdenes fallidos no se limpian automáticamente
   - **Solución:** Activar scheduler o configurar cron externo

2. **Sin webhooks de Stripe implementados**
   - **Impacto:** Confirmaciones de pago son manuales
   - **Riesgo:** Discrepancias entre Stripe y BD
   - **Solución:** Implementar endpoint `/api/webhooks/stripe`

3. **Sin rate limiting**
   - **Riesgo:** Abuso de API, DoS
   - **Solución:** Implementar `@fastify/rate-limit`

4. **Sin logging estructurado**
   - Usa `console.log`, no logger profesional
   - **Solución:** Winston o Pino (Fastify ya incluye Pino)

5. **Sin tests de integración completos**
   - Tests unitarios existen pero coverage bajo
   - **Solución:** Aumentar coverage, especialmente en flows críticos

6. **Optimistic locking solo en bookings**
   - Products/Orders no tienen versioning
   - **Riesgo:** Race conditions en stock
   - **Solución:** Agregar `version` a Product model

7. **Sin métricas/observabilidad**
   - No hay Prometheus/Grafana
   - **Solución:** Instrumentar con métricas

8. **Mock mode en Stripe sin feature flag**
   - Código de producción contiene mocks
   - **Solución:** Separar con environment variables

#### B. Frontend

1. **No usa React Router**
   - Navegación state-based
   - **Limitación:** No URLs compartibles, no SEO
   - **Solución:** Migrar a React Router (si se necesita SEO/URLs)

2. **AuthContext maneja demo mode**
   - Lógica compleja mezclada con auth real
   - **Solución:** Separar DemoContext

3. **Sin TypeScript estricto en frontend**
   - Muchos `any`, `unknown`, type assertions
   - **Solución:** Habilitar `strict: true` en tsconfig

4. **Sin lazy loading de routes**
   - Todo se carga al inicio (except ARScanner)
   - **Solución:** Code splitting con `React.lazy()`

5. **Sin estado global profesional**
   - Solo usa Context API
   - **Limitación:** Re-renders innecesarios
   - **Solución:** Zustand o Jotai (si la app crece)

6. **Sin error boundaries**
   - Errores no manejados pueden crashear la app
   - **Solución:** Implementar ErrorBoundary component

#### C. Arquitectura

1. **Monolito frontend + backend**
   - Ambos en mismo repo
   - **Limitación:** No escala independientemente
   - **Solución:** Separar repos si el equipo crece

2. **Sin CI/CD**
   - No hay GitHub Actions, pipelines
   - **Solución:** Setup CI/CD básico

3. **Sin staging environment**
   - Solo dev y producción
   - **Riesgo:** Bugs en producción
   - **Solución:** Environment de staging

4. **Sin cache layer**
   - Cada request va a DB
   - **Limitación:** Latencia en queries frecuentes
   - **Solución:** Redis para cache

5. **Sin CDN para assets**
   - Imágenes servidas desde backend
   - **Limitación:** Bandwidth, latencia
   - **Solución:** S3 + CloudFront o similar

### 10.2 Bugs Potenciales

1. **Double-booking en Products**
   - Si no hay optimistic locking, puede haber overbooking de stock
   - **Severidad:** Alta
   - **Fix:** Agregar `version` field a Product

2. **Cleanup job puede conflictuar con transacciones activas**
   - Si un booking está siendo procesado y cleanup intenta cancelarlo
   - **Severidad:** Media
   - **Fix:** Verificar que status sea estático antes de cleanup

3. **Payment intent creado pero no guardado**
   - Si falla la actualización en Fase 3
   - **Severidad:** Baja (webhook puede reconciliar)
   - **Fix:** Idempotency keys en Stripe

4. **JWT no se invalida al banear usuario**
   - Token sigue válido hasta expirar (7 días)
   - **Severidad:** Media
   - **Fix:** Blacklist de tokens o reducir expiración

5. **Sin paginación en algunos endpoints**
   - `/api/stories`, `/api/products` pueden retornar miles de registros
   - **Severidad:** Media
   - **Fix:** Agregar paginación obligatoria

### 10.3 Mejoras de Performance

1. **N+1 queries en algunas inclusiones**
   - Algunas queries incluyen relaciones que no se usan
   - **Fix:** Optimizar `include` statements

2. **Sin índices en campos frecuentemente consultados**
   - `@@index` falta en algunos campos
   - **Fix:** Agregar índices

3. **Sin eager loading selectivo**
   - Siempre incluye todas las relaciones
   - **Fix:** Solo incluir lo necesario

4. **Sin compression de responses**
   - HTTP responses sin gzip
   - **Fix:** `@fastify/compress`

5. **Frontend no usa memoization**
   - Muchos `useMemo`, `useCallback` faltantes
   - **Fix:** Profiling y optimización

---

## 11. Recomendaciones

### 11.1 Prioridades Inmediatas (Críticas)

#### 1. Activar Jobs de Limpieza
**Impacto:** Alto
**Esfuerzo:** Bajo (1 día)

```typescript
// En index.ts, descomentar:
import { startScheduler } from './jobs/scheduler.js';
startScheduler();

// O configurar cron externo:
// */15 * * * * curl http://localhost:3001/api/jobs/cleanup
```

**Beneficio:** Liberar inventario de pagos abandonados automáticamente.

#### 2. Implementar Webhooks de Stripe
**Impacto:** Alto
**Esfuerzo:** Medio (2-3 días)

```typescript
app.post('/api/webhooks/stripe', async (req, reply) => {
  const sig = req.headers['stripe-signature'];
  const event = stripeService.constructWebhookEvent(req.rawBody, sig);

  switch (event.type) {
    case 'payment_intent.succeeded':
      await bookingService.confirmBookingByPaymentId(event.data.object.id);
      break;
    case 'payment_intent.payment_failed':
      await bookingService.markPaymentFailed(event.data.object.id);
      break;
  }

  reply.send({ received: true });
});
```

**Beneficio:** Confirmaciones automáticas, mejor sincronización.

#### 3. Agregar Optimistic Locking a Products
**Impacto:** Alto
**Esfuerzo:** Medio (2 días)

```prisma
model Product {
  version Int @default(1)
  // ...
}
```

```typescript
// En marketplace.service.ts, usar withRetry y updateMany
```

**Beneficio:** Prevenir overbooking de stock.

#### 4. Implementar Rate Limiting
**Impacto:** Medio
**Esfuerzo:** Bajo (1 día)

```typescript
await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  cache: 10000
});
```

**Beneficio:** Protección contra abuso, DoS.

### 11.2 Mejoras de Arquitectura (Mediano Plazo)

#### 5. Separar Concerns: Domain Layer
**Impacto:** Alto (mantenibilidad)
**Esfuerzo:** Alto (2-3 semanas)

**Estructura propuesta:**
```
backend/src/
├── domain/
│   ├── entities/
│   │   ├── Booking.ts      # Business entities
│   │   ├── Product.ts
│   │   └── Experience.ts
│   ├── value-objects/
│   │   ├── Money.ts
│   │   └── Location.ts
│   └── repositories/
│       ├── IBookingRepo.ts # Interfaces
│       └── IProductRepo.ts
│
├── infrastructure/
│   ├── repositories/
│   │   ├── PrismaBookingRepo.ts  # Implementaciones
│   │   └── PrismaProductRepo.ts
│   └── stripe/
│       └── StripePaymentGateway.ts
│
└── application/
    └── use-cases/
        ├── CreateBooking.ts
        └── ProcessOrder.ts
```

**Beneficios:**
- Testabilidad mejorada
- Lógica de negocio independiente de infraestructura
- Facilita cambios de tecnología

#### 6. Event-Driven Architecture
**Impacto:** Alto (escalabilidad)
**Esfuerzo:** Alto (3-4 semanas)

```typescript
// Event Bus
eventBus.emit('booking.created', { bookingId, userId });

// Event Handlers
eventBus.on('booking.created', async (data) => {
  await notificationService.notifyHost(data);
  await gamificationService.awardXP(data.userId, 10);
  await analyticsService.trackBooking(data);
});
```

**Beneficios:**
- Desacopla servicios
- Facilita agregar features sin modificar código existente
- Mejor para microservicios futuros

#### 7. CQRS Pattern (Query/Command Separation)
**Impacto:** Medio (performance)
**Esfuerzo:** Alto (3 semanas)

```typescript
// Commands (escritura)
class CreateBookingCommand {
  execute(data: CreateBookingInput): Promise<Booking> {
    // Lógica de negocio, validaciones
  }
}

// Queries (lectura optimizada)
class GetExperiencesQuery {
  execute(filters: ExperienceFilters): Promise<Experience[]> {
    // Solo lectura, puede usar vistas materializadas
  }
}
```

**Beneficios:**
- Optimizar reads y writes independientemente
- Escalabilidad (réplicas de lectura)

### 11.3 Mejoras de Testing (Corto Plazo)

#### 8. Aumentar Coverage
**Impacto:** Alto
**Esfuerzo:** Medio (2 semanas)

**Prioridades:**
1. Tests de integración para flujos críticos:
   - Booking creation (con concurrencia)
   - Order checkout (multi-seller)
   - Payment confirmation
2. Tests unitarios para services:
   - BookingService (85%+ coverage)
   - MarketplaceService
3. Tests E2E para user flows principales

**Herramientas:**
- Vitest (ya configurado)
- Supertest para API testing
- Playwright para E2E (opcional)

#### 9. Contract Testing
**Impacto:** Medio
**Esfuerzo:** Bajo (1 semana)

```typescript
// Validar que frontend y backend usan mismos schemas
import { CreateBookingSchema } from '@backend/schemas';

// En frontend:
const validatedData = CreateBookingSchema.parse(formData);
```

**Beneficio:** Prevenir discrepancias frontend-backend.

### 11.4 Developer Experience

#### 10. Setup Docker Compose
**Impacto:** Alto (onboarding)
**Esfuerzo:** Bajo (1 día)

```yaml
version: '3.8'
services:
  db:
    image: postgres:15
    environment:
      POSTGRES_DB: guelaguetza
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"

  backend:
    build: ./backend
    depends_on:
      - db
    environment:
      DATABASE_URL: postgresql://dev:dev@db:5432/guelaguetza
    ports:
      - "3001:3001"

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
```

**Beneficio:** Onboarding de nuevos devs en minutos.

#### 11. Documentation
**Impacto:** Alto
**Esfuerzo:** Medio (1 semana)

**Crear:**
- OpenAPI spec (con `@fastify/swagger`)
- Architecture Decision Records (ADRs)
- Runbook para operaciones
- Contributing guidelines

#### 12. Linting y Formatting
**Impacto:** Medio
**Esfuerzo:** Bajo (1 día)

```json
// .eslintrc
{
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking"
  ],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-floating-promises": "error"
  }
}
```

**Pre-commit hooks:**
```bash
npm install -D husky lint-staged
```

### 11.5 Infraestructura y Deployment

#### 13. CI/CD Pipeline
**Impacto:** Alto
**Esfuerzo:** Medio (3 días)

```yaml
# .github/workflows/ci.yml
name: CI
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: npm run test:coverage
      - run: npm run build
```

#### 14. Monitoring y Observabilidad
**Impacto:** Alto
**Esfuerzo:** Alto (1 semana)

**Stack:**
- Prometheus (métricas)
- Grafana (dashboards)
- Loki (logs)
- Sentry (error tracking)

**Métricas clave:**
```typescript
// Instrumentar con prom-client
const bookingCreated = new Counter({
  name: 'bookings_created_total',
  help: 'Total bookings created'
});

const bookingDuration = new Histogram({
  name: 'booking_creation_duration_seconds',
  help: 'Time to create booking'
});
```

#### 15. Database Optimization
**Impacto:** Alto (latencia)
**Esfuerzo:** Medio (1 semana)

**Acciones:**
1. Agregar índices faltantes:
   ```prisma
   @@index([userId, createdAt])
   @@index([status, createdAt])
   ```

2. Configurar connection pool:
   ```
   DATABASE_URL=postgresql://...?connection_limit=10
   ```

3. Setup read replicas para queries pesadas

4. Implementar query caching con Redis

### 11.6 Security Hardening

#### 16. Security Audit
**Impacto:** Crítico
**Esfuerzo:** Medio (1 semana)

**Checklist:**
- [ ] Validar todos los inputs con Zod
- [ ] Implementar CSRF protection
- [ ] Configurar CORS correctamente
- [ ] Helmet.js para security headers
- [ ] Sanitizar outputs (XSS prevention)
- [ ] Secrets en environment variables
- [ ] Regular dependency updates
- [ ] SQL injection prevention (Prisma ya lo hace)

#### 17. Compliance (si aplica)
- [ ] GDPR (si hay usuarios EU)
- [ ] PCI DSS (Stripe lo maneja)
- [ ] Términos de servicio
- [ ] Política de privacidad

---

## Resumen de Cambios Recomendados

### Urgentes (Sprint 1-2 semanas)
1. ✅ Activar jobs de limpieza
2. ✅ Implementar webhooks Stripe
3. ✅ Optimistic locking en Products
4. ✅ Rate limiting

### Importantes (Mes 1)
5. ✅ Aumentar test coverage (>80%)
6. ✅ Setup Docker Compose
7. ✅ CI/CD básico
8. ✅ Monitoring básico

### Mejoras Arquitectónicas (Mes 2-3)
9. ✅ Domain layer refactor
10. ✅ Event-driven architecture
11. ✅ CQRS (si es necesario)
12. ✅ Database optimization

### Largo Plazo (Mes 4+)
13. ✅ Microservices (si escala)
14. ✅ GraphQL (si se necesita)
15. ✅ Advanced caching (Redis)
16. ✅ Kubernetes deployment

---

## Conclusión

**Guelaguetza Connect** es una plataforma ambiciosa y bien estructurada con:

**Fortalezas:**
- ✅ Stack moderno y performante
- ✅ Validaciones robustas (Zod)
- ✅ Concurrencia manejada (optimistic locking)
- ✅ Arquitectura de servicios clara
- ✅ Integración con Stripe bien pensada
- ✅ PWA completo con offline support

**Áreas de Mejora:**
- ⚠️ Jobs de limpieza desactivados
- ⚠️ Sin webhooks de Stripe
- ⚠️ Coverage de tests bajo
- ⚠️ Falta observabilidad
- ⚠️ Sin CI/CD

**Recomendación general:**
El proyecto está en buen estado para MVP/beta, pero necesita refuerzos en testing, observabilidad y automatización antes de lanzamiento completo.

**Próximos pasos sugeridos:**
1. Semana 1-2: Activar jobs + webhooks + rate limiting
2. Semana 3-4: Tests + Docker + CI/CD
3. Mes 2: Monitoring + security audit
4. Mes 3+: Refactors arquitectónicos si es necesario

---

**Fecha:** 2026-01-25
**Analista:** Claude Code (Arquitecto de Software)
**Versión del documento:** 1.0
