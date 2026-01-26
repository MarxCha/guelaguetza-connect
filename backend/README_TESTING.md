# Testing Documentation

## 📚 Índice

1. [Resumen](#resumen)
2. [Estructura de Tests](#estructura-de-tests)
3. [Quick Start](#quick-start)
4. [Tests de Integración](#tests-de-integración)
5. [Tests Unitarios](#tests-unitarios)
6. [Cobertura](#cobertura)
7. [CI/CD](#cicd)
8. [Troubleshooting](#troubleshooting)

---

## Resumen

El proyecto tiene una suite completa de tests que incluye:

- **68 tests de integración** (85%+ coverage)
- **Tests unitarios** para utilidades críticas
- **Tests e2e** (Playwright) para flujos completos
- **Mocks** de servicios externos (Stripe, S3, etc.)

### Estadísticas

```
Total Tests:           68+
Integration Tests:     68
Unit Tests:           ~15
E2E Tests:            ~10

Coverage Target:      85%+
Coverage Actual:      85%+

Execution Time:       30-45s (integration)
```

---

## Estructura de Tests

```
backend/
├── test/
│   ├── integration/
│   │   ├── setup-integration.ts              # Setup global para integration tests
│   │   ├── booking.service.test.ts           # 28 tests (Bookings)
│   │   ├── marketplace.service.test.ts       # 24 tests (Marketplace)
│   │   ├── auth.service.test.ts              # 16 tests (Auth)
│   │   ├── booking-concurrency.test.ts       # Tests de concurrencia
│   │   └── product-concurrency.test.ts       # Tests de concurrencia productos
│   │
│   ├── unit/
│   │   ├── optimistic-locking.test.ts        # Tests de locking
│   │   └── marketplace-optimistic-locking.test.ts
│   │
│   ├── helpers/
│   │   └── stripe-mock.ts                    # Mock de Stripe
│   │
│   └── factories/
│       └── factories.test.ts                 # Factories para tests
│
├── scripts/
│   ├── reset-test-db.ts                      # Script de reset de DB
│   └── run-integration-tests.sh              # Script automatizado
│
├── vitest.config.ts                          # Config de tests unitarios
├── vitest.config.integration.ts              # Config de tests de integración
└── docker-compose.test.yml                   # PostgreSQL para tests
```

---

## Quick Start

### Ejecutar Todos los Tests

```bash
# Script automatizado (TODO EN UNO) ⭐ RECOMENDADO
./scripts/run-integration-tests.sh

# O manualmente:
npm run test:db:up              # Iniciar DB de prueba
npm run test:db:reset           # Resetear schema
npm run test:integration        # Ejecutar tests
```

### Ver Cobertura

```bash
npm run test:integration:coverage
open coverage/index.html
```

### Watch Mode (Desarrollo)

```bash
npm run test:integration:watch
```

---

## Tests de Integración

Los tests de integración prueban los servicios completos con una base de datos real (PostgreSQL en Docker).

### Servicios Cubiertos

#### 1. BookingService (28 tests)

**Funcionalidades:**
- ✅ Crear bookings con payment intent
- ✅ Validar disponibilidad
- ✅ Concurrencia (5 bookings simultáneos)
- ✅ Prevenir overbooking
- ✅ Cancelar con refund
- ✅ Confirmar después de webhook
- ✅ Cleanup de bookings fallidos

**Ejemplo:**
```typescript
it('should handle concurrent bookings correctly', async () => {
  // Crear 5 bookings simultáneos al mismo slot
  const bookingPromises = Array.from({ length: 5 }, () =>
    bookingService.createBooking(userId, {
      experienceId,
      timeSlotId,
      guestCount: 1,
    })
  );

  const results = await Promise.all(bookingPromises);

  // Todos completos gracias al retry mechanism
  expect(results).toHaveLength(5);
  expect(results.every(r => r.booking !== undefined)).toBe(true);

  // Verificar version incrementada (optimistic locking)
  const slot = await prisma.experienceTimeSlot.findUnique({
    where: { id: timeSlotId }
  });
  expect(slot?.bookedCount).toBe(5);
  expect(slot?.version).toBe(6); // 1 inicial + 5 incrementos
});
```

#### 2. MarketplaceService (24 tests)

**Funcionalidades:**
- ✅ Crear órdenes multi-seller
- ✅ Validar stock (prevenir overselling)
- ✅ Concurrencia de órdenes
- ✅ Retry en conflictos de versión
- ✅ Carrito de compras
- ✅ Cleanup de órdenes fallidas

**Ejemplo:**
```typescript
it('should prevent overselling with stock validation', async () => {
  // Producto con stock de 5
  const product = await prisma.product.create({
    data: { stock: 5, /* ... */ }
  });

  // Usuario 1 compra 3
  await addToCart(user1.id, product.id, 3);
  await createOrder(user1.id);

  // Usuario 2 intenta comprar 4 (debería fallar)
  await addToCart(user2.id, product.id, 4);

  await expect(
    createOrder(user2.id)
  ).rejects.toThrow('Stock insuficiente');

  // Verificar stock final (5 - 3 = 2)
  const finalProduct = await prisma.product.findUnique({
    where: { id: product.id }
  });
  expect(finalProduct?.stock).toBe(2);
});
```

#### 3. AuthService (16 tests)

**Funcionalidades:**
- ✅ Register / Login / Profile
- ✅ Usuarios baneados (nueva funcionalidad)
- ✅ Email case-insensitive
- ✅ Hash de contraseñas
- ✅ Diferentes roles (USER, HOST, SELLER, ADMIN)

**Ejemplo:**
```typescript
it('should throw error if user is banned', async () => {
  const user = await authService.register({
    email: 'test@example.com',
    password: 'Password123!',
    nombre: 'Test',
    apellido: 'User',
  });

  // Banear usuario
  await prisma.user.update({
    where: { id: user.id },
    data: {
      bannedAt: new Date(),
      bannedReason: 'Violación de términos',
    },
  });

  // Intentar login
  await expect(
    authService.login('test@example.com', 'Password123!')
  ).rejects.toThrow('Tu cuenta ha sido suspendida: Violación de términos');
});
```

### Ejecutar Tests Específicos

```bash
# Todos los de BookingService
npm run test:integration:booking

# Todos los de MarketplaceService
npm run test:integration:marketplace

# Todos los de AuthService
npm run test:integration:auth

# Solo un test específico
npm run test:integration -- -t "should handle concurrent bookings"
```

---

## Tests Unitarios

Los tests unitarios prueban funciones y utilidades aisladas, sin base de datos.

### Cubiertos

- ✅ Optimistic Locking utilities
- ✅ Error handling
- ✅ Validation helpers
- ✅ Metrics utilities

**Ejecutar:**
```bash
npm test
npm test -- --coverage
```

---

## Cobertura

### Objetivos de Cobertura

| Métrica | Target | Actual |
|---------|--------|--------|
| Statements | 85% | ✅ 85%+ |
| Branches | 80% | ✅ 80%+ |
| Functions | 85% | ✅ 85%+ |
| Lines | 85% | ✅ 85%+ |

### Por Servicio

| Servicio | Coverage | Status |
|----------|----------|--------|
| BookingService | 85%+ | ✅ |
| MarketplaceService | 85%+ | ✅ |
| AuthService | 90%+ | ✅ |
| Utils | 90%+ | ✅ |

### Generar Reporte

```bash
npm run test:integration:coverage

# Ver en navegador
open coverage/index.html
```

### Configuración de Coverage

```typescript
// vitest.config.integration.ts
coverage: {
  provider: 'v8',
  reporter: ['text', 'html', 'json', 'lcov'],
  include: ['src/**/*.ts'],
  exclude: ['src/**/*.test.ts', 'src/types/**'],
  thresholds: {
    statements: 85,
    branches: 80,
    functions: 85,
    lines: 85,
  },
}
```

---

## Helpers y Mocks

### Stripe Mock

```typescript
// test/helpers/stripe-mock.ts
import { createStripeMock } from '../helpers/stripe-mock';

const stripeMock = createStripeMock();

// Usar en tests
it('should create payment intent', async () => {
  stripeMock.createPaymentIntent.mockResolvedValue({
    paymentIntentId: 'pi_test_123',
    clientSecret: 'pi_test_123_secret',
  });

  const result = await bookingService.createBooking(/* ... */);

  expect(stripeMock.createPaymentIntent).toHaveBeenCalledWith({
    amount: 100000, // $1000 en centavos
    description: 'Reservación: Tour por Monte Albán',
    metadata: expect.objectContaining({
      bookingId: expect.any(String),
    }),
  });
});
```

### Setup de Integration Tests

```typescript
// test/integration/setup-integration.ts
beforeEach(async () => {
  // Limpiar TODA la base de datos antes de cada test
  // Orden importante: respetar relaciones FK
  await prisma.booking.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.user.deleteMany({});
  // ... etc
});
```

---

## Base de Datos de Prueba

### Docker Compose

```yaml
# docker-compose.test.yml
services:
  postgres-test:
    image: postgres:16-alpine
    container_name: guelaguetza-test-db
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
      POSTGRES_DB: guelaguetza_test
    ports:
      - "5436:5432"
```

### Comandos

```bash
# Iniciar
npm run test:db:up

# Verificar estado
docker ps | grep guelaguetza-test-db

# Resetear (aplicar migraciones)
npm run test:db:reset

# Detener
npm run test:db:down

# Ver logs
docker logs guelaguetza-test-db

# Conectar directamente
docker exec -it guelaguetza-test-db psql -U test_user -d guelaguetza_test
```

---

## CI/CD

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Integration Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Start Test Database
        run: npm run test:db:up

      - name: Wait for Database
        run: |
          until docker exec guelaguetza-test-db pg_isready -U test_user -d guelaguetza_test; do
            sleep 1
          done

      - name: Reset Database
        run: npm run test:db:reset

      - name: Run Integration Tests
        run: npm run test:integration:coverage

      - name: Upload Coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info

      - name: Cleanup
        if: always()
        run: npm run test:db:down
```

---

## Troubleshooting

### Error: "Cannot connect to Docker daemon"

**Solución:**
```bash
# Asegúrate de que Docker Desktop esté corriendo
open -a Docker

# Espera unos segundos y verifica
docker ps
```

### Error: "Database connection failed"

**Solución:**
```bash
# Reinicia el contenedor
npm run test:db:down
npm run test:db:up

# Espera a que esté listo
until docker exec guelaguetza-test-db pg_isready -U test_user -d guelaguetza_test; do
  sleep 1
done

# Resetea el schema
npm run test:db:reset
```

### Tests lentos o colgados

**Solución:**
```typescript
// Aumenta el timeout en vitest.config.integration.ts
export default defineConfig({
  test: {
    testTimeout: 60000, // 60 segundos
    hookTimeout: 60000,
  },
});
```

### Limpiar todo y empezar de cero

```bash
# Detener todo
npm run test:db:down

# Eliminar volúmenes
docker volume rm $(docker volume ls -q | grep postgres_test)

# Empezar desde cero
npm run test:db:up
npm run test:db:reset
npm run test:integration
```

### Tests fallando por race conditions

**Solución:**

Los tests de integración ya están configurados para ejecutarse secuencialmente:

```typescript
// vitest.config.integration.ts
export default defineConfig({
  test: {
    pool: 'forks',
    singleFork: true, // Ejecutar secuencialmente
  },
});
```

Si aún hay problemas, ejecuta un test a la vez:

```bash
npm run test:integration -- test/integration/booking.service.test.ts
```

---

## Buenas Prácticas

### 1. Isolation

Cada test debe ser independiente:

```typescript
beforeEach(async () => {
  // Limpiar DB antes de cada test
  await prisma.user.deleteMany({});
  await prisma.booking.deleteMany({});
});
```

### 2. Descriptive Names

```typescript
// ❌ Mal
it('test 1', () => { /* ... */ });

// ✅ Bien
it('should prevent overbooking with concurrent requests', () => { /* ... */ });
```

### 3. Arrange-Act-Assert

```typescript
it('should create booking successfully', async () => {
  // Arrange
  const user = await createUser();
  const experience = await createExperience();

  // Act
  const result = await bookingService.createBooking(user.id, {
    experienceId: experience.id,
    guestCount: 2,
  });

  // Assert
  expect(result.booking).toBeDefined();
  expect(result.booking.guestCount).toBe(2);
});
```

### 4. Test Edge Cases

```typescript
// No solo happy path
it('should throw error for non-existent experience', async () => {
  await expect(
    bookingService.createBooking(userId, {
      experienceId: 'non-existent-id',
      guestCount: 2,
    })
  ).rejects.toThrow(NotFoundError);
});
```

### 5. Test Concurrency

```typescript
it('should handle concurrent requests correctly', async () => {
  const promises = Array.from({ length: 5 }, () =>
    bookingService.createBooking(/* ... */)
  );

  const results = await Promise.allSettled(promises);

  // Verificar resultados
  const successful = results.filter(r => r.status === 'fulfilled');
  const failed = results.filter(r => r.status === 'rejected');

  expect(successful.length + failed.length).toBe(5);
});
```

---

## Recursos

### Documentación
- [INTEGRATION_TESTS_COVERAGE_REPORT.md](./INTEGRATION_TESTS_COVERAGE_REPORT.md) - Reporte detallado
- [QUICK_TEST_INTEGRATION.md](./QUICK_TEST_INTEGRATION.md) - Quick start
- [INTEGRATION_TESTS_SUMMARY.md](./INTEGRATION_TESTS_SUMMARY.md) - Resumen
- [TEST_IMPLEMENTATION_CHECKLIST.md](./TEST_IMPLEMENTATION_CHECKLIST.md) - Checklist

### Scripts
- `./scripts/run-integration-tests.sh` - Ejecutar todo automáticamente
- `./scripts/reset-test-db.ts` - Resetear base de datos

### Configuración
- `vitest.config.ts` - Tests unitarios
- `vitest.config.integration.ts` - Tests de integración
- `docker-compose.test.yml` - Base de datos de prueba
- `.env.test` - Variables de entorno para tests

---

## Próximos Pasos

Para alcanzar **100% de cobertura**:

1. **EventService** (5-8 tests)
   - RSVP con capacidad
   - Concurrencia de RSVPs
   - Creación de reminders

2. **GamificationService** (5-8 tests)
   - Asignación de badges
   - Actualización de stats
   - Ranking de usuarios

3. **StoryService** (3-5 tests)
   - Upload de stories
   - Expiración automática
   - Visualizaciones

4. **E2E Tests** (Playwright)
   - Flujos completos de usuario
   - Integración frontend-backend

---

## Comandos Rápidos

```bash
# Ejecutar todo (recomendado)
./scripts/run-integration-tests.sh

# DB
npm run test:db:up
npm run test:db:reset
npm run test:db:down

# Tests
npm run test:integration
npm run test:integration:watch
npm run test:integration:coverage

# Tests específicos
npm run test:integration:booking
npm run test:integration:marketplace
npm run test:integration:auth

# Ver coverage
open coverage/index.html
```

---

**✅ Coverage Actual: 85%+**

**🎯 Target: 85%+**

**📊 Tests: 68/68 passing**
