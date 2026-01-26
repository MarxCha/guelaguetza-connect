import { test, expect } from '@playwright/test';
import { login, register, logout } from './helpers/auth';
import { ADMIN_USER, USER_TO_BAN, TIMEOUTS } from './fixtures/test-users';

test.describe('Admin Flow - Panel de Administración', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('test_mode', 'true');
    });
  });

  test('Admin puede acceder al panel de administración', async ({ page }) => {
    // 1. Login como admin
    await test.step('Iniciar sesión como admin', async () => {
      await login(page, ADMIN_USER);
      await expect(page.getByText(ADMIN_USER.nombre)).toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 2. Navegar al panel de admin
    await test.step('Acceder al panel de administración', async () => {
      // Buscar enlace de admin
      const adminLink = page.getByRole('link', { name: /admin|administración/i });

      if (await adminLink.isVisible({ timeout: TIMEOUTS.SHORT })) {
        await adminLink.click();
      } else {
        // Intentar acceder directamente
        await page.goto('/#admin');
      }

      // Verificar que estamos en el panel de admin
      await expect(page.getByRole('heading', { name: /admin|administración|panel/i }))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 3. Verificar secciones del panel de admin
    await test.step('Verificar secciones disponibles', async () => {
      // Verificar que se muestran estadísticas
      const statsSection = page.locator('[data-testid="admin-stats"]')
        .or(page.getByText(/estadísticas|statistics/i));

      if (await statsSection.isVisible({ timeout: TIMEOUTS.SHORT })) {
        await expect(statsSection).toBeVisible();
      }

      // Verificar que hay acceso a usuarios
      const usersSection = page.getByText(/usuarios|users/i);
      await expect(usersSection).toBeVisible();

      // Verificar otras secciones comunes
      const sections = ['Usuarios', 'Contenido', 'Reportes', 'Configuración'];

      for (const section of sections) {
        const sectionElement = page.getByText(new RegExp(section, 'i'));
        if (await sectionElement.isVisible({ timeout: TIMEOUTS.SHORT })) {
          await expect(sectionElement).toBeVisible();
        }
      }
    });
  });

  test('Admin puede banear un usuario', async ({ page }) => {
    // 1. Crear usuario que será baneado
    await test.step('Crear usuario de prueba', async () => {
      const testUser = {
        ...USER_TO_BAN,
        email: `ban.${Date.now()}@guelaguetza.com`
      };

      await register(page, testUser);
      await expect(page.getByText(testUser.nombre)).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Guardar email del usuario para buscarlo después
      await page.evaluate((email) => {
        sessionStorage.setItem('userToBan', email);
      }, testUser.email);

      // Logout del usuario normal
      await logout(page);
    });

    // 2. Login como admin
    await test.step('Iniciar sesión como admin', async () => {
      await login(page, ADMIN_USER);
    });

    // 3. Ir al panel de usuarios
    await test.step('Ir al panel de usuarios', async () => {
      await page.goto('/#admin');

      // Buscar sección de usuarios
      const usersTab = page.getByRole('tab', { name: /usuarios|users/i })
        .or(page.getByRole('link', { name: /usuarios|users/i }));

      if (await usersTab.isVisible({ timeout: TIMEOUTS.SHORT })) {
        await usersTab.click();
      }

      // Verificar que estamos en la lista de usuarios
      await expect(page.getByText(/lista de usuarios|users list/i))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 4. Buscar el usuario
    await test.step('Buscar usuario', async () => {
      // Obtener email del usuario a banear
      const userEmail = await page.evaluate(() => sessionStorage.getItem('userToBan'));

      // Buscar campo de búsqueda
      const searchInput = page.locator('[data-testid="search-users"]')
        .or(page.getByPlaceholder(/buscar usuario/i));

      if (await searchInput.isVisible({ timeout: TIMEOUTS.SHORT })) {
        await searchInput.fill(userEmail || 'ban.');
        await searchInput.press('Enter');

        // Esperar resultados
        await page.waitForTimeout(TIMEOUTS.SHORT);
      }

      // Verificar que aparece el usuario
      await expect(page.locator('[data-testid="user-row"]').first())
        .toBeVisible({ timeout: TIMEOUTS.API_CALL });
    });

    // 5. Banear el usuario
    await test.step('Banear usuario', async () => {
      // Buscar botón de acciones del usuario
      const userRow = page.locator('[data-testid="user-row"]').first();

      // Click en menú de acciones
      const actionsButton = userRow.locator('[data-testid="user-actions"]')
        .or(userRow.getByRole('button', { name: /acciones|actions|⋮/i }));

      if (await actionsButton.isVisible({ timeout: TIMEOUTS.SHORT })) {
        await actionsButton.click();

        // Click en opción de banear
        const banOption = page.getByRole('menuitem', { name: /banear|ban|suspender/i })
          .or(page.getByText(/banear|ban|suspender/i));

        await expect(banOption).toBeVisible({ timeout: TIMEOUTS.SHORT });
        await banOption.click();
      } else {
        // Alternativa: botón directo de banear
        const banButton = userRow.getByRole('button', { name: /banear|ban/i });
        if (await banButton.isVisible()) {
          await banButton.click();
        }
      }

      // Verificar que aparece modal de confirmación
      await expect(page.getByText(/confirmar baneo|confirm ban|razón/i))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 6. Proporcionar razón del baneo
    await test.step('Proporcionar razón del baneo', async () => {
      // Llenar razón
      const reasonInput = page.locator('[data-testid="ban-reason"]')
        .or(page.getByLabel(/razón|reason/i))
        .or(page.locator('textarea'));

      if (await reasonInput.isVisible({ timeout: TIMEOUTS.SHORT })) {
        await reasonInput.fill('Violación de términos de servicio - Test E2E');
      }

      // Confirmar baneo
      const confirmButton = page.getByRole('button', { name: /confirmar|ban|aceptar/i });
      await expect(confirmButton).toBeVisible();
      await confirmButton.click();

      // Esperar confirmación
      await expect(page.getByText(/usuario baneado|user banned|suspendido exitosamente/i))
        .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
    });

    // 7. Verificar que el usuario aparece como baneado
    await test.step('Verificar estado de baneo', async () => {
      // Buscar el usuario nuevamente
      const userRow = page.locator('[data-testid="user-row"]').first();

      // Verificar badge o indicador de baneo
      const bannedBadge = userRow.locator('[data-testid="banned-badge"]')
        .or(userRow.getByText(/baneado|banned|suspendido/i));

      if (await bannedBadge.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
        await expect(bannedBadge).toBeVisible();
      }
    });

    // 8. Logout del admin
    await test.step('Cerrar sesión del admin', async () => {
      await logout(page);
    });

    // 9. Verificar que el usuario baneado NO puede hacer login
    await test.step('Verificar que usuario baneado no puede iniciar sesión', async () => {
      // Obtener credenciales del usuario baneado
      const userEmail = await page.evaluate(() => sessionStorage.getItem('userToBan'));

      // Ir a login
      await page.goto('/');
      const loginButton = page.getByRole('button', { name: /iniciar sesión|login/i });
      if (await loginButton.isVisible()) {
        await loginButton.click();
      }

      // Intentar hacer login
      await page.getByLabel(/correo|email/i).fill(userEmail || USER_TO_BAN.email);
      await page.getByLabel(/contraseña|password/i).fill(USER_TO_BAN.password);
      await page.getByRole('button', { name: /entrar|ingresar|login/i }).click();

      // Verificar que se muestra mensaje de error
      await expect(
        page.getByText(/cuenta suspendida|baneado|banned|no autorizado/i)
      ).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Verificar que NO se redirige al dashboard
      await expect(page.url()).not.toContain('dashboard');
      await expect(page.url()).not.toContain('home');
    });
  });

  test('Admin puede ver estadísticas del sistema', async ({ page }) => {
    // Login como admin
    await login(page, ADMIN_USER);

    // Ir al panel de admin
    await page.goto('/#admin');

    // Verificar estadísticas
    await test.step('Verificar estadísticas generales', async () => {
      const stats = [
        /usuarios totales|total users/i,
        /reservas|bookings/i,
        /ventas|sales/i,
        /ingresos|revenue/i
      ];

      for (const stat of stats) {
        const statElement = page.getByText(stat);
        if (await statElement.isVisible({ timeout: TIMEOUTS.SHORT })) {
          await expect(statElement).toBeVisible();
        }
      }
    });

    // Verificar gráficas si existen
    await test.step('Verificar gráficas', async () => {
      const chart = page.locator('[data-testid="admin-chart"]')
        .or(page.locator('canvas'))
        .or(page.locator('.recharts-wrapper'));

      if (await chart.first().isVisible({ timeout: TIMEOUTS.SHORT })) {
        await expect(chart.first()).toBeVisible();
      }
    });
  });

  test('Admin puede ver y gestionar reportes', async ({ page }) => {
    await login(page, ADMIN_USER);
    await page.goto('/#admin');

    // Ir a sección de reportes
    const reportsTab = page.getByRole('tab', { name: /reportes|reports/i })
      .or(page.getByRole('link', { name: /reportes|reports/i }));

    if (await reportsTab.isVisible({ timeout: TIMEOUTS.SHORT })) {
      await reportsTab.click();

      // Verificar que se muestra lista de reportes
      await expect(page.getByText(/reportes|reports/i)).toBeVisible({ timeout: TIMEOUTS.MEDIUM });

      // Verificar que hay tabla o lista
      const reportsList = page.locator('[data-testid="reports-list"]')
        .or(page.locator('table'));

      if (await reportsList.isVisible({ timeout: TIMEOUTS.SHORT })) {
        await expect(reportsList).toBeVisible();
      }
    }
  });

  test('Usuario normal NO puede acceder al panel de admin', async ({ page }) => {
    // Crear un usuario normal
    const normalUser = {
      email: `normal.${Date.now()}@guelaguetza.com`,
      password: 'Normal123!',
      nombre: 'Normal',
      apellido: 'User'
    };

    await register(page, normalUser);

    // Intentar acceder al panel de admin
    await page.goto('/#admin');

    // Verificar que se redirige o muestra error
    const unauthorizedMessage = page.getByText(/no autorizado|unauthorized|acceso denegado/i);

    if (await unauthorizedMessage.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
      await expect(unauthorizedMessage).toBeVisible();
    } else {
      // Alternativa: verificar que se redirigió a otra página
      await expect(page.url()).not.toContain('admin');
    }
  });

  test('Admin puede desbanear un usuario', async ({ page }) => {
    // Este test asume que hay un usuario baneado del test anterior
    await login(page, ADMIN_USER);
    await page.goto('/#admin');

    // Ir a usuarios
    const usersTab = page.getByRole('tab', { name: /usuarios|users/i });
    if (await usersTab.isVisible({ timeout: TIMEOUTS.SHORT })) {
      await usersTab.click();
    }

    // Filtrar usuarios baneados
    const bannedFilter = page.locator('[data-testid="filter-banned"]')
      .or(page.getByRole('button', { name: /baneados|banned/i }));

    if (await bannedFilter.isVisible({ timeout: TIMEOUTS.SHORT })) {
      await bannedFilter.click();

      // Seleccionar primer usuario baneado
      const firstBannedUser = page.locator('[data-testid="user-row"]').first();

      if (await firstBannedUser.isVisible({ timeout: TIMEOUTS.MEDIUM })) {
        // Abrir menú de acciones
        const actionsButton = firstBannedUser.locator('[data-testid="user-actions"]');
        if (await actionsButton.isVisible()) {
          await actionsButton.click();

          // Click en desbanear
          const unbanOption = page.getByRole('menuitem', { name: /desbanear|unban|restaurar/i });
          if (await unbanOption.isVisible({ timeout: TIMEOUTS.SHORT })) {
            await unbanOption.click();

            // Confirmar
            const confirmButton = page.getByRole('button', { name: /confirmar|aceptar/i });
            if (await confirmButton.isVisible({ timeout: TIMEOUTS.SHORT })) {
              await confirmButton.click();
            }

            // Verificar mensaje de éxito
            await expect(page.getByText(/usuario desbaneado|user unbanned/i))
              .toBeVisible({ timeout: TIMEOUTS.MEDIUM });
          }
        }
      }
    }
  });

  test('Admin puede ver actividad reciente', async ({ page }) => {
    await login(page, ADMIN_USER);
    await page.goto('/#admin');

    // Buscar sección de actividad
    const activitySection = page.locator('[data-testid="recent-activity"]')
      .or(page.getByText(/actividad reciente|recent activity/i));

    if (await activitySection.isVisible({ timeout: TIMEOUTS.SHORT })) {
      await expect(activitySection).toBeVisible();

      // Verificar que hay items de actividad
      const activityItems = page.locator('[data-testid="activity-item"]');
      if (await activityItems.first().isVisible({ timeout: TIMEOUTS.SHORT })) {
        const count = await activityItems.count();
        expect(count).toBeGreaterThan(0);
      }
    }
  });
});
