# Base de Datos de Prueba - PostgreSQL con Docker

Esta guía explica cómo usar la base de datos PostgreSQL de prueba aislada para ejecutar tests de integración.

## Configuración

### Base de Datos de Prueba
- **Puerto**: 5434 (diferente al de desarrollo: 5433)
- **Base de datos**: guelaguetza_test
- **Usuario**: test_user
- **Password**: test_pass
- **Connection String**: `postgresql://test_user:test_pass@localhost:5434/guelaguetza_test?schema=public`

### Archivos de Configuración
- `docker-compose.test.yml` - Configuración de Docker para la BD de test
- `.env.test` - Variables de entorno para tests
- `scripts/reset-test-db.ts` - Script para resetear la BD de test
- `scripts/reset-test-db.sh` - Script bash alternativo para resetear

## Scripts Disponibles

### 1. Levantar Base de Datos de Test
```bash
npm run test:db:up
```
Inicia el contenedor de PostgreSQL para tests en el puerto 5434.

### 2. Bajar Base de Datos de Test
```bash
npm run test:db:down
```
Detiene y elimina el contenedor de prueba.

### 3. Resetear Base de Datos de Test
```bash
npm run test:db:reset
```
- Elimina todos los datos
- Aplica migraciones
- Ejecuta seed con datos de prueba

### 4. Ejecutar Tests de Integración
```bash
npm run test:integration
```
Ejecuta todos los tests de integración usando la BD de test.

## Workflow Típico

### Primera vez
```bash
# 1. Levantar DB de test
npm run test:db:up

# 2. Esperar a que la DB esté lista (healthcheck)
sleep 5

# 3. Resetear y migrar
npm run test:db:reset

# 4. Ejecutar tests
npm run test:integration
```

### Uso diario
```bash
# Si la DB ya está corriendo, solo ejecuta:
npm run test:integration

# Si necesitas datos limpios:
npm run test:db:reset && npm run test:integration
```

### Al terminar
```bash
# Bajar la DB de test
npm run test:db:down
```

## Tipos de Tests

### Tests Unitarios (mocks)
- Ubicación: `src/**/*.test.ts`
- Usan Vitest con mocks de Prisma
- No requieren BD real
- Ejecución: `npm test`

### Tests de Integración (BD real)
- Ubicación: `test/integration/**/*.test.ts`
- Usan base de datos PostgreSQL real
- Requieren `npm run test:db:up`
- Ejecución: `npm run test:integration`

## Limpieza de Datos entre Tests

Los tests de integración usan `beforeEach` para limpiar datos:

```typescript
beforeEach(async () => {
  // Orden importante: limpiar en orden inverso a las relaciones
  await prisma.like.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.story.deleteMany({});
  await prisma.user.deleteMany({});
});
```

## Troubleshooting

### Puerto 5434 ya está en uso
```bash
# Ver qué proceso usa el puerto
lsof -i :5434

# Matar el proceso o usar docker-compose down
npm run test:db:down
```

### Migraciones desactualizadas
```bash
# Resetear completamente la BD de test
npm run test:db:reset
```

### Errores de conexión
```bash
# Verificar que el contenedor está corriendo
docker ps | grep guelaguetza-test-db

# Ver logs del contenedor
docker logs guelaguetza-test-db

# Reiniciar contenedor
npm run test:db:down && npm run test:db:up
```

### Datos persistentes entre ejecuciones
La base de datos de test usa un volumen Docker (`postgres_test_data`). Para limpieza completa:

```bash
# Bajar contenedor y eliminar volumen
docker-compose -f docker-compose.test.yml down -v
```

## CI/CD

Para integración continua, agrega estos pasos:

```yaml
# Ejemplo: GitHub Actions
- name: Start test database
  run: npm run test:db:up

- name: Wait for database
  run: sleep 10

- name: Setup test database
  run: npm run test:db:reset

- name: Run integration tests
  run: npm run test:integration

- name: Stop test database
  run: npm run test:db:down
```

## Variables de Entorno

Los tests de integración usan `.env.test` automáticamente gracias a `dotenv-cli`:

```bash
# Ejecutar con variables de test
dotenv -e .env.test -- npx vitest run
```

## Best Practices

1. **Nunca usar la DB de desarrollo para tests**
   - Los tests truncan tablas y pueden corromper datos

2. **Limpiar datos entre tests**
   - Usar `beforeEach` para garantizar aislamiento

3. **Tests idempotentes**
   - Cada test debe poder ejecutarse independientemente

4. **Seeds mínimos**
   - Solo crear datos necesarios para el test específico

5. **Transacciones para rollback (avanzado)**
   - Considerar usar transacciones para rollback automático
