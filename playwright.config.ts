import { defineConfig, devices } from '@playwright/test';

/**
 * Configuración de Playwright para tests E2E
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './test/e2e',

  // Tiempo máximo que puede durar un test completo
  timeout: 30 * 1000,

  // Configuración de expect
  expect: {
    timeout: 5000
  },

  // Configuración para ejecutar tests
  fullyParallel: false, // Los tests E2E son secuenciales por defecto
  forbidOnly: !!process.env.CI, // Falla en CI si hay .only()
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 1, // Un worker para evitar race conditions

  // Reporter para ver resultados
  reporter: [
    ['html'],
    ['list']
  ],

  // Configuración compartida para todos los tests
  use: {
    // URL base de la aplicación
    baseURL: 'http://localhost:5173',

    // Tomar screenshot solo cuando falle
    screenshot: 'only-on-failure',

    // Guardar video solo cuando falle
    video: 'retain-on-failure',

    // Trace para debugging (solo en CI o cuando falle)
    trace: 'on-first-retry',

    // Configuración de navegador
    viewport: { width: 1280, height: 720 },
    ignoreHTTPSErrors: true,
  },

  // Configuración de proyectos (navegadores)
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // Descomentar para probar en más navegadores
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // Tests en mobile
    // {
    //   name: 'Mobile Chrome',
    //   use: { ...devices['Pixel 5'] },
    // },
  ],

  // Servidor de desarrollo (opcional)
  // Playwright puede iniciar el servidor automáticamente
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});
