#!/bin/bash

# ============================================
# CI/CD Setup Verification Script
# ============================================
# Verifica que todos los archivos necesarios
# para CI/CD estén en su lugar
# ============================================

set -e

echo "🔍 Verificando setup de CI/CD..."
echo ""

ERRORS=0
WARNINGS=0

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} $1"
    else
        echo -e "${RED}✗${NC} $1 - MISSING"
        ((ERRORS++))
    fi
}

# ============================================
# Check GitHub Actions Workflows
# ============================================
echo "📋 Workflows:"
check_file ".github/workflows/ci.yml"
check_file ".github/workflows/deploy.yml"
check_file ".github/workflows/code-quality.yml"
echo ""

# ============================================
# Check Configuration Files
# ============================================
echo "⚙️  Configuration:"
check_file ".github/dependabot.yml"
check_file ".github/CODEOWNERS"
echo ""

# ============================================
# Summary
# ============================================
echo "=========================================="
echo "📊 RESUMEN"
echo "=========================================="
echo -e "Errores:    ${RED}$ERRORS${NC}"
echo -e "Warnings:   ${YELLOW}$WARNINGS${NC}"
echo ""

if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ Setup de CI/CD completo!${NC}"
    exit 0
else
    echo -e "${RED}✗ Setup incompleto${NC}"
    exit 1
fi
