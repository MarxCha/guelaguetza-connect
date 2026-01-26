import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AuthService } from './auth.service.js';
import { prismaMock } from '../../test/setup.js';
import { AppError } from '../utils/errors.js';
import bcrypt from 'bcryptjs';

// Mock de bcryptjs
vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
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
      expect(bcrypt.hash).toHaveBeenCalledWith(registerData.password, 10);
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('email', registerData.email);
      expect(result).not.toHaveProperty('password');
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
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('email', email);
      expect(result).not.toHaveProperty('password');
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
});
