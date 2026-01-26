# Guía Rápida de Factory Functions

## Instalación

Las factories ya están disponibles. Solo necesitas importarlas:

```typescript
import { createUser, createProduct, createBooking } from './test/factories';
```

## Casos de Uso Comunes

### 1. Test Unitario Simple

```typescript
import { describe, it, expect } from 'vitest';
import { createUser } from './test/factories';

describe('User Service', () => {
  it('should validate email format', () => {
    const user = createUser({ email: 'invalid-email' });

    const result = validateEmail(user.email);

    expect(result.isValid).toBe(false);
  });
});
```

### 2. Test con Base de Datos (Integración)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from './helpers';
import { createUser, createStory, resetUserCounter } from './test/factories';

describe('Story Creation', () => {
  beforeEach(async () => {
    await prisma.story.deleteMany();
    await prisma.user.deleteMany();
    resetUserCounter();
  });

  it('should create story for user', async () => {
    // Arrange
    const userData = createUser();
    const user = await prisma.user.create({ data: userData });

    const storyData = createStory({ userId: user.id });

    // Act
    const story = await prisma.story.create({ data: storyData });

    // Assert
    expect(story.userId).toBe(user.id);
  });
});
```

### 3. Seedear Base de Datos de Prueba

```typescript
import { prisma } from './src/lib/prisma';
import {
  createManyUsers,
  createProductsForSeller,
  createExperiencesForHost,
} from './test/factories';

async function seedTestData() {
  // 20 usuarios
  const users = createManyUsers(20);
  await prisma.user.createMany({ data: users });

  // 10 vendedores con productos
  const sellers = users.slice(0, 10);
  for (const seller of sellers) {
    const profile = await prisma.sellerProfile.create({
      data: {
        userId: seller.id,
        businessName: `Tienda ${seller.nombre}`,
      },
    });

    const products = createProductsForSeller(profile.id, 5);
    await prisma.product.createMany({ data: products });
  }

  console.log('Test data seeded!');
}

seedTestData();
```

### 4. Test de API (E2E)

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { buildApp } from './src/app';
import { prisma } from './src/lib/prisma';
import { createUser } from './test/factories';

describe('POST /api/auth/login', () => {
  const app = buildApp();

  beforeEach(async () => {
    await prisma.user.deleteMany();
  });

  it('should login with valid credentials', async () => {
    // Arrange
    const userData = createUser({
      email: 'test@example.com',
      password: 'password123', // será hasheado automáticamente
    });
    await prisma.user.create({ data: userData });

    // Act
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123',
      },
    });

    // Assert
    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('token');
  });
});
```

## Patrones Recomendados

### Pattern 1: Reset Counters en beforeEach

```typescript
import { beforeEach } from 'vitest';
import { resetUserCounter, resetProductCounter } from './test/factories';

beforeEach(() => {
  resetUserCounter();
  resetProductCounter();
  // Esto garantiza IDs predecibles en cada test
});
```

### Pattern 2: Builder Pattern

```typescript
// Crear datos relacionados paso a paso
const host = createUser({ nombre: 'Host' });
await prisma.user.create({ data: host });

const experience = createExperience({
  hostId: host.id,
  price: 500,
});
await prisma.experience.create({ data: experience });

const timeSlots = createTimeSlotsForExperience(experience.id, 10);
await prisma.experienceTimeSlot.createMany({ data: timeSlots });
```

### Pattern 3: Data Fixtures

```typescript
// Crear un "fixture" reutilizable
async function createBookingFixture() {
  const host = createUser();
  const customer = createUser();

  await prisma.user.createMany({ data: [host, customer] });

  const experience = createExperience({ hostId: host.id });
  await prisma.experience.create({ data: experience });

  const slot = createTimeSlot({ experienceId: experience.id });
  await prisma.experienceTimeSlot.create({ data: slot });

  return { host, customer, experience, slot };
}

// Usar en tests
it('should create booking', async () => {
  const { customer, experience, slot } = await createBookingFixture();

  const booking = createBooking({
    userId: customer.id,
    experienceId: experience.id,
    timeSlotId: slot.id,
  });

  // ... test code
});
```

## Comandos de Testing

```bash
# Ejecutar todos los tests
npm test

# Ejecutar solo tests de factories
cd test/factories && npx vitest run --config vitest.config.ts

# Watch mode
npm test -- --watch

# Con cobertura
npm test:coverage
```

## Tips y Mejores Prácticas

1. **Siempre resetea contadores en beforeEach**
   - Garantiza tests determinísticos

2. **Limpia la BD antes de cada test**
   - Evita interferencia entre tests

3. **Usa helpers específicos**
   - `createAdmin()` en lugar de `createUser({ role: 'ADMIN' })`

4. **Override solo lo necesario**
   - Deja que las factories generen el resto

5. **Datos realistas**
   - Las factories ya tienen datos de Oaxaca - úsalos

6. **IDs únicos automáticos**
   - No necesitas generar IDs manualmente

## Troubleshooting

### Error: "Duplicate ID"

```typescript
// Problema:
const user1 = createUser({ id: 'user-1' });
const user2 = createUser({ id: 'user-1' });

// Solución: No especifiques IDs manualmente
const user1 = createUser();
const user2 = createUser();
```

### Error: "Foreign key constraint"

```typescript
// Problema: Crear booking sin experiencia
const booking = createBooking();
await prisma.booking.create({ data: booking });

// Solución: Crear dependencias primero
const user = createUser();
await prisma.user.create({ data: user });

const experience = createExperience({ hostId: user.id });
await prisma.experience.create({ data: experience });

const booking = createBooking({
  userId: user.id,
  experienceId: experience.id,
});
await prisma.booking.create({ data: booking });
```

### Tests inconsistentes

```typescript
// Problema: Contadores no reseteados
describe('My tests', () => {
  it('test 1', () => {
    const user = createUser(); // ID: user-0-...
  });

  it('test 2', () => {
    const user = createUser(); // ID: user-1-...  (diferente!)
  });
});

// Solución: Resetear en beforeEach
beforeEach(() => {
  resetUserCounter();
});
```

## Próximos Pasos

1. Revisa el [README.md](./README.md) para documentación completa
2. Mira [example.test.ts](./example.test.ts) para más ejemplos
3. Ejecuta [factories.test.ts](./factories.test.ts) para ver tests unitarios
4. Crea tus propias factories si necesitas más modelos

## Soporte

Si encuentras bugs o necesitas nuevas factories:
1. Revisa la documentación completa en README.md
2. Mira los ejemplos en example.test.ts
3. Los archivos están en `test/factories/`
