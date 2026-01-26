# Modelo de Datos y Entidades
## Guelaguetza Connect - Entity Relationship Documentation

---

## 📋 Tabla de Contenidos

1. [Diagrama ERD General](#1-diagrama-erd-general)
2. [Dominios de Negocio](#2-dominios-de-negocio)
3. [Relaciones Detalladas](#3-relaciones-detalladas)
4. [Constraints e Invariantes](#4-constraints-e-invariantes)
5. [Índices y Performance](#5-indices-y-performance)
6. [Migraciones Importantes](#6-migraciones-importantes)

---

## 1. Diagrama ERD General

### 1.1 Core: Users & Social

```
                      ┌──────────────────────────┐
                      │         User             │
                      ├──────────────────────────┤
                      │ PK id (cuid)             │
                      │    email (unique)        │
                      │    password (hashed)     │
                      │    nombre                │
                      │    apellido?             │
                      │    avatar?               │
                      │    bio?                  │
                      │    region?               │
                      │    role (enum)           │
                      │    bannedAt?             │
                      │    isPublic              │
                      └─────┬────────────────────┘
                            │
         ┌──────────────────┼──────────────────┬──────────────────┐
         │                  │                  │                  │
         ▼                  ▼                  ▼                  ▼
┌────────────────┐  ┌────────────────┐  ┌──────────┐    ┌──────────────┐
│     Story      │  │   UserStats    │  │  Follow  │    │  UserBadge   │
├────────────────┤  ├────────────────┤  ├──────────┤    ├──────────────┤
│ PK id          │  │ PK id          │  │ PK id    │    │ PK id        │
│ FK userId      │  │ FK userId (1:1)│  │ FK fol.. │    │ FK userId    │
│    description │  │    xp          │  │ FK fol.. │    │ FK badgeId   │
│    mediaUrl    │  │    level       │  │          │    │ unlockedAt   │
│    location    │  │    currentStr. │  │ UQ(both) │    └──────────────┘
│    views       │  │    longestStr. │  └──────────┘           │
│    createdAt   │  └────────────────┘                         │
└────┬───────────┘                                             │
     │                                                          │
     │                                                          ▼
     ├─────────┬────────────┐                          ┌──────────────┐
     ▼         ▼            ▼                          │    Badge     │
┌────────┐ ┌─────────┐ ┌─────────┐                    ├──────────────┤
│  Like  │ │ Comment │ │ Conv... │                    │ PK id        │
├────────┤ ├─────────┤ └─────────┘                    │    code (UQ) │
│ PK id  │ │ PK id   │                                │    name      │
│ FK user│ │ FK user │                                │    icon      │
│ FK stor│ │ FK story│                                │    xpReward  │
│        │ │    text │                                │    category  │
│UQ(u,s) │ └─────────┘                                │    threshold │
└────────┘                                             └──────────────┘
```

### 1.2 Marketplace

```
        ┌──────────────────────────┐
        │         User             │
        └─────┬──────────────┬─────┘
              │              │
              │ 1:1          │ 1:N
              ▼              ▼
     ┌────────────────┐  ┌──────────┐
     │ SellerProfile  │  │  Order   │
     ├────────────────┤  ├──────────┤
     │ PK id          │  │ PK id    │
     │ FK userId (UQ) │  │ FK userId│
     │    businessName│  │ FK seller│
     │    rating      │  │    status│
     │    reviewCount │  │    total │
     │    verified    │  │    stripe│
     │    stripeAcct  │  │    ship..│
     └────┬───────────┘  └─────┬────┘
          │ 1:N                │ 1:N
          ▼                    ▼
     ┌──────────┐         ┌──────────┐
     │ Product  │         │OrderItem │
     ├──────────┤         ├──────────┤
     │ PK id    │◄────────┤ FK order │
     │ FK seller│         │ FK product
     │    name  │         │    qty   │
     │    price │         │    price │
     │    stock │         └──────────┘
     │    status│
     │    images│
     └────┬─────┘
          │ 1:N
          ▼
     ┌──────────┐
     │CartItem  │
     ├──────────┤
     │ FK cart  │
     │ FK product
     │    qty   │
     │UQ(c,p)   │
     └──────────┘
          ▲
          │ 1:N
     ┌────┴─────┐
     │   Cart   │
     ├──────────┤
     │ PK id    │
     │ FK userId│
     │   (1:1)  │
     └──────────┘
```

### 1.3 Bookings & Experiences

```
        ┌──────────────────────────┐
        │         User             │
        └─────┬──────────────┬─────┘
              │ host         │ customer
              │ 1:N          │ 1:N
              ▼              ▼
     ┌────────────────┐  ┌──────────────┐
     │  Experience    │  │   Booking    │
     ├────────────────┤  ├──────────────┤
     │ PK id          │  │ PK id        │
     │ FK hostId      │◄─┤ FK userId    │
     │    title       │  │ FK experience│
     │    price       │  │ FK timeSlot  │
     │    category    │  │    status    │
     │    maxCapacity │  │    guestCount│
     │    location    │  │    totalPrice│
     │    rating      │  │    stripePayId
     │    isActive    │  │    confirmedAt
     └────┬───────────┘  │    cancelledAt
          │ 1:N          │UQ(user,slot) │
          ▼              └──────┬───────┘
     ┌────────────────────┐     │
     │ExperienceTimeSlot  │◄────┘
     ├────────────────────┤
     │ PK id              │
     │ FK experienceId    │
     │    date            │
     │    startTime       │
     │    endTime         │
     │    capacity        │
     │    bookedCount     │
     │    isAvailable     │
     │    version ◄───────┼──── OPTIMISTIC LOCKING
     └────────────────────┘
```

### 1.4 Events & Communities

```
     ┌──────────────┐              ┌───────────────┐
     │    Event     │              │  Community    │
     ├──────────────┤              ├───────────────┤
     │ PK id        │              │ PK id         │
     │    title     │              │    name       │
     │    location  │              │    slug (UQ)  │
     │    startDate │              │    isPublic   │
     │    category  │              │ FK createdById│
     └──┬───────┬───┘              └───┬───────┬───┘
        │ 1:N   │ 1:N                  │ 1:N   │ 1:N
        ▼       ▼                      ▼       ▼
  ┌─────────┐ ┌────────────┐    ┌──────────┐ ┌──────────────┐
  │EventRSVP│ │EventReminder│   │Community │ │ CommunityPost│
  ├─────────┤ ├────────────┤    │ Member   │ ├──────────────┤
  │ FK user │ │ FK user    │    ├──────────┤ │ FK community │
  │ FK event│ │ FK event   │    │ FK userId│ │ FK authorId  │
  │UQ(u,e)  │ │    remindAt│    │ FK commId│ │    content   │
  └─────────┘ │    sent    │    │    role  │ └──────────────┘
              └────────────┘    │UQ(u,c)   │
                                └──────────┘
```

### 1.5 Streaming & AR

```
     ┌──────────────┐              ┌──────────────────┐
     │ LiveStream   │              │PointOfInterest  │
     ├──────────────┤              ├──────────────────┤
     │ PK id        │              │ PK id            │
     │ FK userId    │              │    name          │
     │    title     │              │    description   │
     │    category  │              │    latitude      │
     │    status    │              │    longitude     │
     │    streamKey │              │    category      │
     │    viewerCnt │              │    rating        │
     └──────┬───────┘              └───┬──────────┬───┘
            │ 1:N                      │ 1:N      │ 1:N
            ▼                          ▼          ▼
     ┌──────────────┐          ┌──────────┐  ┌──────────┐
     │StreamMessage │          │POIReview │  │POIFavorite│
     ├──────────────┤          ├──────────┤  ├──────────┤
     │ FK streamId  │          │ FK userId│  │ FK userId│
     │ FK userId    │          │ FK poiId │  │ FK poiId │
     │    content   │          │    rating│  │UQ(u,p)   │
     └──────────────┘          │UQ(u,p)   │  └──────────┘
                               └──────────┘
```

### 1.6 Transport

```
     ┌──────────────┐
     │   BusRoute   │
     ├──────────────┤
     │ PK id        │
     │    routeCode │
     │    name      │
     │    color     │
     │    type (enum)
     └──┬───────┬───┘
        │ 1:N   │ 1:N
        ▼       ▼
   ┌────────┐ ┌─────┐
   │  Stop  │ │ Bus │
   ├────────┤ ├─────┤
   │ FK rout│ │FK rt│
   │ lat/lng│ │ lat │
   │sequence│ │ lng │
   └────────┘ │speed│
              │occup│
              └─────┘
```

---

## 2. Dominios de Negocio

### 2.1 User Domain (Core)

**Aggregate Root:** `User`

**Entidades relacionadas:**
- Story (owned)
- Like, Comment (actions)
- Follow (social graph)
- UserStats (gamification)
- UserBadge (achievements)
- Notification (inbox)

**Invariantes:**
- Email debe ser único
- Password debe estar hasheado
- Role debe ser válido (USER, MODERATOR, ADMIN)
- Si bannedAt existe, bannedReason debe existir

**Eventos de dominio:**
- UserRegistered
- UserLoggedIn
- UserBanned
- UserUnbanned

### 2.2 Marketplace Domain

**Aggregate Root:** `SellerProfile`

**Entidades relacionadas:**
- Product (owned by seller)
- Order (buyer's orders)
- OrderItem (line items)
- ProductReview

**Aggregate Root 2:** `Cart`

**Entidades relacionadas:**
- CartItem

**Invariantes:**
- Un User solo puede tener un SellerProfile
- Product.stock >= 0
- Order.total = sum(OrderItem.price * quantity)
- ProductReview requiere Order DELIVERED

**Eventos de dominio:**
- ProductCreated
- ProductSoldOut
- OrderPlaced
- OrderPaid
- OrderShipped
- OrderDelivered
- ProductReviewed

### 2.3 Booking Domain

**Aggregate Root:** `Experience`

**Entidades relacionadas:**
- ExperienceTimeSlot (owned)
- Booking (reservations)
- ExperienceReview

**Invariantes:**
- TimeSlot.bookedCount <= TimeSlot.capacity
- Booking.guestCount <= availableSpots
- TimeSlot.isAvailable = (bookedCount < capacity)
- ExperienceReview requiere Booking COMPLETED
- Un User solo puede tener un Booking por TimeSlot

**Eventos de dominio:**
- ExperienceCreated
- TimeSlotCreated
- BookingCreated
- BookingConfirmed
- BookingCancelled
- BookingCompleted
- ExperienceReviewed

### 2.4 Event Domain

**Aggregate Root:** `Event`

**Entidades relacionadas:**
- EventRSVP
- EventReminder

**Invariantes:**
- Un User solo puede tener un RSVP por Event
- EventReminder.remindAt debe ser antes de Event.startDate

**Eventos de dominio:**
- EventCreated
- UserRSVPed
- ReminderSet
- ReminderSent

### 2.5 Community Domain

**Aggregate Root:** `Community`

**Entidades relacionadas:**
- CommunityMember
- CommunityPost

**Invariantes:**
- Community.slug debe ser único
- Community.createdBy es auto-member con role ADMIN
- Solo members pueden crear posts
- Solo ADMIN/MODERATOR pueden moderar

**Eventos de dominio:**
- CommunityCreated
- UserJoinedCommunity
- UserLeftCommunity
- PostCreated
- MemberPromoted (MEMBER → MODERATOR)

### 2.6 Streaming Domain

**Aggregate Root:** `LiveStream`

**Entidades relacionadas:**
- StreamMessage

**Invariantes:**
- streamKey debe ser único
- status: SCHEDULED → LIVE → ENDED (one way)
- viewerCount >= 0
- peakViewers >= viewerCount

**Eventos de dominio:**
- StreamScheduled
- StreamStarted
- StreamEnded
- ViewerJoined
- ViewerLeft
- MessageSent

---

## 3. Relaciones Detalladas

### 3.1 User Relations (30+ relaciones)

```typescript
model User {
  // Social
  stories: Story[]
  likes: Like[]
  comments: Comment[]
  followers: Follow[] @relation("UserFollowing")
  following: Follow[] @relation("UserFollowers")

  // Gamification
  badges: UserBadge[]
  stats: UserStats?  // 1:1

  // Notifications
  notifications: Notification[]
  pushSubscriptions: PushSubscription[]

  // Messaging
  conversations: Conversation[]  // AI chat
  conversationsAsP1: DirectConversation[] @relation("P1")
  conversationsAsP2: DirectConversation[] @relation("P2")
  directMessages: DirectMessage[]

  // Events
  eventRSVPs: EventRSVP[]
  eventReminders: EventReminder[]

  // Communities
  createdCommunities: Community[] @relation("Creator")
  communityMembers: CommunityMember[]
  communityPosts: CommunityPost[]

  // Marketplace
  sellerProfile: SellerProfile?  // 1:1
  cart: Cart?  // 1:1
  orders: Order[]
  productReviews: ProductReview[]

  // Bookings
  hostedExperiences: Experience[]
  bookings: Booking[]
  experienceReviews: ExperienceReview[]

  // Streaming
  streams: LiveStream[]
  streamMessages: StreamMessage[]

  // AR/Map
  poiReviews: POIReview[]
  poiFavorites: POIFavorite[]
  poiCheckIns: POICheckIn[]

  // Analytics
  activityLogs: ActivityLog[]
}
```

**Insight:** User es el centro de todo. Todas las features conectan al usuario.

### 3.2 Experience → Booking Flow

```
Experience (1) ──< (N) ExperienceTimeSlot
                          │
                          │ N:1
                          ▼
                      Booking
                          │
                          │ N:1
                          ▼
                        User
```

**Lifecycle:**
1. Host crea Experience
2. Host crea TimeSlots para Experience
3. Users crean Bookings para TimeSlots
4. Booking.guestCount incrementa TimeSlot.bookedCount
5. Cuando bookedCount === capacity, TimeSlot.isAvailable = false

### 3.3 Self-Referencing: Follow

```
         User
          │
    ┌─────┴─────┐
    │           │
    ▼           ▼
followers   following
(relation)  (relation)
    │           │
    └─────┬─────┘
          │
        Follow
    ┌───────────┐
    │ followerId│───┐
    │followingId│   │
    └───────────┘   │
                    │
                    ▼
           (same User table)
```

**Ejemplo:**
```sql
-- Juan sigue a Maria
INSERT INTO Follow (followerId, followingId)
VALUES (juan.id, maria.id);

-- Obtener followers de Maria
SELECT User.* FROM User
JOIN Follow ON Follow.followerId = User.id
WHERE Follow.followingId = maria.id;

-- Obtener following de Juan
SELECT User.* FROM User
JOIN Follow ON Follow.followingId = User.id
WHERE Follow.followerId = juan.id;
```

### 3.4 Polymorphic Relations: ActivityLog

```
ActivityLog
├─ action: 'CREATE_STORY'
│  ├─ targetType: 'STORY'
│  └─ targetId: story.id
│
├─ action: 'FOLLOW'
│  ├─ targetType: 'USER'
│  └─ targetId: followedUser.id
│
├─ action: 'LIKE'
│  ├─ targetType: 'STORY'
│  └─ targetId: story.id
│
└─ action: 'JOIN_COMMUNITY'
   ├─ targetType: 'COMMUNITY'
   └─ targetId: community.id
```

**Query ejemplo:**
```typescript
// Todas las acciones de un usuario
await prisma.activityLog.findMany({
  where: { userId },
  orderBy: { createdAt: 'desc' }
});

// Todas las acciones sobre una story
await prisma.activityLog.findMany({
  where: {
    targetType: 'STORY',
    targetId: storyId
  }
});
```

---

## 4. Constraints e Invariantes

### 4.1 Unique Constraints

```prisma
// Prevenir duplicados

User:
  @@unique([email])

Follow:
  @@unique([followerId, followingId])  // No seguir 2 veces

Like:
  @@unique([userId, storyId])  // No like 2 veces

EventRSVP:
  @@unique([userId, eventId])  // No RSVP 2 veces

Booking:
  @@unique([userId, timeSlotId])  // No reservar mismo slot 2 veces

CartItem:
  @@unique([cartId, productId])  // No agregar mismo producto 2 veces

UserBadge:
  @@unique([userId, badgeId])  // No desbloquear badge 2 veces

ProductReview:
  @@unique([userId, productId])  // Una review por producto

ExperienceReview:
  @@unique([userId, experienceId])  // Una review por experiencia
```

### 4.2 Business Invariants

#### Booking Invariants
```typescript
// Pre-conditions para crear booking:
assert(experience.isActive === true);
assert(timeSlot.isAvailable === true);
assert(guestCount <= (timeSlot.capacity - timeSlot.bookedCount));
assert(timeSlot.experienceId === experienceId);

// Post-conditions después de crear booking:
assert(booking.status === 'PENDING_PAYMENT');
assert(timeSlot.bookedCount_new === timeSlot.bookedCount_old + guestCount);
assert(booking.totalPrice === experience.price * guestCount);
```

#### Order Invariants
```typescript
// Pre-conditions:
for (const item of orderItems) {
  assert(item.product.stock >= item.quantity);
  assert(item.product.status === 'ACTIVE');
}

// Post-conditions:
assert(order.total === sum(item.price * item.quantity));
for (const item of orderItems) {
  assert(product.stock_new === product.stock_old - item.quantity);
}
assert(cart.items.length === 0); // Cart vacío
```

#### Review Invariants
```typescript
// Pre-conditions para review de experiencia:
const completed = await prisma.booking.findFirst({
  where: {
    userId,
    experienceId,
    status: 'COMPLETED'
  }
});
assert(completed !== null);

// Pre-conditions para review de producto:
const delivered = await prisma.order.findFirst({
  where: {
    userId,
    status: 'DELIVERED',
    items: { some: { productId } }
  }
});
assert(delivered !== null);
```

### 4.3 Cascade Deletes

```prisma
// Cuando se elimina un User, se eliminan en cascada:
stories           // DELETE
likes             // DELETE
comments          // DELETE
followers         // DELETE
following         // DELETE
badges            // DELETE
stats             // DELETE
notifications     // DELETE
pushSubscriptions // DELETE
directMessages    // DELETE
eventRSVPs        // DELETE
communityMembers  // DELETE
communityPosts    // DELETE
cart              // DELETE
activityLogs      // DELETE

// NO se eliminan:
orders            // Se mantienen (referencia a NULL o soft delete)
hostedExperiences // Se mantienen (host puede cambiar)
createdCommunities // Transferir ownership antes de eliminar
```

### 4.4 Soft Deletes

```typescript
// Experiences no se borran, se desactivan
await prisma.experience.update({
  where: { id },
  data: { isActive: false }
});

// Products no se borran, se archivan
await prisma.product.update({
  where: { id },
  data: { status: 'ARCHIVED' }
});

// Users pueden banearse
await prisma.user.update({
  where: { id },
  data: {
    bannedAt: new Date(),
    bannedReason: 'Violación de términos'
  }
});
```

---

## 5. Índices y Performance

### 5.1 Índices Compuestos

```prisma
// Queries típicas optimizadas

// "Mis bookings por estado, ordenados por fecha"
model Booking {
  @@index([userId, status, createdAt])
}

// Query:
SELECT * FROM Booking
WHERE userId = $1 AND status = $2
ORDER BY createdAt DESC;
// ↑ Usa índice compuesto eficientemente

// "Productos de un vendedor activos"
model Product {
  @@index([sellerId, status])
}

// "Notificaciones no leídas de un usuario"
model Notification {
  @@index([userId, read])
}

// "Slots disponibles en rango de fechas"
model ExperienceTimeSlot {
  @@index([experienceId, date])
  @@index([date, isAvailable])
}
```

### 5.2 Selectividad de Índices

**Alta selectividad (buenos índices):**
```prisma
@@unique([email])           // Muy selectivo
@@unique([userId, eventId]) // Muy selectivo
@@index([createdAt])        // Ordenamiento
```

**Baja selectividad (índices menos útiles):**
```prisma
@@index([isPublic])   // Solo 2 valores (true/false)
@@index([status])     // Pocos valores distintos
```

**Recomendación:** Combinar con otros campos:
```prisma
@@index([status, createdAt])  // Mejor que solo status
```

### 5.3 Queries N+1 Prevenidas

```typescript
// ❌ N+1 Problem
const bookings = await prisma.booking.findMany();
for (const b of bookings) {
  b.experience = await prisma.experience.findUnique({ where: { id: b.experienceId } });
  b.user = await prisma.user.findUnique({ where: { id: b.userId } });
}
// 1 query + N queries + N queries = 2N+1 queries

// ✓ Solución: Include
const bookings = await prisma.booking.findMany({
  include: {
    experience: true,
    user: { select: { id: true, nombre: true } },
    timeSlot: true
  }
});
// 1 query con JOINs
```

### 5.4 Count Queries Optimizadas

```typescript
// ✓ Use _count para relaciones
const experience = await prisma.experience.findUnique({
  where: { id },
  include: {
    _count: {
      select: {
        bookings: true,
        reviews: true
      }
    }
  }
});
// experience._count.bookings (sin cargar todos los bookings)

// ❌ Evitar
const bookings = await prisma.booking.findMany({ where: { experienceId } });
const count = bookings.length;
```

---

## 6. Migraciones Importantes

### 6.1 Optimistic Locking (2026-01-25)

**Migración:** `20260125074152_add_optimistic_locking_to_time_slots`

```sql
ALTER TABLE "ExperienceTimeSlot"
ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
```

**Propósito:** Prevenir race conditions en bookings concurrentes.

### 6.2 Payment States (2026-01-25)

**Migración:** `20260125075421_add_payment_states`

```sql
-- Agregar nuevos estados a enums
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';

ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PENDING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE IF NOT EXISTS 'PAYMENT_FAILED';
```

**Propósito:** Soporte para flujo de pago en 3 fases.

### 6.3 User Roles Restructure (Commit 5fdff60)

**Cambios:**
- Agregado `UserRole` enum (USER, MODERATOR, ADMIN)
- Agregado `User.role` field
- Agregado `User.bannedAt`, `User.bannedReason`
- Unified SELLER + HOST roles

**Propósito:** Sistema de permisos más robusto, moderación.

---

## 7. Data Flow Examples

### 7.1 Crear Story → Gamificación → Notificación

```
1. POST /api/stories
   └─> StoryService.create()
       ├─> CREATE Story
       ├─> gamificationService.awardXP(userId, 10, 'CREATE_STORY')
       │   ├─> UPDATE UserStats (xp += 10)
       │   ├─> Calculate new level
       │   ├─> checkAndUnlockBadges()
       │   │   └─> If unlocked:
       │   │       ├─> CREATE UserBadge
       │   │       └─> CREATE Notification (BADGE_UNLOCKED)
       │   └─> CREATE ActivityLog
       └─> Return story

2. Followers ven en feed:
   GET /api/feed
   └─> SELECT Story FROM Story
       JOIN Follow ON Follow.followingId = Story.userId
       WHERE Follow.followerId = currentUserId
       ORDER BY Story.createdAt DESC
```

### 7.2 Compra Completa (Multi-Seller)

```
1. Agregar productos al carrito (varios vendedores)
   POST /api/marketplace/cart/items (x5)

2. Checkout
   POST /api/marketplace/orders
   └─> MarketplaceService.createOrder()
       ├─> Agrupar items por seller
       │   Seller A: [producto1, producto2]
       │   Seller B: [producto3]
       │
       ├─> TRANSACTION:
       │   ├─> CREATE Order (sellerId=A, status=PENDING_PAYMENT)
       │   ├─> CREATE OrderItem (x2)
       │   ├─> UPDATE Product.stock (x2, decrement)
       │   ├─> CREATE Order (sellerId=B, status=PENDING_PAYMENT)
       │   ├─> CREATE OrderItem (x1)
       │   ├─> UPDATE Product.stock (x1, decrement)
       │   └─> DELETE CartItem (vaciar carrito)
       │
       ├─> Stripe API (fuera de transacción):
       │   ├─> Create PaymentIntent for Order A
       │   └─> Create PaymentIntent for Order B
       │
       └─> UPDATE Orders con stripePaymentId (status=PENDING)

   Return: [
     { order: orderA, clientSecret: secretA },
     { order: orderB, clientSecret: secretB }
   ]

3. Frontend procesa 2 pagos con Stripe
4. Webhook confirma pagos
5. Orders → PAID → PROCESSING → SHIPPED → DELIVERED
```

---

## 8. Agregaciones y Reports

### 8.1 Seller Dashboard Stats

```typescript
// Ventas totales del vendedor
const stats = await prisma.order.aggregate({
  where: {
    sellerId,
    status: 'DELIVERED'
  },
  _sum: { total: true },
  _count: true
});

// Productos más vendidos
const topProducts = await prisma.orderItem.groupBy({
  by: ['productId'],
  where: {
    order: {
      sellerId,
      status: 'DELIVERED'
    }
  },
  _sum: { quantity: true },
  orderBy: { _sum: { quantity: 'desc' } },
  take: 5
});
```

### 8.2 Host Dashboard Stats

```typescript
// Bookings por estado
const bookingsByStatus = await prisma.booking.groupBy({
  by: ['status'],
  where: {
    experience: { hostId }
  },
  _count: true
});

// Ingresos totales
const earnings = await prisma.booking.aggregate({
  where: {
    experience: { hostId },
    status: 'COMPLETED'
  },
  _sum: { totalPrice: true }
});

// Ocupación promedio
const avgOccupancy = await prisma.experienceTimeSlot.aggregate({
  where: {
    experience: { hostId }
  },
  _avg: {
    bookedCount: true  // bookedCount / capacity
  }
});
```

### 8.3 Admin Analytics

```typescript
// Usuarios activos (últimos 30 días)
const activeUsers = await prisma.activityLog.groupBy({
  by: ['userId'],
  where: {
    createdAt: { gte: thirtyDaysAgo }
  },
  _count: true,
  having: {
    _count: { gt: 5 }  // Al menos 5 acciones
  }
});

// Distribución de roles
const roleDistribution = await prisma.user.groupBy({
  by: ['role'],
  _count: true
});

// Top earners (hosts)
const topHosts = await prisma.booking.groupBy({
  by: ['experience.hostId'],
  where: {
    status: 'COMPLETED'
  },
  _sum: { totalPrice: true },
  orderBy: { _sum: { totalPrice: 'desc' } },
  take: 10
});
```

---

## 9. Denormalization Examples

### 9.1 Rating Caching

**Normalizado (lento):**
```typescript
// Calcular rating cada vez
const reviews = await prisma.experienceReview.findMany({
  where: { experienceId }
});
const rating = reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
```

**Desnormalizado (rápido):**
```prisma
model Experience {
  rating: Float @default(0)      // ← Cached
  reviewCount: Int @default(0)   // ← Cached
}
```

```typescript
// Actualizar cache al crear review
const stats = await prisma.experienceReview.aggregate({
  where: { experienceId },
  _avg: { rating: true },
  _count: { rating: true }
});

await prisma.experience.update({
  where: { id: experienceId },
  data: {
    rating: stats._avg.rating,
    reviewCount: stats._count.rating
  }
});
```

**Trade-off:**
- (+) Queries más rápidas (no aggregation en cada request)
- (-) Complejidad en writes (mantener cache sincronizado)

### 9.2 Viewer Count (LiveStream)

```prisma
model LiveStream {
  viewerCount: Int @default(0)
  peakViewers: Int @default(0)
}
```

```typescript
// WebSocket connection:
await prisma.liveStream.update({
  where: { id: streamId },
  data: {
    viewerCount: { increment: 1 },
    peakViewers: { max: currentViewerCount + 1 }
  }
});

// WebSocket disconnect:
await prisma.liveStream.update({
  where: { id: streamId },
  data: { viewerCount: { decrement: 1 } }
});
```

**Alternativa sin denormalization:**
```typescript
// Count WebSocket connections en memoria
const viewers = new Map<string, Set<string>>();
viewers.get(streamId).size;
```

**Trade-off:**
- Denormalized: Persiste en DB, sobrevive restarts
- In-memory: Más rápido, pero se pierde en restart

---

## 10. Schema Evolution Strategy

### 10.1 Backward Compatible Changes

**Agregar campo opcional:**
```prisma
model User {
  phoneNumber: String?  // ← Safe
}
```

**Agregar relación:**
```prisma
model User {
  wishlistItems: WishlistItem[]  // ← Safe
}

model WishlistItem {
  userId: String
  productId: String
}
```

### 10.2 Breaking Changes

**Renombrar campo:**
```sql
-- Paso 1: Agregar nuevo campo
ALTER TABLE "User" ADD COLUMN "full_name" TEXT;

-- Paso 2: Migrar datos
UPDATE "User" SET "full_name" = "nombre" || ' ' || COALESCE("apellido", '');

-- Paso 3: Hacer obligatorio
ALTER TABLE "User" ALTER COLUMN "full_name" SET NOT NULL;

-- Paso 4: Eliminar campos viejos (después de deploy)
ALTER TABLE "User" DROP COLUMN "nombre";
ALTER TABLE "User" DROP COLUMN "apellido";
```

**Cambiar enum:**
```prisma
// Antes
enum UserRole { USER, HOST, ADMIN }

// Después (unificar HOST → SELLER)
enum UserRole { USER, SELLER, MODERATOR, ADMIN }

// Migración:
UPDATE "User" SET role = 'SELLER' WHERE role = 'HOST';
ALTER TYPE "UserRole" RENAME VALUE 'HOST' TO 'SELLER';
```

---

## 11. Data Integrity Checks

### 11.1 Invariant Validation Queries

```sql
-- Check 1: TimeSlot bookedCount <= capacity
SELECT * FROM "ExperienceTimeSlot"
WHERE "bookedCount" > "capacity";
-- Debe retornar 0 rows

-- Check 2: Booking guestCount suma correcta
SELECT
  ts.id,
  ts.bookedCount AS expected,
  SUM(b.guestCount) AS actual
FROM "ExperienceTimeSlot" ts
LEFT JOIN "Booking" b ON b.timeSlotId = ts.id
  AND b.status NOT IN ('CANCELLED', 'PAYMENT_FAILED')
GROUP BY ts.id
HAVING ts.bookedCount != COALESCE(SUM(b.guestCount), 0);
-- Debe retornar 0 rows

-- Check 3: Product stock no negativo
SELECT * FROM "Product"
WHERE stock < 0;
-- Debe retornar 0 rows

-- Check 4: Order total correcto
SELECT
  o.id,
  o.total AS expected,
  SUM(oi.price * oi.quantity) AS actual
FROM "Order" o
JOIN "OrderItem" oi ON oi.orderId = o.id
GROUP BY o.id
HAVING o.total != SUM(oi.price * oi.quantity);
-- Debe retornar 0 rows
```

### 11.2 Orphaned Records Detection

```sql
-- Bookings sin Experience (no debería pasar, hay FK)
SELECT * FROM "Booking" b
LEFT JOIN "Experience" e ON e.id = b.experienceId
WHERE e.id IS NULL;

-- CartItems de productos eliminados
SELECT * FROM "CartItem" ci
LEFT JOIN "Product" p ON p.id = ci.productId
WHERE p.id IS NULL;

-- Notifications de usuarios eliminados
SELECT * FROM "Notification" n
LEFT JOIN "User" u ON u.id = n.userId
WHERE u.id IS NULL;
```

---

## 12. Capacity Planning

### 12.1 Estimaciones de Tamaño

**Asumiendo 10,000 usuarios activos:**

| Tabla | Rows/User | Total Rows | Size Estimate |
|-------|-----------|------------|---------------|
| User | 1 | 10,000 | 500 KB |
| Story | 10 | 100,000 | 20 MB |
| Like | 50 | 500,000 | 15 MB |
| Comment | 20 | 200,000 | 40 MB |
| Follow | 30 | 300,000 | 10 MB |
| Notification | 100 | 1,000,000 | 200 MB |
| Booking | 5 | 50,000 | 15 MB |
| Order | 3 | 30,000 | 10 MB |
| **Total** | - | **~2M rows** | **~300 MB** |

**Proyección 100K usuarios:** ~3 GB de datos

**Índices:** ~20% del tamaño de datos = ~600 MB

**Total DB:** ~4 GB para 100K usuarios activos

### 12.2 Hot Tables (Write-Heavy)

```
ActivityLog      // Insert-heavy (cada acción)
Notification     // Insert-heavy (cada evento)
StreamMessage    // Insert-heavy (chat en vivo)
Like             // Insert/Delete frecuente

Optimización:
- Particionamiento por fecha (ActivityLog)
- Archivado de notificaciones viejas (>90 días)
- Limitar retención de StreamMessage (7 días)
```

### 12.3 Cold Tables (Read-Heavy)

```
Badge            // Casi nunca cambia
Event            // Creado por admins
BusRoute, Stop   // Datos estáticos

Optimización:
- Cachear en Redis (TTL: 1 hora)
- CDN para imágenes
```

---

## 13. Resumen de Entidades

### Total: 42 Modelos

**Por dominio:**
- Core & Social: 7 (User, Story, Like, Comment, Follow, UserStats, Badge)
- Marketplace: 7 (SellerProfile, Product, Cart, CartItem, Order, OrderItem, ProductReview)
- Bookings: 4 (Experience, TimeSlot, Booking, ExperienceReview)
- Events: 3 (Event, EventRSVP, EventReminder)
- Communities: 3 (Community, CommunityMember, CommunityPost)
- Streaming: 2 (LiveStream, StreamMessage)
- AR/Maps: 4 (POI, POIReview, POIFavorite, POICheckIn)
- Transport: 3 (BusRoute, Stop, Bus)
- Notifications: 2 (Notification, PushSubscription)
- Messaging: 4 (DirectConversation, DirectMessage, Conversation, Message)
- Analytics: 1 (ActivityLog)
- Gamification: 2 (Badge, UserBadge - UserStats está en Core)

### Relaciones Totales: ~80+ relaciones

**Tipos:**
- 1:1 - 5 (User:UserStats, User:Cart, User:SellerProfile)
- 1:N - 60+ (User:Story, Experience:Booking, etc.)
- N:M - 15+ (User:Badge via UserBadge, etc.)
- Self-referencing - 1 (User:Follow)
- Polymorphic - 1 (ActivityLog)

### Unique Constraints: 20+

Previenen duplicados en:
- Likes, Follows, RSVPs, Reviews, Bookings, etc.

### Cascade Deletes: 25+ relaciones

Garantizan integridad referencial.

---

## 14. Queries Críticas (Performance Sensitive)

### 14.1 Feed de Historias

```sql
-- Obtener stories de usuarios que sigo
SELECT s.* FROM "Story" s
JOIN "Follow" f ON f.followingId = s.userId
WHERE f.followerId = $userId
  AND s.createdAt > NOW() - INTERVAL '7 days'
ORDER BY s.createdAt DESC
LIMIT 20;

-- Índices necesarios:
-- Follow (followerId)
-- Story (userId, createdAt)
```

### 14.2 Búsqueda de Experiencias

```sql
-- Buscar experiencias con filtros
SELECT e.* FROM "Experience" e
WHERE e.isActive = true
  AND e.category = $category
  AND e.price BETWEEN $min AND $max
  AND (e.title ILIKE $search OR e.description ILIKE $search)
  AND EXISTS (
    SELECT 1 FROM "ExperienceTimeSlot" ts
    WHERE ts.experienceId = e.id
      AND ts.date = $date
      AND ts.isAvailable = true
  )
ORDER BY e.rating DESC, e.createdAt DESC
LIMIT 20 OFFSET $skip;

-- Índices necesarios:
-- Experience (isActive, category, rating)
-- ExperienceTimeSlot (experienceId, date, isAvailable)
```

### 14.3 Leaderboard

```sql
-- Top usuarios por XP
SELECT
  u.id,
  u.nombre,
  u.avatar,
  us.xp,
  us.level,
  COUNT(DISTINCT ub.badgeId) AS badgeCount
FROM "User" u
JOIN "UserStats" us ON us.userId = u.id
LEFT JOIN "UserBadge" ub ON ub.userId = u.id
WHERE u.bannedAt IS NULL
GROUP BY u.id, us.xp, us.level
ORDER BY us.xp DESC
LIMIT 100;

-- Índices necesarios:
-- UserStats (xp DESC)
-- User (bannedAt)
```

---

## 15. Conclusiones del Modelo de Datos

### Fortalezas

1. **Bien normalizado**: Pocas redundancias, relaciones claras
2. **Constraints adecuados**: Unique constraints previenen duplicados
3. **Cascade deletes**: Integridad referencial automática
4. **Enums bien definidos**: Estados claros, type-safe
5. **Optimistic locking**: Concurrencia manejada en puntos críticos
6. **Índices básicos**: Queries principales optimizadas

### Áreas de Mejora

1. **Falta versioning en Product**: Puede tener race conditions en stock
2. **Denormalization limitada**: Algunos aggregates se calculan en tiempo real
3. **Sin partitioning**: ActivityLog puede crecer mucho
4. **Sin archivado**: Datos viejos no se mueven a cold storage
5. **Índices faltantes**: Algunas queries de dashboard no optimizadas
6. **Sin audit trail**: No hay log de cambios en campos críticos (precio, stock)

### Recomendaciones

1. **Corto plazo:**
   - Agregar `version` a Product
   - Crear índices compuestos faltantes
   - Setup cleanup de ActivityLog (>90 días)

2. **Mediano plazo:**
   - Implementar audit trail (tabla de cambios)
   - Particionar ActivityLog por fecha
   - Cachear aggregations frecuentes

3. **Largo plazo:**
   - Considerar read replicas para analytics
   - Separar analytics en OLAP database
   - Implementar CQRS si escala

---

**Versión:** 1.0
**Fecha:** 2026-01-25
**Autor:** Claude Code
