# Base de Datos de Prueba PostgreSQL - Configuración Completa

Este documento describe la configuración de la base de datos PostgreSQL de prueba para ejecutar tests de integración en Guelaguetza Connect Backend.

## Resumen de Configuración

### Archivos Creados

1. **`docker-compose.test.yml`** - Contenedor PostgreSQL aislado para tests
2. **`.env.test`** - Variables de entorno para tests
3. **`scripts/reset-test-db.ts`** - Script TypeScript para resetear BD
4. **`scripts/reset-test-db.sh`** - Script Bash alternativo para resetear BD
5. **`test/integration/auth.integration.test.ts`** - Test de integración de ejemplo
6. **`vitest.config.integration.ts`** - Configuración de Vitest para tests de integración
7. **`TEST_DATABASE.md`** - Documentación detallada

### Configuración de Base de Datos

- **Puerto**: 5436 (diferente al desarrollo: 5433)
- **Base de datos**: guelaguetza_test
- **Usuario**: test_user
- **Password**: test_pass
- **Contenedor**: guelaguetza-test-db
- **Imagen**: postgres:16-alpine

### Scripts NPM Añadidos

```json
{
  "test:db:up": "docker-compose -f docker-compose.test.yml up -d",
  "test:db:down": "docker-compose -f docker-compose.test.yml down",
  "test:db:reset": "npx dotenv-cli -e .env.test -- tsx scripts/reset-test-db.ts",
  "test:integration": "npx dotenv-cli -e .env.test -- vitest run --config vitest.config.integration.ts"
}
```

## Inicio Rápido

### 1. Primera Vez (Setup Completo)

```bash
# 1. Levantar base de datos de test
npm run test:db:up

# 2. Esperar a que esté lista (healthcheck automático)
sleep 5

# 3. Aplicar migraciones y seed
npx dotenv-cli -e .env.test -- npx prisma migrate deploy
npx dotenv-cli -e .env.test -- tsx prisma/seed.ts
npx dotenv-cli -e .env.test -- tsx prisma/seed-badges.ts

# 4. Ejecutar tests de integración
npm run test:integration
```

### 2. Uso Diario

```bash
# Si la DB ya está corriendo, solo ejecuta:
npm run test:integration

# Si necesitas datos limpios:
npm run test:db:reset && npm run test:integration
```

### 3. Detener Base de Datos

```bash
npm run test:db:down
```

## Verificación del Sistema

### Estado Actual

```bash
$ docker ps | grep guelaguetza-test-db
# Debe mostrar contenedor corriendo en puerto 5436 con estado "healthy"

$ npm run test:integration
# Debe ejecutar 9 tests exitosamente
```

### Tests de Integración Incluidos

**Archivo**: `test/integration/auth.integration.test.ts`

- ✓ POST /api/auth/register - Registro de nuevo usuario
- ✓ POST /api/auth/register - Validación de email duplicado
- ✓ POST /api/auth/register - Validación de contraseña débil
- ✓ POST /api/auth/login - Login con credenciales correctas
- ✓ POST /api/auth/login - Rechazo de contraseña inválida
- ✓ POST /api/auth/login - Rechazo de usuario no existente
- ✓ GET /api/auth/me - Obtener perfil con token válido
- ✓ GET /api/auth/me - Rechazo sin token
- ✓ GET /api/auth/me - Rechazo con token inválido

**Resultado**: 9/9 tests pasando

## Estructura de Tests de Integración

```typescript
describe('Auth Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Inicializar app con DB real
    prisma = new PrismaClient();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar TODAS las tablas en orden correcto
    await prisma.activityLog.deleteMany({});
    // ... más tablas ...
    await prisma.user.deleteMany({});
  });

  it('should test something', async () => {
    // Test con DB real
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/register',
      payload: { /* data */ }
    });
    expect(response.statusCode).toBe(201);
  });
});
```

## Diferencias: Tests Unitarios vs Integración

### Tests Unitarios (mocks)
- Ubicación: `src/**/*.test.ts`
- Usa mocks de Prisma definidos en `test/setup.ts`
- No requiere BD real
- Rápidos (~ms)
- Comando: `npm test`

### Tests de Integración (BD real)
- Ubicación: `test/integration/**/*.test.ts`
- Usa PostgreSQL real en Docker
- Requiere `npm run test:db:up`
- Más lentos (~segundos)
- Comando: `npm run test:integration`

## Dependencias Instaladas

```json
{
  "devDependencies": {
    "dotenv-cli": "^8.0.0"
  }
}
```

## Archivos de Configuración

### docker-compose.test.yml
```yaml
services:
  postgres-test:
    image: postgres:16-alpine
    container_name: guelaguetza-test-db
    ports:
      - "5436:5432"
    environment:
      POSTGRES_USER: test_user
      POSTGRES_PASSWORD: test_pass
      POSTGRES_DB: guelaguetza_test
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U test_user -d guelaguetza_test"]
      interval: 5s
      timeout: 5s
      retries: 5
```

### .env.test
```bash
DATABASE_URL="postgresql://test_user:test_pass@localhost:5436/guelaguetza_test?schema=public"
JWT_SECRET="test-jwt-secret-key"
PORT=3006
NODE_ENV="test"
# VAPID keys vacíos para evitar inicialización de web-push en tests
VAPID_PUBLIC_KEY=""
VAPID_PRIVATE_KEY=""
```

### vitest.config.integration.ts
```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: [], // NO usar setup.ts (tiene mocks)
    include: ['test/integration/**/*.test.ts'],
    testTimeout: 30000,
    pool: 'forks',
    singleFork: true, // Tests secuenciales para evitar race conditions
  },
});
```

## Troubleshooting

### Puerto 5436 ya en uso
```bash
# Ver qué lo está usando
lsof -i :5436

# Bajar contenedor existente
npm run test:db:down
```

### Tests fallan por datos residuales
```bash
# Resetear completamente la BD
npm run test:db:reset
```

### Error de migraciones
```bash
# Aplicar migraciones manualmente
npx dotenv-cli -e .env.test -- npx prisma migrate deploy
```

### Limpiar volumen Docker completamente
```bash
# Eliminar contenedor Y volumen
docker-compose -f docker-compose.test.yml down -v
```

## CI/CD Example (GitHub Actions)

```yaml
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
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Start test database
        run: npm run test:db:up
      
      - name: Wait for database
        run: sleep 10
      
      - name: Run migrations
        run: npx dotenv-cli -e .env.test -- npx prisma migrate deploy
      
      - name: Seed database
        run: |
          npx dotenv-cli -e .env.test -- tsx prisma/seed.ts
          npx dotenv-cli -e .env.test -- tsx prisma/seed-badges.ts
      
      - name: Run integration tests
        run: npm run test:integration
      
      - name: Stop test database
        if: always()
        run: npm run test:db:down
```

## Próximos Pasos

1. **Añadir más tests de integración**:
   - Stories CRUD
   - Social features (follow/unfollow)
   - Gamification (badges, XP)
   - Events RSVP
   - Marketplace

2. **Optimizar limpieza de BD**:
   - Considerar usar transacciones con rollback
   - Implementar helper para truncar todas las tablas

3. **Tests E2E**:
   - Configurar Playwright o Cypress
   - Tests de flujos completos de usuario

4. **Performance tests**:
   - Load testing con k6
   - Stress testing de endpoints

## Recursos

- [Vitest Documentation](https://vitest.dev/)
- [Prisma Testing Guide](https://www.prisma.io/docs/guides/testing)
- [Fastify Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
- [Docker Compose for Testing](https://docs.docker.com/compose/)

## Notas Importantes

- **NO** commitear `.env.test` en el repositorio (ya está en `.gitignore`)
- **NO** usar la BD de desarrollo para tests
- **SIEMPRE** limpiar datos entre tests con `beforeEach`
- **EJECUTAR** tests de integración de forma secuencial (`singleFork: true`)
- **VERIFICAR** que el puerto 5436 no esté en uso antes de levantar la BD

## Estado Final

✅ Base de datos PostgreSQL de prueba configurada
✅ Docker Compose para tests configurado
✅ Scripts NPM para manejo de BD de test
✅ Tests de integración funcionando (9/9 pasando)
✅ Configuración de Vitest separada para integración
✅ Documentación completa

**Todos los sistemas operacionales y listos para desarrollo de tests de integración.**
