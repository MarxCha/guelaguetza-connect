#!/bin/bash
# ============================================
# Docker Configuration Validator
# ============================================
# Verifica que la configuración de Docker sea correcta
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "================================================"
echo -e "${BLUE}🐳 Docker Configuration Validator${NC}"
echo "================================================"
echo ""

ERRORS=0
WARNINGS=0

# ============================================
# 1. Verificar que Docker esté instalado
# ============================================
echo -e "${YELLOW}[1/10]${NC} Verificando Docker..."
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✅ Docker instalado: $DOCKER_VERSION${NC}"
else
    echo -e "${RED}❌ Docker no está instalado${NC}"
    ERRORS=$((ERRORS + 1))
fi

# ============================================
# 2. Verificar que Docker Compose esté instalado
# ============================================
echo -e "${YELLOW}[2/10]${NC} Verificando Docker Compose..."
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✅ Docker Compose instalado: $COMPOSE_VERSION${NC}"
else
    echo -e "${RED}❌ Docker Compose no está instalado${NC}"
    ERRORS=$((ERRORS + 1))
fi

# ============================================
# 3. Verificar que Docker esté corriendo
# ============================================
echo -e "${YELLOW}[3/10]${NC} Verificando Docker daemon..."
if docker info &> /dev/null; then
    echo -e "${GREEN}✅ Docker daemon está corriendo${NC}"
else
    echo -e "${RED}❌ Docker daemon no está corriendo${NC}"
    echo -e "${YELLOW}   Intenta: sudo systemctl start docker${NC}"
    ERRORS=$((ERRORS + 1))
fi

# ============================================
# 4. Verificar archivos de configuración
# ============================================
echo -e "${YELLOW}[4/10]${NC} Verificando archivos de configuración..."

FILES=(
    "docker-compose.yml"
    "docker-compose.prod.yml"
    "Dockerfile.frontend"
    "backend/Dockerfile"
    ".dockerignore"
    "backend/.dockerignore"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        echo -e "${GREEN}   ✅ $file${NC}"
    else
        echo -e "${RED}   ❌ $file no encontrado${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# ============================================
# 5. Verificar scripts de inicialización
# ============================================
echo -e "${YELLOW}[5/10]${NC} Verificando scripts..."

SCRIPTS=(
    "backend/scripts/docker-entrypoint.sh"
    "backend/scripts/init-db.sh"
    "backend/scripts/healthcheck.sh"
)

for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        if [ -x "$script" ]; then
            echo -e "${GREEN}   ✅ $script (ejecutable)${NC}"
        else
            echo -e "${YELLOW}   ⚠️  $script (no ejecutable)${NC}"
            echo -e "${YELLOW}      Ejecuta: chmod +x $script${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
    else
        echo -e "${RED}   ❌ $script no encontrado${NC}"
        ERRORS=$((ERRORS + 1))
    fi
done

# ============================================
# 6. Verificar archivo de entorno
# ============================================
echo -e "${YELLOW}[6/10]${NC} Verificando archivos de entorno..."

if [ -f ".env.docker" ]; then
    echo -e "${GREEN}   ✅ .env.docker encontrado${NC}"
else
    echo -e "${YELLOW}   ⚠️  .env.docker no encontrado${NC}"
    echo -e "${YELLOW}      Ejecuta: cp .env.docker.example .env.docker${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

if [ -f ".env.docker.example" ]; then
    echo -e "${GREEN}   ✅ .env.docker.example encontrado${NC}"
else
    echo -e "${YELLOW}   ⚠️  .env.docker.example no encontrado${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

# ============================================
# 7. Validar docker-compose.yml
# ============================================
echo -e "${YELLOW}[7/10]${NC} Validando docker-compose.yml..."

if docker-compose -f docker-compose.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ docker-compose.yml es válido${NC}"
else
    echo -e "${RED}❌ docker-compose.yml tiene errores de sintaxis${NC}"
    ERRORS=$((ERRORS + 1))
fi

# ============================================
# 8. Validar docker-compose.prod.yml
# ============================================
echo -e "${YELLOW}[8/10]${NC} Validando docker-compose.prod.yml..."

if docker-compose -f docker-compose.prod.yml config > /dev/null 2>&1; then
    echo -e "${GREEN}✅ docker-compose.prod.yml es válido${NC}"
else
    echo -e "${RED}❌ docker-compose.prod.yml tiene errores de sintaxis${NC}"
    ERRORS=$((ERRORS + 1))
fi

# ============================================
# 9. Verificar puertos disponibles
# ============================================
echo -e "${YELLOW}[9/10]${NC} Verificando puertos disponibles..."

PORTS=(5432 6379 3001 5173)
PORT_NAMES=("PostgreSQL" "Redis" "Backend" "Frontend")

for i in "${!PORTS[@]}"; do
    PORT=${PORTS[$i]}
    NAME=${PORT_NAMES[$i]}
    
    if lsof -i :$PORT > /dev/null 2>&1; then
        echo -e "${YELLOW}   ⚠️  Puerto $PORT ($NAME) está en uso${NC}"
        WARNINGS=$((WARNINGS + 1))
    else
        echo -e "${GREEN}   ✅ Puerto $PORT ($NAME) disponible${NC}"
    fi
done

# ============================================
# 10. Verificar package.json scripts
# ============================================
echo -e "${YELLOW}[10/10]${NC} Verificando scripts de npm..."

REQUIRED_SCRIPTS=(
    "docker:up"
    "docker:down"
    "docker:logs"
    "docker:build"
)

for script in "${REQUIRED_SCRIPTS[@]}"; do
    if grep -q "\"$script\"" package.json 2>/dev/null; then
        echo -e "${GREEN}   ✅ npm run $script${NC}"
    else
        echo -e "${YELLOW}   ⚠️  npm run $script no encontrado${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
done

# ============================================
# RESUMEN
# ============================================
echo ""
echo "================================================"
echo -e "${BLUE}📊 Resumen de validación${NC}"
echo "================================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ Configuración perfecta!${NC}"
    echo ""
    echo "Puedes iniciar Docker con:"
    echo -e "${BLUE}  npm run docker:up${NC}"
    echo ""
    EXIT_CODE=0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  $WARNINGS advertencia(s) encontrada(s)${NC}"
    echo ""
    echo "La configuración debería funcionar, pero hay algunas mejoras sugeridas."
    echo ""
    EXIT_CODE=0
else
    echo -e "${RED}❌ $ERRORS error(es) encontrado(s)${NC}"
    echo -e "${YELLOW}⚠️  $WARNINGS advertencia(s) encontrada(s)${NC}"
    echo ""
    echo "Por favor, corrige los errores antes de continuar."
    echo ""
    EXIT_CODE=1
fi

echo "================================================"
echo ""

exit $EXIT_CODE
