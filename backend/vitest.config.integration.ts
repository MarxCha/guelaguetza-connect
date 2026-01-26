import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: path.resolve(__dirname),
    // Usar setup específico para integration tests (sin mocks de Prisma)
    setupFiles: ['test/integration/setup-integration.ts'],
    include: ['test/integration/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'test/integration/setup-integration.ts'],
    testTimeout: 30000,
    hookTimeout: 30000,
    teardownTimeout: 10000,
    // Ejecutar tests de forma secuencial para evitar problemas de concurrencia en la DB
    pool: 'forks',
    singleFork: true,
    // Configuración de cobertura
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/**/*.test.ts',
        'src/**/*.spec.ts',
        'src/types/**',
        'src/index.ts',
        'src/app.ts',
      ],
      thresholds: {
        statements: 85,
        branches: 80,
        functions: 85,
        lines: 85,
      },
    },
  },
});
