#!/bin/bash

# Script de setup para tests E2E con Playwright
# Guelaguetza Connect

echo "🚀 Configurando tests E2E con Playwright..."
echo ""

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para imprimir con color
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# 1. Verificar que Node.js está instalado
echo "1. Verificando Node.js..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    print_success "Node.js instalado: $NODE_VERSION"
else
    print_error "Node.js no está instalado. Por favor instala Node.js primero."
    exit 1
fi

# 2. Verificar que las dependencias están instaladas
echo ""
echo "2. Verificando dependencias..."
if [ -d "node_modules" ] && [ -f "node_modules/@playwright/test/package.json" ]; then
    print_success "Dependencias instaladas"
else
    print_warning "Instalando dependencias..."
    npm install
    if [ $? -eq 0 ]; then
        print_success "Dependencias instaladas correctamente"
    else
        print_error "Error al instalar dependencias"
        exit 1
    fi
fi

# 3. Instalar navegadores de Playwright
echo ""
echo "3. Instalando navegadores de Playwright..."
echo "   Opciones:"
echo "   [1] Solo Chromium (rápido, recomendado)"
echo "   [2] Chromium + Firefox + WebKit (completo)"
echo ""
read -p "   Selecciona una opción (1 o 2): " BROWSER_OPTION

if [ "$BROWSER_OPTION" = "1" ]; then
    print_warning "Instalando solo Chromium..."
    npx playwright install chromium
elif [ "$BROWSER_OPTION" = "2" ]; then
    print_warning "Instalando todos los navegadores..."
    npx playwright install
else
    print_warning "Opción no válida. Instalando solo Chromium..."
    npx playwright install chromium
fi

if [ $? -eq 0 ]; then
    print_success "Navegadores instalados correctamente"
else
    print_error "Error al instalar navegadores"
    exit 1
fi

# 4. Verificar que el backend existe
echo ""
echo "4. Verificando estructura del proyecto..."
if [ -d "backend" ]; then
    print_success "Backend encontrado"

    # Verificar dependencias del backend
    if [ ! -d "backend/node_modules" ]; then
        print_warning "Instalando dependencias del backend..."
        cd backend
        npm install
        cd ..
        print_success "Dependencias del backend instaladas"
    else
        print_success "Dependencias del backend OK"
    fi
else
    print_warning "Backend no encontrado en ./backend"
fi

# 5. Verificar archivos de test
echo ""
echo "5. Verificando archivos de test..."
if [ -d "test/e2e" ]; then
    TEST_COUNT=$(find test/e2e -name "*.spec.ts" | wc -l)
    print_success "Encontrados $TEST_COUNT archivos de test"
else
    print_error "Directorio test/e2e no encontrado"
    exit 1
fi

# 6. Crear .gitignore para resultados de tests si no existe
echo ""
echo "6. Configurando .gitignore..."
if ! grep -q "test-results/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# Playwright" >> .gitignore
    echo "test-results/" >> .gitignore
    echo "playwright-report/" >> .gitignore
    echo "playwright/.cache/" >> .gitignore
    print_success ".gitignore actualizado"
else
    print_success ".gitignore ya configurado"
fi

# 7. Resumen y siguientes pasos
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
print_success "Setup completado exitosamente!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 Siguientes pasos:"
echo ""
echo "1. Iniciar el backend en una terminal:"
echo "   ${YELLOW}cd backend && npm run dev${NC}"
echo ""
echo "2. Iniciar el frontend en otra terminal:"
echo "   ${YELLOW}npm run dev${NC}"
echo ""
echo "3. Ejecutar los tests E2E:"
echo "   ${YELLOW}npm run test:e2e${NC}          (ejecutar todos)"
echo "   ${YELLOW}npm run test:e2e:ui${NC}       (modo UI - recomendado)"
echo "   ${YELLOW}npm run test:e2e:headed${NC}   (ver navegador)"
echo ""
echo "4. Ver documentación completa:"
echo "   ${YELLOW}cat PLAYWRIGHT_E2E_README.md${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
print_success "¡Listo para empezar con los tests E2E! 🎉"
echo ""
