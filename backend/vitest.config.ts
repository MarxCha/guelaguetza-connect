import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    root: path.resolve(__dirname),
    setupFiles: [path.resolve(__dirname, 'test/setup.ts')],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        'prisma/',
        '**/*.config.*',
        '**/*.d.ts',
        'test/',
        'src/index.ts', // Entry point - tested via e2e
      ],
      thresholds: {
        // Thresholds bajos inicialmente - incrementar a medida que se agregan más tests
        // Objetivo final: statements 70%, branches 60%, functions 70%, lines 70%
        statements: 15,
        branches: 2,
        functions: 8,
        lines: 15,
      },
    },
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache'],
    testTimeout: 10000,
    // Separate unit and integration tests
    typecheck: {
      enabled: false,
    },
  },
});
