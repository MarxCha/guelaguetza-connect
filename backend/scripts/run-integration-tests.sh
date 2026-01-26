#!/bin/bash

set -e

echo "=========================================="
echo "🧪 Running Integration Tests"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if test DB is running
echo -e "${BLUE}📋 Checking test database...${NC}"
if ! docker ps | grep -q guelaguetza-test-db; then
  echo -e "${YELLOW}⚠️  Test database not running. Starting it...${NC}"
  npm run test:db:up
  sleep 5
fi

# Wait for DB to be ready
echo -e "${BLUE}⏳ Waiting for database to be ready...${NC}"
until docker exec guelaguetza-test-db pg_isready -U test_user -d guelaguetza_test > /dev/null 2>&1; do
  sleep 1
done
echo -e "${GREEN}✅ Database is ready${NC}"
echo ""

# Reset test database
echo -e "${BLUE}🔄 Resetting test database...${NC}"
npm run test:db:reset
echo ""

# Run integration tests with coverage
echo -e "${BLUE}🏃 Running integration tests with coverage...${NC}"
npm run test:integration:coverage

echo ""
echo -e "${GREEN}=========================================="
echo "✅ Integration Tests Complete!"
echo "==========================================${NC}"
echo ""
echo "📊 Coverage report available at:"
echo "   coverage/index.html"
echo ""
