# Guía de Migración a Clean Architecture

## Paso a Paso: Migrar un Endpoint

### 1. Estado Actual (Legacy)

```typescript
// routes/bookings.ts (ANTES)
app.post('/bookings', async (req, reply) => {
  const bookingService = new BookingService(prisma);
  const result = await bookingService.createBooking(req.user.id, req.body);
  return reply.status(201).send(result);
});

// services/booking.service.ts (ANTES)
async createBooking(userId: string, data: CreateBookingInput) {
  // Validaciones mezcladas con persistencia
  const experience = await this.prisma.experience.findUnique({ where: { id: data.experienceId } });
  if (!experience) throw new NotFoundError('Experience not found');

  const timeSlot = await this.prisma.experienceTimeSlot.findUnique({ where: { id: data.timeSlotId } });
  if (!timeSlot) throw new NotFoundError('Time slot not found');

  // Lógica de negocio en el servicio
  if (timeSlot.capacity - timeSlot.bookedCount < data.guestCount) {
    throw new AppError('Not enough capacity');
  }

  const totalPrice = Number(experience.price) * data.guestCount;

  // Transacción con Prisma directo
  return this.prisma.$transaction(async (tx) => {
    await tx.experienceTimeSlot.update({
      where: { id: timeSlot.id },
      data: { bookedCount: { increment: data.guestCount } }
    });

    return tx.booking.create({
      data: {
        userId,
        experienceId: data.experienceId,
        timeSlotId: data.timeSlotId,
        guestCount: data.guestCount,
        totalPrice: new Prisma.Decimal(totalPrice),
        status: 'PENDING_PAYMENT'
      }
    });
  });
}
```

### 2. Estado Deseado (Clean Architecture)

```typescript
// routes/bookings.ts (DESPUÉS)
import { CreateBookingUseCase } from '../application/use-cases/booking/index.js';
import { PrismaBookingRepository } from '../infrastructure/repositories/index.js';

// Dependency Injection (idealmente con un DI Container)
const bookingRepository = new PrismaBookingRepository(prisma);
const createBookingUseCase = new CreateBookingUseCase(bookingRepository);

app.post('/bookings', async (req, reply) => {
  try {
    const result = await createBookingUseCase.execute({
      userId: req.user.id,
      experienceId: req.body.experienceId,
      timeSlotId: req.body.timeSlotId,
      guestCount: req.body.guestCount,
      specialRequests: req.body.specialRequests,
    });

    return reply.status(201).send(result.booking.toJSON());
  } catch (error) {
    // Error handling middleware
    throw error;
  }
});
```

**Ventajas:**

- ✅ Lógica de negocio en `Booking`, `TimeSlot`, `Experience` entities
- ✅ Validaciones en Value Objects (`GuestCount`, `Money`)
- ✅ Repositorio abstrae Prisma
- ✅ Use Case testeable sin BD
- ✅ Fácil cambiar de Prisma a otro ORM

### 3. Comparación Lado a Lado

| Aspecto | Legacy Service | Clean Architecture |
|---------|---------------|-------------------|
| **Lógica de Negocio** | En `BookingService` | En `Booking`, `TimeSlot` entities |
| **Validaciones** | Dispersas en service | En Value Objects y Entities |
| **Persistencia** | Prisma directo | Abstraído en Repository |
| **Testabilidad** | Difícil (mock Prisma) | Fácil (mock Repository) |
| **Dependencias** | Service depende de Prisma | Domain NO depende de nada |
| **Reutilización** | Lógica atada a Prisma | Entities usables en cualquier contexto |

## Migración por Fases

### Fase 1: Crear Domain Layer (✅ Completado)

- [x] Entities: `Booking`, `Experience`, `TimeSlot`, `Product`, `Order`
- [x] Value Objects: `Money`, `GuestCount`, `Stock`, `BookingStatus`, `OrderStatus`
- [x] Repository Interfaces: `IBookingRepository`, `IProductRepository`
- [x] Domain Services: `BookingDomainService`
- [x] Domain Errors: `DomainError`, `BookingNotFoundError`, etc.

### Fase 2: Crear Application Layer (✅ Completado)

- [x] Use Cases: `CreateBookingUseCase`, `CancelBookingUseCase`, `ConfirmBookingUseCase`
- [x] Use Cases: `CreateOrderUseCase`, `ProcessPaymentUseCase`

### Fase 3: Crear Infrastructure Layer (✅ Completado)

- [x] `PrismaBookingRepository` implementa `IBookingRepository`
- [x] `PrismaProductRepository` implementa `IProductRepository`
- [x] Mappers: Prisma ↔ Domain Entities

### Fase 4: Migrar Routes (⏳ En Progreso)

**Prioridad Alta:**

1. `POST /bookings` → `CreateBookingUseCase`
2. `DELETE /bookings/:id` → `CancelBookingUseCase`
3. `PATCH /bookings/:id/confirm` → `ConfirmBookingUseCase`
4. `POST /orders` → `CreateOrderUseCase`

**Patrón de Migración:**

```typescript
// 1. Importar Use Case y Repository
import { CreateBookingUseCase } from '../application/use-cases/booking/index.js';
import { PrismaBookingRepository } from '../infrastructure/repositories/index.js';

// 2. Crear instancias (DI manual por ahora)
const repo = new PrismaBookingRepository(prisma);
const useCase = new CreateBookingUseCase(repo);

// 3. Reemplazar llamada a service
app.post('/bookings', async (req, reply) => {
  const result = await useCase.execute({
    userId: req.user.id,
    ...req.body
  });

  return reply.send(result.booking.toJSON());
});

// 4. Agregar tests
describe('POST /bookings', () => {
  it('should create booking', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/bookings',
      payload: { experienceId: 'exp1', timeSlotId: 'slot1', guestCount: 2 }
    });

    expect(response.statusCode).toBe(201);
  });
});
```

### Fase 5: Tests (⏳ Pendiente)

**Domain Layer (Target: 100% coverage):**

- [x] `Booking.test.ts` (ejemplo creado)
- [x] `Money.test.ts` (ejemplo creado)
- [ ] `TimeSlot.test.ts`
- [ ] `Experience.test.ts`
- [ ] `Product.test.ts`
- [ ] `Order.test.ts`
- [ ] `GuestCount.test.ts`
- [ ] `Stock.test.ts`
- [ ] `BookingDomainService.test.ts`

**Application Layer:**

- [ ] `CreateBookingUseCase.test.ts` (con mock repository)
- [ ] `CancelBookingUseCase.test.ts`
- [ ] `CreateOrderUseCase.test.ts`

**Infrastructure Layer:**

- [ ] `PrismaBookingRepository.integration.test.ts` (con test DB)

### Fase 6: Deprecar Legacy (⏳ Pendiente)

```typescript
// services/booking.service.ts
/**
 * @deprecated Use CreateBookingUseCase instead
 * This service will be removed in v2.0.0
 */
export class BookingService {
  async createBooking(userId: string, data: CreateBookingInput) {
    // Temporal wrapper
    const useCase = new CreateBookingUseCase(
      new PrismaBookingRepository(this.prisma)
    );
    return useCase.execute({ userId, ...data });
  }
}
```

## Dependency Injection (Futuro)

### Opción 1: Manual (Actual)

```typescript
// routes/bookings.ts
const repo = new PrismaBookingRepository(prisma);
const useCase = new CreateBookingUseCase(repo);
```

### Opción 2: Factory Pattern

```typescript
// infrastructure/factories/UseCaseFactory.ts
export class UseCaseFactory {
  constructor(private prisma: PrismaClient) {}

  createBookingUseCase(): CreateBookingUseCase {
    const repo = new PrismaBookingRepository(this.prisma);
    return new CreateBookingUseCase(repo);
  }
}

// routes/bookings.ts
const factory = new UseCaseFactory(prisma);
const useCase = factory.createBookingUseCase();
```

### Opción 3: DI Container (Recomendado para producción)

```typescript
// infrastructure/di/container.ts
import { Container } from 'inversify';

const container = new Container();
container.bind<IBookingRepository>('BookingRepository').to(PrismaBookingRepository);
container.bind<CreateBookingUseCase>('CreateBookingUseCase').to(CreateBookingUseCase);

// routes/bookings.ts
const useCase = container.get<CreateBookingUseCase>('CreateBookingUseCase');
```

## Checklist de Migración por Endpoint

- [ ] Identificar servicio legacy
- [ ] Crear Use Case correspondiente (si no existe)
- [ ] Actualizar route para usar Use Case
- [ ] Agregar tests unitarios de Use Case
- [ ] Agregar tests de integración de route
- [ ] Verificar que tests legacy siguen pasando
- [ ] Marcar servicio legacy como `@deprecated`
- [ ] Documentar cambios en changelog

## Problemas Comunes y Soluciones

### 1. "Prisma type incompatible with Domain Entity"

**Problema:**
```typescript
const booking = await prisma.booking.findUnique({ where: { id } });
return Booking.reconstitute(booking); // Error de tipos
```

**Solución:**
```typescript
// Usar mapper en repository
private toDomain(data: PrismaBooking): Booking {
  return Booking.reconstitute({
    id: data.id,
    status: data.status,
    guestCount: data.guestCount,
    capacity: data.experience.maxCapacity, // Obtener de relación
    totalPrice: Number(data.totalPrice),
    // ...
  });
}
```

### 2. "Circular dependency between entities"

**Problema:**
```typescript
// Booking.ts
import { Experience } from './Experience.js';

// Experience.ts
import { Booking } from './Booking.js'; // ❌ Circular
```

**Solución:**
```typescript
// Usar Domain Service
// BookingDomainService.ts
import { Booking } from '../entities/Booking.js';
import { Experience } from '../entities/Experience.js';

class BookingDomainService {
  static createBooking(experience: Experience, ...): Booking {
    // Lógica que involucra ambos agregados
  }
}
```

### 3. "Transaction scope leaking"

**Problema:**
```typescript
const repo = new PrismaBookingRepository(prisma);
await repo.withTransaction(async (txRepo) => {
  await txRepo.save(booking);
  await externalApiCall(); // ❌ Llamada fuera del contexto transaccional
});
```

**Solución:**
```typescript
// Hacer llamadas externas ANTES o DESPUÉS de la transacción
const payment = await stripeService.createIntent(...);

await repo.withTransaction(async (txRepo) => {
  booking.attachPaymentIntent(payment.id);
  await txRepo.save(booking);
});
```

## Recursos

- [Clean Architecture by Uncle Bob](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Domain-Driven Design by Eric Evans](https://www.domainlanguage.com/ddd/)
- [Implementing Domain-Driven Design by Vaughn Vernon](https://vaughnvernon.com/)
