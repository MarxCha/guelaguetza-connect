import { describe, it, expect, beforeEach } from 'vitest';
import { AuthService } from '../../src/services/auth.service.js';
import { AppError, NotFoundError } from '../../src/utils/errors.js';
import { prisma } from './setup-integration.js';
import bcrypt from 'bcryptjs';

describe('AuthService Integration Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(prisma);
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerData = {
        email: `test-${Date.now()}@example.com`,
        password: 'Password123!',
        nombre: 'Juan',
        apellido: 'Pérez',
        region: 'Valles Centrales',
        role: 'USER' as const,
      };

      const result = await authService.register(registerData);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(registerData.email);
      expect(result.nombre).toBe(registerData.nombre);
      expect(result.apellido).toBe(registerData.apellido);
      expect(result).not.toHaveProperty('password'); // Password should not be exposed

      // Verificar que el usuario fue creado en la BD
      const userInDb = await prisma.user.findUnique({
        where: { email: registerData.email },
      });

      expect(userInDb).toBeTruthy();
      expect(userInDb?.email).toBe(registerData.email);

      // Verificar que la contraseña fue hasheada
      const isPasswordHashed = await bcrypt.compare(
        registerData.password,
        userInDb!.password
      );
      expect(isPasswordHashed).toBe(true);
    });

    it('should throw error if email already exists', async () => {
      const email = `duplicate-${Date.now()}@example.com`;

      // Registrar primer usuario
      await authService.register({
        email,
        password: 'Password123!',
        nombre: 'First',
        apellido: 'User',
        region: 'Valles Centrales',
        role: 'USER',
      });

      // Intentar registrar con el mismo email
      await expect(
        authService.register({
          email,
          password: 'DifferentPassword123!',
          nombre: 'Second',
          apellido: 'User',
          region: 'Valles Centrales',
          role: 'USER',
        })
      ).rejects.toThrow('El email ya está registrado');
    });

    it('should create user with default role USER if not specified', async () => {
      const result = await authService.register({
        email: `default-role-${Date.now()}@example.com`,
        password: 'Password123!',
        nombre: 'Default',
        apellido: 'Role',
        region: 'Valles Centrales',
      });

      expect(result.role).toBe('USER');
    });

    it('should create user with different roles', async () => {
      const hostResult = await authService.register({
        email: `host-${Date.now()}@example.com`,
        password: 'Password123!',
        nombre: 'Host',
        apellido: 'User',
        region: 'Valles Centrales',
        role: 'HOST',
      });

      expect(hostResult.role).toBe('HOST');

      const sellerResult = await authService.register({
        email: `seller-${Date.now()}@example.com`,
        password: 'Password123!',
        nombre: 'Seller',
        apellido: 'User',
        region: 'Valles Centrales',
        role: 'SELLER',
      });

      expect(sellerResult.role).toBe('SELLER');
    });
  });

  describe('login', () => {
    let testEmail: string;
    let testPassword: string;
    let testUserId: string;

    beforeEach(async () => {
      testEmail = `login-test-${Date.now()}@example.com`;
      testPassword = 'Password123!';

      const user = await authService.register({
        email: testEmail,
        password: testPassword,
        nombre: 'Login',
        apellido: 'Test',
        region: 'Valles Centrales',
        role: 'USER',
      });
      testUserId = user.id;
    });

    it('should login with correct credentials', async () => {
      const result = await authService.login(testEmail, testPassword);

      expect(result).toHaveProperty('id');
      expect(result.email).toBe(testEmail);
      expect(result.nombre).toBe('Login');
      expect(result).not.toHaveProperty('password');
    });

    it('should throw error if email does not exist', async () => {
      await expect(
        authService.login('nonexistent@example.com', 'Password123!')
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw error if password is incorrect', async () => {
      await expect(
        authService.login(testEmail, 'WrongPassword123!')
      ).rejects.toThrow('Credenciales inválidas');
    });

    it('should throw error if user is banned', async () => {
      // Banear usuario
      await prisma.user.update({
        where: { id: testUserId },
        data: {
          bannedAt: new Date(),
          bannedReason: 'Violación de términos de servicio',
        },
      });

      await expect(
        authService.login(testEmail, testPassword)
      ).rejects.toThrow('Tu cuenta ha sido suspendida');
    });

    it('should allow login for different roles', async () => {
      const adminEmail = `admin-${Date.now()}@example.com`;
      await authService.register({
        email: adminEmail,
        password: testPassword,
        nombre: 'Admin',
        apellido: 'User',
        region: 'Valles Centrales',
        role: 'ADMIN',
      });

      const result = await authService.login(adminEmail, testPassword);

      expect(result.role).toBe('ADMIN');
    });

    it('should be case-insensitive for email', async () => {
      const upperCaseEmail = testEmail.toUpperCase();

      const result = await authService.login(upperCaseEmail, testPassword);

      expect(result.email).toBe(testEmail); // Should return lowercase
    });
  });

  describe('getProfile', () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await authService.register({
        email: `profile-test-${Date.now()}@example.com`,
        password: 'Password123!',
        nombre: 'Profile',
        apellido: 'Test',
        region: 'Valles Centrales',
        role: 'USER',
      });
      testUserId = user.id;
    });

    it('should get user profile successfully', async () => {
      const profile = await authService.getProfile(testUserId);

      expect(profile).toHaveProperty('id', testUserId);
      expect(profile).toHaveProperty('email');
      expect(profile).toHaveProperty('nombre', 'Profile');
      expect(profile).not.toHaveProperty('password');
      expect(profile).toHaveProperty('_count');
    });

    it('should throw error if user not found', async () => {
      await expect(
        authService.getProfile('non-existent-id')
      ).rejects.toThrow('Usuario no encontrado');
    });

    it('should include user counts', async () => {
      // Crear una historia para el usuario
      await prisma.story.create({
        data: {
          userId: testUserId,
          imageUrl: 'test.jpg',
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        },
      });

      const profile = await authService.getProfile(testUserId);

      expect(profile._count).toBeDefined();
      expect(profile._count.stories).toBe(1);
    });
  });

  describe('updateProfile', () => {
    let testUserId: string;

    beforeEach(async () => {
      const user = await authService.register({
        email: `update-test-${Date.now()}@example.com`,
        password: 'Password123!',
        nombre: 'Original',
        apellido: 'Name',
        region: 'Valles Centrales',
        role: 'USER',
      });
      testUserId = user.id;
    });

    it('should update user profile successfully', async () => {
      const updatedProfile = await authService.updateProfile(testUserId, {
        nombre: 'Updated',
        apellido: 'NewName',
        bio: 'Nueva biografía',
      });

      expect(updatedProfile.nombre).toBe('Updated');
      expect(updatedProfile.apellido).toBe('NewName');
      expect(updatedProfile.bio).toBe('Nueva biografía');

      // Verificar en BD
      const userInDb = await prisma.user.findUnique({
        where: { id: testUserId },
      });
      expect(userInDb?.nombre).toBe('Updated');
    });

    it('should update avatar', async () => {
      const updatedProfile = await authService.updateProfile(testUserId, {
        avatar: 'https://example.com/avatar.jpg',
      });

      expect(updatedProfile.avatar).toBe('https://example.com/avatar.jpg');
    });

    it('should update region', async () => {
      const updatedProfile = await authService.updateProfile(testUserId, {
        region: 'Sierra Norte',
      });

      expect(updatedProfile.region).toBe('Sierra Norte');
    });

    it('should allow partial updates', async () => {
      const updatedProfile = await authService.updateProfile(testUserId, {
        nombre: 'JustName',
      });

      expect(updatedProfile.nombre).toBe('JustName');
      expect(updatedProfile.apellido).toBe('Name'); // Unchanged
    });
  });

});
