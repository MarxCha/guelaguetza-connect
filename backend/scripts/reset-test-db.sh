#!/bin/bash

# Script to reset test database
# Usage: ./scripts/reset-test-db.sh

set -e

echo "🔄 Resetting test database..."

# Load test environment variables
export $(grep -v '^#' .env.test | xargs)

# Drop and recreate database schema
echo "📦 Resetting Prisma schema..."
npx prisma migrate reset --force --skip-seed

# Run migrations
echo "🔄 Running migrations..."
npx prisma migrate deploy

# Seed test data
echo "🌱 Seeding test data..."
tsx prisma/seed.ts

echo "✅ Test database reset complete!"
