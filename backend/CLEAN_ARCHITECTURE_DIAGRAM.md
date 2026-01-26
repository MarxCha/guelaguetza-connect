# Clean Architecture - Diagrama de Flujo

## Arquitectura de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                       PRESENTATION LAYER                         │
│                     (Routes/Controllers)                         │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  POST /api/bookings                                       │  │
│  │  GET  /api/bookings/:id                                   │  │
│  │  POST /api/orders                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                      APPLICATION LAYER                           │
│                        (Use Cases)                               │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  CreateBookingUseCase                                     │  │
│  │  ConfirmBookingUseCase                                    │  │
│  │  CancelBookingUseCase                                     │  │
│  │  CreateOrderUseCase                                       │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                        DOMAIN LAYER                              │
│                   (Business Logic - PURE)                        │
│  ┌────────────────────────┬──────────────────────────────────┐ │
│  │    ENTITIES            │    VALUE OBJECTS                 │ │
│  │  - Booking             │  - Money                         │ │
│  │  - Experience          │  - GuestCount                    │ │
│  │  - TimeSlot            │  - BookingStatus                 │ │
│  │  - Order               │  - OrderStatus                   │ │
│  │  - Product             │  - Stock                         │ │
│  └────────────────────────┴──────────────────────────────────┘ │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │    DOMAIN SERVICES                                        │  │
│  │  - BookingDomainService                                   │  │
│  │  - OrderDomainService (futuro)                            │  │
│  └──────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │    REPOSITORY INTERFACES                                  │  │
│  │  - IBookingRepository                                     │  │
│  │  - IProductRepository                                     │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                    INFRASTRUCTURE LAYER                          │
│                  (External Dependencies)                         │
│  ┌────────────────────────┬──────────────────────────────────┐ │
│  │  REPOSITORIES          │  EXTERNAL SERVICES               │ │
│  │  - PrismaBookingRepo   │  - StripeService                 │ │
│  │  - PrismaProductRepo   │  - EmailService                  │ │
│  │  - PrismaOrderRepo     │  - CacheService                  │ │
│  └────────────────────────┴──────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│                       DATABASE / APIS                            │
│                   PostgreSQL + Stripe + Redis                    │
└─────────────────────────────────────────────────────────────────┘
```

## Flujo de Creación de Booking

```
┌──────────────┐
│   Cliente    │
│  (Frontend)  │
└──────┬───────┘
       │ POST /api/bookings
       ↓
┌─────────────────────────────────────────────────────────────┐
│  Route Handler (Presentation)                               │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  1. Valida request (zod schema)                        │ │
│  │  2. Extrae userId del token JWT                        │ │
│  │  3. Llama al Use Case                                  │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  CreateBookingUseCase (Application)                         │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  execute(input) {                                      │ │
│  │    return repo.withTransaction(async (repo) => {       │ │
│  │      // 1. Obtener agregados                           │ │
│  │      const experience = await repo.findExperienceById()│ │
│  │      const timeSlot = await repo.findTimeSlotById()    │ │
│  │                                                         │ │
│  │      // 2. Delegar lógica de negocio al Domain Service │ │
│  │      const booking = BookingDomainService.createBooking│ │
│  │                                                         │ │
│  │      // 3. Actualizar estado de agregados              │ │
│  │      timeSlot.reserve(guestCount)                      │ │
│  │                                                         │ │
│  │      // 4. Persistir cambios                           │ │
│  │      await repo.save(booking)                          │ │
│  │      await repo.saveTimeSlot(timeSlot)                 │ │
│  │    })                                                   │ │
│  │  }                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  BookingDomainService (Domain)                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  static createBooking(                                 │ │
│  │    experience: Experience,                             │ │
│  │    timeSlot: TimeSlot,                                 │ │
│  │    userId: string,                                     │ │
│  │    guestCount: number                                  │ │
│  │  ) {                                                    │ │
│  │    // VALIDACIONES DE NEGOCIO                          │ │
│  │    if (!experience.isActive)                           │ │
│  │      throw new DomainError('...')                      │ │
│  │                                                         │ │
│  │    if (timeSlot.experienceId !== experience.id)        │ │
│  │      throw new DomainError('...')                      │ │
│  │                                                         │ │
│  │    const guests = GuestCount.create(guestCount, cap)   │ │
│  │                                                         │ │
│  │    if (!timeSlot.hasAvailableSpots(guests.value))      │ │
│  │      throw new InsufficientCapacityError(...)          │ │
│  │                                                         │ │
│  │    // CÁLCULOS DE NEGOCIO                              │ │
│  │    const totalPrice = experience.price.multiply(guests)│ │
│  │                                                         │ │
│  │    // CREAR ENTIDAD                                    │ │
│  │    return Booking.create({                             │ │
│  │      userId, experienceId, timeSlotId,                 │ │
│  │      guestCount: guests,                               │ │
│  │      totalPrice                                        │ │
│  │    })                                                   │ │
│  │  }                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  Booking Entity (Domain)                                    │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  static create(data) {                                 │ │
│  │    return new Booking({                                │ │
│  │      ...data,                                          │ │
│  │      id: '',  // Lo setea el repository               │ │
│  │      status: BookingStatus.pendingPayment(),          │ │
│  │      createdAt: new Date()                            │ │
│  │    })                                                  │ │
│  │  }                                                     │ │
│  │                                                        │ │
│  │  private validate() {                                 │ │
│  │    if (!this.userId) throw new DomainError('...')    │ │
│  │    if (!this.experienceId) throw new DomainError('...│ │
│  │  }                                                     │ │
│  │                                                        │ │
│  │  // MÉTODOS DE NEGOCIO                                │ │
│  │  confirm() { ... }                                    │ │
│  │  cancel() { ... }                                     │ │
│  │  complete() { ... }                                   │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  TimeSlot Entity (Domain)                                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  reserve(guestCount: number) {                         │ │
│  │    const available = this.getAvailableSpots()          │ │
│  │    if (guestCount > available) {                       │ │
│  │      throw new DomainError('Not enough spots')         │ │
│  │    }                                                    │ │
│  │                                                         │ │
│  │    this.bookedCount += guestCount                      │ │
│  │                                                         │ │
│  │    if (this.bookedCount >= this.capacity) {            │ │
│  │      this.isAvailable = false                          │ │
│  │    }                                                    │ │
│  │                                                         │ │
│  │    this.version += 1  // Optimistic locking            │ │
│  │  }                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────────────┐
│  PrismaBookingRepository (Infrastructure)                   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  async save(booking: Booking) {                        │ │
│  │    const data = {                                      │ │
│  │      userId: booking.userId,                           │ │
│  │      status: booking.status.toString(),  // VO → DB   │ │
│  │      totalPrice: booking.totalPrice.toDecimal(),       │ │
│  │      guestCount: booking.guestCount.value              │ │
│  │    }                                                    │ │
│  │                                                         │ │
│  │    if (booking.id) {                                   │ │
│  │      return this.prisma.booking.update(...)            │ │
│  │    } else {                                            │ │
│  │      return this.prisma.booking.create(...)            │ │
│  │    }                                                    │ │
│  │  }                                                      │ │
│  │                                                         │ │
│  │  async saveTimeSlot(timeSlot: TimeSlot) {              │ │
│  │    // OPTIMISTIC LOCKING                               │ │
│  │    const result = await prisma.updateMany({            │ │
│  │      where: {                                          │ │
│  │        id: timeSlot.id,                                │ │
│  │        version: timeSlot.version - 1  // Prev version │ │
│  │      },                                                │ │
│  │      data: {                                           │ │
│  │        bookedCount: timeSlot.bookedCount,              │ │
│  │        version: timeSlot.version                       │ │
│  │      }                                                  │ │
│  │    })                                                   │ │
│  │                                                         │ │
│  │    if (result.count === 0) {                           │ │
│  │      throw new ConcurrencyError('...')                 │ │
│  │    }                                                    │ │
│  │  }                                                      │ │
│  └────────────────────────────────────────────────────────┘ │
└────────────────────────┬────────────────────────────────────┘
                         ↓
                  ┌──────────────┐
                  │  PostgreSQL  │
                  └──────────────┘
```

## Dependencias entre Capas

```
Presentation  ──depends on──>  Application
                                    │
Application   ──depends on──>  Domain (Interfaces)
                                    │
Infrastructure ──implements──>  Domain Interfaces
                                    │
Domain        ──NO DEPENDE DE NADA (Pure Business Logic)
```

## Ejemplo: State Transitions

```
BookingStatus State Machine:

  PENDING_PAYMENT ──confirm()──> CONFIRMED ──complete()──> COMPLETED
         │                            │
         │                            │
      cancel()                    cancel()
         │                            │
         ↓                            ↓
    CANCELLED <─────────────────────────
         ↑
         │
    PAYMENT_FAILED
```

## Value Objects - Immutability

```typescript
// ❌ Mutable (ANTES)
let price = 500;
price = price * 2;  // Mutación directa

// ✅ Immutable (AHORA)
const price = Money.create(500);
const doublePrice = price.multiply(2);  // Nueva instancia
// price sigue siendo 500
// doublePrice es 1000
```

## Testing Strategy

```
Unit Tests (Domain Layer)
  ↓
  Test entities, value objects, domain services
  Sin dependencias externas
  Rápidos (< 200ms para 202 tests)

Integration Tests (Application + Infrastructure)
  ↓
  Test use cases con repositorios reales
  Base de datos de test
  Moderados (segundos)

E2E Tests (Presentation + Application + Infrastructure)
  ↓
  Test flujos completos via HTTP
  Todos los componentes integrados
  Lentos (minutos)
```

## Ventajas de Clean Architecture

1. **Independencia de Frameworks**
   - Dominio no depende de Prisma, Express, etc.
   - Puedes cambiar de ORM sin tocar la lógica de negocio

2. **Testeable**
   - Domain layer: 100% unit tests
   - No mocks complejos
   - Tests rápidos

3. **Mantenible**
   - Lógica de negocio centralizada
   - Cambios localizados
   - Fácil de razonar

4. **Flexible**
   - Añadir nuevos casos de uso es simple
   - Cambiar infraestructura no afecta el dominio
   - Migrar a microservicios más fácil

5. **Type Safety**
   - TypeScript + Domain Types
   - Errores en compile time
   - Autocomplete en IDE
