# Arquitectura de Tests E2E

Diagrama de la arquitectura de tests end-to-end.

## Flujo de Ejecución

```
┌─────────────────────────────────────────────────────────────────┐
│                    Ejecutar Tests E2E                            │
│                  pnpm test:e2e                                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  vitest.config.e2e.ts                            │
│  • Environment: node                                             │
│  • Setup: test/e2e/setup.ts                                      │
│  • Timeout: 30s                                                  │
│  • Pool: single thread                                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    test/e2e/setup.ts                             │
│  beforeAll:                                                      │
│    • buildApp() → Fastify instance                               │
│    • PrismaClient → Database connection                          │
│  beforeEach:                                                     │
│    • cleanupDatabase() → Limpia datos de tests anteriores       │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   health     │    │   booking    │    │  marketplace │
│   .test.ts   │    │   -flow      │    │   -flow      │
│              │    │   .test.ts   │    │   .test.ts   │
│  9 tests     │    │  6 tests     │    │  7 tests     │
└──────────────┘    └──────────────┘    └──────────────┘
                              │
                              ▼
                    ┌──────────────┐
                    │    admin     │
                    │   -flow      │
                    │   .test.ts   │
                    │  11 tests    │
                    └──────────────┘
```

## Estructura de un Test E2E

```
┌─────────────────────────────────────────────────────────────────┐
│  describe('E2E: Flujo de Usuario')                               │
│                                                                   │
│  beforeEach:                                                      │
│    • Seed datos de prueba (fixtures)                             │
│    • Crear usuarios, productos, experiencias                     │
│                                                                   │
│  it('Usuario puede completar flujo'):                            │
│    │                                                              │
│    ├─ 1. Login                                                   │
│    │    app.inject({ POST /api/auth/login })                     │
│    │    → Obtener token JWT                                      │
│    │                                                              │
│    ├─ 2. Acción principal                                        │
│    │    app.inject({ GET/POST con token })                       │
│    │    → Verificar respuesta HTTP                               │
│    │                                                              │
│    ├─ 3. Verificación en BD                                      │
│    │    prisma.model.findUnique()                                │
│    │    → Verificar estado de datos                              │
│    │                                                              │
│    └─ 4. Assertions                                              │
│         expect(statusCode).toBe(200)                             │
│         expect(body).toHaveProperty('id')                        │
│                                                                   │
│  afterEach (automático):                                         │
│    • cleanupDatabase() limpia todos los datos                    │
└─────────────────────────────────────────────────────────────────┘
```

## Componentes de la Arquitectura

### 1. Configuración

```
vitest.config.e2e.ts
    ↓ configura
Vitest Runner
    ↓ ejecuta
test/e2e/setup.ts
    ↓ levanta
[Fastify App] + [PostgreSQL Test DB]
```

### 2. Fixtures (Datos de Prueba)

```
test/e2e/fixtures/
    ├── users.ts        → 5 usuarios (regular, host, seller, admin, banned)
    ├── experiences.ts  → 3 experiencias + horarios
    └── products.ts     → 5 productos + perfil vendedor
```

### 3. Tests

```
test/e2e/
    ├── health.test.ts          → Verificación de setup
    ├── booking-flow.test.ts    → Reservar experiencia
    ├── marketplace-flow.test.ts → Comprar productos
    └── admin-flow.test.ts      → Gestión de usuarios
```

### 4. Helpers

```
test/e2e/
    ├── setup.ts    → getTestApp(), getTestPrisma(), generateAuthToken()
    └── utils.ts    → login(), authenticatedGet(), cleanupDatabase(), etc.
```

## Flujo de un Test Booking

```
┌──────────────────────────────────────────────────────────────────┐
│  Usuario quiere reservar una experiencia                          │
└──────────────────────────────────────────────────────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ beforeEach: Seed datos               │
    │  • Crear usuario (regularUser)       │
    │  • Crear host (hostUser)             │
    │  • Crear experiencia (cookingClass)  │
    │  • Crear time slot disponible        │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ PASO 1: Login                        │
    │  POST /api/auth/login                │
    │  → token JWT                         │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ PASO 2: Listar experiencias          │
    │  GET /api/bookings/experiences       │
    │  → Array de experiencias             │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ PASO 3: Buscar por categoría         │
    │  GET /api/.../experiences?cat=CLASE  │
    │  → Filtradas                         │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ PASO 4: Ver detalle                  │
    │  GET /api/.../experiences/:id        │
    │  → Detalles completos                │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ PASO 5: Ver horarios                 │
    │  GET /api/.../experiences/:id/slots  │
    │  → Time slots disponibles            │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ PASO 6: Crear booking                │
    │  POST /api/bookings/bookings         │
    │  Headers: Authorization              │
    │  Body: { experienceId, timeSlotId }  │
    │  → Booking creado (201)              │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ PASO 7: Verificar en "Mis Reservas"  │
    │  GET /api/bookings/bookings          │
    │  → Array con mi booking              │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ PASO 8: Ver detalle del booking      │
    │  GET /api/bookings/bookings/:id      │
    │  → Detalles completos                │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ Verificaciones:                      │
    │  • HTTP responses correctos          │
    │  • Datos en BD correctos             │
    │  • Relaciones intactas               │
    └──────────────────┬──────────────────┘
                       │
    ┌──────────────────┴──────────────────┐
    │ afterEach: Cleanup automático        │
    │  • Eliminar bookings                 │
    │  • Eliminar time slots               │
    │  • Eliminar experiencias             │
    │  • Eliminar usuarios                 │
    └──────────────────────────────────────┘
```

## Flujo de Datos

```
┌─────────────┐
│  Test File  │
└──────┬──────┘
       │
       │ getTestApp()
       ▼
┌─────────────┐       inject()        ┌──────────────┐
│  Fastify    │ ─────────────────────→ │   Routes     │
│  Instance   │                        │  /api/...    │
└──────┬──────┘                        └──────┬───────┘
       │                                      │
       │ getTestPrisma()                      │
       ▼                                      ▼
┌─────────────┐                        ┌──────────────┐
│  Prisma     │                        │   Services   │
│  Client     │ ←────────────────────  │  booking,    │
└──────┬──────┘       query            │  marketplace │
       │                                └──────────────┘
       │
       ▼
┌─────────────┐
│ PostgreSQL  │
│   Test DB   │
│  (port 5433)│
└─────────────┘
```

## Stack Tecnológico

```
┌───────────────────────────────────────────┐
│           Test Framework: Vitest           │
├───────────────────────────────────────────┤
│       HTTP Server: Fastify 5.x             │
├───────────────────────────────────────────┤
│       Database ORM: Prisma 6.x             │
├───────────────────────────────────────────┤
│     Database: PostgreSQL 15 (Docker)       │
├───────────────────────────────────────────┤
│      Auth: JWT (@fastify/jwt)              │
├───────────────────────────────────────────┤
│    Validation: Zod + TypeProvider          │
└───────────────────────────────────────────┘
```

## Ciclo de Vida de un Test

```
1. beforeAll (una vez)
   ├─ Crear app de Fastify
   ├─ Conectar a PostgreSQL
   └─ Preparar JWT

2. beforeEach (antes de cada test)
   ├─ Limpiar BD completa
   └─ Seed datos específicos del test

3. Test
   ├─ Ejecutar HTTP requests
   ├─ Verificar respuestas
   └─ Verificar estado de BD

4. afterEach (después de cada test)
   └─ Cleanup automático (ya hecho en beforeEach)

5. afterAll (una vez al final)
   ├─ Cerrar Fastify
   └─ Desconectar PostgreSQL
```

## Patterns Utilizados

### 1. AAA Pattern (Arrange-Act-Assert)

```typescript
it('test', async () => {
  // Arrange: Preparar datos
  const user = await prisma.user.create({...});

  // Act: Ejecutar acción
  const response = await app.inject({...});

  // Assert: Verificar resultado
  expect(response.statusCode).toBe(200);
});
```

### 2. Given-When-Then (BDD style)

```typescript
it('test', async () => {
  // Given: Usuario autenticado
  const token = await login(email, password);

  // When: Crea un booking
  const response = await createBooking(token, data);

  // Then: Booking existe en BD
  const booking = await prisma.booking.findUnique({...});
  expect(booking).toBeDefined();
});
```

### 3. Test Fixtures Pattern

```typescript
// Centralizar datos de prueba
import { testUsers } from './fixtures/users.js';

beforeEach(async () => {
  await prisma.user.create({
    data: testUsers.regularUser
  });
});
```

### 4. Helper Functions Pattern

```typescript
// Encapsular operaciones comunes
async function login(email, password) {
  const response = await app.inject({...});
  return extractToken(response);
}
```

## Ventajas de esta Arquitectura

✅ **Aislamiento**: Cada test es independiente
✅ **Realismo**: Usa servidor y BD reales
✅ **Mantenibilidad**: Fixtures y helpers reutilizables
✅ **Velocidad**: Cleanup rápido, tests en serie
✅ **Confiabilidad**: No hay mocks, prueba integraciones reales
✅ **Debugging**: Fácil inspeccionar BD y logs
✅ **CI/CD Ready**: Fácil de ejecutar en pipelines

## Comparación con Otros Enfoques

| Aspecto | E2E (Actual) | Tests Unitarios | Tests de Integración |
|---------|--------------|-----------------|---------------------|
| Scope | Flujo completo | Función aislada | Módulo con deps |
| BD Real | ✅ Sí | ❌ Mock | ✅ Sí |
| Servidor | ✅ Sí | ❌ No | ⚠️  A veces |
| Velocidad | 🐌 ~4s | 🚀 ~200ms | ⚡ ~1s |
| Confianza | 🟢 Alta | 🟡 Media | 🟢 Alta |
| Debugging | 🟢 Fácil | 🟢 Fácil | 🟡 Medio |

## Métricas de Rendimiento

```
┌────────────────────────────────────────────┐
│  Tiempo de ejecución:                       │
│  • health.test.ts:      234ms (9 tests)     │
│  • booking-flow:        1.2s  (6 tests)     │
│  • marketplace-flow:    1.5s  (7 tests)     │
│  • admin-flow:          987ms (11 tests)    │
│  ─────────────────────────────────────────  │
│  TOTAL:                 ~4s   (33 tests)    │
└────────────────────────────────────────────┘
```

## Escalabilidad

Agregar nuevo flujo E2E:

```
1. Crear archivo: test/e2e/nuevo-flow.test.ts
2. Importar setup y fixtures
3. Escribir tests siguiendo pattern existente
4. Ejecutar: pnpm test:e2e nuevo
```

No requiere cambios en:
- Configuración de Vitest
- Setup de BD
- Fixtures existentes
- CI/CD pipeline

## Referencias

- **Setup principal:** `test/e2e/setup.ts`
- **Config Vitest:** `vitest.config.e2e.ts`
- **Fixtures:** `test/e2e/fixtures/`
- **Helpers:** `test/e2e/utils.ts`
