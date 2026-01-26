# Quick Start - Tests de Integración

## Setup Inicial (Primera Vez)

```bash
# 1. Levantar base de datos
npm run test:db:up

# 2. Esperar healthcheck (5 segundos)
sleep 5

# 3. Aplicar migraciones
npx dotenv-cli -e .env.test -- npx prisma migrate deploy

# 4. Seed inicial
npx dotenv-cli -e .env.test -- tsx prisma/seed.ts
npx dotenv-cli -e .env.test -- tsx prisma/seed-badges.ts

# 5. Ejecutar tests
npm run test:integration
```

## Uso Diario

```bash
# Ejecutar tests (BD ya corriendo)
npm run test:integration
```

## Comandos Útiles

```bash
# Reset completo de BD
npm run test:db:reset

# Bajar BD de test
npm run test:db:down

# Ver estado del contenedor
docker ps | grep guelaguetza-test-db

# Ver logs de PostgreSQL
docker logs guelaguetza-test-db

# Acceder a la BD con psql
docker exec -it guelaguetza-test-db psql -U test_user -d guelaguetza_test

# Verificar migraciones
npx dotenv-cli -e .env.test -- npx prisma migrate status
```

## Estructura de Test de Integración

```typescript
// test/integration/mi-feature.test.ts
import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { PrismaClient } from '@prisma/client';

describe('Mi Feature', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    prisma = new PrismaClient();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar BD (orden importante: dependencias primero)
    await prisma.myModel.deleteMany({});
    await prisma.user.deleteMany({});
  });

  it('should do something', async () => {
    // Crear datos de test
    const user = await prisma.user.create({
      data: { email: 'test@test.com', password: 'hash', nombre: 'Test' }
    });

    // Ejecutar request
    const response = await app.inject({
      method: 'POST',
      url: '/api/my-endpoint',
      payload: { /* data */ }
    });

    // Aserciones
    expect(response.statusCode).toBe(200);
    
    // Verificar en BD
    const result = await prisma.myModel.findFirst();
    expect(result).toBeTruthy();
  });
});
```

## Troubleshooting Rápido

### Puerto en uso
```bash
lsof -i :5436
npm run test:db:down
```

### BD corrupta
```bash
docker-compose -f docker-compose.test.yml down -v
npm run test:db:up
# Re-ejecutar setup inicial
```

### Tests fallan
```bash
npm run test:db:reset
npm run test:integration
```

## Archivos Clave

- `docker-compose.test.yml` - Config de PostgreSQL
- `.env.test` - Variables de ambiente
- `vitest.config.integration.ts` - Config de Vitest
- `test/integration/` - Tests de integración
- `scripts/reset-test-db.ts` - Script de reset

## Links Útiles

- [TEST_DATABASE.md](./TEST_DATABASE.md) - Guía detallada
- [README_TEST_DB.md](./README_TEST_DB.md) - Documentación completa
- [SETUP_SUMMARY.md](./SETUP_SUMMARY.md) - Resumen del setup
