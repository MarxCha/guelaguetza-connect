import { execSync } from 'child_process';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load test environment
config({ path: resolve(__dirname, '../.env.test') });

async function resetTestDatabase() {
  console.log('🔄 Resetting test database...');

  try {
    // Reset database schema
    console.log('📦 Resetting Prisma schema...');
    execSync('npx prisma migrate reset --force --skip-seed', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    // Run migrations
    console.log('🔄 Running migrations...');
    execSync('npx prisma migrate deploy', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    // Seed test data
    console.log('🌱 Seeding test data...');
    execSync('tsx prisma/seed.ts', {
      stdio: 'inherit',
      env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    });

    console.log('✅ Test database reset complete!');
  } catch (error) {
    console.error('❌ Error resetting test database:', error);
    process.exit(1);
  }
}

resetTestDatabase();
