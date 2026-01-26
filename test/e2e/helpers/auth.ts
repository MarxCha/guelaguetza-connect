import { Page, expect } from '@playwright/test';
import type { TestUser } from '../fixtures/test-users';

/**
 * Helper para iniciar sesión en la aplicación
 */
export async function login(page: Page, user: TestUser) {
  // Ir a la página de login
  await page.goto('/');

  // Buscar el botón de login y hacer click
  const loginButton = page.getByRole('button', { name: /iniciar sesión|login/i });
  if (await loginButton.isVisible()) {
    await loginButton.click();
  }

  // Esperar a que aparezca el formulario de login
  await expect(page.getByRole('heading', { name: /iniciar sesión|login/i })).toBeVisible();

  // Llenar formulario
  await page.getByLabel(/correo|email/i).fill(user.email);
  await page.getByLabel(/contraseña|password/i).fill(user.password);

  // Submit
  await page.getByRole('button', { name: /entrar|ingresar|login/i }).click();

  // Esperar a que se complete el login (verificar que aparezca elemento del usuario logueado)
  await expect(page.getByText(user.nombre, { exact: false })).toBeVisible({ timeout: 10000 });
}

/**
 * Helper para registrar un nuevo usuario
 */
export async function register(page: Page, user: TestUser) {
  // Ir a la página principal
  await page.goto('/');

  // Buscar el botón de registro
  const registerButton = page.getByRole('button', { name: /registrarse|registro|sign up/i });
  if (await registerButton.isVisible()) {
    await registerButton.click();
  }

  // Esperar al formulario de registro
  await expect(page.getByRole('heading', { name: /registro|registrarse|sign up/i })).toBeVisible();

  // Llenar formulario
  await page.getByLabel(/nombre/i).first().fill(user.nombre);
  await page.getByLabel(/apellido/i).fill(user.apellido);
  await page.getByLabel(/correo|email/i).fill(user.email);
  await page.getByLabel(/contraseña|password/i).first().fill(user.password);

  // Confirmar contraseña si existe el campo
  const confirmPasswordField = page.getByLabel(/confirmar contraseña|confirm password/i);
  if (await confirmPasswordField.isVisible().catch(() => false)) {
    await confirmPasswordField.fill(user.password);
  }

  // Submit
  await page.getByRole('button', { name: /registrarse|crear cuenta|sign up/i }).click();

  // Esperar a que se complete el registro
  await expect(page.getByText(user.nombre, { exact: false })).toBeVisible({ timeout: 10000 });
}

/**
 * Helper para cerrar sesión
 */
export async function logout(page: Page) {
  // Buscar menú de usuario o botón de logout
  const userMenuButton = page.getByRole('button', { name: /perfil|mi cuenta|usuario/i });

  if (await userMenuButton.isVisible()) {
    await userMenuButton.click();

    // Click en opción de cerrar sesión
    await page.getByRole('button', { name: /cerrar sesión|logout|salir/i }).click();
  } else {
    // Si no hay menú, buscar directamente el botón de logout
    await page.getByRole('button', { name: /cerrar sesión|logout|salir/i }).click();
  }

  // Verificar que se cerró la sesión
  await expect(page.getByRole('button', { name: /iniciar sesión|login/i })).toBeVisible({ timeout: 5000 });
}

/**
 * Helper para verificar que el usuario está autenticado
 */
export async function expectAuthenticated(page: Page, userName: string) {
  await expect(page.getByText(userName, { exact: false })).toBeVisible();
}

/**
 * Helper para verificar que el usuario NO está autenticado
 */
export async function expectNotAuthenticated(page: Page) {
  await expect(page.getByRole('button', { name: /iniciar sesión|login/i })).toBeVisible();
}
