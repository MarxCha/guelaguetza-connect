# Quick Start - Tests E2E

Guía rápida para ejecutar los tests E2E en 5 minutos.

## 1. Setup (Primera vez solamente)

```bash
# Opción A: Script automático (Recomendado)
./test/e2e/setup-test-db.sh

# Opción B: Manual
cp .env.test.example .env.test
docker-compose -f test/e2e/docker-compose.test.yml up -d
cd backend && DATABASE_URL="postgresql://postgres:postgres@localhost:5433/guelaguetza_test" npx prisma migrate deploy && cd ..
```

## 2. Ejecutar Tests

```bash
# Todos los tests E2E
pnpm test:e2e

# Solo un flujo específico
pnpm test:e2e booking      # Flujo de reservaciones
pnpm test:e2e marketplace  # Flujo de compras
pnpm test:e2e admin        # Flujo de administración
pnpm test:e2e health       # Health checks
```

## 3. Resultados Esperados

```
✓ test/e2e/health.test.ts (9 tests) 234ms
✓ test/e2e/booking-flow.test.ts (6 tests) 1.2s
✓ test/e2e/marketplace-flow.test.ts (7 tests) 1.5s
✓ test/e2e/admin-flow.test.ts (11 tests) 987ms

Test Files  4 passed (4)
Tests  33 passed (33)
Duration  3.92s
```

## Troubleshooting

### Error: Cannot connect to database
```bash
docker-compose -f test/e2e/docker-compose.test.yml up -d
```

### Error: Table does not exist
```bash
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/guelaguetza_test" npx prisma migrate deploy
cd ..
```

### Reset completo
```bash
docker-compose -f test/e2e/docker-compose.test.yml down -v
./test/e2e/setup-test-db.sh
```

## Flujos Disponibles

### 1. Booking Flow
Usuario reserva una experiencia (clase de cocina, tour, etc.)
```bash
pnpm test:e2e booking
```

### 2. Marketplace Flow
Usuario compra productos (artesanías, mezcal, etc.)
```bash
pnpm test:e2e marketplace
```

### 3. Admin Flow
Administrador gestiona usuarios (banear, cambiar roles, etc.)
```bash
pnpm test:e2e admin
```

## Usuarios de Prueba

Todos usan password: `password123`

| Email | Rol | Propósito |
|-------|-----|-----------|
| user@example.com | USER | Compras y reservas |
| host@example.com | USER | Crear experiencias |
| seller@example.com | USER | Vender productos |
| admin@example.com | ADMIN | Administración |

## Comandos Útiles

```bash
# Modo watch (auto-rerun al guardar)
pnpm test:e2e:watch

# Con UI interactiva
pnpm test:e2e:ui

# Con coverage
pnpm test:e2e:coverage

# Test específico por nombre
pnpm test:e2e "Usuario puede completar el flujo de reservación"
```

## Más Información

- **Guía completa:** `E2E_TESTING_GUIDE.md`
- **Resumen técnico:** `E2E_TESTS_SUMMARY.md`
- **README detallado:** `test/e2e/README.md`
