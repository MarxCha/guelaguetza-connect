#!/bin/bash

echo "🔍 Verificando Domain Layer Implementation..."
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counters
PASS=0
FAIL=0

check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    ((PASS++))
  else
    echo -e "${RED}✗${NC} $1 - MISSING"
    ((FAIL++))
  fi
}

echo "📁 Verificando estructura de carpetas..."
echo ""

# Domain Layer - Booking
echo "Booking Domain:"
check_file "src/domain/booking/entities/Booking.ts"
check_file "src/domain/booking/entities/Booking.test.ts"
check_file "src/domain/booking/entities/Experience.ts"
check_file "src/domain/booking/entities/Experience.test.ts"
check_file "src/domain/booking/entities/TimeSlot.ts"
check_file "src/domain/booking/entities/TimeSlot.test.ts"
check_file "src/domain/booking/value-objects/Money.ts"
check_file "src/domain/booking/value-objects/Money.test.ts"
check_file "src/domain/booking/value-objects/GuestCount.ts"
check_file "src/domain/booking/value-objects/GuestCount.test.ts"
check_file "src/domain/booking/value-objects/BookingStatus.ts"
check_file "src/domain/booking/value-objects/BookingStatus.test.ts"
check_file "src/domain/booking/repositories/IBookingRepository.ts"
check_file "src/domain/booking/services/BookingDomainService.ts"
check_file "src/domain/booking/services/BookingDomainService.test.ts"

echo ""
echo "Marketplace Domain:"
check_file "src/domain/marketplace/entities/Order.ts"
check_file "src/domain/marketplace/entities/Order.test.ts"
check_file "src/domain/marketplace/entities/Product.ts"
check_file "src/domain/marketplace/entities/Product.test.ts"
check_file "src/domain/marketplace/value-objects/Stock.ts"
check_file "src/domain/marketplace/value-objects/Stock.test.ts"
check_file "src/domain/marketplace/value-objects/OrderStatus.ts"
check_file "src/domain/marketplace/value-objects/OrderStatus.test.ts"
check_file "src/domain/marketplace/repositories/IProductRepository.ts"

echo ""
echo "Shared Domain:"
check_file "src/domain/shared/errors/DomainError.ts"

echo ""
echo "Application Layer:"
check_file "src/application/use-cases/booking/CreateBookingUseCase.ts"
check_file "src/application/use-cases/booking/ConfirmBookingUseCase.ts"
check_file "src/application/use-cases/booking/CancelBookingUseCase.ts"
check_file "src/application/use-cases/marketplace/CreateOrderUseCase.ts"

echo ""
echo "Infrastructure Layer:"
check_file "src/infrastructure/repositories/PrismaBookingRepository.ts"
check_file "src/infrastructure/repositories/PrismaProductRepository.ts"

echo ""
echo "📊 Ejecutando tests..."
npm test -- --run src/domain > /dev/null 2>&1

if [ $? -eq 0 ]; then
  echo -e "${GREEN}✓${NC} Todos los tests del domain layer pasan"
  ((PASS++))
else
  echo -e "${RED}✗${NC} Algunos tests fallan"
  ((FAIL++))
fi

echo ""
echo "════════════════════════════════════════"
echo "Resultado Final:"
echo -e "${GREEN}✓ Checks Passed: $PASS${NC}"
if [ $FAIL -gt 0 ]; then
  echo -e "${RED}✗ Checks Failed: $FAIL${NC}"
  exit 1
else
  echo -e "${GREEN}🎉 Domain Layer Verification Complete!${NC}"
  exit 0
fi
