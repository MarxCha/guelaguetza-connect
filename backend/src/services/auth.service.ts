import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { RegisterInput, UpdateProfileInput } from '../schemas/auth.schema.js';
import { AppError, NotFoundError } from '../utils/errors.js';

export class AuthService {
  constructor(private prisma: PrismaClient) {}

  async register(data: RegisterInput) {
    const normalizedEmail = data.email.toLowerCase();

    const existingUser = await this.prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (existingUser) {
      throw new AppError('El email ya está registrado', 400);
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        ...data,
        email: normalizedEmail,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        avatar: true,
        region: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // Check if user is banned
    if (user.bannedAt) {
      throw new AppError(
        `Tu cuenta ha sido suspendida${user.bannedReason ? `: ${user.bannedReason}` : ''}`,
        403
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      throw new AppError('Credenciales inválidas', 401);
    }

    return {
      id: user.id,
      email: user.email,
      nombre: user.nombre,
      apellido: user.apellido,
      avatar: user.avatar,
      region: user.region,
      role: user.role,
    };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        avatar: true,
        region: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            stories: true,
            likes: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundError('Usuario no encontrado');
    }

    return user;
  }

  async updateProfile(userId: string, data: UpdateProfileInput) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        email: true,
        nombre: true,
        apellido: true,
        avatar: true,
        region: true,
        role: true,
      },
    });

    return user;
  }
}
