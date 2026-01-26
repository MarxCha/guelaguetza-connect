# Guía de Tests E2E - Guelaguetza Connect

Esta guía explica cómo ejecutar y trabajar con los tests end-to-end (E2E) del proyecto.

## Qué son los Tests E2E

Los tests E2E (end-to-end) simulan el comportamiento real de los usuarios en la aplicación completa:

- Levantan el servidor backend completo
- Usan una base de datos real de prueba
- Ejecutan flujos completos de usuario
- Verifican integración entre componentes
- Son más lentos pero más confiables

**Diferencia con tests unitarios:**
- Tests unitarios: Prueban funciones/componentes aislados (rápidos)
- Tests E2E: Prueban flujos completos de usuario (lentos pero realistas)

## Configuración Inicial

### 1. Instalar dependencias

```bash
pnpm install
```

### 2. Configurar base de datos de prueba

#### Opción A: Usando script automático (Recomendado)

```bash
chmod +x test/e2e/setup-test-db.sh
./test/e2e/setup-test-db.sh
```

#### Opción B: Manual

```bash
# 1. Crear .env.test
cp .env.test.example .env.test

# 2. Levantar PostgreSQL con Docker
docker-compose -f test/e2e/docker-compose.test.yml up -d

# 3. Aplicar migraciones
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/guelaguetza_test" npx prisma migrate deploy
cd ..
```

### 3. Verificar configuración

```bash
pnpm test:e2e health
```

Si este test pasa, la configuración está correcta.

## Ejecutar Tests

### Todos los tests E2E
```bash
pnpm test:e2e
```

### Test específico
```bash
# Por nombre de archivo
pnpm test:e2e booking-flow

# Por nombre de suite
pnpm test:e2e "Admin Flow"
```

### En modo watch (desarrollo)
```bash
pnpm test:e2e:watch
```

### Con UI interactiva
```bash
pnpm test:e2e:ui
```

### Con coverage
```bash
pnpm test:e2e:coverage
```

## Estructura de Tests

### Archivos Principales

```
test/e2e/
├── setup.ts                    # Configuración global
├── health.test.ts              # Verificación de configuración
├── booking-flow.test.ts        # Flujo de reservaciones
├── marketplace-flow.test.ts    # Flujo de compras
├── admin-flow.test.ts          # Flujo de administración
├── fixtures/                   # Datos de prueba
│   ├── users.ts
│   ├── experiences.ts
│   └── products.ts
└── docker-compose.test.yml     # BD de prueba
```

### Anatomía de un Test E2E

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { getTestApp, getTestPrisma, generateAuthToken } from './setup.js';
import { testUsers, TEST_PASSWORD } from './fixtures/users.js';

describe('E2E: Mi Flujo', () => {
  const app = getTestApp();
  const prisma = getTestPrisma();

  let userId: string;

  beforeEach(async () => {
    // Seed: Preparar datos de prueba
    const user = await prisma.user.create({
      data: testUsers.regularUser,
    });
    userId = user.id;
  });

  it('Usuario puede completar flujo exitosamente', async () => {
    // PASO 1: Login
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUsers.regularUser.email,
        password: TEST_PASSWORD,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const { token } = JSON.parse(loginResponse.body);

    // PASO 2: Acción autenticada
    const response = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
  });
});
```

## Flujos Cubiertos

### 1. Booking Flow
**Archivo:** `test/e2e/booking-flow.test.ts`

Flujo completo de reservación de experiencias:
- Login de usuario
- Búsqueda de experiencias
- Selección de horario
- Creación de booking
- Visualización de reservaciones
- Cancelación

### 2. Marketplace Flow
**Archivo:** `test/e2e/marketplace-flow.test.ts`

Flujo completo de compra de productos:
- Login de usuario
- Búsqueda de productos
- Agregar múltiples productos al carrito
- Modificar cantidades
- Checkout
- Visualización de órdenes

### 3. Admin Flow
**Archivo:** `test/e2e/admin-flow.test.ts`

Flujo completo de administración:
- Login de admin
- Dashboard de estadísticas
- Búsqueda de usuarios
- Banear/desbanear usuarios
- Cambio de roles
- Moderación de contenido

## Fixtures (Datos de Prueba)

### Usuarios Disponibles

```typescript
import { testUsers, TEST_PASSWORD } from './fixtures/users.js';

// Usuario regular
testUsers.regularUser
// email: user@example.com
// password: password123

// Anfitrión
testUsers.hostUser
// email: host@example.com

// Vendedor
testUsers.sellerUser
// email: seller@example.com

// Admin
testUsers.adminUser
// email: admin@example.com

// Usuario baneado
testUsers.bannedUser
// email: banned@example.com
```

### Experiencias

```typescript
import { testExperiences } from './fixtures/experiences.js';

testExperiences.cookingClass  // Clase de cocina ($500)
testExperiences.mezcalTour    // Tour de mezcal ($350)
testExperiences.textileWorkshop // Taller de tejido ($400)
```

### Productos

```typescript
import { testProducts } from './fixtures/products.js';

testProducts.alebrije   // $850, stock: 5
testProducts.mezcal     // $450, stock: 20
testProducts.textil     // $1200, stock: 3
testProducts.ceramica   // $320, stock: 10
testProducts.soldOut    // $500, stock: 0
```

## Helpers Útiles

### getTestApp()
Retorna instancia de Fastify para hacer requests HTTP.

```typescript
const app = getTestApp();
const response = await app.inject({
  method: 'GET',
  url: '/api/endpoint',
});
```

### getTestPrisma()
Retorna instancia de Prisma para seeding y verificaciones.

```typescript
const prisma = getTestPrisma();
const user = await prisma.user.create({ data: {...} });
```

### generateAuthToken(userId)
Genera token JWT válido para autenticación.

```typescript
const token = generateAuthToken(userId);
const response = await app.inject({
  method: 'GET',
  url: '/api/protected',
  headers: {
    authorization: `Bearer ${token}`,
  },
});
```

## Debugging

### Ver logs del servidor

Los logs de Fastify se muestran en la consola durante los tests.

### Inspeccionar base de datos

```bash
# Conectar a BD de prueba
docker exec -it guelaguetza-test-db psql -U postgres -d guelaguetza_test

# Ver datos
SELECT * FROM "User";
SELECT * FROM "Booking";
SELECT * FROM "Order";
```

### Detener tests en un punto

```typescript
it('mi test', async () => {
  const response = await app.inject({...});

  // Detener aquí para inspeccionar
  console.log(JSON.stringify(JSON.parse(response.body), null, 2));

  expect(response.statusCode).toBe(200);
});
```

### Ejecutar un solo test

```typescript
it.only('solo este test se ejecutará', async () => {
  // ...
});
```

## Mejores Prácticas

### 1. Tests Independientes
Cada test debe poder ejecutarse de forma aislada.

```typescript
// ✅ BIEN
beforeEach(async () => {
  // Crear datos necesarios
  user = await prisma.user.create({...});
});

// ❌ MAL
let user; // Definido fuera y reutilizado entre tests
```

### 2. Cleanup Automático
El setup hace cleanup automático, pero puedes agregar más si es necesario.

```typescript
afterEach(async () => {
  // Cleanup adicional si es necesario
  await prisma.specialModel.deleteMany();
});
```

### 3. Assertions Completas
Verifica tanto la respuesta HTTP como el estado de la BD.

```typescript
// Verificar respuesta HTTP
expect(response.statusCode).toBe(201);
const body = JSON.parse(response.body);
expect(body).toHaveProperty('id');

// Verificar BD
const dbRecord = await prisma.model.findUnique({
  where: { id: body.id },
});
expect(dbRecord).toBeDefined();
```

### 4. Simular Casos Reales
Los tests E2E deben simular comportamiento real de usuarios.

```typescript
// ✅ BIEN: Flujo completo
it('usuario puede comprar producto', async () => {
  // 1. Login
  const { token } = await login();

  // 2. Ver producto
  await viewProduct(productId);

  // 3. Agregar al carrito
  await addToCart(productId, token);

  // 4. Checkout
  await checkout(token);

  // 5. Verificar orden
  const orders = await getMyOrders(token);
  expect(orders.length).toBe(1);
});

// ❌ MAL: Saltar pasos
it('crear orden directamente', async () => {
  const order = await prisma.order.create({...});
  // Esto no prueba el flujo real
});
```

### 5. Testear Casos de Error
No solo casos exitosos, también errores.

```typescript
it('no permite comprar producto sin stock', async () => {
  const response = await addToCart(soldOutProductId, token);

  expect(response.statusCode).toBe(400);
  const body = JSON.parse(response.body);
  expect(body.error).toContain('stock');
});
```

## Troubleshooting

### Error: Cannot connect to database

**Solución:**
```bash
# Verificar que PostgreSQL está corriendo
docker ps | grep guelaguetza-test-db

# Si no está corriendo, levantar
docker-compose -f test/e2e/docker-compose.test.yml up -d
```

### Error: Table does not exist

**Solución:**
```bash
# Aplicar migraciones
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/guelaguetza_test" npx prisma migrate deploy
```

### Tests fallan aleatoriamente

**Causa:** Probablemente datos quedaron de test anterior.

**Solución:** El cleanup automático debería manejarlo. Si persiste:
```bash
# Reset completo de BD
docker-compose -f test/e2e/docker-compose.test.yml down -v
./test/e2e/setup-test-db.sh
```

### Error: Port 5433 already in use

**Solución:**
```bash
# Encontrar proceso usando el puerto
lsof -i :5433

# Detener contenedor existente
docker-compose -f test/e2e/docker-compose.test.yml down
```

## Mantenimiento

### Limpiar base de datos de prueba

```bash
# Detener y eliminar volúmenes
docker-compose -f test/e2e/docker-compose.test.yml down -v
```

### Actualizar fixtures

Los fixtures están en `test/e2e/fixtures/`. Actualizar según sea necesario:

```typescript
// test/e2e/fixtures/users.ts
export const testUsers = {
  newUserType: {
    id: 'user_new_001',
    email: 'new@example.com',
    // ...
  },
};
```

### Agregar nuevos tests E2E

1. Crear archivo en `test/e2e/nuevo-flow.test.ts`
2. Importar setup y fixtures
3. Seguir patrón de tests existentes
4. Documentar en README de e2e

## CI/CD

Para ejecutar en CI/CD:

```yaml
# .github/workflows/e2e.yml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: postgres
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: guelaguetza_test
        ports:
          - 5433:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: pnpm install

      - name: Run migrations
        run: |
          cd backend
          DATABASE_URL="postgresql://postgres:postgres@localhost:5433/guelaguetza_test" npx prisma migrate deploy

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5433/guelaguetza_test
          JWT_SECRET: test-secret
```

## Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Fastify Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
- [Prisma Testing](https://www.prisma.io/docs/guides/testing)
- Tests E2E README: `test/e2e/README.md`
