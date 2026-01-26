# Tests E2E con Playwright - Guelaguetza Connect

Guía completa para ejecutar tests End-to-End usando Playwright en el proyecto Guelaguetza Connect.

## Tabla de Contenidos

1. [Instalación](#instalación)
2. [Configuración](#configuración)
3. [Ejecutar Tests](#ejecutar-tests)
4. [Estructura de Tests](#estructura-de-tests)
5. [Escribir Nuevos Tests](#escribir-nuevos-tests)
6. [Debugging](#debugging)
7. [Mejores Prácticas](#mejores-prácticas)

---

## Instalación

### 1. Instalar Dependencias

```bash
npm install
```

### 2. Instalar Navegadores de Playwright

```bash
npx playwright install
```

Para instalar solo Chromium (más rápido):

```bash
npx playwright install chromium
```

---

## Configuración

### Requisitos Previos

Los tests E2E requieren que tanto el frontend como el backend estén corriendo:

#### Terminal 1: Backend (Puerto 3005)

```bash
cd backend
npm run dev
```

#### Terminal 2: Frontend (Puerto 5173)

```bash
npm run dev
```

Verificar que ambos servidores están corriendo:
- Frontend: http://localhost:5173
- Backend API: http://localhost:3005/api

---

## Ejecutar Tests

### Comandos Principales

```bash
# Ejecutar todos los tests E2E
npm run test:e2e

# Ejecutar con navegador visible (headed mode)
npm run test:e2e:headed

# Abrir UI de Playwright (RECOMENDADO para desarrollo)
npm run test:e2e:ui

# Ejecutar en modo debug
npm run test:e2e:debug

# Ver reporte HTML del último test
npm run test:e2e:report

# Generar código de test automáticamente
npm run test:e2e:codegen
```

### Ejecutar Tests Específicos

```bash
# Solo tests de booking
npx playwright test booking-flow

# Solo tests de marketplace
npx playwright test marketplace-flow

# Solo tests de admin
npx playwright test admin-flow

# Un test específico por nombre
npx playwright test -g "Usuario puede reservar una experiencia"

# Solo tests que fallaron la última vez
npx playwright test --last-failed
```

### Ejecutar en Diferentes Navegadores

```bash
# Solo en Chromium (por defecto)
npx playwright test --project=chromium

# Solo en Firefox
npx playwright test --project=firefox

# Solo en WebKit (Safari)
npx playwright test --project=webkit

# En todos los navegadores
npx playwright test --project=chromium --project=firefox --project=webkit
```

---

## Estructura de Tests

```
test/e2e/
├── fixtures/
│   └── test-users.ts          # Datos de prueba (usuarios, productos, etc.)
├── helpers/
│   └── auth.ts                # Funciones helper de autenticación
├── setup.spec.ts              # Tests de verificación del ambiente
├── booking-flow.spec.ts       # Tests del flujo de reservas
├── marketplace-flow.spec.ts   # Tests del flujo de marketplace
└── admin-flow.spec.ts         # Tests del flujo de administración

playwright.config.ts           # Configuración de Playwright
```

### Tests Implementados

#### 1. Setup Verification (`setup.spec.ts`)
- Verifica que la aplicación carga correctamente
- Comprueba que el backend API está accesible
- Valida sistema de navegación
- Prueba localStorage
- Verifica responsividad
- Valida accesibilidad

#### 2. Booking Flow (`booking-flow.spec.ts`)
- Registro de nuevo usuario
- Login de usuario existente
- Búsqueda de experiencias
- Ver detalle de experiencia
- Seleccionar fecha y horario
- Crear reserva
- Procesar pago (simulado con Stripe test mode)
- Verificar reserva en "Mis Reservas"
- Filtrar experiencias por categoría
- Buscar experiencias por texto

#### 3. Marketplace Flow (`marketplace-flow.spec.ts`)
- Login de usuario
- Navegar la tienda
- Ver productos disponibles
- Ver detalle de producto
- Agregar productos al carrito
- Actualizar cantidades en carrito
- Eliminar productos del carrito
- Completar checkout
- Procesar pago
- Verificar orden en "Mis Pedidos"
- Agregar productos a wishlist
- Filtrar productos por categoría
- Buscar productos por texto

#### 4. Admin Flow (`admin-flow.spec.ts`)
- Login como administrador
- Acceder al panel de administración
- Ver estadísticas del sistema
- Buscar usuarios
- Banear usuario con razón
- Verificar que usuario baneado no puede hacer login
- Desbanear usuario
- Ver actividad reciente
- Gestionar reportes
- Validar que usuarios normales NO pueden acceder

---

## Fixtures y Helpers

### Fixtures de Usuarios

```typescript
import {
  REGULAR_USER,      // Usuario regular
  ADMIN_USER,        // Administrador
  GUIDE_USER,        // Guía turístico
  SELLER_USER,       // Vendedor
  USER_TO_BAN,       // Usuario para tests de baneo
  STRIPE_TEST_CARDS, // Tarjetas de prueba de Stripe
  TIMEOUTS           // Timeouts configurados
} from './fixtures/test-users';
```

### Helpers de Autenticación

```typescript
import { login, register, logout } from './helpers/auth';

// Ejemplo de uso
await login(page, REGULAR_USER);
await register(page, NEW_USER_DATA);
await logout(page);
```

### Tarjetas de Prueba de Stripe

```typescript
STRIPE_TEST_CARDS.SUCCESS              // 4242 4242 4242 4242 - Pago exitoso
STRIPE_TEST_CARDS.DECLINED             // 4000 0000 0000 0002 - Pago rechazado
STRIPE_TEST_CARDS.INSUFFICIENT_FUNDS   // 4000 0000 0000 9995 - Fondos insuficientes
STRIPE_TEST_CARDS.REQUIRES_AUTHENTICATION // 4000 0025 0000 3155 - Requiere autenticación
```

---

## Escribir Nuevos Tests

### Estructura Básica

```typescript
import { test, expect } from '@playwright/test';
import { login } from './helpers/auth';
import { REGULAR_USER, TIMEOUTS } from './fixtures/test-users';

test.describe('Mi Feature', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('debe hacer algo específico', async ({ page }) => {
    // Arrange: Preparar
    await login(page, REGULAR_USER);

    // Act: Ejecutar acción
    await page.getByRole('button', { name: /mi botón/i }).click();

    // Assert: Verificar resultado
    await expect(page.getByText(/resultado esperado/i))
      .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });
});
```

### Test Steps (Para tests largos)

```typescript
test('Flujo completo de usuario', async ({ page }) => {
  await test.step('1. Login', async () => {
    await login(page, REGULAR_USER);
  });

  await test.step('2. Navegar a experiencias', async () => {
    await page.goto('/#experiences');
  });

  await test.step('3. Seleccionar experiencia', async () => {
    await page.locator('[data-testid="experience-card"]').first().click();
  });

  await test.step('4. Verificar detalles', async () => {
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });
});
```

### Selectores Recomendados

Orden de preferencia:

1. **Por Rol** (mejor para accesibilidad):
```typescript
await page.getByRole('button', { name: /enviar/i });
await page.getByRole('textbox', { name: /email/i });
await page.getByRole('heading', { name: /título/i });
```

2. **Por Label** (ideal para formularios):
```typescript
await page.getByLabel(/nombre/i);
await page.getByLabel(/contraseña/i);
```

3. **Por Texto**:
```typescript
await page.getByText(/bienvenido/i);
```

4. **Por data-testid** (cuando no hay alternativa semántica):
```typescript
await page.locator('[data-testid="product-card"]');
```

5. **Por CSS** (último recurso):
```typescript
await page.locator('.product-card');
```

### Agregar data-testid a Componentes

```tsx
// En tu componente React
export function ProductCard({ product }: Props) {
  return (
    <div data-testid="product-card">
      <h3 data-testid="product-name">{product.name}</h3>
      <button data-testid="add-to-cart">Agregar al carrito</button>
    </div>
  );
}
```

---

## Debugging

### 1. Playwright UI Mode (RECOMENDADO)

```bash
npm run test:e2e:ui
```

Ventajas:
- Ver cada paso del test en tiempo real
- Time travel: ir hacia atrás y adelante
- Inspeccionar DOM en cada paso
- Ver network requests y responses
- Pick locator: seleccionar elementos visualmente

### 2. Debug Mode con Inspector

```bash
npm run test:e2e:debug
```

Abre Playwright Inspector donde puedes:
- Ejecutar paso a paso
- Pausar ejecución
- Ver selectores
- Evaluar expresiones

### 3. Headed Mode (Ver navegador)

```bash
npm run test:e2e:headed
```

Ejecuta tests con el navegador visible.

### 4. Pausar Test Manualmente

```typescript
test('mi test', async ({ page }) => {
  await page.goto('/');

  // Pausar aquí para inspeccionar
  await page.pause();

  await page.click('button');
});
```

### 5. Screenshots y Videos

Los tests automáticamente capturan:
- Screenshot cuando falla
- Video cuando falla (si está configurado)

Ubicación: `test-results/`

Ver configuración en `playwright.config.ts`:

```typescript
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry',
}
```

### 6. Console Logs del Navegador

```typescript
// Escuchar logs de consola del navegador
page.on('console', msg => {
  console.log('Browser console:', msg.text());
});

// Evaluar código en el navegador
const title = await page.evaluate(() => document.title);
console.log('Page title:', title);
```

### 7. Trace Viewer

Si tienes un trace file:

```bash
npx playwright show-trace trace.zip
```

---

## Mejores Prácticas

### 1. Tests Independientes

```typescript
// ✅ Bueno: cada test se configura solo
test('editar usuario', async ({ page }) => {
  const user = await createTestUser(); // Setup propio
  await editUser(page, user);
});

// ❌ Malo: depende de otro test
let globalUser;
test('crear usuario', async () => {
  globalUser = await createUser();
});
test('editar usuario', async () => {
  await editUser(globalUser); // Dependencia
});
```

### 2. Usar Esperas Inteligentes

```typescript
// ✅ Bueno: esperar condición específica
await expect(page.getByRole('button')).toBeEnabled();
await page.getByRole('button').click();

// ❌ Malo: espera arbitraria
await page.waitForTimeout(3000);
await page.click('button');
```

### 3. Selectores Resilientes

```typescript
// ✅ Bueno: selector semántico y flexible
await page.getByRole('button', { name: /agregar al carrito/i });

// ❌ Malo: selector frágil
await page.locator('body > div:nth-child(3) > button.btn-primary');
```

### 4. Assertions Descriptivas

```typescript
// ✅ Bueno: mensaje claro
await expect(page.getByText(/pedido confirmado/i))
  .toBeVisible({ timeout: 10000 });

// Aceptable pero menos claro
await expect(page.locator('.success-msg')).toBeVisible();
```

### 5. Cleanup

```typescript
test.afterEach(async ({ page }) => {
  // Limpiar estado si es necesario
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
});
```

### 6. Organizar con describe

```typescript
test.describe('Experiencias', () => {
  test.describe('Como usuario regular', () => {
    test('puede ver listado', async ({ page }) => { });
    test('puede reservar', async ({ page }) => { });
  });

  test.describe('Como guía', () => {
    test('puede crear experiencia', async ({ page }) => { });
    test('puede editar experiencia', async ({ page }) => { });
  });
});
```

---

## Configuración Avanzada

### playwright.config.ts

```typescript
export default defineConfig({
  testDir: './test/e2e',
  timeout: 30 * 1000,        // Timeout por test
  expect: { timeout: 5000 }, // Timeout de expects
  fullyParallel: false,      // Tests en paralelo
  retries: process.env.CI ? 2 : 0, // Reintentos en CI
  workers: 1,                // Workers (1 = secuencial)

  use: {
    baseURL: 'http://localhost:5173',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },

  // Navegadores a probar
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    // { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],

  // Auto-start dev server
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## CI/CD

### GitHub Actions

Ejemplo de workflow:

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright
        run: npx playwright install --with-deps chromium

      - name: Start backend
        run: |
          cd backend
          npm ci
          npm start &
          sleep 5

      - name: Start frontend
        run: |
          npm run build
          npm run preview &
          sleep 5

      - name: Run E2E tests
        run: npm run test:e2e

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## Comandos Útiles

```bash
# Generar código automáticamente
npm run test:e2e:codegen

# Ver último reporte
npm run test:e2e:report

# Solo tests que fallaron
npx playwright test --last-failed

# Tests en paralelo
npx playwright test --workers=4

# Headed con slow motion
npx playwright test --headed --slow-mo=1000

# Lista de todos los tests
npx playwright test --list

# Ejecutar test específico
npx playwright test test/e2e/booking-flow.spec.ts:15

# Actualizar screenshots (visual regression)
npx playwright test --update-snapshots
```

---

## Troubleshooting

### El test no encuentra un elemento

1. Ejecuta en modo UI: `npm run test:e2e:ui`
2. Usa el "Pick Locator" para encontrar el selector correcto
3. Verifica que el elemento existe en ese momento
4. Agrega espera explícita si es contenido dinámico

### Tests pasan localmente pero fallan en CI

1. Verifica URLs (localhost vs. production)
2. Aumenta timeouts para CI más lenta
3. Revisa el trace en artifacts
4. Verifica que los servicios están iniciados

### Navegador no se cierra

```bash
# Linux/Mac
pkill -f chromium

# Windows
taskkill /F /IM chrome.exe
```

### Error: Browsercontext is closed

Asegúrate de no cerrar el page manualmente:

```typescript
// ❌ Malo
await page.close();

// ✅ Bueno: déjalo a Playwright
// No hacer nada, Playwright maneja el cleanup
```

---

## Recursos

- [Documentación de Playwright](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Selectors Guide](https://playwright.dev/docs/selectors)
- [Debugging Guide](https://playwright.dev/docs/debug)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

---

## Siguiente Pasos

1. Instalar Playwright browsers: `npx playwright install`
2. Iniciar backend y frontend
3. Ejecutar tests de setup: `npx playwright test setup`
4. Explorar Playwright UI: `npm run test:e2e:ui`
5. Escribir tu primer test

---

**Nota:** Si encuentras problemas, revisa primero que ambos servidores (frontend y backend) estén corriendo correctamente.
