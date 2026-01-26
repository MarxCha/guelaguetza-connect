# Comandos Útiles - Optimistic Locking

## 🚀 Aplicar en Producción

### 1. Verificar implementación
```bash
./check-optimistic-locking.sh
```

### 2. Ejecutar tests unitarios
```bash
npm test -- marketplace-optimistic-locking.test.ts
```

Resultado esperado:
```
✓ test/unit/marketplace-optimistic-locking.test.ts (15 tests)
Test Files  1 passed (1)
     Tests  15 passed (15)
```

### 3. Aplicar migración
```bash
npx prisma migrate deploy
```

### 4. Generar cliente Prisma actualizado
```bash
npx prisma generate
```

### 5. Reiniciar backend
```bash
npm run dev
# o en producción:
npm run build && npm start
```

## 🧪 Tests

### Ejecutar todos los tests de optimistic locking
```bash
npm test -- marketplace-optimistic-locking.test.ts
```

### Ejecutar tests de integración (requiere DB)
```bash
npm run test:integration -- marketplace.service.test.ts
```

### Ejecutar test específico
```bash
npm test -- marketplace-optimistic-locking.test.ts -t "should handle race condition"
```

### Ver cobertura de tests
```bash
npm test -- --coverage marketplace-optimistic-locking.test.ts
```

## 🔍 Verificación

### Ver campo version en schema
```bash
grep -A 2 "version" prisma/schema.prisma | grep -A 2 "model Product"
```

### Ver migración creada
```bash
cat prisma/migrations/20260125_add_version_to_products/migration.sql
```

### Ver funciones de optimistic locking
```bash
grep -n "export.*function" src/utils/optimistic-locking.ts
```

### Ver uso en marketplace service
```bash
grep -n "updateProductWithLocking" src/services/marketplace.service.ts
grep -n "withRetry" src/services/marketplace.service.ts
```

### Contar tests creados
```bash
grep -c "it(" test/unit/marketplace-optimistic-locking.test.ts
```

## 📊 Base de Datos

### Ver estado de migraciones
```bash
npx prisma migrate status
```

### Ver productos con versión (en psql)
```sql
SELECT id, name, stock, version
FROM "Product"
LIMIT 10;
```

### Ver productos con versión > 1 (actualizados)
```sql
SELECT id, name, stock, version
FROM "Product"
WHERE version > 1;
```

### Verificar índices
```sql
\d "Product"
```

## 📈 Métricas

### Ver todas las métricas
```bash
curl http://localhost:3005/metrics
```

### Ver solo métricas de concurrencia
```bash
curl http://localhost:3005/metrics | grep concurrency
```

### Ver métricas de órdenes
```bash
curl http://localhost:3005/metrics | grep order
```

### Ver duración de creación de órdenes
```bash
curl http://localhost:3005/metrics | grep order_creation_duration
```

## 🔧 Troubleshooting

### Si la migración falla
```bash
# Ver logs detallados
npx prisma migrate deploy --verbose

# Resetear migraciones (⚠️ SOLO EN DEV)
npx prisma migrate reset
```

### Si los tests fallan
```bash
# Limpiar caché
rm -rf node_modules/.vitest

# Reinstalar dependencias
npm install

# Ejecutar tests en modo verbose
npm test -- marketplace-optimistic-locking.test.ts --reporter=verbose
```

### Verificar que Prisma esté actualizado
```bash
npx prisma --version
npx prisma generate
```

### Ver logs del backend en tiempo real
```bash
npm run dev | grep -E "(Concurrency|Stock|Version)"
```

## 🧹 Limpieza

### Limpiar datos de prueba
```bash
# Conectar a DB de prueba
psql -U test_user -d guelaguetza_test

# Limpiar productos de prueba
DELETE FROM "Product" WHERE name LIKE '%Test%';
```

### Resetear versiones (⚠️ SOLO PARA TESTING)
```sql
UPDATE "Product" SET version = 1;
```

## 🎯 Comandos de Desarrollo

### Watch mode para tests
```bash
npm test -- marketplace-optimistic-locking.test.ts --watch
```

### Ejecutar tests con coverage
```bash
npm test -- marketplace-optimistic-locking.test.ts --coverage
```

### Ver archivos modificados en Git
```bash
git status
git diff src/services/marketplace.service.ts
git diff test/integration/marketplace.service.test.ts
```

### Hacer commit de cambios
```bash
git add prisma/migrations/20260125_add_version_to_products/
git add test/unit/marketplace-optimistic-locking.test.ts
git add test/integration/marketplace.service.test.ts
git add *.md
git commit -m "feat: implement optimistic locking for Product stock

- Add version field to Product model
- Create migration for optimistic locking
- Implement updateProductWithLocking and getProductWithVersion
- Add 15 unit tests for concurrency scenarios
- Update integration tests with concurrent orders
- Add comprehensive documentation

Fixes race conditions in stock management during concurrent orders"
```

## 📚 Documentación

### Leer documentación completa
```bash
cat PRODUCT_OPTIMISTIC_LOCKING_IMPLEMENTATION.md
```

### Leer resumen ejecutivo
```bash
cat OPTIMISTIC_LOCKING_SUMMARY.md
```

### Leer guía rápida
```bash
cat README_OPTIMISTIC_LOCKING.md
```

### Ver estructura de archivos
```bash
tree -L 3 -I node_modules
```

## 🔄 Rollback (Si es necesario)

### Hacer rollback de migración
```bash
# ⚠️ CUIDADO: Esto revierte la migración
npx prisma migrate resolve --rolled-back 20260125_add_version_to_products
```

### Remover campo version del schema (solo si es necesario)
```bash
# Editar manualmente prisma/schema.prisma y remover línea:
# version     Int             @default(1)

# Luego crear nueva migración:
npx prisma migrate dev --name remove_version_from_products
```

## ✅ Checklist de Verificación

```bash
# Ejecutar todos los checks
echo "1. Campo version en schema..."
grep -q "version.*Int.*@default(1)" prisma/schema.prisma && echo "✅" || echo "❌"

echo "2. Migración creada..."
[ -f "prisma/migrations/20260125_add_version_to_products/migration.sql" ] && echo "✅" || echo "❌"

echo "3. Funciones de optimistic locking..."
grep -q "updateProductWithLocking" src/utils/optimistic-locking.ts && echo "✅" || echo "❌"

echo "4. Uso en marketplace service..."
grep -q "updateProductWithLocking" src/services/marketplace.service.ts && echo "✅" || echo "❌"

echo "5. Tests unitarios..."
[ -f "test/unit/marketplace-optimistic-locking.test.ts" ] && echo "✅" || echo "❌"

echo "6. Tests pasando..."
npm test -- marketplace-optimistic-locking.test.ts --run > /dev/null 2>&1 && echo "✅" || echo "❌"
```

## 🎉 Quick Start

Para aplicar todo de una vez:

```bash
# 1. Verificar
./check-optimistic-locking.sh

# 2. Tests
npm test -- marketplace-optimistic-locking.test.ts

# 3. Migrar
npx prisma migrate deploy

# 4. Reiniciar
npm run dev
```

---

**Nota:** Todos estos comandos asumen que estás en el directorio `backend/`.
