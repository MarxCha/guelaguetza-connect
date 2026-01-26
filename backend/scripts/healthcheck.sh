#!/bin/sh
# ============================================
# Custom Health Check Script
# ============================================
# Verifica que todos los servicios críticos estén funcionando
# ============================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

EXIT_CODE=0

echo "================================================"
echo "🏥 Running Health Checks"
echo "================================================"

# ============================================
# 1. Check HTTP Server
# ============================================
echo -n "${YELLOW}Checking HTTP server...${NC} "
if wget --no-verbose --tries=1 --spider http://localhost:${PORT:-3001}/health 2>/dev/null; then
    echo "${GREEN}✅ OK${NC}"
else
    echo "${RED}❌ FAILED${NC}"
    EXIT_CODE=1
fi

# ============================================
# 2. Check Database Connection
# ============================================
echo -n "${YELLOW}Checking database connection...${NC} "
if node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.\$queryRaw\`SELECT 1\`
  .then(() => { process.exit(0); })
  .catch(() => { process.exit(1); });
" 2>/dev/null; then
    echo "${GREEN}✅ OK${NC}"
else
    echo "${RED}❌ FAILED${NC}"
    EXIT_CODE=1
fi

# ============================================
# 3. Check Redis Connection (si existe)
# ============================================
if [ -n "$REDIS_URL" ]; then
    echo -n "${YELLOW}Checking Redis connection...${NC} "
    
    # Intentar ping a Redis
    REDIS_HOST=$(echo $REDIS_URL | sed 's|redis://[^@]*@||' | sed 's|redis://||' | cut -d: -f1)
    REDIS_PORT=$(echo $REDIS_URL | sed 's|redis://[^@]*@||' | sed 's|redis://||' | cut -d: -f2 | cut -d/ -f1)
    
    if wget --no-verbose --tries=1 --spider "http://${REDIS_HOST}:${REDIS_PORT}" 2>/dev/null; then
        echo "${GREEN}✅ OK${NC}"
    else
        echo "${YELLOW}⚠️  WARNING${NC}"
    fi
fi

echo "================================================"
if [ $EXIT_CODE -eq 0 ]; then
    echo "${GREEN}✅ All health checks passed!${NC}"
else
    echo "${RED}❌ Some health checks failed!${NC}"
fi
echo "================================================"

exit $EXIT_CODE
