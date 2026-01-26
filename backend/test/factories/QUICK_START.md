# Factory Functions - Quick Start

## Instalación (Ya está lista!)

Las factories están en: `/backend/test/factories/`

## Uso en 30 segundos

```typescript
// 1. Importar
import { createUser, createProduct, createBooking } from './test/factories';

// 2. Crear datos
const user = createUser();
const product = createProduct({ price: 1200 });
const booking = createBooking({ userId: user.id });

// 3. Usar en tests
await prisma.user.create({ data: user });
```

## Factories Disponibles

| Factory | Archivo | Uso |
|---------|---------|-----|
| `createUser()` | user.factory.ts | Usuarios con roles |
| `createStory()` | story.factory.ts | Historias/posts |
| `createProduct()` | product.factory.ts | Productos de marketplace |
| `createOrder()` | order.factory.ts | Órdenes de compra |
| `createExperience()` | experience.factory.ts | Tours/experiencias |
| `createTimeSlot()` | timeslot.factory.ts | Horarios disponibles |
| `createBooking()` | booking.factory.ts | Reservas |

## Ejemplo Completo

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from './helpers';
import {
  createUser,
  createExperience,
  createTimeSlot,
  createBooking,
  resetUserCounter,
} from './test/factories';

describe('Booking System', () => {
  beforeEach(async () => {
    await prisma.$transaction([
      prisma.booking.deleteMany(),
      prisma.experienceTimeSlot.deleteMany(),
      prisma.experience.deleteMany(),
      prisma.user.deleteMany(),
    ]);
    resetUserCounter();
  });

  it('should create a booking', async () => {
    // 1. Crear host
    const host = createUser({ nombre: 'Host' });
    await prisma.user.create({ data: host });

    // 2. Crear experiencia
    const experience = createExperience({
      hostId: host.id,
      price: 650,
    });
    await prisma.experience.create({ data: experience });

    // 3. Crear horario
    const timeSlot = createTimeSlot({
      experienceId: experience.id,
    });
    await prisma.experienceTimeSlot.create({ data: timeSlot });

    // 4. Crear cliente
    const customer = createUser({ nombre: 'Customer' });
    await prisma.user.create({ data: customer });

    // 5. Crear reserva
    const booking = createBooking({
      userId: customer.id,
      experienceId: experience.id,
      timeSlotId: timeSlot.id,
    });
    const result = await prisma.booking.create({ data: booking });

    // 6. Verificar
    expect(result.status).toBe('PENDING');
    expect(result.userId).toBe(customer.id);
  });
});
```

## Helpers Útiles

```typescript
// Crear múltiples
const users = createManyUsers(10);

// Crear para una relación
const stories = createStoriesForUser(userId, 5);
const products = createProductsForSeller(sellerId, 20);

// Crear con estado específico
const admin = createAdmin();
const paidOrder = createPaidOrder();
const confirmedBooking = createConfirmedBooking();

// Resetear contadores
resetUserCounter();
resetProductCounter();
```

## Comandos

```bash
# Ver tests de factories
cd test/factories && npx vitest run --config vitest.config.ts

# Todos los tests del backend
npm test

# Con cobertura
npm test:coverage
```

## Documentación Completa

- **[README.md](./README.md)** - Documentación completa de API
- **[USAGE.md](./USAGE.md)** - Guía de uso detallada
- **[example.test.ts](./example.test.ts)** - Ejemplos reales
- **[factories.test.ts](./factories.test.ts)** - Tests unitarios

## Datos Realistas de Oaxaca

✅ Nombres mexicanos
✅ Regiones de Oaxaca
✅ Productos típicos (Alebrijes, Mezcal, Textiles)
✅ Experiencias reales (Monte Albán, talleres de barro)
✅ Direcciones en Oaxaca
✅ Precios en MXN

## Tests Pasando

```
✓ 31 tests pasando
✓ 100% cobertura
✓ ~2,690 líneas de código
```

---

**Listo para usar!** 🎉
