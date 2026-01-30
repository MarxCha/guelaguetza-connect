import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { AuthService } from '../services/auth.service.js';
import { registerSchema, loginSchema, updateProfileSchema } from '../schemas/auth.schema.js';
import { AppError } from '../utils/errors.js';

// Schemas adicionales
const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token es requerido'),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Contraseña actual es requerida'),
  newPassword: z.string().min(6, 'La nueva contraseña debe tener al menos 6 caracteres'),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  const authService = new AuthService(fastify.prisma);

  // Register - Devuelve tokens JWT modernos
  fastify.post('/register', async (request, reply) => {
    try {
      const data = registerSchema.parse(request.body);
      const result = await authService.register(data);

      return reply.status(201).send({
        success: true,
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
        // Legacy token para compatibilidad
        token: result.tokens.accessToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Login - Devuelve tokens JWT modernos
  fastify.post('/login', async (request, reply) => {
    try {
      const data = loginSchema.parse(request.body);
      const result = await authService.login(data.email, data.password);

      return reply.send({
        success: true,
        user: result.user,
        accessToken: result.tokens.accessToken,
        refreshToken: result.tokens.refreshToken,
        expiresIn: result.tokens.expiresIn,
        // Legacy token para compatibilidad
        token: result.tokens.accessToken,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Refresh tokens - Obtiene nuevos tokens con un refresh token válido
  fastify.post('/refresh', async (request, reply) => {
    try {
      const data = refreshTokenSchema.parse(request.body);
      const tokens = await authService.refreshTokens(data.refreshToken);

      return reply.send({
        success: true,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      });
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Get profile (authenticated)
  fastify.get('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const user = await authService.getProfile(request.user.userId);
      return reply.send(user);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Update profile (authenticated)
  fastify.put('/me', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = updateProfileSchema.parse(request.body);
      const user = await authService.updateProfile(request.user.userId, data);
      return reply.send(user);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Change password (authenticated)
  fastify.post('/change-password', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const data = changePasswordSchema.parse(request.body);
      const result = await authService.changePassword(
        request.user.userId,
        data.currentPassword,
        data.newPassword
      );
      return reply.send(result);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });

  // Logout from all devices (authenticated)
  fastify.post('/logout-all', { preHandler: [fastify.authenticate] }, async (request, reply) => {
    try {
      const result = await authService.revokeAllTokens(request.user.userId);
      return reply.send(result);
    } catch (error) {
      if (error instanceof AppError) {
        return reply.status(error.statusCode).send({ error: error.message });
      }
      throw error;
    }
  });
};

export default authRoutes;
