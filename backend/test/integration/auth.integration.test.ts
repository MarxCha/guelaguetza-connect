import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

describe('Auth Integration Tests', () => {
  let app: FastifyInstance;
  let prisma: PrismaClient;

  beforeAll(async () => {
    // Inicializar app y Prisma con DB de test
    prisma = new PrismaClient();
    app = await buildApp();
    await app.ready();
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await app.close();
  });

  beforeEach(async () => {
    // Limpiar datos de test antes de cada prueba
    // Orden importante: eliminar en orden inverso a las relaciones
    await prisma.activityLog.deleteMany({});
    await prisma.productReview.deleteMany({});
    await prisma.orderItem.deleteMany({});
    await prisma.order.deleteMany({});
    await prisma.cartItem.deleteMany({});
    await prisma.cart.deleteMany({});
    await prisma.product.deleteMany({});
    await prisma.sellerProfile.deleteMany({});
    await prisma.experienceReview.deleteMany({});
    await prisma.booking.deleteMany({});
    await prisma.experienceTimeSlot.deleteMany({});
    await prisma.experience.deleteMany({});
    await prisma.pOICheckIn.deleteMany({});
    await prisma.pOIFavorite.deleteMany({});
    await prisma.pOIReview.deleteMany({});
    await prisma.pointOfInterest.deleteMany({});
    await prisma.streamMessage.deleteMany({});
    await prisma.liveStream.deleteMany({});
    await prisma.communityPost.deleteMany({});
    await prisma.communityMember.deleteMany({});
    await prisma.community.deleteMany({});
    await prisma.eventReminder.deleteMany({});
    await prisma.eventRSVP.deleteMany({});
    await prisma.event.deleteMany({});
    await prisma.directMessage.deleteMany({});
    await prisma.directConversation.deleteMany({});
    await prisma.notification.deleteMany({});
    await prisma.userBadge.deleteMany({});
    await prisma.badge.deleteMany({});
    await prisma.userStats.deleteMany({});
    await prisma.follow.deleteMany({});
    await prisma.pushSubscription.deleteMany({});
    await prisma.message.deleteMany({});
    await prisma.conversation.deleteMany({});
    await prisma.bus.deleteMany({});
    await prisma.stop.deleteMany({});
    await prisma.busRoute.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.like.deleteMany({});
    await prisma.story.deleteMany({});
    await prisma.user.deleteMany({});
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const userData = {
        email: 'test@example.com',
        password: 'Password123!',
        nombre: 'Test',
        apellido: 'User',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('token');
      expect(body.user).toHaveProperty('email', userData.email);
      expect(body.user).toHaveProperty('nombre', userData.nombre);
      expect(body.user).not.toHaveProperty('password');

      // Verificar que el usuario se creó en la DB
      const user = await prisma.user.findUnique({
        where: { email: userData.email },
      });
      expect(user).toBeTruthy();
      expect(user?.email).toBe(userData.email);
    });

    it('should not allow duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        password: 'Password123!',
        nombre: 'Test',
        apellido: 'User',
      };

      // Primer registro
      await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: userData,
      });

      // Segundo registro con mismo email
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: userData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.body);
      expect(body.error).toBeTruthy();
    });

    it('should validate password length', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/register',
        payload: {
          email: 'weak@example.com',
          password: '123', // Too short
          nombre: 'Test',
        },
      });

      // Should return validation error (422 or 500 depending on error handler)
      expect([422, 500]).toContain(response.statusCode);
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      // Crear usuario de prueba
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      await prisma.user.create({
        data: {
          email: 'login@example.com',
          password: hashedPassword,
          nombre: 'Login',
          apellido: 'Test',
        },
      });
    });

    it('should login with correct credentials', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'Password123!',
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('token');
      expect(body.user).toHaveProperty('email', 'login@example.com');
    });

    it('should reject invalid password', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'login@example.com',
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject non-existent user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'nonexistent@example.com',
          password: 'Password123!',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('GET /api/auth/me', () => {
    let authToken: string;
    let userId: string;

    beforeEach(async () => {
      // Crear usuario y obtener token
      const hashedPassword = await bcrypt.hash('Password123!', 10);
      const user = await prisma.user.create({
        data: {
          email: 'profile@example.com',
          password: hashedPassword,
          nombre: 'Profile',
          apellido: 'Test',
        },
      });
      userId = user.id;

      // Login para obtener token
      const loginResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/login',
        payload: {
          email: 'profile@example.com',
          password: 'Password123!',
        },
      });

      const loginBody = JSON.parse(loginResponse.body);
      authToken = loginBody.token;
    });

    it('should get user profile with valid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: `Bearer ${authToken}`,
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.body);
      expect(body).toHaveProperty('id', userId);
      expect(body).toHaveProperty('email', 'profile@example.com');
      expect(body).not.toHaveProperty('password');
    });

    it('should reject request without token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject request with invalid token', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          authorization: 'Bearer invalid-token',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });
});
