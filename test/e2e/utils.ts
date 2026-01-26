/**
 * Utilidades comunes para tests E2E
 */

import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';

/**
 * Espera un número de milisegundos
 * Útil para debugging o esperar procesos asíncronos
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Formatea una respuesta JSON para logging
 */
export function formatResponse(response: any): string {
  try {
    const body = JSON.parse(response.body);
    return JSON.stringify(
      {
        statusCode: response.statusCode,
        headers: response.headers,
        body,
      },
      null,
      2
    );
  } catch {
    return JSON.stringify(
      {
        statusCode: response.statusCode,
        headers: response.headers,
        body: response.body,
      },
      null,
      2
    );
  }
}

/**
 * Extrae el token de una respuesta de login
 */
export function extractToken(loginResponse: any): string {
  const body = JSON.parse(loginResponse.body);
  return body.token;
}

/**
 * Crea headers de autenticación
 */
export function authHeaders(token: string): Record<string, string> {
  return {
    authorization: `Bearer ${token}`,
  };
}

/**
 * Verifica que una respuesta sea exitosa (2xx)
 */
export function expectSuccess(response: any): void {
  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(
      `Expected success status, got ${response.statusCode}: ${response.body}`
    );
  }
}

/**
 * Verifica que una respuesta sea un error (4xx, 5xx)
 */
export function expectError(response: any): void {
  if (response.statusCode >= 200 && response.statusCode < 400) {
    throw new Error(
      `Expected error status, got ${response.statusCode}: ${response.body}`
    );
  }
}

/**
 * Helper para hacer login y obtener token
 */
export async function login(
  app: FastifyInstance,
  email: string,
  password: string
): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: { email, password },
  });

  expectSuccess(response);
  return extractToken(response);
}

/**
 * Helper para crear un usuario y hacer login
 */
export async function createUserAndLogin(
  app: FastifyInstance,
  prisma: PrismaClient,
  userData: any
): Promise<{ userId: string; token: string }> {
  const user = await prisma.user.create({ data: userData });

  const response = await app.inject({
    method: 'POST',
    url: '/api/auth/login',
    payload: {
      email: userData.email,
      password: 'password123', // Asume que los fixtures usan esta password
    },
  });

  expectSuccess(response);

  return {
    userId: user.id,
    token: extractToken(response),
  };
}

/**
 * Helper para hacer request GET autenticado
 */
export async function authenticatedGet(
  app: FastifyInstance,
  url: string,
  token: string
) {
  return app.inject({
    method: 'GET',
    url,
    headers: authHeaders(token),
  });
}

/**
 * Helper para hacer request POST autenticado
 */
export async function authenticatedPost(
  app: FastifyInstance,
  url: string,
  token: string,
  payload: any
) {
  return app.inject({
    method: 'POST',
    url,
    headers: authHeaders(token),
    payload,
  });
}

/**
 * Helper para hacer request PUT autenticado
 */
export async function authenticatedPut(
  app: FastifyInstance,
  url: string,
  token: string,
  payload: any
) {
  return app.inject({
    method: 'PUT',
    url,
    headers: authHeaders(token),
    payload,
  });
}

/**
 * Helper para hacer request DELETE autenticado
 */
export async function authenticatedDelete(
  app: FastifyInstance,
  url: string,
  token: string
) {
  return app.inject({
    method: 'DELETE',
    url,
    headers: authHeaders(token),
  });
}

/**
 * Verifica que un array esté paginado correctamente
 */
export function expectPagination(body: any, expectedPage: number, expectedLimit: number) {
  if (!body.pagination) {
    throw new Error('Response does not have pagination object');
  }

  const { pagination } = body;

  if (pagination.page !== expectedPage) {
    throw new Error(`Expected page ${expectedPage}, got ${pagination.page}`);
  }

  if (pagination.limit !== expectedLimit) {
    throw new Error(`Expected limit ${expectedLimit}, got ${pagination.limit}`);
  }

  if (typeof pagination.total !== 'number') {
    throw new Error('Pagination total is not a number');
  }

  if (typeof pagination.totalPages !== 'number') {
    throw new Error('Pagination totalPages is not a number');
  }
}

/**
 * Calcula el total de items en un carrito
 */
export function calculateCartTotal(cartItems: any[]): number {
  return cartItems.reduce((total, item) => {
    const price = Number(item.product.price);
    const quantity = item.quantity;
    return total + price * quantity;
  }, 0);
}

/**
 * Genera una fecha futura a partir de hoy
 */
export function futureDate(daysFromNow: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date;
}

/**
 * Genera una fecha pasada a partir de hoy
 */
export function pastDate(daysAgo: number): Date {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date;
}

/**
 * Limpia todos los datos de prueba de la BD
 * Útil para cleanup manual
 */
export async function cleanupDatabase(prisma: PrismaClient): Promise<void> {
  // El orden importa debido a las relaciones FK
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.productReview.deleteMany();
  await prisma.product.deleteMany();
  await prisma.sellerProfile.deleteMany();

  await prisma.experienceReview.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.experienceTimeSlot.deleteMany();
  await prisma.experience.deleteMany();

  await prisma.activityLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.userBadge.deleteMany();
  await prisma.userStats.deleteMany();
  await prisma.follow.deleteMany();
  await prisma.like.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.story.deleteMany();
  await prisma.user.deleteMany();
}

/**
 * Genera un email único para tests
 */
export function uniqueEmail(prefix: string = 'test'): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `${prefix}_${timestamp}_${random}@example.com`;
}

/**
 * Genera un CUID único (compatible con Prisma)
 * Nota: Esto es un mock simple, Prisma genera CUIDs reales
 */
export function mockCuid(): string {
  return `test_${Date.now()}_${Math.random().toString(36).substring(7)}`;
}

/**
 * Snapshot de estado de BD para debugging
 */
export async function dbSnapshot(prisma: PrismaClient): Promise<any> {
  return {
    users: await prisma.user.count(),
    stories: await prisma.story.count(),
    bookings: await prisma.booking.count(),
    orders: await prisma.order.count(),
    products: await prisma.product.count(),
    experiences: await prisma.experience.count(),
  };
}

/**
 * Log formateado para debugging de tests
 */
export function debugLog(label: string, data: any): void {
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`📋 ${label}`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(JSON.stringify(data, null, 2));
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
}
