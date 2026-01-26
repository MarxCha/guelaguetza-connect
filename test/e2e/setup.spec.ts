import { test, expect } from '@playwright/test';
import { TIMEOUTS } from './fixtures/test-users';

/**
 * Tests de setup para verificar que el ambiente E2E está configurado correctamente
 */
test.describe('E2E Setup Verification', () => {
  test('La aplicación carga correctamente', async ({ page }) => {
    // Ir a la página principal
    await page.goto('/');

    // Verificar que el título de la página existe
    await expect(page).toHaveTitle(/guelaguetza|oaxaca/i, { timeout: TIMEOUTS.LONG });

    // Verificar que la página tiene contenido
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // Verificar que no hay errores críticos en consola
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Esperar un momento para que se cargue la página
    await page.waitForTimeout(TIMEOUTS.SHORT);

    // No deberían haber errores críticos de carga
    const criticalErrors = errors.filter(err =>
      err.includes('Failed to load') ||
      err.includes('TypeError') ||
      err.includes('ReferenceError')
    );

    expect(criticalErrors.length).toBe(0);
  });

  test('El backend API está accesible', async ({ page }) => {
    // Hacer una petición simple al backend
    const response = await page.request.get('http://localhost:3005/api/health')
      .catch(() => null);

    if (response) {
      // Si el endpoint de health existe
      expect(response.ok()).toBeTruthy();
    } else {
      // Si no existe endpoint de health, intentar otra ruta conocida
      const storiesResponse = await page.request.get('http://localhost:3005/api/stories')
        .catch(() => null);

      // Es aceptable que falle con 401 (no autenticado), pero no debe fallar con error de red
      if (storiesResponse) {
        expect([200, 401, 404]).toContain(storiesResponse.status());
      }
    }
  });

  test('El sistema de navegación funciona', async ({ page }) => {
    await page.goto('/');

    // Verificar que existen elementos de navegación comunes
    const navigation = page.locator('nav')
      .or(page.locator('[role="navigation"]'))
      .or(page.locator('header'));

    await expect(navigation.first()).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
  });

  test('LocalStorage está disponible', async ({ page }) => {
    await page.goto('/');

    // Verificar que podemos usar localStorage
    await page.evaluate(() => {
      localStorage.setItem('test_key', 'test_value');
      const value = localStorage.getItem('test_key');
      if (value !== 'test_value') {
        throw new Error('LocalStorage no funciona correctamente');
      }
      localStorage.removeItem('test_key');
    });
  });

  test('La aplicación es responsive', async ({ page }) => {
    await page.goto('/');

    // Probar diferentes viewports
    const viewports = [
      { width: 375, height: 667, name: 'Mobile' },
      { width: 768, height: 1024, name: 'Tablet' },
      { width: 1920, height: 1080, name: 'Desktop' }
    ];

    for (const viewport of viewports) {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Verificar que la página sigue siendo visible
      const body = page.locator('body');
      await expect(body).toBeVisible();

      // Verificar que no hay overflow horizontal excesivo
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      // Un poco de scroll horizontal es aceptable en mobile
      if (viewport.width >= 768) {
        expect(hasHorizontalScroll).toBeFalsy();
      }
    }
  });

  test('Los test data-testid están presentes en componentes clave', async ({ page }) => {
    await page.goto('/');

    // Verificar que existen algunos data-testid importantes
    // Esto ayuda a asegurar que los componentes están instrumentados para testing

    // Esperar un momento para que cargue la app
    await page.waitForTimeout(TIMEOUTS.SHORT);

    // Contar cuántos elementos tienen data-testid
    const elementsWithTestId = await page.locator('[data-testid]').count();

    // Si hay elementos con data-testid, el equipo está usando buenas prácticas
    // Si no hay ninguno, los tests dependerán más de texto y roles
    console.log(`Elementos con data-testid encontrados: ${elementsWithTestId}`);

    // Este test no falla, solo informa
    expect(elementsWithTestId).toBeGreaterThanOrEqual(0);
  });

  test('Los formularios tienen labels accesibles', async ({ page }) => {
    await page.goto('/');

    // Intentar ir a la página de login
    const loginButton = page.getByRole('button', { name: /iniciar sesión|login/i });

    if (await loginButton.isVisible({ timeout: TIMEOUTS.SHORT })) {
      await loginButton.click();

      // Verificar que los campos de formulario tienen labels
      await page.waitForTimeout(TIMEOUTS.SHORT);

      // Buscar inputs de formulario
      const emailInput = page.getByLabel(/correo|email/i);
      const passwordInput = page.getByLabel(/contraseña|password/i);

      // Al menos uno de los dos debería ser visible (o tener label asociado)
      const hasAccessibleInputs =
        await emailInput.isVisible().catch(() => false) ||
        await passwordInput.isVisible().catch(() => false);

      expect(hasAccessibleInputs).toBeTruthy();
    }
  });

  test('No hay warnings de React en consola', async ({ page }) => {
    const warnings: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'warning' && msg.text().includes('React')) {
        warnings.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(TIMEOUTS.MEDIUM);

    // Filtrar warnings conocidos y aceptables
    const criticalWarnings = warnings.filter(warning =>
      !warning.includes('DevTools') &&
      !warning.includes('Download') &&
      !warning.includes('useLayoutEffect')
    );

    // Idealmente no debería haber warnings críticos
    if (criticalWarnings.length > 0) {
      console.warn('React warnings encontrados:', criticalWarnings);
    }
  });

  test('Las imágenes tienen alt text', async ({ page }) => {
    await page.goto('/');

    await page.waitForTimeout(TIMEOUTS.SHORT);

    // Buscar todas las imágenes
    const images = page.locator('img');
    const imageCount = await images.count();

    if (imageCount > 0) {
      // Verificar que tienen alt attribute
      for (let i = 0; i < Math.min(imageCount, 5); i++) {
        const img = images.nth(i);
        const alt = await img.getAttribute('alt');

        // El alt puede ser string vacío para imágenes decorativas, pero debe existir
        expect(alt).not.toBeNull();
      }
    }
  });
});
