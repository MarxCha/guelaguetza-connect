-- ============================================
-- MIGRATION: Add Comprehensive Performance Indexes
-- ============================================
-- This migration adds strategic indexes to improve query performance
-- across the most frequently accessed tables in the application.

-- ============================================
-- USER TABLE INDEXES
-- ============================================
-- Index on email (already unique, but adding for explicit query optimization)
CREATE INDEX IF NOT EXISTS "User_email_idx" ON "User"("email");

-- Index on role for admin queries and filtering
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User"("role");

-- Index on createdAt for chronological queries
CREATE INDEX IF NOT EXISTS "User_createdAt_idx" ON "User"("createdAt");

-- ============================================
-- ACTIVITY LOG INDEXES
-- ============================================
-- Composite index for user activity queries
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_action_idx" ON "ActivityLog"("userId", "action");

-- Composite index for user timeline queries
CREATE INDEX IF NOT EXISTS "ActivityLog_userId_createdAt_idx" ON "ActivityLog"("userId", "createdAt");

-- Index on createdAt for time-based cleanup and reporting
CREATE INDEX IF NOT EXISTS "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");

-- ============================================
-- PRODUCT TABLE INDEXES
-- ============================================
-- Index on sellerId for seller dashboard
CREATE INDEX IF NOT EXISTS "Product_sellerId_idx" ON "Product"("sellerId");

-- Composite index for category filtering with status
CREATE INDEX IF NOT EXISTS "Product_category_status_idx" ON "Product"("category", "status");

-- Index on status for filtering active/archived products
CREATE INDEX IF NOT EXISTS "Product_status_idx" ON "Product"("status");

-- Index on createdAt for chronological sorting
CREATE INDEX IF NOT EXISTS "Product_createdAt_idx" ON "Product"("createdAt");

-- ============================================
-- ORDER TABLE INDEXES
-- ============================================
-- Index on userId for user order history
CREATE INDEX IF NOT EXISTS "Order_userId_idx" ON "Order"("userId");

-- Composite index for user orders by status
CREATE INDEX IF NOT EXISTS "Order_userId_status_idx" ON "Order"("userId", "status");

-- Composite index for user orders chronologically
CREATE INDEX IF NOT EXISTS "Order_userId_createdAt_idx" ON "Order"("userId", "createdAt");

-- Index on sellerId for seller dashboard
CREATE INDEX IF NOT EXISTS "Order_sellerId_idx" ON "Order"("sellerId");

-- Composite index for seller orders by status
CREATE INDEX IF NOT EXISTS "Order_sellerId_status_idx" ON "Order"("sellerId", "status");

-- Composite index for seller orders chronologically
CREATE INDEX IF NOT EXISTS "Order_sellerId_createdAt_idx" ON "Order"("sellerId", "createdAt");

-- Index on status for admin filtering
CREATE INDEX IF NOT EXISTS "Order_status_idx" ON "Order"("status");

-- Index on createdAt for chronological queries and cleanup jobs
CREATE INDEX IF NOT EXISTS "Order_createdAt_idx" ON "Order"("createdAt");

-- ============================================
-- EXPERIENCE TABLE INDEXES
-- ============================================
-- Composite index for active experiences by category
CREATE INDEX IF NOT EXISTS "Experience_category_isActive_idx" ON "Experience"("category", "isActive");

-- Composite index for active experiences chronologically
CREATE INDEX IF NOT EXISTS "Experience_isActive_createdAt_idx" ON "Experience"("isActive", "createdAt");

-- Index on createdAt for sorting
CREATE INDEX IF NOT EXISTS "Experience_createdAt_idx" ON "Experience"("createdAt");

-- ============================================
-- EXPERIENCE TIME SLOT INDEXES
-- ============================================
-- Index on experienceId for fetching all slots
CREATE INDEX IF NOT EXISTS "ExperienceTimeSlot_experienceId_idx" ON "ExperienceTimeSlot"("experienceId");

-- Composite index for experience slots by date
CREATE INDEX IF NOT EXISTS "ExperienceTimeSlot_experienceId_date_idx" ON "ExperienceTimeSlot"("experienceId", "date");

-- Composite index for experience slots by time
CREATE INDEX IF NOT EXISTS "ExperienceTimeSlot_experienceId_startTime_idx" ON "ExperienceTimeSlot"("experienceId", "startTime");

-- Index on date for calendar queries
CREATE INDEX IF NOT EXISTS "ExperienceTimeSlot_date_idx" ON "ExperienceTimeSlot"("date");

-- Index on availability for filtering
CREATE INDEX IF NOT EXISTS "ExperienceTimeSlot_isAvailable_idx" ON "ExperienceTimeSlot"("isAvailable");

-- ============================================
-- BOOKING TABLE INDEXES
-- ============================================
-- Index on userId for user bookings
CREATE INDEX IF NOT EXISTS "Booking_userId_idx" ON "Booking"("userId");

-- Composite index for user bookings by status
CREATE INDEX IF NOT EXISTS "Booking_userId_status_idx" ON "Booking"("userId", "status");

-- Composite index for user bookings chronologically
CREATE INDEX IF NOT EXISTS "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");

-- Index on experienceId for experience bookings
CREATE INDEX IF NOT EXISTS "Booking_experienceId_idx" ON "Booking"("experienceId");

-- Index on status for filtering and cleanup jobs
CREATE INDEX IF NOT EXISTS "Booking_status_idx" ON "Booking"("status");

-- Composite index for status-based cleanup with time
CREATE INDEX IF NOT EXISTS "Booking_status_createdAt_idx" ON "Booking"("status", "createdAt");

-- Index on createdAt for chronological queries
CREATE INDEX IF NOT EXISTS "Booking_createdAt_idx" ON "Booking"("createdAt");

-- ============================================
-- STORY TABLE INDEXES
-- ============================================
-- Add composite index for comments
CREATE INDEX IF NOT EXISTS "Comment_storyId_createdAt_idx" ON "Comment"("storyId", "createdAt");

-- Add index on userId for user comments
CREATE INDEX IF NOT EXISTS "Comment_userId_idx" ON "Comment"("userId");

-- ============================================
-- LIKE TABLE INDEXES
-- ============================================
-- Add index on storyId for counting likes
CREATE INDEX IF NOT EXISTS "Like_storyId_idx" ON "Like"("storyId");

-- Add index on userId for user likes
CREATE INDEX IF NOT EXISTS "Like_userId_idx" ON "Like"("userId");

-- ============================================
-- NOTES
-- ============================================
-- These indexes are designed to optimize:
-- 1. User authentication and role-based queries
-- 2. Activity log filtering and analytics
-- 3. Product catalog browsing and filtering
-- 4. Order management for buyers and sellers
-- 5. Experience discovery and booking
-- 6. Time slot availability queries
-- 7. Booking management and cleanup jobs
-- 8. Social features (likes, comments)
--
-- Connection pooling should be configured in DATABASE_URL:
-- - Development: connection_limit=10
-- - Production: connection_limit=20-50
-- - pool_timeout=20-30 seconds
--
-- Monitor query performance with:
-- EXPLAIN ANALYZE <query>
