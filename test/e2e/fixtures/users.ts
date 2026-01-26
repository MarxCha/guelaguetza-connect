import bcrypt from 'bcryptjs';
import { UserRole } from '@prisma/client';

/**
 * Datos de usuarios de prueba
 */

export const TEST_PASSWORD = 'password123';
const HASHED_PASSWORD = bcrypt.hashSync(TEST_PASSWORD, 10);

export const testUsers = {
  regularUser: {
    id: 'user_regular_001',
    email: 'user@example.com',
    password: HASHED_PASSWORD,
    nombre: 'Juan',
    apellido: 'Pérez',
    avatar: null,
    bio: 'Usuario regular de prueba',
    region: 'Valles Centrales',
    isPublic: true,
    role: 'USER' as UserRole,
    bannedAt: null,
    bannedReason: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  hostUser: {
    id: 'user_host_001',
    email: 'host@example.com',
    password: HASHED_PASSWORD,
    nombre: 'María',
    apellido: 'González',
    avatar: null,
    bio: 'Anfitriona de experiencias',
    region: 'Sierra Norte',
    isPublic: true,
    role: 'USER' as UserRole,
    bannedAt: null,
    bannedReason: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  sellerUser: {
    id: 'user_seller_001',
    email: 'seller@example.com',
    password: HASHED_PASSWORD,
    nombre: 'Pedro',
    apellido: 'Martínez',
    avatar: null,
    bio: 'Vendedor de artesanías',
    region: 'Istmo',
    isPublic: true,
    role: 'USER' as UserRole,
    bannedAt: null,
    bannedReason: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  adminUser: {
    id: 'user_admin_001',
    email: 'admin@example.com',
    password: HASHED_PASSWORD,
    nombre: 'Admin',
    apellido: 'System',
    avatar: null,
    bio: 'Administrador del sistema',
    region: null,
    isPublic: true,
    role: 'ADMIN' as UserRole,
    bannedAt: null,
    bannedReason: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  bannedUser: {
    id: 'user_banned_001',
    email: 'banned@example.com',
    password: HASHED_PASSWORD,
    nombre: 'Usuario',
    apellido: 'Baneado',
    avatar: null,
    bio: null,
    region: null,
    isPublic: true,
    role: 'USER' as UserRole,
    bannedAt: new Date('2024-01-15'),
    bannedReason: 'Violación de términos de servicio',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15'),
  },
};

/**
 * Helper: Obtener usuario por tipo
 */
export function getTestUser(type: keyof typeof testUsers) {
  return testUsers[type];
}

/**
 * Helper: Obtener credenciales para login
 */
export function getTestCredentials(type: keyof typeof testUsers) {
  const user = testUsers[type];
  return {
    email: user.email,
    password: TEST_PASSWORD,
  };
}
