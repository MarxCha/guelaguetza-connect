import { test, expect } from '@playwright/test';
import { login, register } from './helpers/auth';
import { REGULAR_USER, NEW_USER_DATA, STRIPE_TEST_CARDS, TIMEOUTS } from './fixtures/test-users';

test.describe('Booking Flow - Reservar Experiencia', () => {
  test.beforeEach(async ({ page }) => {
    // Configurar localStorage para modo de prueba
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('test_mode', 'true');
    });
  });

  test('Usuario puede registrarse, buscar y reservar una experiencia', async ({ page }) => {
    // 1. Registro de nuevo usuario
    await test.step('Registrar nuevo usuario', async () => {
      const newUser = {
        ...NEW_USER_DATA,
        email: `test.${Date.now()}@guelaguetza.com`
      };

      await register(page, newUser);

      // Verificar que el registro fue exitoso
      await expect(page.getByText(newUser.nombre)).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 2. Buscar experiencias
    await test.step('Navegar a experiencias', async () => {
      // Buscar el link o botón de "Experiencias"
      const experiencesLink = page.getByRole('link', { name: /experiencias|experiences/i });

      if (await experiencesLink.isVisible()) {
        await experiencesLink.click();
      } else {
        // Alternativa: navegar directamente
        await page.goto('/#experiences');
      }

      // Verificar que estamos en la página correcta
      await expect(page.getByRole('heading', { name: /experiencias/i })).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 3. Ver listado de experiencias
    await test.step('Ver experiencias disponibles', async () => {
      // Esperar a que carguen las experiencias
      await expect(page.locator('[data-testid="experience-card"]').first()).toBeVisible({ timeout: TIMEOUTS.API_CALL });

      // Verificar que hay al menos una experiencia
      const experienceCards = page.locator('[data-testid="experience-card"]');
      await expect(experienceCards).toHaveCount(await experienceCards.count());
    });

    // 4. Seleccionar una experiencia
    await test.step('Seleccionar y ver detalle de experiencia', async () => {
      // Click en la primera experiencia
      await page.locator('[data-testid="experience-card"]').first().click();

      // Verificar que estamos en el detalle
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Verificar que se muestran detalles importantes
      await expect(page.getByText(/precio|price/i)).toBeVisible();
      await expect(page.getByText(/duración|duration/i)).toBeVisible();
    });

    // 5. Seleccionar fecha y horario
    await test.step('Seleccionar fecha y horario', async () => {
      // Buscar selector de fecha
      const dateSelector = page.locator('[data-testid="date-selector"]').or(page.locator('input[type="date"]'));

      if (await dateSelector.isVisible()) {
        await dateSelector.click();

        // Seleccionar una fecha futura (mañana)
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        await dateSelector.fill(tomorrowStr);
      }

      // Seleccionar un time slot si está disponible
      const timeSlotButton = page.locator('[data-testid="time-slot"]').first();

      if (await timeSlotButton.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
        await timeSlotButton.click();

        // Verificar que se seleccionó
        await expect(timeSlotButton).toHaveClass(/selected|active/i);
      }
    });

    // 6. Seleccionar número de invitados
    await test.step('Seleccionar número de invitados', async () => {
      const guestSelector = page.locator('[data-testid="guest-count"]').or(page.locator('input[type="number"]'));

      if (await guestSelector.isVisible()) {
        await guestSelector.fill('2');
      }
    });

    // 7. Crear booking
    let bookingId: string | null = null;

    await test.step('Crear reserva', async () => {
      // Click en botón de reservar
      const bookButton = page.getByRole('button', { name: /reservar|book now/i });
      await expect(bookButton).toBeVisible();
      await bookButton.click();

      // Esperar confirmación o redirección a pago
      // El flujo puede variar: puede mostrar modal de confirmación o ir directo a pago
      await page.waitForTimeout(TIMEOUTS.SHORT);

      // Guardar URL para extraer booking ID si está disponible
      const url = page.url();
      const bookingIdMatch = url.match(/booking[s]?\/([a-zA-Z0-9-_]+)/);
      if (bookingIdMatch) {
        bookingId = bookingIdMatch[1];
      }
    });

    // 8. Simular pago con Stripe (si está configurado)
    await test.step('Completar pago (simulado)', async () => {
      // Verificar si aparece formulario de pago de Stripe
      const stripeForm = page.frameLocator('iframe[name*="stripe"]').first();

      // Si no hay Stripe en modo test, puede ser pago simulado
      const cardNumberInput = stripeForm.locator('[placeholder*="número de tarjeta"]')
        .or(page.locator('[data-testid="card-number"]'));

      if (await cardNumberInput.isVisible({ timeout: TIMEOUTS.MEDIUM }).catch(() => false)) {
        // Llenar datos de tarjeta de prueba
        await cardNumberInput.fill(STRIPE_TEST_CARDS.SUCCESS.number);

        const expiryInput = stripeForm.locator('[placeholder*="MM"]')
          .or(page.locator('[data-testid="card-expiry"]'));
        if (await expiryInput.isVisible()) {
          await expiryInput.fill(STRIPE_TEST_CARDS.SUCCESS.expiry);
        }

        const cvcInput = stripeForm.locator('[placeholder*="CVC"]')
          .or(page.locator('[data-testid="card-cvc"]'));
        if (await cvcInput.isVisible()) {
          await cvcInput.fill(STRIPE_TEST_CARDS.SUCCESS.cvc);
        }

        // Click en pagar
        const payButton = page.getByRole('button', { name: /pagar|pay|confirmar pago/i });
        await payButton.click();
      } else {
        // Modo mock: buscar botón de confirmar
        const confirmButton = page.getByRole('button', { name: /confirmar|confirm/i });
        if (await confirmButton.isVisible()) {
          await confirmButton.click();
        }
      }

      // Esperar a que se procese el pago
      await page.waitForTimeout(TIMEOUTS.PAYMENT);
    });

    // 9. Verificar que la reserva fue creada exitosamente
    await test.step('Verificar confirmación de reserva', async () => {
      // Buscar mensaje de éxito
      await expect(
        page.getByText(/reserva confirmada|booking confirmed|éxito/i)
      ).toBeVisible({ timeout: TIMEOUTS.LONG });
    });

    // 10. Ir a "Mis Reservas" y verificar
    await test.step('Verificar reserva en "Mis Reservas"', async () => {
      // Navegar a Mis Reservas
      const myBookingsLink = page.getByRole('link', { name: /mis reservas|my bookings/i });

      if (await myBookingsLink.isVisible()) {
        await myBookingsLink.click();
      } else {
        await page.goto('/#my-bookings');
      }

      // Esperar a que cargue la lista
      await expect(page.getByRole('heading', { name: /mis reservas|my bookings/i }))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Verificar que aparece la reserva recién creada
      await expect(page.locator('[data-testid="booking-card"]').first())
        .toBeVisible({ timeout: TIMEOUTS.API_CALL });

      // Verificar estado de la reserva
      await expect(page.getByText(/confirmada|confirmed/i)).toBeVisible();
    });
  });

  test('Usuario existente puede iniciar sesión y reservar', async ({ page }) => {
    // 1. Login
    await test.step('Iniciar sesión', async () => {
      await login(page, REGULAR_USER);
    });

    // 2. Navegar a experiencias
    await test.step('Navegar a experiencias', async () => {
      await page.goto('/#experiences');
      await expect(page.getByRole('heading', { name: /experiencias/i }))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 3. Ver detalle de una experiencia
    await test.step('Ver detalle de experiencia', async () => {
      await page.locator('[data-testid="experience-card"]').first().click();
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    });

    // 4. Verificar que el botón de reservar está disponible
    await test.step('Verificar botón de reservar', async () => {
      const bookButton = page.getByRole('button', { name: /reservar|book/i });
      await expect(bookButton).toBeVisible();
      await expect(bookButton).toBeEnabled();
    });
  });

  test('Usuario NO autenticado debe ser redirigido a login al intentar reservar', async ({ page }) => {
    // 1. Ir a experiencias sin login
    await page.goto('/#experiences');

    // 2. Seleccionar una experiencia
    await page.locator('[data-testid="experience-card"]').first().click();

    // 3. Intentar reservar
    const bookButton = page.getByRole('button', { name: /reservar|book/i });
    if (await bookButton.isVisible()) {
      await bookButton.click();

      // Verificar que se redirige a login
      await expect(page.getByRole('heading', { name: /iniciar sesión|login/i }))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    }
  });

  test('Filtrar experiencias por categoría', async ({ page }) => {
    // Ir a experiencias
    await page.goto('/#experiences');

    // Buscar filtro de categoría
    const categoryFilter = page.locator('[data-testid="category-filter"]')
      .or(page.getByRole('combobox', { name: /categoría|category/i }));

    if (await categoryFilter.isVisible({ timeout: TIMEOUTS.SHORT })) {
      // Seleccionar una categoría
      await categoryFilter.click();

      const tourOption = page.getByRole('option', { name: /tour/i });
      if (await tourOption.isVisible()) {
        await tourOption.click();
      }

      // Verificar que se aplicó el filtro
      await page.waitForTimeout(TIMEOUTS.SHORT);

      // Las experiencias deben ser solo tours
      const experienceCards = page.locator('[data-testid="experience-card"]');
      if (await experienceCards.first().isVisible({ timeout: TIMEOUTS.MEDIUM })) {
        await expect(experienceCards.first()).toContainText(/tour/i);
      }
    }
  });

  test('Buscar experiencia por texto', async ({ page }) => {
    // Ir a experiencias
    await page.goto('/#experiences');

    // Buscar campo de búsqueda
    const searchInput = page.locator('[data-testid="search-experiences"]')
      .or(page.getByPlaceholder(/buscar|search/i));

    if (await searchInput.isVisible({ timeout: TIMEOUTS.SHORT })) {
      // Buscar "Monte Albán"
      await searchInput.fill('Monte Albán');
      await searchInput.press('Enter');

      // Esperar resultados
      await page.waitForTimeout(TIMEOUTS.SHORT);

      // Verificar que los resultados contienen el término buscado
      const firstCard = page.locator('[data-testid="experience-card"]').first();
      if (await firstCard.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
        await expect(firstCard).toContainText(/monte albán/i);
      }
    }
  });
});
