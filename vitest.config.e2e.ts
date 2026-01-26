import { defineConfig } from 'vitest/config';
import path from 'path';

/**
 * Configuración de Vitest para tests E2E
 *
 * Los tests E2E son diferentes a los tests unitarios:
 * - Usan base de datos real (aunque de prueba)
 * - Levantan servidor Fastify completo
 * - Son más lentos pero más completos
 * - Prueban flujos completos de usuario
 */
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: path.resolve(__dirname),
    setupFiles: [path.resolve(__dirname, 'test/e2e/setup.ts')],

    // Tests E2E son más lentos
    testTimeout: 30000,
    hookTimeout: 30000,

    // Solo incluir tests E2E
    include: ['test/e2e/**/*.test.ts'],
    exclude: [
      'node_modules',
      'backend/node_modules',
      'dist',
      'backend/dist',
      '.idea',
      '.git',
      '.cache',
    ],

    // Coverage para E2E (opcional)
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      reportsDirectory: './coverage/e2e',
      exclude: [
        'node_modules/**',
        'backend/node_modules/**',
        'test/**',
        '**/*.test.{ts,tsx}',
        '**/*.config.{ts,js}',
        '**/types.ts',
        'dist/**',
        'backend/dist/**',
        'dev-dist/**',
      ],
    },

    // Ejecutar tests en serie para evitar conflictos de BD
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },

    // Mejor output para debugging
    reporter: ['verbose'],
  },

  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});
