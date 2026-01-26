# Guía Rápida: Tests de Integración

## Inicio Rápido (3 pasos)

```bash
# 1. Iniciar BD de test (requiere Docker)
npm run test:db:up

# 2. Aplicar migraciones
npm run test:db:reset

# 3. Ejecutar tests
npm run test:integration
```

## Scripts Disponibles

### Tests de Integración

```bash
# Todos los tests
npm run test:integration

# Watch mode
npm run test:integration:watch

# Con coverage
npm run test:integration:coverage

# Test específico
npm run test:integration:booking
npm run test:integration:marketplace
npm run test:integration:auth
```

### Base de Datos

```bash
# Iniciar BD de test
npm run test:db:up

# Detener BD de test
npm run test:db:down

# Resetear BD (limpia y aplica migraciones)
npm run test:db:reset
```

### Helper Script (Recomendado)

```bash
# Ejecutar todos los tests (con setup automático)
./scripts/run-integration-tests.sh

# Ejecutar test específico
./scripts/run-integration-tests.sh test/integration/booking.service.test.ts

# Con coverage
./scripts/run-integration-tests.sh -c

# Watch mode
./scripts/run-integration-tests.sh -w

# Resetear BD antes de ejecutar
./scripts/run-integration-tests.sh -r

# Solo configurar (no ejecutar tests)
./scripts/run-integration-tests.sh --setup

# Cleanup (detener BD)
./scripts/run-integration-tests.sh --cleanup
```

## Resumen de Tests

### BookingService (15 tests)
- Crear bookings con payment intent
- Validación de disponibilidad
- Concurrencia (5 bookings simultáneos)
- Prevención de overbooking
- Cancelación y confirmación
- Cleanup de bookings fallidos
- Búsqueda y filtros

### MarketplaceService (18 tests)
- Crear órdenes
- Órdenes multi-seller
- Validación de stock
- Concurrencia con stock limitado
- Carrito (agregar/remover)
- Cleanup de órdenes fallidas
- Búsqueda de productos

### AuthService (11 tests)
- Registro de usuarios
- Login
- Perfiles
- Actualización de datos

## Troubleshooting

### Docker no está corriendo
```bash
# Iniciar Docker Desktop
# Luego:
npm run test:db:up
```

### Tabla no existe
```bash
# Aplicar migraciones
npm run test:db:reset
```

### Tests fallan
```bash
# Resetear todo
npm run test:db:down
npm run test:db:up
npm run test:db:reset
npm run test:integration
```

## Estructura

```
test/integration/
├── setup-integration.ts           # Setup global
├── booking.service.test.ts        # 15 tests
├── marketplace.service.test.ts    # 18 tests
├── auth.service.test.ts           # 11 tests
└── README.md                       # Documentación completa
```

## Variables de Entorno

El archivo `.env.test` ya está configurado con valores por defecto:

```env
DATABASE_URL="postgresql://test_user:test_pass@localhost:5436/guelaguetza_test"
JWT_SECRET="test-jwt-secret-key"
NODE_ENV="test"
```

## Métricas

- **Total Tests**: 44
- **Total Lines**: 1,016
- **Coverage Target**: 85%+
- **Execution Time**: ~30s

## CI/CD

Los tests están listos para integrarse en CI/CD:

```yaml
# .github/workflows/test.yml
- name: Start test database
  run: npm run test:db:up

- name: Run integration tests
  run: npm run test:integration

- name: Upload coverage
  uses: codecov/codecov-action@v3
```

## Más Información

Ver documentación completa en:
- `test/integration/README.md`
- `INTEGRATION_TESTS_SUMMARY.md`
