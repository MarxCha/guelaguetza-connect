/**
 * UserFactory - Generador de usuarios de prueba
 */

import type { User, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

let userCounter = 0;

const NOMBRES = [
  'Juan', 'María', 'José', 'Carmen', 'Pedro', 'Ana', 'Luis', 'Rosa',
  'Carlos', 'Elena', 'Miguel', 'Sofia', 'Diego', 'Laura', 'Fernando',
];

const APELLIDOS = [
  'García', 'López', 'Martínez', 'Hernández', 'González', 'Pérez',
  'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Rivera', 'Gómez',
];

const REGIONES = [
  'Valles Centrales',
  'Sierra Norte',
  'Sierra Sur',
  'Mixteca',
  'Istmo',
  'Costa',
  'Papaloapan',
];

export interface UserFactoryOptions {
  id?: string;
  email?: string;
  password?: string;
  nombre?: string;
  apellido?: string;
  avatar?: string;
  bio?: string;
  region?: string;
  isPublic?: boolean;
  role?: UserRole;
  bannedAt?: Date;
  bannedReason?: string;
}

/**
 * Genera un usuario de prueba
 */
export function createUser(options: UserFactoryOptions = {}): Omit<User, 'createdAt' | 'updatedAt'> {
  const index = userCounter++;
  const nombre = options.nombre ?? NOMBRES[index % NOMBRES.length];
  const apellido = options.apellido ?? APELLIDOS[index % APELLIDOS.length];

  return {
    id: options.id ?? `user-${index}-${Date.now()}`,
    email: options.email ?? `${nombre.toLowerCase()}.${apellido.toLowerCase()}${index}@example.com`,
    password: options.password ?? bcrypt.hashSync('password123', 10),
    nombre,
    apellido,
    avatar: options.avatar ?? null,
    bio: options.bio ?? null,
    region: options.region ?? null,
    isPublic: options.isPublic ?? true,
    role: options.role ?? 'USER',
    bannedAt: options.bannedAt ?? null,
    bannedReason: options.bannedReason ?? null,
  };
}

/**
 * Crea un usuario administrador
 */
export function createAdmin(options: UserFactoryOptions = {}): Omit<User, 'createdAt' | 'updatedAt'> {
  return createUser({
    ...options,
    role: 'ADMIN',
    nombre: options.nombre ?? 'Admin',
    apellido: options.apellido ?? 'Principal',
  });
}

/**
 * Crea un usuario moderador
 */
export function createModerator(options: UserFactoryOptions = {}): Omit<User, 'createdAt' | 'updatedAt'> {
  return createUser({
    ...options,
    role: 'MODERATOR',
    nombre: options.nombre ?? 'Moderador',
  });
}

/**
 * Crea un usuario con perfil completo
 */
export function createUserWithProfile(options: UserFactoryOptions = {}): Omit<User, 'createdAt' | 'updatedAt'> {
  const index = userCounter % REGIONES.length;

  return createUser({
    ...options,
    bio: options.bio ?? 'Amante de la cultura oaxaqueña. Me encanta la Guelaguetza y las tradiciones de mi tierra.',
    region: options.region ?? REGIONES[index],
    avatar: options.avatar ?? `https://i.pravatar.cc/150?u=${userCounter}`,
  });
}

/**
 * Crea un usuario baneado
 */
export function createBannedUser(options: UserFactoryOptions = {}): Omit<User, 'createdAt' | 'updatedAt'> {
  return createUser({
    ...options,
    bannedAt: options.bannedAt ?? new Date(),
    bannedReason: options.bannedReason ?? 'Violación de términos de servicio',
  });
}

/**
 * Crea múltiples usuarios
 */
export function createManyUsers(count: number, options: UserFactoryOptions = {}): Omit<User, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createUser(options));
}

/**
 * Resetea el contador de usuarios (útil entre tests)
 */
export function resetUserCounter(): void {
  userCounter = 0;
}
