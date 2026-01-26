#!/bin/bash
#
# Script para aplicar índices de optimización
#
# Uso:
#   chmod +x scripts/apply-optimization-indexes.sh
#   ./scripts/apply-optimization-indexes.sh

set -e

echo "🚀 Aplicando optimizaciones de índices a la base de datos..."
echo ""

# Verificar que existe la migración
MIGRATION_FILE="prisma/migrations/20260125_add_performance_indexes/migration.sql"

if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Error: No se encontró el archivo de migración"
    echo "   Esperado en: $MIGRATION_FILE"
    exit 1
fi

echo "📄 Archivo de migración encontrado"
echo ""

# Verificar conexión a la base de datos
echo "🔍 Verificando conexión a la base de datos..."

if ! npx prisma db execute --file "$MIGRATION_FILE" --schema prisma/schema.prisma 2>/dev/null; then
    echo ""
    echo "⚠️  No se pudo conectar a la base de datos automáticamente."
    echo ""
    echo "Por favor, ejecuta manualmente el siguiente comando SQL en tu base de datos:"
    echo ""
    echo "=================================================="
    cat "$MIGRATION_FILE"
    echo "=================================================="
    echo ""
    echo "O ejecuta:"
    echo "  psql -h localhost -p 5433 -U postgres -d guelaguetza_db -f $MIGRATION_FILE"
    echo ""
    exit 0
fi

echo "✅ Índices aplicados exitosamente"
echo ""

# Verificar índices creados
echo "🔍 Verificando índices creados..."
echo ""

# Ejecutar análisis de índices
if command -v npx &> /dev/null; then
    echo "📊 Ejecutando análisis de índices..."
    npx tsx scripts/analyze-queries.ts 2>/dev/null || echo "ℹ️  Para análisis completo, ejecuta: npx tsx scripts/analyze-queries.ts"
fi

echo ""
echo "✅ Optimización completada"
echo ""
echo "📚 Documentación: docs/DATABASE_OPTIMIZATION.md"
echo ""
