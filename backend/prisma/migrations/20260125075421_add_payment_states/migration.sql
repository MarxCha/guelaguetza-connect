-- AlterEnum: Add new payment states to BookingStatus
ALTER TYPE "BookingStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "BookingStatus" ADD VALUE 'PAYMENT_FAILED';

-- AlterEnum: Add new payment states to OrderStatus
ALTER TYPE "OrderStatus" ADD VALUE 'PENDING_PAYMENT';
ALTER TYPE "OrderStatus" ADD VALUE 'PAYMENT_FAILED';

-- Note: Enum values in PostgreSQL are append-only and cannot be reordered.
-- The new values will be added at the end of the enum.
-- If ordering is critical, you would need to recreate the enum type.
