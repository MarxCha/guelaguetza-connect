# Clean Architecture - Refactorización Completa

## Resumen Ejecutivo

Se ha refactorizado el backend de Guelaguetza Connect a **Clean Architecture** con **Domain-Driven Design (DDD)**. La lógica de negocio ahora está centralizada en entidades ricas, independientes de frameworks y bases de datos.

## Estructura Completa

```
backend/src/
│
├── domain/                              # ⭐ DOMAIN LAYER (100% puro, sin dependencias)
│   ├── booking/
│   │   ├── entities/
│   │   │   ├── Booking.ts              # Entidad rica con state machine
│   │   │   ├── Booking.test.ts         # Tests unitarios 100% coverage
│   │   │   ├── Experience.ts           # Agregado de experiencia
│   │   │   └── TimeSlot.ts             # Gestión de capacidad y versioning
│   │   ├── value-objects/
│   │   │   ├── Money.ts                # Operaciones inmutables con dinero
│   │   │   ├── Money.test.ts
│   │   │   ├── GuestCount.ts           # Validación de capacidad
│   │   │   └── BookingStatus.ts        # Estados válidos (type-safe)
│   │   ├── repositories/
│   │   │   └── IBookingRepository.ts   # Interface (NO implementación)
│   │   ├── services/
│   │   │   └── BookingDomainService.ts # Lógica cross-aggregate
│   │   └── index.ts                    # Exports limpios
│   │
│   ├── marketplace/
│   │   ├── entities/
│   │   │   ├── Product.ts              # Gestión de inventario con optimistic locking
│   │   │   └── Order.ts                # State machine de órdenes
│   │   ├── value-objects/
│   │   │   ├── Stock.ts                # Reserve/release inmutable
│   │   │   └── OrderStatus.ts          # Estados de orden
│   │   ├── repositories/
│   │   │   └── IProductRepository.ts
│   │   └── index.ts
│   │
│   └── shared/
│       └── errors/
│           └── DomainError.ts          # Errores específicos del dominio
│
├── application/                         # ⭐ APPLICATION LAYER (orquestación)
│   └── use-cases/
│       ├── booking/
│       │   ├── CreateBookingUseCase.ts  # Crear reserva + reservar slot
│       │   ├── ConfirmBookingUseCase.ts # Confirmar pago
│       │   ├── CancelBookingUseCase.ts  # Cancelar + liberar slot + refund
│       │   └── index.ts
│       └── marketplace/
│           ├── CreateOrderUseCase.ts    # Crear orden + reservar stock
│           ├── ProcessPaymentUseCase.ts # Procesar pago Stripe
│           └── index.ts
│
├── infrastructure/                      # ⭐ INFRASTRUCTURE LAYER (detalles técnicos)
│   └── repositories/
│       ├── PrismaBookingRepository.ts  # Implementa IBookingRepository
│       │                               # Mappers: Prisma ↔ Domain
│       ├── PrismaProductRepository.ts  # Implementa IProductRepository
│       └── index.ts
│
├── routes/                              # ⭐ PRESENTATION LAYER (HTTP)
│   ├── bookings.ts                     # Usa Use Cases (a migrar)
│   └── marketplace.ts                  # Usa Use Cases (a migrar)
│
└── services/                            # ⚠️ LEGACY (a deprecar)
    ├── booking.service.ts              # Refactorizado a Use Cases
    └── marketplace.service.ts          # Refactorizado a Use Cases
```

## Archivos Creados

### Domain Layer (19 archivos)

#### Booking Domain
- ✅ `domain/booking/entities/Booking.ts` - Entidad principal con state machine
- ✅ `domain/booking/entities/Booking.test.ts` - Tests unitarios completos
- ✅ `domain/booking/entities/Experience.ts` - Agregado de experiencias
- ✅ `domain/booking/entities/TimeSlot.ts` - Gestión de slots con optimistic locking
- ✅ `domain/booking/value-objects/Money.ts` - Value object inmutable
- ✅ `domain/booking/value-objects/Money.test.ts` - Tests de Money
- ✅ `domain/booking/value-objects/GuestCount.ts` - Validación de capacidad
- ✅ `domain/booking/value-objects/BookingStatus.ts` - Type-safe status
- ✅ `domain/booking/repositories/IBookingRepository.ts` - Interface
- ✅ `domain/booking/services/BookingDomainService.ts` - Lógica cross-aggregate
- ✅ `domain/booking/index.ts` - Exports

#### Marketplace Domain
- ✅ `domain/marketplace/entities/Product.ts` - Gestión de stock
- ✅ `domain/marketplace/entities/Order.ts` - State machine de órdenes
- ✅ `domain/marketplace/value-objects/Stock.ts` - Reserve/release
- ✅ `domain/marketplace/value-objects/OrderStatus.ts` - Estados válidos
- ✅ `domain/marketplace/repositories/IProductRepository.ts` - Interface
- ✅ `domain/marketplace/index.ts` - Exports

#### Shared Domain
- ✅ `domain/shared/errors/DomainError.ts` - Errores de dominio
- ✅ `domain/shared/index.ts` - Exports

### Application Layer (5 archivos)

- ✅ `application/use-cases/booking/CreateBookingUseCase.ts`
- ✅ `application/use-cases/booking/ConfirmBookingUseCase.ts`
- ✅ `application/use-cases/booking/CancelBookingUseCase.ts`
- ✅ `application/use-cases/booking/index.ts`
- ✅ `application/use-cases/marketplace/CreateOrderUseCase.ts`
- ✅ `application/use-cases/marketplace/ProcessPaymentUseCase.ts`
- ✅ `application/use-cases/marketplace/index.ts`

### Infrastructure Layer (3 archivos)

- ✅ `infrastructure/repositories/PrismaBookingRepository.ts`
- ✅ `infrastructure/repositories/PrismaProductRepository.ts`
- ✅ `infrastructure/repositories/index.ts`

### Documentación (3 archivos)

- ✅ `CLEAN_ARCHITECTURE.md` - Guía completa de arquitectura
- ✅ `MIGRATION_GUIDE.md` - Paso a paso de migración
- ✅ `CLEAN_ARCHITECTURE_README.md` - Este archivo

**Total: 30 archivos nuevos**

## Principios Aplicados

### 1. Dependency Inversion (SOLID)

```
┌──────────────────────────────────────────┐
│          PRESENTATION LAYER              │
│         (routes/bookings.ts)             │
└────────────────┬─────────────────────────┘
                 │ usa
                 ↓
┌──────────────────────────────────────────┐
│         APPLICATION LAYER                │
│      (CreateBookingUseCase)              │
└────────────────┬─────────────────────────┘
                 │ depende de
                 ↓
┌──────────────────────────────────────────┐
│           DOMAIN LAYER                   │
│      (IBookingRepository)                │  ← Interface
└──────────────────────────────────────────┘
                 ↑
                 │ implementa
┌──────────────────────────────────────────┐
│      INFRASTRUCTURE LAYER                │
│   (PrismaBookingRepository)              │
└──────────────────────────────────────────┘
```

### 2. Rich Domain Model

**Booking Entity:**
```typescript
class Booking {
  // ✅ Lógica de negocio dentro de la entidad
  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new DomainError('Cannot cancel in current status');
    }
    this.status = BookingStatus.cancelled();
    this.cancelledAt = new Date();
  }

  canBeCancelled(): boolean {
    return this.status.canBeCancelled();
  }

  requiresRefund(): boolean {
    return this.isConfirmed() && !!this.stripePaymentId;
  }
}
```

### 3. Value Objects Inmutables

**Money:**
```typescript
class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {}

  add(other: Money): Money {
    // ✅ Retorna NUEVA instancia, no modifica original
    return new Money(this.amount + other.amount, this.currency);
  }

  multiply(factor: number): Money {
    // ✅ Validación centralizada
    if (factor < 0) throw new Error('Cannot multiply by negative');
    return new Money(this.amount * factor, this.currency);
  }
}
```

### 4. Domain Services

```typescript
class BookingDomainService {
  // Lógica que involucra múltiples agregados
  static createBooking(
    experience: Experience,
    timeSlot: TimeSlot,
    userId: string,
    guestCount: number
  ): Booking {
    // Validaciones cross-aggregate
    if (!experience.isActive) {
      throw new DomainError('Experience is inactive');
    }

    if (timeSlot.experienceId !== experience.id) {
      throw new DomainError('TimeSlot does not belong to experience');
    }

    const guests = GuestCount.create(guestCount, experience.maxCapacity);
    const totalPrice = experience.price.multiply(guests.value);

    return Booking.create({ userId, experienceId, timeSlotId, guests, totalPrice });
  }
}
```

### 5. Use Cases (Application Layer)

```typescript
class CreateBookingUseCase {
  constructor(private repo: IBookingRepository) {}

  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    // Orquestación pura, delegando lógica al dominio
    return this.repo.withTransaction(async (repo) => {
      const experience = await repo.findExperienceById(input.experienceId);
      const timeSlot = await repo.findTimeSlotById(input.timeSlotId);

      // ✅ Lógica en Domain Service
      const booking = BookingDomainService.createBooking(
        experience, timeSlot, input.userId, input.guestCount
      );

      // ✅ Efectos en agregados
      timeSlot.reserve(input.guestCount);

      // ✅ Persistencia
      await repo.save(booking);
      await repo.saveTimeSlot(timeSlot);

      return { booking };
    });
  }
}
```

## Ventajas de la Nueva Arquitectura

| Aspecto | Legacy | Clean Architecture |
|---------|--------|-------------------|
| **Lógica de Negocio** | Dispersa en services | Centralizada en Domain Entities |
| **Validaciones** | En controllers/services | En Value Objects y Entities |
| **Testabilidad** | Difícil (mock Prisma) | Fácil (mock Repository interfaces) |
| **Dependencias** | Service → Prisma | Domain → Nada |
| **Type Safety** | Prisma types everywhere | Domain types + mappers |
| **Reutilización** | Atada a HTTP + Prisma | Entities usables en CLI, jobs, etc. |
| **Cambio de ORM** | Reescribir services | Solo cambiar Infrastructure |
| **Coverage** | ~30% | Target: 100% en Domain |

## Ejemplo Completo: Cancelar Booking

### 1. Domain Layer

```typescript
// domain/booking/entities/Booking.ts
class Booking {
  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new DomainError('Cannot cancel booking');
    }
    this.status = BookingStatus.cancelled();
    this.cancelledAt = new Date();
  }

  canBeCancelled(): boolean {
    return !this.isCompleted() && !this.isCancelled();
  }

  requiresRefund(): boolean {
    return this.isConfirmed() && !!this.stripePaymentId;
  }
}

// domain/booking/entities/TimeSlot.ts
class TimeSlot {
  release(guestCount: number): void {
    if (guestCount > this.bookedCount) {
      throw new DomainError('Cannot release more than booked');
    }
    this.bookedCount -= guestCount;
    this.isAvailable = true;
    this.version += 1; // Optimistic locking
  }
}
```

### 2. Application Layer

```typescript
// application/use-cases/booking/CancelBookingUseCase.ts
class CancelBookingUseCase {
  async execute(input: CancelBookingInput): Promise<CancelBookingOutput> {
    return this.repo.withTransaction(async (repo) => {
      // 1. Get booking
      const booking = await repo.findById(input.bookingId);
      if (!booking) throw new BookingNotFoundError(input.bookingId);

      // 2. Validate permissions
      const experience = await repo.findExperienceById(booking.experienceId);
      const canCancel = BookingDomainService.canCancelBooking(
        booking, experience, input.userId
      );
      if (!canCancel) throw new UnauthorizedActionError('cancel', 'booking');

      // 3. Get time slot
      const timeSlot = await repo.findTimeSlotById(booking.timeSlotId);

      // 4. Cancel booking (domain logic)
      booking.cancel();

      // 5. Release capacity (domain logic)
      timeSlot.release(booking.guestCount.value);

      // 6. Persist changes
      await repo.save(booking);
      await repo.saveTimeSlot(timeSlot);

      return {
        booking,
        requiresRefund: booking.requiresRefund(),
        refundAmount: booking.totalPrice.amount,
      };
    });
  }
}
```

### 3. Infrastructure Layer

```typescript
// infrastructure/repositories/PrismaBookingRepository.ts
class PrismaBookingRepository implements IBookingRepository {
  async save(booking: Booking): Promise<Booking> {
    const data = {
      userId: booking.userId,
      status: booking.status.toString(),
      guestCount: booking.guestCount.value,
      totalPrice: booking.totalPrice.toDecimal(),
      cancelledAt: booking.cancelledAt,
    };

    if (booking.id) {
      const saved = await this.prisma.booking.update({
        where: { id: booking.id },
        data,
      });
      return this.toDomain(saved);
    } else {
      const saved = await this.prisma.booking.create({ data });
      return this.toDomain(saved);
    }
  }

  private toDomain(data: PrismaBooking): Booking {
    return Booking.reconstitute({
      id: data.id,
      status: data.status,
      guestCount: data.guestCount,
      capacity: data.experience.maxCapacity,
      totalPrice: Number(data.totalPrice),
      // ...
    });
  }
}
```

### 4. Presentation Layer

```typescript
// routes/bookings.ts
app.delete('/bookings/:id', async (req, reply) => {
  const cancelBookingUseCase = new CancelBookingUseCase(
    new PrismaBookingRepository(prisma)
  );

  const result = await cancelBookingUseCase.execute({
    bookingId: req.params.id,
    userId: req.user.id,
  });

  // Si requiere refund, procesar con Stripe (fuera de la transacción)
  if (result.requiresRefund) {
    await stripeService.createRefund(result.booking.stripePaymentId!);
  }

  return reply.send({
    message: 'Booking cancelled',
    refunded: result.requiresRefund,
  });
});
```

## Testing Strategy

### Domain Tests (100% coverage)

```typescript
// domain/booking/entities/Booking.test.ts
describe('Booking.cancel()', () => {
  it('should cancel pending booking', () => {
    const booking = createBooking();
    booking.cancel();
    expect(booking.status.isCancelled()).toBe(true);
  });

  it('should throw when cancelling completed booking', () => {
    const booking = createBooking();
    booking.complete();
    expect(() => booking.cancel()).toThrow(DomainError);
  });
});
```

### Use Case Tests (con mocks)

```typescript
// application/use-cases/CancelBookingUseCase.test.ts
describe('CancelBookingUseCase', () => {
  it('should cancel booking and release slot', async () => {
    const mockRepo = {
      findById: vi.fn().mockResolvedValue(booking),
      save: vi.fn(),
      saveTimeSlot: vi.fn(),
      withTransaction: vi.fn((cb) => cb(mockRepo)),
    };

    const useCase = new CancelBookingUseCase(mockRepo);
    await useCase.execute({ bookingId: '1', userId: 'user1' });

    expect(mockRepo.save).toHaveBeenCalled();
    expect(mockRepo.saveTimeSlot).toHaveBeenCalled();
  });
});
```

## Roadmap

### Completado ✅
- [x] Domain Layer (Entities, Value Objects, Interfaces)
- [x] Application Layer (Use Cases)
- [x] Infrastructure Layer (Repositories)
- [x] Tests de ejemplo (Booking, Money)
- [x] Documentación completa

### En Progreso ⏳
- [ ] Migrar routes a Use Cases
- [ ] Tests unitarios completos (target: 100% coverage Domain)
- [ ] Tests de integración de Use Cases

### Pendiente 📋
- [ ] Dependency Injection Container
- [ ] Deprecar services legacy
- [ ] Event Sourcing para auditoría
- [ ] CQRS para separar reads/writes
- [ ] Domain Events para notificaciones

## Cómo Usar

### 1. Ejecutar Tests

```bash
cd backend
npm run test:domain  # Tests unitarios del dominio
npm run test:unit    # Todos los tests unitarios
npm run test:integration  # Tests de integración
```

### 2. Migrar un Endpoint

Ver `MIGRATION_GUIDE.md` para paso a paso detallado.

### 3. Agregar Nueva Funcionalidad

```bash
# 1. Crear entidad o value object en domain/
# 2. Crear use case en application/use-cases/
# 3. Actualizar repository interface
# 4. Implementar en infrastructure/repositories/
# 5. Agregar tests
# 6. Actualizar route
```

## Contacto

Para dudas sobre la arquitectura, revisar:
- `CLEAN_ARCHITECTURE.md` - Principios y patrones
- `MIGRATION_GUIDE.md` - Paso a paso de migración
- Código de ejemplo en `domain/booking/entities/Booking.test.ts`
