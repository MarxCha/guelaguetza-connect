#!/bin/bash

# Script para aplicar migración de optimistic locking a Product
# Uso: ./scripts/migrate-product-version.sh [environment]
#      environment: dev (default) | test | prod

set -e  # Exit on error

ENVIRONMENT=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"

cd "$BACKEND_DIR"

echo "╔════════════════════════════════════════════════════════╗"
echo "║  Migración: Optimistic Locking para Productos         ║"
echo "║  Agregando campo 'version' al modelo Product          ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Validar que existe .env
if [ ! -f .env ]; then
    echo "❌ Error: Archivo .env no encontrado"
    echo "Por favor crea un archivo .env con DATABASE_URL"
    exit 1
fi

# Cargar variables de entorno
source .env

# Validar DATABASE_URL
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL no está definido en .env"
    exit 1
fi

echo "📋 Configuración:"
echo "   Environment: $ENVIRONMENT"
echo "   Database: ${DATABASE_URL%%\?*}"  # Ocultar query params
echo ""

# Función para verificar conexión a la base de datos
check_db_connection() {
    echo "🔌 Verificando conexión a la base de datos..."

    if ! npx prisma db execute --stdin <<< "SELECT 1;" > /dev/null 2>&1; then
        echo "❌ No se puede conectar a la base de datos"
        echo "Verifica que PostgreSQL esté corriendo y las credenciales sean correctas"
        exit 1
    fi

    echo "✅ Conexión exitosa"
}

# Función para hacer backup (solo en producción)
backup_database() {
    if [ "$ENVIRONMENT" = "prod" ]; then
        echo "💾 Creando backup de la base de datos..."

        BACKUP_FILE="backup_$(date +%Y%m%d_%H%M%S).sql"

        # Extraer componentes de DATABASE_URL
        DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\(.*\):.*/\1/p')
        DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
        DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')
        DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\(.*\):.*/\1/p')

        pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" > "backups/$BACKUP_FILE"

        echo "✅ Backup creado: backups/$BACKUP_FILE"
    fi
}

# Función para verificar estado actual
check_migration_status() {
    echo "📊 Estado actual de migraciones:"
    npx prisma migrate status || true
    echo ""
}

# Función para aplicar migración
apply_migration() {
    case "$ENVIRONMENT" in
        dev)
            echo "🔧 Aplicando migración en DESARROLLO..."
            npx prisma migrate dev --name add_version_to_product
            ;;
        test)
            echo "🧪 Aplicando migración en TEST..."
            npx prisma migrate deploy
            ;;
        prod)
            echo "🚀 Aplicando migración en PRODUCCIÓN..."

            # Confirmación extra en producción
            read -p "¿Estás seguro de aplicar esta migración en PRODUCCIÓN? (yes/no): " confirm
            if [ "$confirm" != "yes" ]; then
                echo "❌ Migración cancelada"
                exit 0
            fi

            npx prisma migrate deploy
            ;;
        *)
            echo "❌ Environment inválido: $ENVIRONMENT"
            echo "Usa: dev, test, o prod"
            exit 1
            ;;
    esac
}

# Función para verificar migración
verify_migration() {
    echo "🔍 Verificando que el campo 'version' se agregó correctamente..."

    # Verificar que la columna existe
    result=$(npx prisma db execute --stdin <<< "
        SELECT column_name, data_type, column_default
        FROM information_schema.columns
        WHERE table_name = 'Product' AND column_name = 'version';
    " 2>&1)

    if echo "$result" | grep -q "version"; then
        echo "✅ Campo 'version' agregado exitosamente"
        echo "$result"
    else
        echo "⚠️  No se pudo verificar el campo 'version'"
    fi

    echo ""

    # Verificar que productos existentes tienen version = 1
    echo "🔍 Verificando versiones de productos existentes..."
    npx prisma db execute --stdin <<< "
        SELECT COUNT(*) as total_products,
               COUNT(CASE WHEN version = 1 THEN 1 END) as products_with_version_1
        FROM \"Product\";
    "
}

# Función para regenerar cliente Prisma
regenerate_client() {
    echo "🔄 Regenerando cliente Prisma..."
    npx prisma generate
    echo "✅ Cliente regenerado"
}

# Función para ejecutar tests
run_tests() {
    if [ "$ENVIRONMENT" = "dev" ] || [ "$ENVIRONMENT" = "test" ]; then
        echo "🧪 Ejecutando tests de optimistic locking..."
        npm test -- optimistic-locking.test.ts || true
        echo ""
    fi
}

# Función principal
main() {
    echo "Iniciando proceso de migración..."
    echo ""

    check_db_connection
    check_migration_status

    if [ "$ENVIRONMENT" = "prod" ]; then
        backup_database
    fi

    apply_migration
    verify_migration
    regenerate_client

    if [ "$ENVIRONMENT" != "prod" ]; then
        run_tests
    fi

    echo ""
    echo "╔════════════════════════════════════════════════════════╗"
    echo "║  ✅ Migración completada exitosamente                  ║"
    echo "╚════════════════════════════════════════════════════════╝"
    echo ""
    echo "📝 Próximos pasos:"
    echo "   1. Reinicia el servidor: npm run dev"
    echo "   2. Verifica los endpoints de checkout"
    echo "   3. Monitorea los logs para ConcurrencyError"
    echo ""
    echo "📚 Documentación:"
    echo "   - PRODUCT_OPTIMISTIC_LOCKING.md"
    echo "   - PRODUCT_LOCKING_COMMANDS.md"
    echo ""
}

# Ejecutar
main
