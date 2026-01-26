-- Migration: Add Performance Indexes
-- Description: Optimización de queries con índices compuestos estratégicos

-- ============================================
-- STORY: Optimizar listado por usuario y fecha
-- ============================================
CREATE INDEX IF NOT EXISTS "Story_userId_createdAt_idx" ON "Story"("userId", "createdAt");

-- ============================================
-- ACTIVITY LOG: Optimizar queries de actividad por usuario
-- ============================================
DROP INDEX IF EXISTS "ActivityLog_userId_createdAt_idx";
CREATE INDEX "ActivityLog_userId_action_createdAt_idx" ON "ActivityLog"("userId", "action", "createdAt");

-- ============================================
-- NOTIFICATION: Optimizar listado de notificaciones no leídas
-- ============================================
DROP INDEX IF EXISTS "Notification_userId_read_idx";
CREATE INDEX "Notification_userId_read_createdAt_idx" ON "Notification"("userId", "read", "createdAt");

-- ============================================
-- PRODUCT: Optimizar búsqueda de productos por vendedor y categoría
-- ============================================
DROP INDEX IF EXISTS "Product_sellerId_idx";
DROP INDEX IF EXISTS "Product_category_status_idx";
CREATE INDEX "Product_sellerId_status_idx" ON "Product"("sellerId", "status");
CREATE INDEX "Product_category_status_createdAt_idx" ON "Product"("category", "status", "createdAt");

-- ============================================
-- ORDER: Optimizar queries de órdenes con filtros compuestos
-- ============================================
DROP INDEX IF EXISTS "Order_userId_idx";
DROP INDEX IF EXISTS "Order_sellerId_idx";
DROP INDEX IF EXISTS "Order_status_idx";
CREATE INDEX "Order_userId_status_createdAt_idx" ON "Order"("userId", "status", "createdAt");
CREATE INDEX "Order_sellerId_status_createdAt_idx" ON "Order"("sellerId", "status", "createdAt");
CREATE INDEX "Order_stripePaymentId_idx" ON "Order"("stripePaymentId");

-- ============================================
-- EXPERIENCE TIME SLOT: Optimizar búsqueda de slots disponibles
-- ============================================
DROP INDEX IF EXISTS "ExperienceTimeSlot_experienceId_date_idx";
DROP INDEX IF EXISTS "ExperienceTimeSlot_date_isAvailable_idx";
CREATE INDEX "ExperienceTimeSlot_experienceId_date_isAvailable_idx" ON "ExperienceTimeSlot"("experienceId", "date", "isAvailable");
CREATE INDEX "ExperienceTimeSlot_date_isAvailable_idx" ON "ExperienceTimeSlot"("date", "isAvailable");

-- ============================================
-- BOOKING: Optimizar queries de reservaciones
-- ============================================
DROP INDEX IF EXISTS "Booking_userId_idx";
DROP INDEX IF EXISTS "Booking_experienceId_idx";
DROP INDEX IF EXISTS "Booking_status_idx";
CREATE INDEX "Booking_userId_status_createdAt_idx" ON "Booking"("userId", "status", "createdAt");
CREATE INDEX "Booking_experienceId_status_idx" ON "Booking"("experienceId", "status");
CREATE INDEX "Booking_stripePaymentId_idx" ON "Booking"("stripePaymentId");
