import { FastifyRequest, FastifyReply, FastifyPluginAsync } from 'fastify';
import fp from 'fastify-plugin';
import { UserRole } from '@prisma/client';
import { AuthService } from '../services/auth.service.js';
import { getTokenBlacklistService } from '../services/token-blacklist.service.js';

// ============================================
// TIPOS E INTERFACES
// ============================================

export interface AuthenticatedUser {
  id: string;
  userId: string; // Alias for backward compatibility
  email: string;
  role: UserRole;
  bannedAt: Date | null;
}

// Extender FastifyRequest para incluir información de autenticación
declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser;
    isAuthenticated: boolean;
  }
}

// ============================================
// UTILIDADES
// ============================================

/**
 * Extrae el token Bearer del header Authorization
 */
function extractBearerToken(authHeader?: string): string | null {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
}

// ============================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================

/**
 * Middleware principal de autenticación
 * Verifica el token JWT, valida en blacklist y agrega el usuario al request
 *
 * USO:
 * fastify.get('/protected', { preHandler: [authenticate] }, async (req, reply) => {
 *   // req.user está disponible y autenticado
 * });
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extraer token del header
    const token = extractBearerToken(request.headers.authorization);

    if (!token) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token not provided',
      });
    }

    // Obtener servicios
    const authService = new AuthService(request.server.prisma);
    const blacklistService = getTokenBlacklistService();

    // Verificar token JWT
    let payload;
    try {
      payload = await authService.verifyAccessToken(token);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Invalid token';
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: message.includes('expired') ? 'Token expired' : 'Invalid token',
      });
    }

    // Verificar que el token no esté en blacklist
    const isBlacklisted = await blacklistService.isBlacklisted(payload.jti);
    if (isBlacklisted) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Token has been revoked',
      });
    }

    // Obtener información completa del usuario desde la BD
    const user = await request.server.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        bannedAt: true,
      },
    });

    if (!user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'User not found',
      });
    }

    // Verificar si el usuario está baneado
    if (user.bannedAt) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: 'Your account has been suspended',
      });
    }

    // Agregar usuario al request
    request.user = {
      ...user,
      userId: user.id, // Alias for backward compatibility
    };
    request.isAuthenticated = true;
  } catch (error) {
    request.server.log.error('Authentication error:', error);
    return reply.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: 'Authentication failed',
    });
  }
}

/**
 * Middleware de autenticación opcional
 * Si hay token, lo verifica y agrega el usuario
 * Si no hay token, continúa sin usuario
 *
 * USO:
 * fastify.get('/public', { preHandler: [optionalAuth] }, async (req, reply) => {
 *   if (req.isAuthenticated) {
 *     // Usuario autenticado
 *   } else {
 *     // Usuario anónimo
 *   }
 * });
 */
export async function optionalAuth(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Extraer token del header
  const token = extractBearerToken(request.headers.authorization);

  // Si no hay token, marcar como no autenticado y continuar
  if (!token) {
    request.isAuthenticated = false;
    return;
  }

  try {
    // Obtener servicios
    const authService = new AuthService(request.server.prisma);
    const blacklistService = getTokenBlacklistService();

    // Verificar token JWT
    const payload = await authService.verifyAccessToken(token);

    // Verificar blacklist
    const isBlacklisted = await blacklistService.isBlacklisted(payload.jti);
    if (isBlacklisted) {
      request.isAuthenticated = false;
      return;
    }

    // Obtener información del usuario
    const user = await request.server.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        bannedAt: true,
      },
    });

    if (!user || user.bannedAt) {
      request.isAuthenticated = false;
      return;
    }

    // Agregar usuario al request
    request.user = {
      ...user,
      userId: user.id,
    };
    request.isAuthenticated = true;
  } catch (error) {
    // En caso de error, simplemente marcar como no autenticado
    request.isAuthenticated = false;
  }
}

// ============================================
// MIDDLEWARE DE ROLES
// ============================================

/**
 * Factory para crear middleware que requiere roles específicos
 *
 * USO:
 * const requireAdmin = requireRole(['ADMIN']);
 * fastify.delete('/admin/users/:id', { preHandler: [authenticate, requireAdmin] }, ...);
 *
 * const requireSellerOrAdmin = requireRole(['SELLER', 'ADMIN']);
 * fastify.post('/products', { preHandler: [authenticate, requireSellerOrAdmin] }, ...);
 */
export function requireRole(allowedRoles: UserRole | UserRole[]) {
  const roles = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        statusCode: 401,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    if (!roles.includes(request.user.role)) {
      return reply.status(403).send({
        statusCode: 403,
        error: 'Forbidden',
        message: `Insufficient permissions. Required roles: ${roles.join(', ')}`,
      });
    }
  };
}

/**
 * Middleware para requerir rol ADMIN
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Middleware para requerir rol SELLER o ADMIN
 */
export const requireSeller = requireRole([UserRole.SELLER, UserRole.ADMIN]);

/**
 * Middleware para requerir rol USER, SELLER o ADMIN (cualquier usuario autenticado)
 */
export const requireUser = requireRole([UserRole.USER, UserRole.SELLER, UserRole.ADMIN]);

// ============================================
// PLUGIN DE FASTIFY
// ============================================

/**
 * Plugin de Fastify que decora el request con propiedades de autenticación
 * y registra los middlewares como hooks reutilizables
 */
const authMiddlewarePlugin: FastifyPluginAsync = async (fastify) => {
  // Decorar FastifyRequest con valores por defecto
  fastify.decorateRequest('user', null);
  fastify.decorateRequest('isAuthenticated', false);

  // Decorar FastifyInstance con los middlewares (para compatibilidad con código existente)
  fastify.decorate('authenticate', authenticate);
  fastify.decorate('optionalAuth', optionalAuth);
  fastify.decorate('requireAdmin', requireAdmin);
  fastify.decorate('requireSeller', requireSeller);
  fastify.decorate('requireUser', requireUser);
  fastify.decorate('requireRole', requireRole);
};

// Exportar como plugin de Fastify
export default fp(authMiddlewarePlugin, {
  name: 'auth-middleware',
  dependencies: ['prisma'], // Depende del plugin de Prisma
});

// ============================================
// DECLARACIONES DE TIPOS PARA FASTIFY
// ============================================

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: typeof authenticate;
    optionalAuth: typeof optionalAuth;
    requireAdmin: typeof requireAdmin;
    requireSeller: typeof requireSeller;
    requireUser: typeof requireUser;
    requireRole: typeof requireRole;
  }
}
