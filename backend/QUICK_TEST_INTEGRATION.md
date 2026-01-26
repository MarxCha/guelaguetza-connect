# Quick Start: Integration Tests

## Ejecutar Tests en 3 Pasos

### 1️⃣ Iniciar Docker Desktop
Asegúrate de que Docker Desktop esté corriendo.

### 2️⃣ Ejecutar Script Automatizado
```bash
cd backend
./scripts/run-integration-tests.sh
```

Esto hará:
- ✅ Iniciar base de datos de prueba (si no está corriendo)
- ✅ Esperar a que esté lista
- ✅ Resetear schema y datos
- ✅ Ejecutar todos los tests de integración
- ✅ Generar reporte de cobertura

### 3️⃣ Ver Reporte de Cobertura
```bash
open coverage/index.html
```

---

## Comandos Individuales

### Iniciar BD de Prueba
```bash
npm run test:db:up
```

### Resetear BD
```bash
npm run test:db:reset
```

### Ejecutar Tests

```bash
# Todos los tests de integración con cobertura
npm run test:integration:coverage

# Tests específicos
npm run test:integration:booking
npm run test:integration:marketplace
npm run test:integration:auth

# Watch mode (útil durante desarrollo)
npm run test:integration:watch
```

### Detener BD de Prueba
```bash
npm run test:db:down
```

---

## Estructura de Tests

```
test/integration/
├── setup-integration.ts          # Setup global (limpia BD antes de cada test)
├── booking.service.test.ts       # 28 tests (Bookings + Concurrencia)
├── marketplace.service.test.ts   # 24 tests (Órdenes + Stock)
└── auth.service.test.ts          # 16 tests (Auth + Usuarios baneados)

Total: 68 tests de integración
```

---

## Objetivo de Cobertura

| Métrica | Target |
|---------|--------|
| Statements | 85% |
| Branches | 80% |
| Functions | 85% |
| Lines | 85% |

---

## Casos de Prueba Destacados

### Concurrencia
- ✅ 5 bookings simultáneos al mismo slot
- ✅ Órdenes concurrentes con stock limitado
- ✅ Retry en conflictos de versión

### Integridad
- ✅ Prevención de overbooking
- ✅ Prevención de overselling
- ✅ Cleanup de transacciones fallidas

### Seguridad
- ✅ Usuarios baneados no pueden login
- ✅ Validación de permisos
- ✅ Email case-insensitive

### Payments
- ✅ Payment intents en bookings
- ✅ Refunds en cancelaciones
- ✅ Confirmación post-webhook

---

## Troubleshooting

### Error: "Cannot connect to Docker daemon"
```bash
# Asegúrate de que Docker Desktop esté corriendo
open -a Docker
```

### Error: "Database connection failed"
```bash
# Reinicia el contenedor
npm run test:db:down
npm run test:db:up
```

### Tests lentos o colgados
```bash
# Aumenta el timeout en vitest.config.integration.ts
testTimeout: 60000  # 60 segundos
```

### Limpiar todo y empezar de cero
```bash
npm run test:db:down
docker volume rm $(docker volume ls -q | grep postgres_test)
npm run test:db:up
npm run test:db:reset
```

---

## Ver Logs de Tests

```bash
# Ejecutar con verbose
npm run test:integration -- --reporter=verbose

# Ver solo tests fallidos
npm run test:integration -- --reporter=verbose --run
```

---

## CI/CD

Para ejecutar en pipeline:

```yaml
# .github/workflows/test.yml
- name: Start Test DB
  run: docker-compose -f docker-compose.test.yml up -d

- name: Wait for DB
  run: |
    until docker exec guelaguetza-test-db pg_isready; do
      sleep 1
    done

- name: Run Integration Tests
  run: npm run test:integration:coverage

- name: Upload Coverage
  uses: codecov/codecov-action@v3
```

---

## Siguiente Nivel: 100% Coverage

Para alcanzar 100% de cobertura, implementar tests para:

1. **EventService** (RSVPs, Reminders)
2. **GamificationService** (Badges, Stats)
3. **StoryService** (Upload, Expiración)
4. **WebSocket** (Notificaciones, Mensajes)

Ver: `INTEGRATION_TESTS_COVERAGE_REPORT.md` para detalles completos.
