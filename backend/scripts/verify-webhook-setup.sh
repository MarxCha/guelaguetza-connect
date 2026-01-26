#!/bin/bash

# Script de verificación de setup de webhooks
# Autor: Claude Opus 4.5
# Fecha: 2026-01-25

echo "🔍 Verificando configuración de webhooks..."
echo ""

# Colores
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Función para verificar archivo
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✅${NC} $1 existe"
    return 0
  else
    echo -e "${RED}❌${NC} $1 NO EXISTE"
    return 1
  fi
}

# Función para verificar variable de entorno
check_env() {
  if grep -q "$1" .env 2>/dev/null; then
    echo -e "${GREEN}✅${NC} $1 configurada en .env"
    return 0
  else
    echo -e "${YELLOW}⚠️${NC}  $1 NO configurada en .env"
    return 1
  fi
}

echo "📁 Verificando archivos del proyecto..."
echo ""

# Archivos principales
check_file "src/routes/webhooks.ts"
check_file "src/services/stripe.service.ts"
check_file "src/services/booking.service.ts"
check_file "src/services/marketplace.service.ts"
check_file "prisma/schema.prisma"
check_file "prisma/migrations/20260125_add_webhook_events/migration.sql"

echo ""
echo "📄 Verificando documentación..."
echo ""

check_file "WEBHOOKS_GUIDE.md"
check_file "WEBHOOKS_README.md"
check_file "WEBHOOKS_IMPLEMENTATION_SUMMARY.md"
check_file "WEBHOOK_IDEMPOTENCY.md"
check_file "WEBHOOK_IMPLEMENTATION_COMPLETE.md"

echo ""
echo "🔐 Verificando variables de entorno..."
echo ""

check_env "STRIPE_SECRET_KEY"
check_env "STRIPE_WEBHOOK_SECRET"

echo ""
echo "🔍 Verificando modelo WebhookEvent en schema.prisma..."
if grep -q "model WebhookEvent" prisma/schema.prisma; then
  echo -e "${GREEN}✅${NC} Modelo WebhookEvent encontrado"
else
  echo -e "${RED}❌${NC} Modelo WebhookEvent NO encontrado"
fi

echo ""
echo "🔍 Verificando registro de ruta en app.ts..."
if grep -q "webhooksRoutes" src/app.ts; then
  echo -e "${GREEN}✅${NC} Ruta webhooksRoutes registrada"
else
  echo -e "${RED}❌${NC} Ruta webhooksRoutes NO registrada"
fi

echo ""
echo "🔍 Verificando plugin fastify-raw-body..."
if grep -q "fastify-raw-body" package.json; then
  echo -e "${GREEN}✅${NC} Dependencia fastify-raw-body instalada"
else
  echo -e "${RED}❌${NC} Dependencia fastify-raw-body NO instalada"
fi

echo ""
echo "📊 Resumen de verificación:"
echo ""
echo -e "${GREEN}✅${NC} = Configurado correctamente"
echo -e "${YELLOW}⚠️${NC}  = Requiere atención"
echo -e "${RED}❌${NC} = Falta configuración"

echo ""
echo "📝 Próximos pasos:"
echo ""
echo "1. Aplicar migración de BD:"
echo "   npx prisma migrate deploy"
echo ""
echo "2. Configurar variables de entorno (si faltan):"
echo "   STRIPE_SECRET_KEY=sk_test_..."
echo "   STRIPE_WEBHOOK_SECRET=whsec_..."
echo ""
echo "3. Testear con Stripe CLI:"
echo "   stripe listen --forward-to http://localhost:3000/api/webhooks/stripe"
echo "   stripe trigger payment_intent.succeeded"
echo ""
echo "4. Verificar logs:"
echo "   tail -f logs/app.log"
echo ""

echo "✨ Verificación completada"
