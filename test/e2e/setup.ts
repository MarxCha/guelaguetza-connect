import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../backend/src/app.js';
import { PrismaClient } from '@prisma/client';

let testApp: FastifyInstance;
let testPrisma: PrismaClient;

/**
 * Setup global para tests E2E
 * Crea instancia de app y limpia la BD de prueba
 */
beforeAll(async () => {
  // Crear app de prueba
  testApp = await buildApp();
  await testApp.ready();

  // Instancia de Prisma para tests
  testPrisma = new PrismaClient({
    datasourceUrl: process.env.DATABASE_URL,
  });

  await testPrisma.$connect();
});

/**
 * Cleanup global
 */
afterAll(async () => {
  await testPrisma.$disconnect();
  await testApp.close();
});

/**
 * Limpiar datos entre tests para evitar interferencias
 */
beforeEach(async () => {
  // Limpiar datos de prueba antes de cada test
  // IMPORTANTE: El orden importa debido a las relaciones FK
  await testPrisma.orderItem.deleteMany();
  await testPrisma.order.deleteMany();
  await testPrisma.cartItem.deleteMany();
  await testPrisma.cart.deleteMany();
  await testPrisma.productReview.deleteMany();
  await testPrisma.product.deleteMany();
  await testPrisma.sellerProfile.deleteMany();

  await testPrisma.experienceReview.deleteMany();
  await testPrisma.booking.deleteMany();
  await testPrisma.experienceTimeSlot.deleteMany();
  await testPrisma.experience.deleteMany();

  await testPrisma.activityLog.deleteMany();
  await testPrisma.notification.deleteMany();
  await testPrisma.userBadge.deleteMany();
  await testPrisma.userStats.deleteMany();
  await testPrisma.follow.deleteMany();
  await testPrisma.like.deleteMany();
  await testPrisma.comment.deleteMany();
  await testPrisma.story.deleteMany();
  await testPrisma.user.deleteMany();
});

/**
 * Exportar instancias para usar en tests
 */
export function getTestApp(): FastifyInstance {
  return testApp;
}

export function getTestPrisma(): PrismaClient {
  return testPrisma;
}

/**
 * Helper: Generar token JWT para autenticación
 */
export function generateAuthToken(userId: string): string {
  return testApp.jwt.sign({ userId });
}

/**
 * Helper: Hacer request autenticado
 */
export async function authenticatedRequest(
  method: string,
  url: string,
  userId: string,
  body?: any
) {
  const token = generateAuthToken(userId);

  return testApp.inject({
    method,
    url,
    headers: {
      authorization: `Bearer ${token}`,
    },
    payload: body,
  });
}
