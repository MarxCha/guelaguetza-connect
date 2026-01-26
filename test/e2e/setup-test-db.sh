#!/bin/bash

# Script para configurar base de datos de prueba para tests E2E
# Uso: ./test/e2e/setup-test-db.sh

set -e

echo "========================================="
echo "  Configurando BD de prueba para E2E"
echo "========================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 1. Verificar que existe .env.test
if [ ! -f .env.test ]; then
  echo -e "${YELLOW}Creando .env.test desde .env.test.example...${NC}"
  cp .env.test.example .env.test
  echo -e "${GREEN}✓ Archivo .env.test creado${NC}"
  echo "  Por favor, revisa y ajusta las variables en .env.test"
else
  echo -e "${GREEN}✓ .env.test ya existe${NC}"
fi

# 2. Levantar contenedor de PostgreSQL
echo ""
echo "Levantando contenedor de PostgreSQL de prueba..."
docker-compose -f test/e2e/docker-compose.test.yml up -d

# 3. Esperar a que PostgreSQL esté listo
echo ""
echo "Esperando a que PostgreSQL esté listo..."
sleep 5

# 4. Verificar conexión
echo ""
echo "Verificando conexión a PostgreSQL..."
docker exec guelaguetza-test-db pg_isready -U postgres || {
  echo "Error: PostgreSQL no está listo"
  exit 1
}
echo -e "${GREEN}✓ PostgreSQL está listo${NC}"

# 5. Aplicar migraciones
echo ""
echo "Aplicando migraciones de Prisma..."
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/guelaguetza_test" npx prisma migrate deploy
cd ..
echo -e "${GREEN}✓ Migraciones aplicadas${NC}"

# 6. Generar cliente de Prisma
echo ""
echo "Generando cliente de Prisma..."
cd backend
npx prisma generate
cd ..
echo -e "${GREEN}✓ Cliente de Prisma generado${NC}"

echo ""
echo "========================================="
echo -e "${GREEN}  ✓ Base de datos de prueba lista${NC}"
echo "========================================="
echo ""
echo "Puedes ejecutar los tests E2E con:"
echo "  pnpm test:e2e"
echo ""
echo "Para detener la base de datos:"
echo "  docker-compose -f test/e2e/docker-compose.test.yml down"
echo ""
