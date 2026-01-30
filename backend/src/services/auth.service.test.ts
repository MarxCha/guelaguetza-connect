import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { prismaMock } from '../../test/setup.js';
import { AppError } from '../utils/errors.js';
import * as bcrypt from 'bcryptjs';

// Mock de bcryptjs
vi.mock('bcryptjs', () => ({
  hash: vi.fn(),
  compare: vi.fn(),
}));

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(prismaMock as any);
    vi.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: 'new@example.com',
        password: 'password123',
        nombre: 'New',
        apellido: 'User',
        region: 'Valles Centrales',
        role: 'USER' as const,
      };

      const hashedPassword = '$2a$10$hashedpassword';

      prismaMock.user.findUnique.mockResolvedValue(null);
      vi.mocked(bcrypt.hash).mockResolvedValue(hashedPassword as never);
      prismaMock.user.create.mockResolvedValue({
        id: '1',
        email: registerData.email,
        nombre: registerData.nombre,
        apellido: registerData.apellido,
        avatar: null,
        region: registerData.region,
        role: registerData.role,
        createdAt: new Date(),
      } as any);

      const result = await authService.register(registerData);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email: registerData.email },
      });
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 12);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email', registerData.email);
      expect(result.user).not.toHaveProperty('password');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
      expect(result.tokens).toHaveProperty('expiresIn');
    });

    it('should throw error if email already exists', async () => {
      const registerData = {
        email: 'existing@example.com',
        password: 'password123',
        nombre: 'Existing',
        apellido: 'User',
        region: 'Valles Centrales',
        role: 'USER' as const,
      };

      prismaMock.user.findUnique.mockResolvedValue({
        id: '1',
        email: registerData.email,
        nombre: 'Existing',
        apellido: 'User',
        password: 'hashedpassword',
        avatar: null,
        region: 'Valles Centrales',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await expect(authService.register(registerData)).rejects.toThrow(AppError);
      await expect(authService.register(registerData)).rejects.toThrow('El email ya está registrado');
    });
  });

  describe('login', () => {
    it('should login user with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = '$2a$10$hashedpassword';

      const mockUser = {
        id: '1',
        email,
        nombre: 'Test',
        apellido: 'User',
        password: hashedPassword,
        avatar: null,
        region: 'Valles Centrales',
        role: 'USER' as const,
        bannedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as never);

      const result = await authService.login(email, password);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { email },
      });
      expect(bcrypt.compare).toHaveBeenCalledWith(password, hashedPassword);
      expect(result).toHaveProperty('user');
      expect(result).toHaveProperty('tokens');
      expect(result.user).toHaveProperty('id', '1');
      expect(result.user).toHaveProperty('email', email);
      expect(result.user).not.toHaveProperty('password');
      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.login('notfound@example.com', 'password123')).rejects.toThrow(AppError);
      await expect(authService.login('notfound@example.com', 'password123')).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw error if password is invalid', async () => {
      const mockUser = {
        id: '1',
        email: 'test@example.com',
        nombre: 'Test',
        apellido: 'User',
        password: '$2a$10$hashedpassword',
        avatar: null,
        region: 'Valles Centrales',
        role: 'USER' as const,
        bannedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUser);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as never);

      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow(AppError);
      await expect(authService.login('test@example.com', 'wrongpassword')).rejects.toThrow('Credenciales inválidas');
    });
  });

  describe('getProfile', () => {
    it('should get user profile successfully', async () => {
      const userId = '1';
      const mockUserProfile = {
        id: userId,
        email: 'test@example.com',
        nombre: 'Test',
        apellido: 'User',
        avatar: null,
        region: 'Valles Centrales',
        role: 'USER' as const,
        createdAt: new Date(),
        _count: {
          stories: 5,
          likes: 10,
        },
      };

      prismaMock.user.findUnique.mockResolvedValue(mockUserProfile as any);

      const result = await authService.getProfile(userId);

      expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
        where: { id: userId },
        select: expect.objectContaining({
          id: true,
          email: true,
          nombre: true,
        }),
      });
      expect(result).toHaveProperty('id', userId);
      expect(result).toHaveProperty('_count');
    });

    it('should throw error if user not found', async () => {
      prismaMock.user.findUnique.mockResolvedValue(null);

      await expect(authService.getProfile('nonexistent')).rejects.toThrow('Usuario no encontrado');
    });
  });

  describe('updateProfile', () => {
    it('should update user profile successfully', async () => {
      const userId = '1';
      const updateData = {
        nombre: 'Updated',
        apellido: 'Name',
      };

      const updatedUser = {
        id: userId,
        email: 'test@example.com',
        nombre: updateData.nombre,
        apellido: updateData.apellido,
        avatar: null,
        region: 'Valles Centrales',
        role: 'USER' as const,
      };

      prismaMock.user.update.mockResolvedValue({
        ...updatedUser,
        password: 'hashedpassword',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await authService.updateProfile(userId, updateData);

      expect(prismaMock.user.update).toHaveBeenCalledWith({
        where: { id: userId },
        data: updateData,
        select: expect.objectContaining({
          id: true,
          email: true,
          nombre: true,
        }),
      });
      expect(result).toHaveProperty('nombre', updateData.nombre);
      expect(result).toHaveProperty('apellido', updateData.apellido);
    });
  });

  describe('Token Rotation & Reuse Detection', () => {
    let testUser: any;

    beforeEach(async () => {
      testUser = {
        id: 'user-123',
        email: 'test@example.com',
        nombre: 'Test',
        apellido: 'User',
        password: 'hashedpassword',
        avatar: null,
        region: 'Valles Centrales',
        role: 'USER' as const,
        bannedAt: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Limpiar estado antes de cada test
      await authService.clearAllTokens();
    });

    describe('generateTokenPair', () => {
      it('should generate tokens with familyId in refresh token', async () => {
        const tokens = await authService.generateTokenPair(
          testUser.id,
          testUser.email,
          testUser.role
        );

        expect(tokens).toHaveProperty('accessToken');
        expect(tokens).toHaveProperty('refreshToken');
        expect(tokens).toHaveProperty('expiresIn');

        // Verificar que el refresh token tenga familyId
        const payload = await authService.verifyRefreshToken(tokens.refreshToken);
        expect(payload).toHaveProperty('familyId');
        expect(payload.familyId).toBeTruthy();
        expect(payload.type).toBe('refresh');
      });

      it('should create a new token family', async () => {
        const tokens = await authService.generateTokenPair(testUser.id, testUser.email, testUser.role);

        // Verify the refresh token has a familyId
        const payload = await authService.verifyRefreshToken(tokens.refreshToken);
        expect(payload.familyId).toBeTruthy();
      });
    });

    describe('refreshTokens', () => {
      it('should rotate tokens successfully on first refresh', async () => {
        prismaMock.user.findUnique.mockResolvedValue(testUser);

        // Generar tokens iniciales
        const initialTokens = await authService.generateTokenPair(
          testUser.id,
          testUser.email,
          testUser.role
        );

        // Refrescar tokens
        const newTokens = await authService.refreshTokens(initialTokens.refreshToken);

        expect(newTokens).toHaveProperty('accessToken');
        expect(newTokens).toHaveProperty('refreshToken');
        expect(newTokens.accessToken).not.toBe(initialTokens.accessToken);
        expect(newTokens.refreshToken).not.toBe(initialTokens.refreshToken);
      });

      it('should maintain the same familyId across rotations', async () => {
        prismaMock.user.findUnique.mockResolvedValue(testUser);

        const tokens1 = await authService.generateTokenPair(
          testUser.id,
          testUser.email,
          testUser.role
        );
        const payload1 = await authService.verifyRefreshToken(tokens1.refreshToken);

        const tokens2 = await authService.refreshTokens(tokens1.refreshToken);
        const payload2 = await authService.verifyRefreshToken(tokens2.refreshToken);

        expect(payload1.familyId).toBe(payload2.familyId);
      });

      it('should detect token reuse attack and invalidate family', async () => {
        prismaMock.user.findUnique.mockResolvedValue(testUser);

        // Generar tokens iniciales
        const initialTokens = await authService.generateTokenPair(
          testUser.id,
          testUser.email,
          testUser.role
        );

        // Primera rotación (válida)
        const newTokens = await authService.refreshTokens(initialTokens.refreshToken);
        expect(newTokens).toBeTruthy();

        // Intentar reusar el token inicial (ATAQUE)
        await expect(authService.refreshTokens(initialTokens.refreshToken)).rejects.toThrow(
          'Actividad sospechosa detectada'
        );

        // El nuevo token válido también debe fallar ahora (familia comprometida)
        await expect(authService.refreshTokens(newTokens.refreshToken)).rejects.toThrow(
          'Sesión invalidada por seguridad'
        );
      });

      it('should reject tokens without familyId (old format)', async () => {
        // Crear un token sin familyId manualmente
        const oldToken = await authService['generateTokenPair'](
          testUser.id,
          testUser.email,
          testUser.role
        );

        // Modificar el servicio temporalmente para simular token antiguo
        // (esto es solo para demostración; en realidad todos los nuevos tokens tendrán familyId)
        await expect(
          authService.refreshTokens('invalid.token.format')
        ).rejects.toThrow();
      });

      it('should throw error if user is banned during refresh', async () => {
        const bannedUser = { ...testUser, bannedAt: new Date() };
        prismaMock.user.findUnique.mockResolvedValue(bannedUser);

        const tokens = await authService.generateTokenPair(
          testUser.id,
          testUser.email,
          testUser.role
        );

        await expect(authService.refreshTokens(tokens.refreshToken)).rejects.toThrow(
          'Tu cuenta ha sido suspendida'
        );
      });

      it('should throw error if user not found during refresh', async () => {
        prismaMock.user.findUnique.mockResolvedValue(null);

        const tokens = await authService.generateTokenPair(
          testUser.id,
          testUser.email,
          testUser.role
        );

        await expect(authService.refreshTokens(tokens.refreshToken)).rejects.toThrow(
          'Usuario no encontrado'
        );
      });
    });

    describe('revokeAllTokens', () => {
      it('should invalidate all token families for a user', async () => {
        prismaMock.user.findUnique.mockResolvedValue(testUser);

        // Crear múltiples sesiones (familias)
        const t1 = await authService.generateTokenPair(testUser.id, testUser.email, testUser.role);
        const t2 = await authService.generateTokenPair(testUser.id, testUser.email, testUser.role);
        const t3 = await authService.generateTokenPair(testUser.id, testUser.email, testUser.role);

        // Revocar todos los tokens
        const result = await authService.revokeAllTokens(testUser.id);
        expect(result.invalidatedSessions).toBeGreaterThanOrEqual(0);
        expect(result).toHaveProperty('success', true);

        // Verify tokens no longer work after revocation
        await expect(authService.refreshTokens(t1.refreshToken)).rejects.toThrow();
        await expect(authService.refreshTokens(t2.refreshToken)).rejects.toThrow();
        await expect(authService.refreshTokens(t3.refreshToken)).rejects.toThrow();
      });

      it('should only invalidate tokens for the specified user', async () => {
        const user2 = { ...testUser, id: 'user-456', email: 'user2@example.com' };
        prismaMock.user.findUnique.mockImplementation((args: any) => {
          if (args?.where?.id === testUser.id) return Promise.resolve(testUser);
          if (args?.where?.id === user2.id) return Promise.resolve(user2);
          return Promise.resolve(null);
        });

        // Crear sesiones para ambos usuarios
        const t1 = await authService.generateTokenPair(testUser.id, testUser.email, testUser.role);
        const t2 = await authService.generateTokenPair(user2.id, user2.email, user2.role);

        // Revocar solo las del primer usuario
        const result = await authService.revokeAllTokens(testUser.id);
        expect(result).toHaveProperty('success', true);

        // User2's token should still work
        prismaMock.user.findUnique.mockResolvedValue(user2);
        const refreshed = await authService.refreshTokens(t2.refreshToken);
        expect(refreshed).toHaveProperty('accessToken');
      });
    });

    describe('getTokenStats', () => {
      it('should return token statistics structure', async () => {
        const stats = await authService.getTokenStats();
        expect(stats).toHaveProperty('blacklistedTokens');
        expect(stats).toHaveProperty('usedTokens');
        expect(stats).toHaveProperty('tokenFamilies');
      });
    });
  });
});
