#!/bin/bash

echo "======================================"
echo "  Verificación de Optimistic Locking"
echo "======================================"
echo ""

echo "✓ 1. Verificando campo 'version' en schema.prisma..."
if grep -q "version.*Int.*@default(1)" prisma/schema.prisma; then
  echo "   ✅ Campo 'version' encontrado en schema"
else
  echo "   ❌ Campo 'version' NO encontrado"
fi
echo ""

echo "✓ 2. Verificando migración..."
if [ -f "prisma/migrations/20260125_add_version_to_products/migration.sql" ]; then
  echo "   ✅ Migración creada"
  cat prisma/migrations/20260125_add_version_to_products/migration.sql
else
  echo "   ❌ Migración NO encontrada"
fi
echo ""

echo "✓ 3. Verificando funciones en optimistic-locking.ts..."
if grep -q "updateProductWithLocking" src/utils/optimistic-locking.ts; then
  echo "   ✅ updateProductWithLocking() existe"
else
  echo "   ❌ updateProductWithLocking() NO existe"
fi

if grep -q "getProductWithVersion" src/utils/optimistic-locking.ts; then
  echo "   ✅ getProductWithVersion() existe"
else
  echo "   ❌ getProductWithVersion() NO existe"
fi

if grep -q "withRetry" src/utils/optimistic-locking.ts; then
  echo "   ✅ withRetry() existe"
else
  echo "   ❌ withRetry() NO existe"
fi
echo ""

echo "✓ 4. Verificando uso en marketplace.service.ts..."
if grep -q "updateProductWithLocking" src/services/marketplace.service.ts; then
  echo "   ✅ createOrder() usa optimistic locking"
else
  echo "   ❌ createOrder() NO usa optimistic locking"
fi

if grep -q "withRetry" src/services/marketplace.service.ts; then
  echo "   ✅ withRetry() implementado"
else
  echo "   ❌ withRetry() NO implementado"
fi
echo ""

echo "✓ 5. Verificando tests unitarios..."
if [ -f "test/unit/marketplace-optimistic-locking.test.ts" ]; then
  echo "   ✅ Tests unitarios creados"
  TESTS=$(grep -c "it(" test/unit/marketplace-optimistic-locking.test.ts)
  echo "   📊 Total de tests: $TESTS"
else
  echo "   ❌ Tests unitarios NO encontrados"
fi
echo ""

echo "✓ 6. Verificando tests de integración..."
if grep -q "should handle concurrent orders for limited stock with optimistic locking" test/integration/marketplace.service.test.ts; then
  echo "   ✅ Tests de concurrencia actualizados"
else
  echo "   ❌ Tests de concurrencia NO actualizados"
fi
echo ""

echo "======================================"
echo "  Resumen de Implementación"
echo "======================================"
echo ""
echo "Archivos creados/modificados:"
echo "  - prisma/migrations/20260125_add_version_to_products/migration.sql"
echo "  - test/unit/marketplace-optimistic-locking.test.ts"
echo "  - test/integration/marketplace.service.test.ts (actualizado)"
echo "  - PRODUCT_OPTIMISTIC_LOCKING_IMPLEMENTATION.md"
echo "  - OPTIMISTIC_LOCKING_SUMMARY.md"
echo ""
echo "Próximos pasos:"
echo "  1. Aplicar migración: npx prisma migrate deploy"
echo "  2. Ejecutar tests: npm test -- marketplace-optimistic-locking.test.ts"
echo "  3. Verificar en producción"
echo ""
