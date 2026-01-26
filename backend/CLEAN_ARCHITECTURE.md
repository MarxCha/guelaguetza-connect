# Clean Architecture - Domain Layer Implementation

## Estructura del Proyecto

```
backend/src/
├── domain/                       # Capa de Dominio (NO depende de nada)
│   ├── booking/
│   │   ├── entities/
│   │   │   ├── Booking.ts       # Entidad rica con lógica de negocio
│   │   │   ├── Experience.ts    # Entidad de experiencia
│   │   │   └── TimeSlot.ts      # Entidad de slot con reservas
│   │   ├── value-objects/
│   │   │   ├── Money.ts         # Valor objeto inmutable para dinero
│   │   │   ├── GuestCount.ts    # Validación de capacidad
│   │   │   └── BookingStatus.ts # Estados válidos del booking
│   │   ├── repositories/
│   │   │   └── IBookingRepository.ts  # Interface (NO implementación)
│   │   ├── services/
│   │   │   └── BookingDomainService.ts # Lógica entre agregados
│   │   └── index.ts
│   │
│   ├── marketplace/
│   │   ├── entities/
│   │   │   ├── Product.ts       # Gestión de inventario
│   │   │   └── Order.ts         # Estados de orden
│   │   ├── value-objects/
│   │   │   ├── Stock.ts         # Reserva/liberación de stock
│   │   │   └── OrderStatus.ts   # Estados válidos
│   │   ├── repositories/
│   │   │   └── IProductRepository.ts
│   │   └── index.ts
│   │
│   └── shared/
│       └── errors/
│           └── DomainError.ts   # Errores específicos del dominio
│
├── application/                 # Capa de Aplicación (orquesta el dominio)
│   └── use-cases/
│       ├── booking/
│       │   ├── CreateBookingUseCase.ts
│       │   ├── ConfirmBookingUseCase.ts
│       │   ├── CancelBookingUseCase.ts
│       │   └── index.ts
│       └── marketplace/
│           ├── CreateOrderUseCase.ts
│           ├── ProcessPaymentUseCase.ts
│           └── index.ts
│
├── infrastructure/              # Capa de Infraestructura (detalles técnicos)
│   └── repositories/
│       ├── PrismaBookingRepository.ts  # Implementa IBookingRepository
│       ├── PrismaProductRepository.ts  # Implementa IProductRepository
│       └── index.ts
│
├── routes/                      # Capa de Presentación (HTTP)
│   ├── bookings.ts             # Usa Use Cases
│   └── marketplace.ts
│
└── services/                    # Legacy (a migrar)
    ├── booking.service.ts
    └── marketplace.service.ts
```

## Principios Aplicados

### 1. Dependency Inversion (SOLID)

```
Domain (Interfaces) ← Application ← Infrastructure
       ↑                   ↓
       └─────────────── Implementa
```

- El **dominio** define interfaces de repositorios
- La **infraestructura** implementa esas interfaces
- La **aplicación** depende de las interfaces, NO de las implementaciones

### 2. Entities Ricas (Rich Domain Model)

**ANTES (Anemic Model):**
```typescript
// service/booking.service.ts
async cancelBooking(id: string) {
  const booking = await this.prisma.booking.findUnique({ where: { id } });

  if (booking.status === 'CANCELLED') {
    throw new Error('Already cancelled');
  }

  if (booking.status === 'COMPLETED') {
    throw new Error('Cannot cancel completed');
  }

  // ... más lógica dispersa
}
```

**DESPUÉS (Rich Model):**
```typescript
// domain/booking/entities/Booking.ts
class Booking {
  cancel(): void {
    if (!this.canBeCancelled()) {
      throw new DomainError(`Cannot cancel in ${this.status} status`);
    }
    this.status = BookingStatus.cancelled();
    this.cancelledAt = new Date();
  }

  canBeCancelled(): boolean {
    return this.status.canBeCancelled();
  }
}

// application/use-cases/CancelBookingUseCase.ts
async execute(input) {
  const booking = await this.repo.findById(input.bookingId);
  booking.cancel(); // La lógica está en la entidad
  return this.repo.save(booking);
}
```

### 3. Value Objects Inmutables

```typescript
// domain/booking/value-objects/Money.ts
class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {}

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  // Validaciones centralizadas
  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Cannot multiply by negative');
    }
    return new Money(this.amount * factor, this.currency);
  }
}
```

### 4. Domain Services

Cuando la lógica involucra múltiples agregados:

```typescript
// domain/booking/services/BookingDomainService.ts
class BookingDomainService {
  static createBooking(
    experience: Experience,
    timeSlot: TimeSlot,
    userId: string,
    guestCount: number
  ): Booking {
    // Validación que cruza agregados
    if (!experience.isActive) {
      throw new DomainError('Experience is not active');
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

Orquestan el flujo de negocio:

```typescript
// application/use-cases/booking/CreateBookingUseCase.ts
class CreateBookingUseCase {
  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    return this.repo.withTransaction(async (repo) => {
      // 1. Obtener agregados
      const experience = await repo.findExperienceById(input.experienceId);
      const timeSlot = await repo.findTimeSlotById(input.timeSlotId);

      // 2. Lógica de dominio
      const booking = BookingDomainService.createBooking(
        experience, timeSlot, input.userId, input.guestCount
      );

      // 3. Efectos secundarios en agregados
      timeSlot.reserve(input.guestCount);

      // 4. Persistir
      await repo.save(booking);
      await repo.saveTimeSlot(timeSlot);

      return { booking };
    });
  }
}
```

### 6. Repository Pattern

Abstracción de persistencia:

```typescript
// domain/booking/repositories/IBookingRepository.ts
export interface IBookingRepository {
  save(booking: Booking): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  withTransaction<T>(callback: (repo: IBookingRepository) => Promise<T>): Promise<T>;
}

// infrastructure/repositories/PrismaBookingRepository.ts
export class PrismaBookingRepository implements IBookingRepository {
  async save(booking: Booking): Promise<Booking> {
    const data = this.toPrismaData(booking);

    if (booking.id) {
      const saved = await this.prisma.booking.update({ where: { id: booking.id }, data });
      return this.toDomain(saved);
    } else {
      const saved = await this.prisma.booking.create({ data });
      return this.toDomain(saved);
    }
  }

  // Mapeo: Prisma Model ↔ Domain Entity
  private toDomain(data: PrismaBooking): Booking {
    return Booking.reconstitute({
      id: data.id,
      status: data.status,
      // ...
    });
  }
}
```

## Migración desde Legacy

### Paso 1: Crear Use Case

```typescript
// Nuevo código
const createBooking = new CreateBookingUseCase(bookingRepository);
const result = await createBooking.execute({
  userId,
  experienceId,
  timeSlotId,
  guestCount,
});
```

### Paso 2: Adaptar Route

```typescript
// routes/bookings.ts
import { CreateBookingUseCase } from '../application/use-cases/booking/index.js';
import { PrismaBookingRepository } from '../infrastructure/repositories/index.js';

// Dependency Injection
const bookingRepo = new PrismaBookingRepository(prisma);
const createBookingUseCase = new CreateBookingUseCase(bookingRepo);

app.post('/bookings', async (req, reply) => {
  const result = await createBookingUseCase.execute({
    userId: req.user.id,
    ...req.body,
  });

  return reply.status(201).send(result.booking.toJSON());
});
```

### Paso 3: Deprecar Service Legacy

```typescript
// services/booking.service.ts
// @deprecated - Use CreateBookingUseCase instead
async createBooking(userId: string, data: CreateBookingInput) {
  // Wrapper temporal
  const useCase = new CreateBookingUseCase(new PrismaBookingRepository(this.prisma));
  return useCase.execute({ userId, ...data });
}
```

## Testing

### Tests Unitarios (Domain Layer)

```typescript
// domain/booking/entities/Booking.test.ts
describe('Booking Entity', () => {
  it('should confirm booking when in pending status', () => {
    const booking = Booking.create({
      userId: 'user1',
      experienceId: 'exp1',
      timeSlotId: 'slot1',
      guestCount: GuestCount.create(2, 10),
      totalPrice: Money.create(100),
    });

    booking.confirm();

    expect(booking.status.isConfirmed()).toBe(true);
    expect(booking.confirmedAt).toBeDefined();
  });

  it('should throw error when cancelling completed booking', () => {
    const booking = Booking.create({ /* ... */ });
    booking.confirm();
    booking.complete();

    expect(() => booking.cancel()).toThrow(DomainError);
  });
});
```

### Tests de Integración (Use Cases)

```typescript
// application/use-cases/booking/CreateBookingUseCase.test.ts
describe('CreateBookingUseCase', () => {
  it('should create booking and reserve time slot', async () => {
    const mockRepo = createMockRepository();
    const useCase = new CreateBookingUseCase(mockRepo);

    const result = await useCase.execute({
      userId: 'user1',
      experienceId: 'exp1',
      timeSlotId: 'slot1',
      guestCount: 2,
    });

    expect(result.booking.status.isPendingPayment()).toBe(true);
    expect(mockRepo.saveTimeSlot).toHaveBeenCalled();
  });
});
```

## Ventajas de esta Arquitectura

1. **Testabilidad**: Entities y Value Objects son puros, sin dependencias externas
2. **Flexibilidad**: Cambiar de Prisma a TypeORM solo afecta a Infrastructure
3. **Mantenibilidad**: Lógica de negocio centralizada en Domain
4. **Type Safety**: TypeScript + Domain Entities = Validaciones en tiempo de compilación
5. **Escalabilidad**: Use Cases aislados, fáciles de extender

## Próximos Pasos

1. ✅ Domain Layer: Entities, Value Objects, Interfaces
2. ✅ Application Layer: Use Cases
3. ✅ Infrastructure Layer: Prisma Repositories
4. ⏳ Migrar Routes a Use Cases
5. ⏳ Tests unitarios de Entities (target: 100% coverage)
6. ⏳ Tests de integración de Use Cases
7. ⏳ Deprecar `services/` legacy
