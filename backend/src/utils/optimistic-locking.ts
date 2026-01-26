import { PrismaClient } from '@prisma/client';
import { ConcurrencyError } from './errors.js';

/**
 * Opciones para retry de operaciones con locking optimista
 */
export interface RetryOptions {
  maxRetries?: number;
  retryDelay?: number;
}

/**
 * Ejecuta una operación con retry automático en caso de conflicto de concurrencia
 *
 * @param operation - Función que ejecuta la operación a reintentar
 * @param options - Opciones de configuración de retry
 * @returns El resultado de la operación
 * @throws ConcurrencyError si se excede el número máximo de reintentos
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const { maxRetries = 3, retryDelay = 100 } = options;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      // Si es el último intento o no es un error de concurrencia, lanzar el error
      if (attempt === maxRetries - 1 || !(error instanceof ConcurrencyError)) {
        throw error;
      }

      // Esperar antes de reintentar (con backoff exponencial)
      await new Promise((resolve) =>
        setTimeout(resolve, retryDelay * Math.pow(2, attempt))
      );
    }
  }

  // Esto no debería alcanzarse nunca, pero TypeScript lo requiere
  throw new ConcurrencyError('Número máximo de reintentos excedido');
}

/**
 * Actualiza un ExperienceTimeSlot usando locking optimista
 *
 * @param prisma - Cliente de Prisma (puede ser dentro de transacción)
 * @param timeSlotId - ID del time slot a actualizar
 * @param currentVersion - Versión esperada del time slot
 * @param data - Datos a actualizar
 * @returns El time slot actualizado
 * @throws ConcurrencyError si la versión no coincide
 */
export async function updateTimeSlotWithLocking(
  prisma: PrismaClient | any, // any para soportar tx de transacciones
  timeSlotId: string,
  currentVersion: number,
  data: {
    bookedCount?: { increment?: number; decrement?: number };
    isAvailable?: boolean;
  }
) {
  const result = await prisma.experienceTimeSlot.updateMany({
    where: {
      id: timeSlotId,
      version: currentVersion,
    },
    data: {
      ...data,
      version: { increment: 1 },
    },
  });

  if (result.count === 0) {
    throw new ConcurrencyError(
      'El horario ha sido modificado por otro usuario. Por favor, recarga e intenta nuevamente.'
    );
  }

  // Retornar el registro actualizado
  return prisma.experienceTimeSlot.findUnique({
    where: { id: timeSlotId },
  });
}

/**
 * Obtiene un time slot y verifica que no haya cambiado
 *
 * @param prisma - Cliente de Prisma
 * @param timeSlotId - ID del time slot
 * @param expectedVersion - Versión esperada (opcional, para validación)
 * @returns El time slot actualizado
 * @throws ConcurrencyError si la versión no coincide
 */
export async function getTimeSlotWithVersion(
  prisma: PrismaClient | any,
  timeSlotId: string,
  expectedVersion?: number
) {
  const timeSlot = await prisma.experienceTimeSlot.findUnique({
    where: { id: timeSlotId },
  });

  if (!timeSlot) {
    throw new Error('Time slot no encontrado');
  }

  if (expectedVersion !== undefined && timeSlot.version !== expectedVersion) {
    throw new ConcurrencyError(
      'El horario ha sido modificado. Por favor, recarga e intenta nuevamente.'
    );
  }

  return timeSlot;
}

/**
 * Actualiza un Product usando locking optimista
 *
 * @param prisma - Cliente de Prisma (puede ser dentro de transacción)
 * @param productId - ID del producto a actualizar
 * @param currentVersion - Versión esperada del producto
 * @param data - Datos a actualizar (puede incluir decrementos de stock)
 * @returns El producto actualizado
 * @throws ConcurrencyError si la versión no coincide
 */
export async function updateProductWithLocking(
  prisma: PrismaClient | any, // any para soportar tx de transacciones
  productId: string,
  currentVersion: number,
  data: {
    stock?: { increment?: number; decrement?: number };
    status?: string;
    [key: string]: any;
  }
) {
  const result = await prisma.product.updateMany({
    where: {
      id: productId,
      version: currentVersion,
    },
    data: {
      ...data,
      version: { increment: 1 },
    },
  });

  if (result.count === 0) {
    throw new ConcurrencyError(
      'El producto ha sido modificado por otro usuario. Por favor, recarga e intenta nuevamente.'
    );
  }

  // Retornar el registro actualizado
  return prisma.product.findUnique({
    where: { id: productId },
  });
}

/**
 * Obtiene un producto y verifica que no haya cambiado
 *
 * @param prisma - Cliente de Prisma
 * @param productId - ID del producto
 * @param expectedVersion - Versión esperada (opcional, para validación)
 * @returns El producto actualizado
 * @throws ConcurrencyError si la versión no coincide
 */
export async function getProductWithVersion(
  prisma: PrismaClient | any,
  productId: string,
  expectedVersion?: number
) {
  const product = await prisma.product.findUnique({
    where: { id: productId },
  });

  if (!product) {
    throw new Error('Producto no encontrado');
  }

  if (expectedVersion !== undefined && product.version !== expectedVersion) {
    throw new ConcurrencyError(
      'El producto ha sido modificado. Por favor, recarga e intenta nuevamente.'
    );
  }

  return product;
}
