#!/bin/bash
# ============================================
# PostgreSQL Initialization Script
# ============================================
# Este script se ejecuta automáticamente cuando
# se crea el contenedor de PostgreSQL por primera vez
# ============================================

set -e

echo "================================================"
echo "🗄️  Initializing PostgreSQL Database"
echo "================================================"

# Crear la base de datos principal si no existe
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "postgres" <<-EOSQL
    -- Crear base de datos principal
    SELECT 'CREATE DATABASE guelaguetza_db'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'guelaguetza_db')\gexec

    -- Crear base de datos de testing
    SELECT 'CREATE DATABASE guelaguetza_test'
    WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'guelaguetza_test')\gexec

    -- Configurar extensiones
    \c guelaguetza_db
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    \c guelaguetza_test
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pg_trgm";

    -- Confirmar
    \c postgres
    SELECT datname FROM pg_database WHERE datname IN ('guelaguetza_db', 'guelaguetza_test');
EOSQL

echo "================================================"
echo "✅ PostgreSQL initialization complete!"
echo "================================================"
