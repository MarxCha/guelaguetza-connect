#!/bin/bash
# ============================================
# Quick Start - Docker Setup
# ============================================
# Script interactivo para configurar Docker
# ============================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo ""
echo "================================================"
echo -e "${CYAN}🐳 Guelaguetza Connect - Docker Quick Start${NC}"
echo "================================================"
echo ""

# ============================================
# 1. Verificar requisitos
# ============================================
echo -e "${YELLOW}[1/5]${NC} Verificando requisitos..."

if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker no está instalado${NC}"
    echo ""
    echo "Instala Docker desde: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose no está instalado${NC}"
    echo ""
    echo "Instala Docker Compose desde: https://docs.docker.com/compose/install/"
    exit 1
fi

if ! docker info &> /dev/null; then
    echo -e "${RED}❌ Docker daemon no está corriendo${NC}"
    echo ""
    echo "Inicia Docker Desktop o ejecuta: sudo systemctl start docker"
    exit 1
fi

echo -e "${GREEN}✅ Todos los requisitos cumplidos${NC}"
echo ""

# ============================================
# 2. Configurar archivo de entorno
# ============================================
echo -e "${YELLOW}[2/5]${NC} Configurando archivo de entorno..."

if [ ! -f ".env.docker" ]; then
    echo -e "${BLUE}Copiando .env.docker.example a .env.docker...${NC}"
    cp .env.docker.example .env.docker
    echo -e "${GREEN}✅ Archivo .env.docker creado${NC}"
    
    echo ""
    read -p "¿Quieres editar las variables de entorno ahora? [y/N]: " edit_env
    if [ "$edit_env" = "y" ] || [ "$edit_env" = "Y" ]; then
        ${EDITOR:-nano} .env.docker
    fi
else
    echo -e "${GREEN}✅ .env.docker ya existe${NC}"
fi

echo ""

# ============================================
# 3. Hacer scripts ejecutables
# ============================================
echo -e "${YELLOW}[3/5]${NC} Configurando scripts..."

chmod +x backend/scripts/*.sh 2>/dev/null || true
chmod +x scripts/*.sh 2>/dev/null || true

echo -e "${GREEN}✅ Scripts configurados${NC}"
echo ""

# ============================================
# 4. Build de imágenes
# ============================================
echo -e "${YELLOW}[4/5]${NC} ¿Quieres hacer build de las imágenes ahora?"
echo -e "${BLUE}Esto puede tardar 5-10 minutos la primera vez.${NC}"
echo ""
read -p "Hacer build ahora? [Y/n]: " do_build

if [ "$do_build" != "n" ] && [ "$do_build" != "N" ]; then
    echo ""
    echo -e "${BLUE}🔨 Building imágenes...${NC}"
    docker-compose build
    echo -e "${GREEN}✅ Build completado${NC}"
else
    echo -e "${YELLOW}⏭️  Build omitido. Las imágenes se crearán al levantar los servicios.${NC}"
fi

echo ""

# ============================================
# 5. Levantar servicios
# ============================================
echo -e "${YELLOW}[5/5]${NC} ¿Quieres levantar los servicios ahora?"
echo ""
read -p "Levantar servicios? [Y/n]: " do_up

if [ "$do_up" != "n" ] && [ "$do_up" != "N" ]; then
    echo ""
    echo -e "${BLUE}🚀 Levantando servicios...${NC}"
    docker-compose up -d
    
    echo ""
    echo -e "${YELLOW}⏳ Esperando a que los servicios estén listos...${NC}"
    sleep 10
    
    echo ""
    echo -e "${GREEN}✅ Servicios levantados!${NC}"
    echo ""
    
    # Mostrar estado
    docker-compose ps
    
    echo ""
    echo "================================================"
    echo -e "${GREEN}🎉 Todo listo!${NC}"
    echo "================================================"
    echo ""
    echo "Accede a la aplicación:"
    echo -e "  ${CYAN}Frontend:${NC} http://localhost:5173"
    echo -e "  ${CYAN}Backend:${NC}  http://localhost:3001"
    echo ""
    echo "Comandos útiles:"
    echo -e "  ${BLUE}npm run docker:logs${NC}        - Ver logs"
    echo -e "  ${BLUE}npm run docker:migrate${NC}     - Ejecutar migraciones"
    echo -e "  ${BLUE}npm run docker:seed${NC}        - Seed de datos"
    echo -e "  ${BLUE}npm run docker:down${NC}        - Bajar servicios"
    echo -e "  ${BLUE}make help${NC}                  - Ver todos los comandos"
    echo ""
    echo "================================================"
    echo ""
else
    echo ""
    echo "================================================"
    echo -e "${GREEN}✅ Configuración completa!${NC}"
    echo "================================================"
    echo ""
    echo "Para levantar los servicios:"
    echo -e "  ${BLUE}npm run docker:up${NC}"
    echo ""
    echo "O usando Make:"
    echo -e "  ${BLUE}make up${NC}"
    echo ""
    echo "================================================"
    echo ""
fi
