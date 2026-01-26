# Flujos de Negocio Detallados
## Guelaguetza Connect - Documentación Técnica

---

## 📋 Tabla de Contenidos

1. [Flujo de Reservación (Booking)](#1-flujo-de-reservacion-booking)
2. [Flujo de Marketplace (Orders)](#2-flujo-de-marketplace-orders)
3. [Flujo de Autenticación y Autorización](#3-flujo-de-autenticacion-y-autorizacion)
4. [Flujo de Gamificación](#4-flujo-de-gamificacion)
5. [Flujo de Notificaciones](#5-flujo-de-notificaciones)
6. [Flujo de Comunidades](#6-flujo-de-comunidades)
7. [Flujo de Streaming](#7-flujo-de-streaming)
8. [Machine de Estados](#8-maquinas-de-estados)

---

## 1. Flujo de Reservación (Booking)

### 1.1 Crear Booking (Con Optimistic Locking)

```
┌──────────────┐
│   CLIENT     │
└──────┬───────┘
       │
       │ POST /api/bookings/bookings
       │ { experienceId, timeSlotId, guestCount: 2 }
       │
       ▼
┌──────────────────────────────────────────────────────────────┐
│ ROUTE: bookingsRoutes.ts                                     │
├──────────────────────────────────────────────────────────────┤
│ 1. Middleware: authenticate                                  │
│    - Verificar JWT                                           │
│    - Cargar user desde DB                                    │
│    - Verificar si está baneado                               │
│                                                              │
│ 2. Validar input con Zod:                                    │
│    CreateBookingSchema.parse(request.body)                   │
│                                                              │
│ 3. Delegar a service:                                        │
│    bookingService.createBooking(userId, data)                │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ SERVICE: BookingService.createBooking()                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│ WRAPPER: withRetry(() => {...}, { maxRetries: 3 })          │
│ │                                                            │
│ ├─ Intento 1:                                                │
│ │  │                                                         │
│ │  ├─ FASE 1: VALIDACIÓN Y RESERVA (Transacción DB)         │
│ │  │  ┌────────────────────────────────────────────────┐    │
│ │  │  │ 1.1 Fetch experience y timeSlot (parallel)     │    │
│ │  │  │     const [exp, slot] = await Promise.all([])  │    │
│ │  │  │                                                 │    │
│ │  │  │ 1.2 Validar:                                    │    │
│ │  │  │     ✓ Experience exists                         │    │
│ │  │  │     ✓ TimeSlot exists                           │    │
│ │  │  │     ✓ Slot pertenece a experience               │    │
│ │  │  │     ✓ Slot.isAvailable = true                   │    │
│ │  │  │     ✓ Hay espacio: capacity - bookedCount >= 2  │    │
│ │  │  │                                                 │    │
│ │  │  │ 1.3 Guardar versión:                            │    │
│ │  │  │     currentVersion = slot.version               │    │
│ │  │  │                                                 │    │
│ │  │  │ 1.4 Calcular precio:                            │    │
│ │  │  │     totalPrice = exp.price * guestCount         │    │
│ │  │  │                                                 │    │
│ │  │  │ 1.5 TRANSACCIÓN:                                │    │
│ │  │  │     await prisma.$transaction(async tx => {     │    │
│ │  │  │                                                 │    │
│ │  │  │       // Actualizar slot con locking optimista │    │
│ │  │  │       await updateTimeSlotWithLocking(          │    │
│ │  │  │         tx,                                     │    │
│ │  │  │         timeSlotId,                             │    │
│ │  │  │         currentVersion,  // ← Verificación      │    │
│ │  │  │         {                                       │    │
│ │  │  │           bookedCount: { increment: 2 },       │    │
│ │  │  │           isAvailable: (booked+2 < capacity)   │    │
│ │  │  │         }                                       │    │
│ │  │  │       );                                        │    │
│ │  │  │       // ↑ Si version cambió → ConcurrencyError│    │
│ │  │  │                                                 │    │
│ │  │  │       // Crear booking                         │    │
│ │  │  │       return tx.booking.create({               │    │
│ │  │  │         data: {                                │    │
│ │  │  │           userId,                              │    │
│ │  │  │           experienceId,                        │    │
│ │  │  │           timeSlotId,                          │    │
│ │  │  │           guestCount: 2,                       │    │
│ │  │  │           totalPrice,                          │    │
│ │  │  │           status: 'PENDING_PAYMENT'  // ← Fase 1│    │
│ │  │  │         }                                      │    │
│ │  │  │       });                                      │    │
│ │  │  │     });                                        │    │
│ │  │  └────────────────────────────────────────────────┘    │
│ │  │                                                         │
│ │  ├─ FASE 2: STRIPE API (Fuera de transacción)             │
│ │  │  ┌────────────────────────────────────────────────┐    │
│ │  │  │ 2.1 Crear PaymentIntent:                       │    │
│ │  │  │     const payment = await stripe.paymentIntents│    │
│ │  │  │       .create({                                │    │
│ │  │  │         amount: totalPrice * 100, // cents     │    │
│ │  │  │         metadata: {                            │    │
│ │  │  │           bookingId: booking.id,               │    │
│ │  │  │           experienceId,                        │    │
│ │  │  │           userId,                              │    │
│ │  │  │           guestCount: '2'                      │    │
│ │  │  │         }                                      │    │
│ │  │  │       });                                      │    │
│ │  │  │                                                │    │
│ │  │  │ 2.2 Si error:                                  │    │
│ │  │  │     await prisma.booking.update({              │    │
│ │  │  │       where: { id: booking.id },               │    │
│ │  │  │       data: { status: 'PAYMENT_FAILED' }       │    │
│ │  │  │     });                                        │    │
│ │  │  │     throw new AppError('Error al procesar...')│    │
│ │  │  └────────────────────────────────────────────────┘    │
│ │  │                                                         │
│ │  ├─ FASE 3: ACTUALIZACIÓN FINAL                            │
│ │  │  ┌────────────────────────────────────────────────┐    │
│ │  │  │ 3.1 Actualizar booking:                        │    │
│ │  │  │     await prisma.booking.update({              │    │
│ │  │  │       where: { id },                           │    │
│ │  │  │       data: {                                  │    │
│ │  │  │         stripePaymentId: payment.id,           │    │
│ │  │  │         status: 'PENDING'  // ← Listo para pago│    │
│ │  │  │       }                                        │    │
│ │  │  │     });                                        │    │
│ │  │  └────────────────────────────────────────────────┘    │
│ │  │                                                         │
│ │  └─ return { booking, clientSecret }                      │
│ │                                                            │
│ ├─ Si ConcurrencyError:                                     │
│ │    Esperar 100ms * 2^attempt                              │
│ │    Reintentar desde FASE 1                                │
│ │                                                            │
│ └─ Si maxRetries excedido:                                  │
│      throw ConcurrencyError('Max retries excedido')         │
│                                                              │
└──────────────────┬───────────────────────────────────────────┘
                   │
                   ▼
┌──────────────────────────────────────────────────────────────┐
│ ROUTE: Manejo de respuesta                                   │
├──────────────────────────────────────────────────────────────┤
│ try {                                                        │
│   const result = await bookingService.createBooking(...)    │
│   reply.status(201).send(result)                            │
│ } catch (error) {                                            │
│   if (error instanceof ConcurrencyError) {                   │
│     reply.status(409).send({                                 │
│       error: 'ConcurrencyError',                             │
│       hint: 'Recarga los datos e intenta nuevamente'         │
│     });                                                      │
│   }                                                          │
│   throw error;                                               │
│ }                                                            │
└──────────────────────────────────────────────────────────────┘
```

### 1.2 Confirmar Booking (Después de Pago)

```
POST /api/bookings/bookings/:id/confirm

┌────────────────────────────────────────────────┐
│ 1. Fetch booking con experience                │
│    WHERE id AND userId = currentUser           │
│                                                │
│ 2. Validar estado:                             │
│    ✓ Status in ['PENDING', 'PENDING_PAYMENT']  │
│    ✗ Si ya confirmado → Error 400              │
│                                                │
│ 3. Verificar pago en Stripe:                   │
│    const status = await stripe                 │
│      .paymentIntents                           │
│      .retrieve(booking.stripePaymentId);       │
│                                                │
│    if (status !== 'succeeded') {               │
│      throw AppError('Pago no completado')      │
│    }                                           │
│                                                │
│ 4. Actualizar booking:                         │
│    UPDATE Booking                              │
│    SET status = 'CONFIRMED',                   │
│        confirmedAt = NOW()                     │
│    WHERE id                                    │
│                                                │
│ 5. (Futuro) Enviar notificaciones:             │
│    - Al usuario (confirmación)                 │
│    - Al host (nueva reservación)               │
└────────────────────────────────────────────────┘
```

### 1.3 Cancelar Booking (Con Refund)

```
POST /api/bookings/bookings/:id/cancel

┌────────────────────────────────────────────────┐
│ WRAPPER: withRetry()                           │
│ │                                              │
│ ├─ 1. Fetch booking + timeSlot                 │
│ │      WHERE id                                │
│ │                                              │
│ │  2. Validar permisos:                        │
│ │     ✓ userId === booking.userId OR           │
│ │     ✓ userId === booking.experience.hostId   │
│ │                                              │
│ │  3. Validar estado:                          │
│ │     ✗ Status === 'CANCELLED' → Error         │
│ │     ✗ Status === 'COMPLETED' → Error         │
│ │                                              │
│ │  4. Guardar versión:                         │
│ │     currentVersion = timeSlot.version        │
│ │                                              │
│ │  5. REFUND EN STRIPE (antes de BD):          │
│ │     if (status === 'CONFIRMED' &&            │
│ │         stripePaymentId) {                   │
│ │       await stripe.refunds.create({          │
│ │         payment_intent: stripePaymentId      │
│ │       });                                    │
│ │     }                                        │
│ │                                              │
│ │  6. TRANSACCIÓN: Cancelar + Restaurar        │
│ │     await prisma.$transaction(async tx => {  │
│ │                                              │
│ │       // Restaurar capacidad con locking     │
│ │       await updateTimeSlotWithLocking(       │
│ │         tx, timeSlotId, currentVersion,      │
│ │         {                                    │
│ │           bookedCount: { decrement: 2 },    │
│ │           isAvailable: true                 │
│ │         }                                    │
│ │       );                                     │
│ │                                              │
│ │       // Actualizar booking                  │
│ │       return tx.booking.update({             │
│ │         where: { id },                       │
│ │         data: {                              │
│ │           status: 'CANCELLED',               │
│ │           cancelledAt: new Date()            │
│ │         }                                    │
│ │       });                                    │
│ │     });                                      │
│ │                                              │
│ └─ Si ConcurrencyError → Retry                 │
└────────────────────────────────────────────────┘
```

### 1.4 Cleanup Job (Bookings Fallidos)

```
SCHEDULER (cada 15 minutos)
  │
  └─→ cleanupFailedBookings(timeoutMinutes = 30)

┌────────────────────────────────────────────────┐
│ 1. Query bookings fallidos:                    │
│    WHERE status IN ['PENDING_PAYMENT',         │
│                     'PAYMENT_FAILED']          │
│      AND createdAt < NOW() - 30 minutes        │
│                                                │
│ 2. Agrupar por timeSlot:                       │
│    Map<timeSlotId, total guestCount>           │
│                                                │
│ 3. TRANSACCIÓN:                                │
│    For each (timeSlotId, guestCount):          │
│      UPDATE ExperienceTimeSlot                 │
│      SET bookedCount = bookedCount - count,    │
│          isAvailable = true                    │
│      WHERE id = timeSlotId                     │
│                                                │
│    UPDATE Bookings                             │
│    SET status = 'CANCELLED',                   │
│        cancelledAt = NOW()                     │
│    WHERE id IN (failedBookingIds)              │
│                                                │
│ 4. Return { cleaned: count }                   │
└────────────────────────────────────────────────┘
```

**Escenarios cubiertos:**
- Usuario abandona checkout
- Error de Stripe no recuperado
- Usuario nunca completa pago

---

## 2. Flujo de Marketplace (Orders)

### 2.1 Agregar al Carrito

```
POST /api/marketplace/cart/items
{ productId, quantity: 2 }

┌────────────────────────────────────────────────┐
│ 1. Fetch product:                              │
│    WHERE id = productId                        │
│                                                │
│ 2. Validar:                                    │
│    ✓ Product exists                            │
│    ✓ Status === 'ACTIVE'                       │
│    ✓ Stock >= quantity                         │
│                                                │
│ 3. Get or create cart:                         │
│    Cart WHERE userId                           │
│    (auto-create si no existe)                  │
│                                                │
│ 4. Check existing cart item:                   │
│    WHERE cartId AND productId                  │
│                                                │
│    Si existe:                                  │
│      newQty = existing.quantity + quantity     │
│      Validar: newQty <= product.stock          │
│      UPDATE CartItem SET quantity = newQty     │
│                                                │
│    Si NO existe:                               │
│      CREATE CartItem {                         │
│        cartId, productId, quantity             │
│      }                                         │
│                                                │
│ 5. Return cart actualizado (con totales)       │
└────────────────────────────────────────────────┘
```

### 2.2 Checkout (Crear Order)

```
POST /api/marketplace/orders
{ shippingAddress: {...} }

┌────────────────────────────────────────────────────────────┐
│ 1. Fetch cart con items + products                         │
│    WHERE userId                                            │
│                                                            │
│ 2. Validar carrito no vacío                                │
│                                                            │
│ 3. Agrupar items por vendedor:                             │
│    Map<sellerId, CartItem[]>                               │
│                                                            │
│ 4. FASE 1: CREAR ÓRDENES Y RESERVAR STOCK                  │
│    ┌──────────────────────────────────────────────────┐    │
│    │ TRANSACCIÓN:                                      │    │
│    │ For each seller:                                  │    │
│    │                                                   │    │
│    │   4.1 Validar stock de cada producto:             │    │
│    │       For each item:                              │    │
│    │         product = FETCH Product                   │    │
│    │         if (product.stock < item.quantity)        │    │
│    │           throw AppError('Stock insuficiente')    │    │
│    │                                                   │    │
│    │   4.2 Calcular total:                             │    │
│    │       total = sum(item.price * item.quantity)     │    │
│    │                                                   │    │
│    │   4.3 Crear Order:                                │    │
│    │       CREATE Order {                              │    │
│    │         userId, sellerId,                         │    │
│    │         status: 'PENDING_PAYMENT',                │    │
│    │         total,                                    │    │
│    │         shippingAddress                           │    │
│    │       }                                           │    │
│    │                                                   │    │
│    │   4.4 Crear OrderItems:                           │    │
│    │       CREATE OrderItem (for each item)            │    │
│    │                                                   │    │
│    │   4.5 Reservar stock:                             │    │
│    │       For each item:                              │    │
│    │         UPDATE Product                            │    │
│    │         SET stock = stock - quantity              │    │
│    │         WHERE id = item.productId                 │    │
│    │                                                   │    │
│    │ 4.6 Vaciar carrito:                               │    │
│    │     DELETE CartItem WHERE cartId                  │    │
│    └──────────────────────────────────────────────────┘    │
│                                                            │
│ 5. FASE 2: CREAR PAYMENT INTENTS (Para cada orden)         │
│    ┌──────────────────────────────────────────────────┐    │
│    │ For each order:                                   │    │
│    │   try {                                           │    │
│    │     payment = await stripe.paymentIntents.create()│    │
│    │                                                   │    │
│    │     // FASE 3: Actualizar                         │    │
│    │     await prisma.order.update({                   │    │
│    │       where: { id: order.id },                    │    │
│    │       data: {                                     │    │
│    │         stripePaymentId: payment.id,              │    │
│    │         status: 'PENDING'                         │    │
│    │       }                                           │    │
│    │     });                                           │    │
│    │   } catch (stripeError) {                         │    │
│    │     // Marcar como fallido                        │    │
│    │     await prisma.order.update({                   │    │
│    │       data: { status: 'PAYMENT_FAILED' }          │    │
│    │     });                                           │    │
│    │   }                                               │    │
│    └──────────────────────────────────────────────────┘    │
│                                                            │
│ 6. Return array de { order, clientSecret }                 │
└────────────────────────────────────────────────────────────┘
```

**Multi-Seller Support:**
- Un carrito puede tener productos de múltiples vendedores
- Se crea una Order POR VENDEDOR
- Cada orden tiene su propio PaymentIntent
- Usuario paga múltiples veces (frontend maneja esto)

### 2.3 Actualizar Estado de Orden (Seller)

```
PUT /api/marketplace/orders/:id/status
{ status: 'SHIPPED' }

┌────────────────────────────────────────────────┐
│ 1. Fetch order con seller                      │
│                                                │
│ 2. Validar permiso:                            │
│    ✓ order.seller.userId === currentUserId     │
│                                                │
│ 3. Validar transición válida:                  │
│    PAID → PROCESSING ✓                         │
│    PROCESSING → SHIPPED ✓                      │
│    SHIPPED → DELIVERED ✓                       │
│    PENDING → CANCELLED ✓                       │
│    COMPLETED → CANCELLED ✗                     │
│                                                │
│ 4. UPDATE Order SET status                     │
│                                                │
│ 5. (Futuro) Notificar al comprador             │
└────────────────────────────────────────────────┘
```

---

## 3. Flujo de Autenticación y Autorización

### 3.1 Register

```
POST /api/auth/register
{ email, password, nombre, apellido?, region? }

┌────────────────────────────────────────────────┐
│ AuthService.register()                         │
├────────────────────────────────────────────────┤
│ 1. Verificar email único:                      │
│    existingUser = FIND User WHERE email        │
│    if (existingUser)                           │
│      throw AppError('Email ya registrado')     │
│                                                │
│ 2. Hashear password:                           │
│    hash = await bcrypt.hash(password, 10)      │
│                                                │
│ 3. Crear usuario:                              │
│    user = CREATE User {                        │
│      email, password: hash,                    │
│      nombre, apellido, region,                 │
│      role: 'USER',  // ← Default                │
│      isPublic: true                            │
│    }                                           │
│                                                │
│ 4. Crear UserStats (auto):                     │
│    CREATE UserStats {                          │
│      userId, xp: 0, level: 1, streak: 0        │
│    }                                           │
│                                                │
│ 5. Generar JWT:                                │
│    token = jwt.sign(                           │
│      { userId: user.id },                      │
│      SECRET,                                   │
│      { expiresIn: '7d' }                       │
│    )                                           │
│                                                │
│ 6. Return { user, token }                      │
└────────────────────────────────────────────────┘
```

### 3.2 Login

```
POST /api/auth/login
{ email, password }

┌────────────────────────────────────────────────┐
│ AuthService.login()                            │
├────────────────────────────────────────────────┤
│ 1. Fetch user:                                 │
│    user = FIND User WHERE email                │
│    if (!user)                                  │
│      throw AppError('Credenciales inválidas')  │
│                                                │
│ 2. Verificar password:                         │
│    isValid = await bcrypt.compare(             │
│      password,                                 │
│      user.password                             │
│    )                                           │
│    if (!isValid)                               │
│      throw AppError('Credenciales inválidas')  │
│                                                │
│ 3. Generar JWT:                                │
│    token = jwt.sign(                           │
│      { userId: user.id },                      │
│      SECRET,                                   │
│      { expiresIn: '7d' }                       │
│    )                                           │
│                                                │
│ 4. Return {                                    │
│      user: {                                   │
│        id, email, nombre, apellido,            │
│        avatar, region, role                    │
│      },                                        │
│      token                                     │
│    }                                           │
└────────────────────────────────────────────────┘
```

### 3.3 Middleware: authenticate

```
GET /api/bookings/bookings
Header: Authorization: Bearer <token>

┌────────────────────────────────────────────────┐
│ fastify.authenticate()                         │
├────────────────────────────────────────────────┤
│ 1. Verificar header:                           │
│    token = extractFromHeader(request)          │
│    if (!token)                                 │
│      reply.status(401).send('No autorizado')   │
│                                                │
│ 2. Verificar JWT signature:                    │
│    decoded = jwt.verify(token, SECRET)         │
│    // Lanza error si inválido/expirado         │
│                                                │
│ 3. Fetch user completo desde DB:              │
│    user = FIND User                            │
│      WHERE id = decoded.userId                 │
│      SELECT id, email, role, bannedAt          │
│                                                │
│    if (!user)                                  │
│      reply.status(401).send('Usuario no found')│
│                                                │
│ 4. Verificar si está baneado:                  │
│    if (user.bannedAt)                          │
│      reply.status(403).send('Cuenta suspendida')│
│                                                │
│ 5. Adjuntar a request:                         │
│    request.user = {                            │
│      id: user.id,                              │
│      userId: user.id, // alias                 │
│      email: user.email,                        │
│      role: user.role,                          │
│      bannedAt: user.bannedAt                   │
│    }                                           │
│                                                │
│ 6. Continuar al handler                        │
└────────────────────────────────────────────────┘
```

### 3.4 Admin Middleware

```
DELETE /api/admin/users/:id
onRequest: [authenticate, requireAdmin]

┌────────────────────────────────────────────────┐
│ requireAdmin()                                 │
├────────────────────────────────────────────────┤
│ const user = request.user;                     │
│                                                │
│ if (user.role !== 'ADMIN') {                   │
│   reply.status(403).send({                     │
│     error: 'Requiere permisos de admin'        │
│   });                                          │
│ }                                              │
│                                                │
│ // Continuar al handler                        │
└────────────────────────────────────────────────┘
```

---

## 4. Flujo de Gamificación

### 4.1 Award XP (Al crear story)

```
POST /api/stories
{ description, mediaUrl, location }

┌────────────────────────────────────────────────┐
│ StoryService.createStory()                     │
├────────────────────────────────────────────────┤
│ 1. Crear story:                                │
│    story = CREATE Story {                      │
│      userId, description, mediaUrl, location   │
│    }                                           │
│                                                │
│ 2. Trigger gamificación:                       │
│    await gamificationService.awardXP(          │
│      userId,                                   │
│      amount: 10,                               │
│      action: 'CREATE_STORY'                    │
│    )                                           │
│                                                │
│ 3. Return story                                │
└────────────────────────────────────────────────┘
       │
       ▼
┌────────────────────────────────────────────────┐
│ GamificationService.awardXP()                  │
├────────────────────────────────────────────────┤
│ 1. Get or create UserStats:                   │
│    stats = FIND UserStats WHERE userId         │
│                                                │
│ 2. Actualizar XP:                              │
│    newXP = stats.xp + 10                       │
│                                                │
│ 3. Calcular nivel:                             │
│    newLevel = Math.floor(√(newXP / 100))       │
│    levelUp = newLevel > stats.level            │
│                                                │
│ 4. TRANSACCIÓN:                                │
│    UPDATE UserStats                            │
│    SET xp = newXP, level = newLevel            │
│                                                │
│    if (levelUp) {                              │
│      CREATE Notification {                     │
│        type: 'LEVEL_UP',                       │
│        title: '¡Subiste a nivel ' + newLevel   │
│      }                                         │
│    }                                           │
│                                                │
│ 5. Check badges desbloqueables:                │
│    await checkAndUnlockBadges(userId)          │
│                                                │
│ 6. Log actividad:                              │
│    CREATE ActivityLog {                        │
│      userId, action: 'XP_EARNED',              │
│      metadata: { amount: 10, action: '...' }   │
│    }                                           │
└────────────────────────────────────────────────┘
```

### 4.2 Desbloquear Badges

```
checkAndUnlockBadges(userId)

┌────────────────────────────────────────────────┐
│ 1. Fetch user stats + badges actuales:         │
│    stats = UserStats + UserBadge[]             │
│                                                │
│ 2. Fetch all badges disponibles:               │
│    allBadges = FIND Badge                      │
│                                                │
│ 3. For each badge:                             │
│    ┌──────────────────────────────────────┐    │
│    │ if (alreadyUnlocked) skip            │    │
│    │                                      │    │
│    │ if (badge.code === 'FIRST_STORY') {  │    │
│    │   count = COUNT Story WHERE userId   │    │
│    │   if (count >= 1) unlock()           │    │
│    │ }                                    │    │
│    │                                      │    │
│    │ if (badge.code === 'CONNECTED') {    │    │
│    │   followers = COUNT Follow           │    │
│    │     WHERE followingId = userId       │    │
│    │   if (followers >= 50) unlock()      │    │
│    │ }                                    │    │
│    │                                      │    │
│    │ // ... más condiciones                │    │
│    └──────────────────────────────────────┘    │
│                                                │
│ 4. Para cada badge desbloqueado:               │
│    TRANSACCIÓN:                                │
│      CREATE UserBadge { userId, badgeId }      │
│      UPDATE UserStats                          │
│        SET xp = xp + badge.xpReward            │
│      CREATE Notification {                     │
│        type: 'BADGE_UNLOCKED',                 │
│        title: '¡Insignia desbloqueada!',       │
│        body: badge.name                        │
│      }                                         │
└────────────────────────────────────────────────┘
```

### 4.3 Actualizar Streaks

```
updateStreak(userId)

┌────────────────────────────────────────────────┐
│ 1. Fetch UserStats:                            │
│    stats = FIND UserStats WHERE userId         │
│                                                │
│ 2. Obtener fechas:                             │
│    lastVisit = stats.lastVisitDate             │
│    today = new Date()                          │
│                                                │
│ 3. Determinar acción:                          │
│    if (isToday(lastVisit)) {                   │
│      // Ya visitó hoy, no hacer nada           │
│      return stats;                             │
│    }                                           │
│                                                │
│    if (isYesterday(lastVisit)) {               │
│      // Continuar racha                        │
│      newStreak = stats.currentStreak + 1;      │
│      if (newStreak > stats.longestStreak) {    │
│        longestStreak = newStreak;              │
│      }                                         │
│    } else {                                    │
│      // Racha rota                             │
│      newStreak = 1;                            │
│    }                                           │
│                                                │
│ 4. Actualizar:                                 │
│    UPDATE UserStats                            │
│    SET currentStreak = newStreak,              │
│        longestStreak = max(longest, new),      │
│        lastVisitDate = today                   │
│                                                │
│ 5. Check badge "Racha de 7 días":              │
│    if (newStreak === 7) {                      │
│      unlockBadge('WEEKLY_STREAK')              │
│    }                                           │
└────────────────────────────────────────────────┘
```

---

## 5. Flujo de Notificaciones

### 5.1 Crear Notificación

```
Trigger: Evento de negocio (like, follow, badge, etc.)

┌────────────────────────────────────────────────┐
│ NotificationService.create()                   │
├────────────────────────────────────────────────┤
│ 1. Crear en DB:                                │
│    notification = CREATE Notification {        │
│      userId,                                   │
│      type: 'NEW_FOLLOWER',                     │
│      title: 'Juan te está siguiendo',          │
│      body: '',                                 │
│      data: { followerId },                     │
│      read: false                               │
│    }                                           │
│                                                │
│ 2. Buscar subscriptions:                       │
│    subs = FIND PushSubscription                │
│      WHERE userId                              │
│                                                │
│ 3. Enviar push notifications:                  │
│    For each subscription:                      │
│      await webpush.sendNotification(           │
│        subscription,                           │
│        JSON.stringify({                        │
│          title: notification.title,            │
│          body: notification.body,              │
│          icon: '/icon-192x192.png',            │
│          data: notification.data               │
│        })                                      │
│      )                                         │
│                                                │
│ 4. (Futuro) Enviar por WebSocket si conectado  │
│                                                │
│ 5. Return notification                         │
└────────────────────────────────────────────────┘
```

### 5.2 Tipos de Notificaciones

```typescript
enum NotificationType {
  NEW_FOLLOWER     // "{follower} te está siguiendo"
  LIKE             // "{user} le gustó tu historia"
  COMMENT          // "{user} comentó en tu historia"
  BADGE_UNLOCKED   // "¡Insignia desbloqueada! {badgeName}"
  LEVEL_UP         // "¡Subiste a nivel {level}!"
  DIRECT_MESSAGE   // "Nuevo mensaje de {sender}"
  EVENT_REMINDER   // "Recordatorio: {eventName} en 1 hora"
  SYSTEM           // "Actualización del sistema"
}
```

**Trigger points:**
```typescript
// En SocialService.follow()
await notificationService.create(followingId, {
  type: 'NEW_FOLLOWER',
  title: `${follower.nombre} te está siguiendo`,
  data: { followerId }
});

// En StoryService (cuando recibe like)
await notificationService.create(story.userId, {
  type: 'LIKE',
  title: 'Te han dado me gusta',
  body: `A ${liker.nombre} le gustó tu historia`,
  data: { storyId, likerId }
});
```

---

## 6. Flujo de Comunidades

### 6.1 Crear Comunidad

```
POST /api/communities
{ name, description, isPublic: true }

┌────────────────────────────────────────────────┐
│ 1. Generar slug:                               │
│    slug = slugify(name) + '-' + randomId()     │
│                                                │
│ 2. Validar unicidad:                           │
│    existing = FIND Community WHERE slug        │
│    if (existing) regenerate slug               │
│                                                │
│ 3. TRANSACCIÓN:                                │
│    community = CREATE Community {              │
│      name, slug, description,                  │
│      isPublic, createdById: userId             │
│    }                                           │
│                                                │
│    // Auto-unirse como ADMIN                   │
│    CREATE CommunityMember {                    │
│      userId, communityId: community.id,        │
│      role: 'ADMIN'                             │
│    }                                           │
│                                                │
│ 4. Return community                            │
└────────────────────────────────────────────────┘
```

### 6.2 Unirse a Comunidad

```
POST /api/communities/:id/join

┌────────────────────────────────────────────────┐
│ 1. Fetch community:                            │
│    WHERE id                                    │
│                                                │
│ 2. Validar:                                    │
│    if (!community.isPublic)                    │
│      // Requiere aprobación (futuro)           │
│      throw AppError('Comunidad privada')       │
│                                                │
│ 3. Check si ya es miembro:                     │
│    existing = FIND CommunityMember             │
│      WHERE userId AND communityId              │
│    if (existing)                               │
│      throw AppError('Ya eres miembro')         │
│                                                │
│ 4. Crear membresía:                            │
│    CREATE CommunityMember {                    │
│      userId, communityId,                      │
│      role: 'MEMBER'                            │
│    }                                           │
│                                                │
│ 5. (Futuro) Notificar a admins de comunidad    │
└────────────────────────────────────────────────┘
```

### 6.3 Crear Post en Comunidad

```
POST /api/communities/:id/posts
{ content, imageUrl? }

┌────────────────────────────────────────────────┐
│ 1. Fetch community                             │
│                                                │
│ 2. Verificar membresía:                        │
│    member = FIND CommunityMember               │
│      WHERE userId AND communityId              │
│    if (!member)                                │
│      throw ForbiddenError('No eres miembro')   │
│                                                │
│ 3. Crear post:                                 │
│    post = CREATE CommunityPost {               │
│      communityId, authorId: userId,            │
│      content, imageUrl                         │
│    }                                           │
│                                                │
│ 4. (Futuro) Notificar a miembros activos       │
│                                                │
│ 5. Award XP:                                   │
│    gamificationService.awardXP(                │
│      userId, 5, 'COMMUNITY_POST'               │
│    )                                           │
└────────────────────────────────────────────────┘
```

---

## 7. Flujo de Streaming

### 7.1 Crear Stream

```
POST /api/streams
{ title, category, scheduledAt? }

┌────────────────────────────────────────────────┐
│ 1. Generar stream key:                         │
│    streamKey = generateSecureKey()             │
│                                                │
│ 2. Crear stream:                               │
│    stream = CREATE LiveStream {                │
│      userId,                                   │
│      title, category,                          │
│      streamKey,  // ← Para OBS/software        │
│      status: 'SCHEDULED',                      │
│      scheduledAt: scheduledAt || NOW()         │
│    }                                           │
│                                                │
│ 3. (Futuro) Integrar con servicio de video:    │
│    - Generar RTMP endpoint                     │
│    - Configurar transcoding                    │
│    - Generar HLS/DASH playback URL             │
│                                                │
│ 4. Return stream con streamKey                 │
└────────────────────────────────────────────────┘
```

### 7.2 Iniciar Stream (SCHEDULED → LIVE)

```
POST /api/streams/:id/start

┌────────────────────────────────────────────────┐
│ 1. Fetch stream:                               │
│    WHERE id AND userId = currentUser           │
│                                                │
│ 2. Validar estado:                             │
│    ✓ Status === 'SCHEDULED'                    │
│                                                │
│ 3. Actualizar:                                 │
│    UPDATE LiveStream                           │
│    SET status = 'LIVE',                        │
│        startedAt = NOW()                       │
│                                                │
│ 4. (Futuro) Notificar a followers:             │
│    followers = FIND Follow                     │
│      WHERE followingId = userId                │
│    For each follower:                          │
│      CREATE Notification {                     │
│        type: 'LIVE_STREAM',                    │
│        title: '{user} está en vivo'            │
│      }                                         │
└────────────────────────────────────────────────┘
```

### 7.3 WebSocket: Chat de Stream

```
WS /api/streams/:id/chat

┌────────────────────────────────────────────────┐
│ CONNECTION:                                    │
│ 1. Verificar JWT en query params               │
│ 2. Verificar que stream está LIVE              │
│ 3. Incrementar viewerCount                     │
│    UPDATE LiveStream                           │
│    SET viewerCount = viewerCount + 1,          │
│        peakViewers = MAX(peak, current+1)      │
│                                                │
│ MESSAGE:                                       │
│ 1. Validar formato                             │
│ 2. Guardar en DB:                              │
│    CREATE StreamMessage {                      │
│      streamId, userId, content                 │
│    }                                           │
│ 3. Broadcast a todos los viewers:              │
│    ws.broadcast({                              │
│      type: 'message',                          │
│      user: { id, nombre, avatar },             │
│      content, createdAt                        │
│    })                                          │
│                                                │
│ DISCONNECT:                                    │
│ 1. Decrementar viewerCount                     │
│    UPDATE LiveStream                           │
│    SET viewerCount = viewerCount - 1           │
└────────────────────────────────────────────────┘
```

---

## 8. Máquinas de Estados

### 8.1 BookingStatus State Machine

```
                    ┌─────────────────┐
                    │ PENDING_PAYMENT │ (Inventario reservado)
                    └────┬────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
    ┌──────────┐   ┌─────────┐  ┌──────────────┐
    │ PAYMENT_ │   │ PENDING │  │ CANCELLED    │
    │ FAILED   │   └────┬────┘  └──────────────┘
    └────┬─────┘        │
         │              │ confirm payment
         │              │
         │         ┌────▼────────┐
         │         │ CONFIRMED   │
         │         └────┬────────┘
         │              │ host completes
         │              │
         │         ┌────▼────────┐
         └────────→│ CANCELLED   │
                   └─────────────┘
                         │
                         │ experience ends
                         │
                   ┌─────▼──────┐
                   │ COMPLETED  │
                   └────────────┘
```

**Transiciones permitidas:**
```typescript
const bookingTransitions = {
  PENDING_PAYMENT: ['PENDING', 'PAYMENT_FAILED', 'CANCELLED'],
  PENDING: ['CONFIRMED', 'CANCELLED'],
  PAYMENT_FAILED: ['PENDING', 'CANCELLED'], // Retry
  CONFIRMED: ['COMPLETED', 'CANCELLED'],
  CANCELLED: [], // Terminal
  COMPLETED: []  // Terminal
};

function canTransition(from: BookingStatus, to: BookingStatus): boolean {
  return bookingTransitions[from].includes(to);
}
```

### 8.2 OrderStatus State Machine

```
                    ┌─────────────────┐
                    │ PENDING_PAYMENT │ (Stock reservado)
                    └────┬────────────┘
                         │
            ┌────────────┼────────────┐
            │            │            │
            ▼            ▼            ▼
    ┌──────────┐   ┌─────────┐  ┌──────────────┐
    │ PAYMENT_ │   │ PENDING │  │ CANCELLED    │
    │ FAILED   │   └────┬────┘  └──────────────┘
    └────┬─────┘        │
         │              │ payment succeeds
         │              │
         │         ┌────▼────────┐
         │         │    PAID     │
         │         └────┬────────┘
         │              │ seller processes
         │              │
         │         ┌────▼────────┐
         │         │ PROCESSING  │
         │         └────┬────────┘
         │              │ seller ships
         │              │
         │         ┌────▼────────┐
         │         │  SHIPPED    │
         │         └────┬────────┘
         │              │ arrives
         │              │
         │         ┌────▼────────┐
         └────────→│ DELIVERED   │
                   └─────┬───────┘
                         │ refund requested
                         │
                   ┌─────▼─────┐
                   │ REFUNDED  │
                   └───────────┘
```

### 8.3 ProductStatus State Machine

```
    ┌───────┐
    │ DRAFT │ (Borrador, no visible)
    └───┬───┘
        │ seller publishes
        │
    ┌───▼────┐
    │ ACTIVE │ (Visible, comprable)
    └───┬────┘
        │
        ├─→ stock = 0 → SOLD_OUT
        │
        └─→ seller archives → ARCHIVED
```

---

## 9. Patrones de Concurrencia

### 9.1 Escenario: Booking Concurrente

**Setup:**
- TimeSlot con capacity=10, bookedCount=8
- User A quiere reservar 2 espacios
- User B quiere reservar 2 espacios
- Ambos inician casi simultáneamente

**Timeline sin Optimistic Locking (INCORRECTO):**

```
Time | User A                        | User B                        | DB
-----|-------------------------------|-------------------------------|-----
t0   | Leer slot: booked=8, cap=10   |                               | 8
t1   |                               | Leer slot: booked=8, cap=10   | 8
t2   | Validar: 8+2=10 ✓            |                               | 8
t3   |                               | Validar: 8+2=10 ✓            | 8
t4   | UPDATE booked=booked+2        |                               | 10
t5   |                               | UPDATE booked=booked+2        | 12 ❌
```

**Resultado:** OVERBOOKING - 12 reservaciones para capacidad de 10.

**Timeline CON Optimistic Locking (CORRECTO):**

```
Time | User A                        | User B                        | DB (booked, version)
-----|-------------------------------|-------------------------------|----------------------
t0   | Leer slot: booked=8, v=1      |                               | (8, 1)
t1   |                               | Leer slot: booked=8, v=1      | (8, 1)
t2   | Validar: 8+2=10 ✓            |                               | (8, 1)
t3   |                               | Validar: 8+2=10 ✓            | (8, 1)
t4   | BEGIN TRANSACTION             |                               | (8, 1)
t5   | UPDATE ExperienceTimeSlot     |                               |
     | SET booked=10, version=2      |                               |
     | WHERE id=X AND version=1      |                               |
t6   | COMMIT ✓                      |                               | (10, 2)
t7   |                               | BEGIN TRANSACTION             | (10, 2)
t8   |                               | UPDATE ExperienceTimeSlot     |
     |                               | SET booked=12, version=3      |
     |                               | WHERE id=X AND version=1      |
t9   |                               | → result.count = 0 ❌        | (10, 2)
t10  |                               | ROLLBACK                      | (10, 2)
t11  |                               | throw ConcurrencyError        |
t12  |                               | RETRY (intento 2):            |
     |                               | Leer slot: booked=10, v=2     | (10, 2)
t13  |                               | Validar: 10+2 > 10 ✗         | (10, 2)
t14  |                               | throw AppError('No space')    | (10, 2)
```

**Resultado:** User A exitoso, User B rechazado correctamente.

### 9.2 Escenario: Cancelación Concurrente

**Setup:**
- Booking con guestCount=2, timeSlot en version=5
- User A cancela booking
- Host B cancela mismo booking
- Casi simultáneo

```
Time | User A (Cancel)               | Host B (Cancel)               | DB (booked, v)
-----|-------------------------------|-------------------------------|----------------
t0   | Fetch booking + slot v=5      |                               | (10, 5)
t1   |                               | Fetch booking + slot v=5      | (10, 5)
t2   | Refund en Stripe ✓           |                               | (10, 5)
t3   |                               | Refund en Stripe (idempotente)| (10, 5)
t4   | BEGIN TRANSACTION             |                               | (10, 5)
t5   | UPDATE slot WHERE v=5         |                               |
     | SET booked=8, version=6       |                               |
t6   | UPDATE booking=CANCELLED      |                               |
t7   | COMMIT ✓                      |                               | (8, 6)
t8   |                               | BEGIN TRANSACTION             | (8, 6)
t9   |                               | UPDATE slot WHERE v=5         |
     |                               | → count = 0 ❌               | (8, 6)
t10  |                               | throw ConcurrencyError        |
t11  |                               | RETRY: Fetch booking          |
t12  |                               | Status = 'CANCELLED' ✗       |
t13  |                               | throw AppError('Ya cancelado')| (8, 6)
```

**Resultado:** Solo una cancelación se procesa, la segunda detecta que ya está cancelado.

---

## 10. Transacciones y Atomicidad

### 10.1 Booking Creation (Multi-Step Transaction)

```typescript
await prisma.$transaction(async (tx) => {
  // Step 1: Actualizar slot (con optimistic locking)
  await updateTimeSlotWithLocking(tx, slotId, version, {
    bookedCount: { increment: guestCount }
  });

  // Step 2: Crear booking
  const booking = await tx.booking.create({
    data: { userId, experienceId, timeSlotId, status: 'PENDING_PAYMENT' }
  });

  // Si cualquier paso falla → ROLLBACK automático
  return booking;
});
```

**Propiedades ACID:**
- **Atomicity**: Todo o nada (si falla step 2, step 1 se revierte)
- **Consistency**: Invariantes respetadas (capacity >= bookedCount)
- **Isolation**: Otras transacciones no ven estado intermedio
- **Durability**: Una vez commit, datos persisten

### 10.2 Order Creation (Multi-Seller)

```typescript
const orders = await prisma.$transaction(async (tx) => {
  const createdOrders = [];

  // Para cada vendedor en el carrito
  for (const [sellerId, items] of itemsBySeller) {
    // Validar stock de cada producto
    for (const item of items) {
      const product = await tx.product.findUnique({ where: { id: item.productId } });
      if (product.stock < item.quantity) {
        throw AppError('Stock insuficiente'); // → ROLLBACK COMPLETO
      }
    }

    // Crear orden
    const order = await tx.order.create({
      data: {
        userId, sellerId,
        status: 'PENDING_PAYMENT',
        items: { create: [...] }
      }
    });

    // Reservar stock
    for (const item of items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } }
      });
    }

    createdOrders.push(order);
  }

  // Vaciar carrito
  await tx.cartItem.deleteMany({ where: { cartId } });

  return createdOrders;
});

// Si CUALQUIER vendedor falla validación → TODO se revierte
// Garantía: O se crean todas las órdenes, o ninguna
```

---

## 11. Casos Edge Manejados

### 11.1 Double Booking Prevention

```typescript
// Constraint en DB:
@@unique([userId, timeSlotId])

// Si usuario intenta reservar el mismo slot 2 veces:
try {
  await prisma.booking.create({ data: { userId, timeSlotId, ... } });
} catch (error) {
  if (error.code === 'P2002') { // Unique constraint
    throw new AppError('Ya tienes una reservación para este horario');
  }
}
```

### 11.2 Insufficient Stock

```typescript
// En createOrder():
if (product.stock < item.quantity) {
  throw new AppError(
    `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`
  );
}
// → Transacción se revierte, stock no se decrementa
```

### 11.3 Payment Intent Fallido

```typescript
try {
  const payment = await stripe.paymentIntents.create({ ... });
} catch (stripeError) {
  // Inventario YA ESTÁ RESERVADO en BD
  await prisma.booking.update({
    where: { id: booking.id },
    data: { status: 'PAYMENT_FAILED' }
  });

  throw new AppError('Error al procesar pago. Por favor intenta nuevamente.');
  // Usuario puede reintentar sin perder su reserva (por 30 min)
}
```

### 11.4 Refund Fallido

```typescript
// En cancelBooking():
if (booking.status === 'CONFIRMED' && booking.stripePaymentId) {
  try {
    await stripe.refunds.create({ payment_intent: paymentId });
  } catch (refundError) {
    // Si refund falla, NO cancelamos el booking
    throw new AppError(
      'Error al procesar reembolso. Por favor contacta soporte.',
      500
    );
    // → No se ejecuta la transacción de cancelación
    // → Booking sigue CONFIRMED
    // → Soporte debe manejar manualmente
  }
}
```

### 11.5 Concurrent Cancellations

```typescript
// Usuario cancela, host cancela simultáneamente
// Gracias a optimistic locking, solo una transacción tiene éxito:

// Thread A: COMMIT exitoso
// Thread B: ConcurrencyError → Retry → Status ya es CANCELLED → Error
```

### 11.6 Review sin Booking Completado

```typescript
async createReview(userId, experienceId, data) {
  // Verificar que usuario completó la experiencia
  const completed = await prisma.booking.findFirst({
    where: {
      userId,
      experienceId,
      status: 'COMPLETED'
    }
  });

  if (!completed) {
    throw new AppError('Solo puedes reseñar experiencias que hayas completado');
  }

  // Prevenir reviews duplicados
  const existing = await prisma.experienceReview.findUnique({
    where: { userId_experienceId: { userId, experienceId } }
  });

  if (existing) {
    throw new AppError('Ya has reseñado esta experiencia');
  }

  // Crear review
}
```

---

## 12. Validaciones de Negocio

### 12.1 Booking Validations

```typescript
// En createBooking():

// 1. Experience existe y está activo
if (!experience || !experience.isActive) {
  throw new NotFoundError('Experiencia no encontrada');
}

// 2. TimeSlot existe
if (!timeSlot) {
  throw new NotFoundError('Horario no encontrado');
}

// 3. TimeSlot pertenece a la experience
if (timeSlot.experienceId !== experienceId) {
  throw new AppError('El horario no corresponde a esta experiencia');
}

// 4. TimeSlot está disponible
if (!timeSlot.isAvailable) {
  throw new AppError('Este horario ya no está disponible');
}

// 5. Hay suficiente capacidad
const availableSpots = timeSlot.capacity - timeSlot.bookedCount;
if (guestCount > availableSpots) {
  throw new AppError(`Solo hay ${availableSpots} lugares disponibles`);
}

// 6. guestCount es razonable
if (guestCount < 1 || guestCount > experience.maxCapacity) {
  throw new AppError('Número de invitados inválido');
}
```

### 12.2 Product Validations

```typescript
// En createProduct():

// 1. Usuario tiene SellerProfile
const seller = await prisma.sellerProfile.findUnique({ where: { userId } });
if (!seller) {
  throw new AppError('Necesitas crear un perfil de vendedor primero');
}

// 2. Precio válido
if (data.price <= 0 || data.price > 1000000) {
  throw new AppError('Precio inválido');
}

// 3. Stock no negativo
if (data.stock < 0) {
  throw new AppError('Stock no puede ser negativo');
}

// 4. Al menos una imagen
if (!data.images || data.images.length === 0) {
  throw new AppError('Debes subir al menos una imagen');
}
```

### 12.3 Permission Validations

```typescript
// Pattern común en todos los updates:
const resource = await prisma.resource.findUnique({
  where: { id },
  include: { owner: true }
});

if (!resource) {
  throw new NotFoundError('Recurso no encontrado');
}

if (resource.ownerId !== userId && user.role !== 'ADMIN') {
  throw new ForbiddenError('No tienes permiso para editar este recurso');
}
```

---

## 13. Cálculos de Negocio

### 13.1 Precio Total de Booking

```typescript
const totalPrice = Number(experience.price) * guestCount;
```

**Futuro:**
- Agregar descuentos (coupons)
- Precios dinámicos (por temporada)
- Fees de plataforma (comisión)

### 13.2 Rating Promedio

```typescript
// Al crear review:
const stats = await prisma.experienceReview.aggregate({
  where: { experienceId },
  _avg: { rating: true },
  _count: { rating: true }
});

await prisma.experience.update({
  where: { id: experienceId },
  data: {
    rating: stats._avg.rating || 0,
    reviewCount: stats._count.rating
  }
});
```

### 13.3 Nivel de Usuario

```typescript
// Formula: level = floor(sqrt(xp / 100))
const newLevel = Math.floor(Math.sqrt(stats.xp / 100));

// Ejemplos:
// 0 XP     → Nivel 1
// 100 XP   → Nivel 1
// 400 XP   → Nivel 2
// 900 XP   → Nivel 3
// 10,000 XP → Nivel 10
```

### 13.4 Subtotal de Carrito

```typescript
const subtotal = cart.items.reduce((sum, item) => {
  return sum + Number(item.product.price) * item.quantity;
}, 0);

const itemCount = cart.items.reduce((sum, item) => {
  return sum + item.quantity;
}, 0);
```

---

## 14. Query Optimization Examples

### 14.1 N+1 Prevention

```typescript
// ❌ MAL (N+1 queries)
const bookings = await prisma.booking.findMany();
for (const booking of bookings) {
  booking.experience = await prisma.experience.findUnique({
    where: { id: booking.experienceId }
  });
}

// ✓ BIEN (1 query con join)
const bookings = await prisma.booking.findMany({
  include: {
    experience: true,
    timeSlot: true,
    user: { select: { id: true, nombre: true } }
  }
});
```

### 14.2 Paginación

```typescript
const page = query.page || 1;
const limit = query.limit || 20;
const skip = (page - 1) * limit;

const [items, total] = await Promise.all([
  prisma.experience.findMany({
    where: filters,
    skip,
    take: limit,
    orderBy: { createdAt: 'desc' }
  }),
  prisma.experience.count({ where: filters })
]);

return {
  items,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit)
  }
};
```

### 14.3 Selective Includes

```typescript
// Solo incluir lo necesario
const experience = await prisma.experience.findUnique({
  where: { id },
  include: {
    host: {
      select: { id: true, nombre: true, avatar: true } // No todo el user
    },
    reviews: {
      take: 10,  // Solo últimos 10
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, nombre: true, avatar: true } }
      }
    },
    _count: {
      select: { bookings: true, reviews: true }
    }
  }
});
```

---

## 15. Índices Críticos

### 15.1 Índices Actuales

```prisma
// Bookings
@@index([userId])
@@index([experienceId])
@@index([timeSlotId])
@@index([status])

// Orders
@@index([userId])
@@index([sellerId])
@@index([status])

// ExperienceTimeSlot
@@index([experienceId, date])
@@index([date, isAvailable])

// Notifications
@@index([userId, read])
@@index([createdAt])

// Follow
@@index([followerId])
@@index([followingId])
```

### 15.2 Índices Recomendados (Faltantes)

```prisma
// Para queries de dashboard
model Booking {
  @@index([userId, status, createdAt])
  @@index([experienceId, status])
}

model Order {
  @@index([userId, status, createdAt])
  @@index([sellerId, status, createdAt])
}

// Para analytics
model ActivityLog {
  @@index([userId, action, createdAt])
}

// Para búsqueda
model Product {
  @@index([category, status, createdAt])
  @@index([sellerId, status])
}
```

---

## 16. Webhook Flow (Pendiente)

### 16.1 Stripe Webhook Handler

```
POST /api/webhooks/stripe
Header: stripe-signature: xxx

┌────────────────────────────────────────────────┐
│ 1. Construir evento:                           │
│    event = stripe.webhooks.constructEvent(     │
│      request.rawBody,                          │
│      signature,                                │
│      WEBHOOK_SECRET                            │
│    )                                           │
│                                                │
│ 2. Switch por tipo de evento:                  │
│                                                │
│    case 'payment_intent.succeeded':            │
│      metadata = event.data.object.metadata     │
│                                                │
│      if (metadata.bookingId) {                 │
│        await prisma.booking.update({           │
│          where: { id: metadata.bookingId },    │
│          data: {                               │
│            status: 'CONFIRMED',                │
│            confirmedAt: new Date()             │
│          }                                     │
│        });                                     │
│                                                │
│        // Notificar usuario + host             │
│      }                                         │
│                                                │
│      if (metadata.orderId) {                   │
│        await prisma.order.update({             │
│          where: { id: metadata.orderId },      │
│          data: { status: 'PAID' }              │
│        });                                     │
│      }                                         │
│      break;                                    │
│                                                │
│    case 'payment_intent.payment_failed':       │
│      // Marcar como PAYMENT_FAILED             │
│      break;                                    │
│                                                │
│    case 'charge.refunded':                     │
│      // Marcar como REFUNDED                   │
│      break;                                    │
│                                                │
│ 3. Return { received: true }                   │
└────────────────────────────────────────────────┘
```

**Idempotencia:**
- Webhooks pueden llegar múltiples veces
- Usar `metadata.bookingId` para encontrar registro
- Verificar que estado actual permite transición
- Si ya está en estado final, ignorar

---

## 17. Resumen de Patrones Implementados

| Patrón | Dónde | Propósito |
|--------|-------|-----------|
| **Service Layer** | Todos los services | Separar lógica de negocio de presentación |
| **Repository** | Prisma Client | Abstracción de persistencia |
| **Optimistic Locking** | BookingService | Prevenir race conditions |
| **Three-Phase Commit** | Booking/Order creation | Separar BD de llamadas externas |
| **Retry with Backoff** | withRetry() | Manejar concurrencia automáticamente |
| **State Machine** | BookingStatus, OrderStatus | Validar transiciones |
| **Plugin Architecture** | Fastify plugins | Modularidad y dependency injection |
| **Schema Validation** | Zod schemas | Type safety + validación |
| **Singleton** | StripeService | Una instancia compartida |
| **Error Hierarchy** | AppError, NotFoundError, etc. | Manejo consistente de errores |
| **Factory Pattern** | Badge creation, User creation | Inicialización compleja |

---

## 18. Conclusiones Técnicas

### Fortalezas del Diseño

1. **Concurrencia robusta**: Optimistic locking previene race conditions
2. **Transacciones atómicas**: Garantías ACID en operaciones críticas
3. **Separación de concerns**: Services vs Routes vs DB
4. **Type safety**: TypeScript + Zod en todo el stack
5. **Error handling consistente**: Jerarquía de errores clara

### Áreas de Mejora

1. **Optimistic locking parcial**: Solo en bookings, falta en products
2. **Sin webhooks**: Confirmaciones manuales en lugar de automáticas
3. **Sin idempotency keys**: Stripe requests pueden duplicarse
4. **Cleanup job desactivado**: Inventario no se libera automáticamente
5. **Sin circuit breaker**: Llamadas a Stripe no tienen fallback
6. **Sin event sourcing**: No hay log de cambios de estado

---

**Versión:** 1.0
**Fecha:** 2026-01-25
**Autor:** Claude Code
