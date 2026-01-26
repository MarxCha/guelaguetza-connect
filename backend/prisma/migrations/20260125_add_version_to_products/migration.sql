-- AlterTable
-- Add version field to Product model for optimistic locking
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
