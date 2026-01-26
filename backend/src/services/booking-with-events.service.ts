/**
 * BookingService con Event-Driven Architecture
 *
 * Este archivo muestra cómo integrar eventos en el BookingService.
 * Para usarlo, reemplace el contenido de booking.service.ts con este archivo
 * y actualice el constructor en las routes para pasar el eventBus.
 *
 * CAMBIOS NECESARIOS EN routes/bookings.ts:
 *
 * const bookingService = new BookingService(fastify.prisma, fastify.cache, fastify.eventBus);
 *
 */

import { PrismaClient, BookingStatus, Prisma } from '@prisma/client';
import {
  CreateExperienceInput,
  UpdateExperienceInput,
  CreateTimeSlotInput,
  CreateBookingInput,
  ExperienceQuery,
  TimeSlotQuery,
  BookingQuery,
  CreateExperienceReviewInput,
} from '../schemas/booking.schema.js';
import { stripeService } from './stripe.service.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import {
  updateTimeSlotWithLocking,
  getTimeSlotWithVersion,
  withRetry,
} from '../utils/optimistic-locking.js';
import { CacheService } from './cache.service.js';
import { EventBus, createEvent, EventTypes } from '../infrastructure/events/index.js';

export class BookingService {
  // Cache TTLs (in seconds)
  private readonly CACHE_TTL = {
    EXPERIENCE_DETAIL: 120, // 2 minutos - detalle de experiencia
    EXPERIENCE_LIST: 300, // 5 minutos - listado de experiencias
    TIME_SLOTS: 60, // 1 minuto - slots disponibles (cambian frecuentemente)
    USER_BOOKINGS: 60, // 1 minuto - reservaciones del usuario
  };

  constructor(
    private prisma: PrismaClient,
    private cache?: CacheService,
    private eventBus?: EventBus
  ) {}

  // ============================================
  // BOOKING - CREATE (con eventos)
  // ============================================

  async createBooking(userId: string, data: CreateBookingInput) {
    const { experienceId, timeSlotId, guestCount, specialRequests } = data;

    // Invalidar cache de bookings del usuario
    if (this.cache) {
      await this.cache.del(`user:${userId}:bookings`);
    }

    return withRetry(
      async () => {
        // FASE 1: Validación y reserva de inventario
        const [experience, timeSlot] = await Promise.all([
          this.prisma.experience.findUnique({ where: { id: experienceId } }),
          this.prisma.experienceTimeSlot.findUnique({ where: { id: timeSlotId } }),
        ]);

        if (!experience) throw new NotFoundError('Experiencia no encontrada');
        if (!timeSlot) throw new NotFoundError('Horario no encontrado');
        if (timeSlot.experienceId !== experienceId) {
          throw new AppError('El horario no corresponde a esta experiencia', 400);
        }
        if (!timeSlot.isAvailable) {
          throw new AppError('Este horario ya no está disponible', 400);
        }

        const availableSpots = timeSlot.capacity - timeSlot.bookedCount;
        if (guestCount > availableSpots) {
          throw new AppError(`Solo hay ${availableSpots} lugares disponibles`, 400);
        }

        const currentVersion = timeSlot.version;
        const totalPrice = Number(experience.price) * guestCount;

        let booking;

        try {
          booking = await this.prisma.$transaction(async (tx) => {
            await updateTimeSlotWithLocking(tx, timeSlotId, currentVersion, {
              bookedCount: { increment: guestCount },
              isAvailable: timeSlot.bookedCount + guestCount < timeSlot.capacity,
            });

            return tx.booking.create({
              data: {
                userId,
                experienceId,
                timeSlotId,
                guestCount,
                totalPrice: new Prisma.Decimal(totalPrice),
                specialRequests,
                status: 'PENDING_PAYMENT',
              },
              include: {
                experience: true,
                timeSlot: true,
              },
            });
          });
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            throw new AppError('Ya tienes una reservación activa para este horario', 409);
          }
          throw error;
        }

        // FASE 2: Crear payment intent
        let clientSecret: string | undefined;

        try {
          const payment = await stripeService.createPaymentIntent({
            amount: Math.round(totalPrice * 100),
            description: `Reservación: ${experience.title}`,
            metadata: {
              bookingId: booking.id,
              experienceId,
              timeSlotId,
              userId,
              guestCount: String(guestCount),
            },
          });

          clientSecret = payment?.clientSecret;

          if (payment?.paymentIntentId) {
            await this.prisma.booking.update({
              where: { id: booking.id },
              data: {
                stripePaymentId: payment.paymentIntentId,
                status: 'PENDING',
              },
            });
          }
        } catch (stripeError) {
          await this.prisma.booking.update({
            where: { id: booking.id },
            data: { status: 'PAYMENT_FAILED' },
          });

          throw new AppError(
            'Error al procesar el pago. Por favor intenta nuevamente.',
            500,
            stripeError instanceof Error ? stripeError.message : undefined
          );
        }

        // FASE 3: Emitir evento BookingCreated
        if (this.eventBus) {
          const [user, host] = await Promise.all([
            this.prisma.user.findUnique({
              where: { id: userId },
              select: { nombre: true, apellido: true },
            }),
            this.prisma.user.findUnique({
              where: { id: experience.hostId },
              select: { nombre: true },
            }),
          ]);

          const event = createEvent(EventTypes.BOOKING_CREATED, {
            bookingId: booking.id,
            userId,
            userName: user ? `${user.nombre} ${user.apellido || ''}`.trim() : undefined,
            experienceId,
            experienceTitle: experience.title,
            hostId: experience.hostId,
            hostName: host?.nombre || 'Host',
            guestCount,
            totalPrice,
            timeSlot: {
              date: timeSlot.date.toISOString().split('T')[0],
              startTime: timeSlot.startTime,
              endTime: timeSlot.endTime,
            },
          });
          this.eventBus.emitAsync(event);
        }

        return {
          booking,
          clientSecret,
        };
      },
      { maxRetries: 3, retryDelay: 100 }
    );
  }

  // ============================================
  // BOOKING - CONFIRM (con eventos)
  // ============================================

  async confirmBooking(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { experience: true },
    });

    if (!booking) throw new NotFoundError('Reservación no encontrada');
    if (booking.userId !== userId) {
      throw new AppError('No tienes permiso para confirmar esta reservación', 403);
    }
    if (!['PENDING', 'PENDING_PAYMENT'].includes(booking.status)) {
      throw new AppError('Esta reservación ya fue procesada', 400);
    }

    if (booking.stripePaymentId && stripeService.isEnabled()) {
      const status = await stripeService.getPaymentStatus(booking.stripePaymentId);
      if (status !== 'succeeded') {
        throw new AppError('El pago no ha sido completado', 400);
      }
    }

    const confirmed = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
      include: {
        experience: {
          include: {
            host: { select: { id: true } },
          },
        },
        timeSlot: true,
        user: { select: { nombre: true, apellido: true } },
      },
    });

    // Invalidar cache
    if (this.cache) {
      await Promise.all([
        this.cache.del(`user:${userId}:bookings`),
        this.cache.del(`host:${confirmed.experience.host.id}:bookings`),
      ]);
    }

    // Emitir evento BookingConfirmed
    if (this.eventBus) {
      const event = createEvent(EventTypes.BOOKING_CONFIRMED, {
        bookingId: confirmed.id,
        userId: confirmed.userId,
        userName: `${confirmed.user.nombre} ${confirmed.user.apellido || ''}`.trim(),
        experienceId: confirmed.experienceId,
        experienceTitle: confirmed.experience.title,
        hostId: confirmed.experience.host.id,
        guestCount: confirmed.guestCount,
        totalPrice: Number(confirmed.totalPrice),
        timeSlot: {
          date: confirmed.timeSlot.date.toISOString().split('T')[0],
          startTime: confirmed.timeSlot.startTime,
        },
      });
      this.eventBus.emitAsync(event);
    }

    return confirmed;
  }

  // ============================================
  // BOOKING - CANCEL (con eventos)
  // ============================================

  async cancelBooking(id: string, userId: string) {
    return withRetry(
      async () => {
        const booking = await this.prisma.booking.findUnique({
          where: { id },
          include: { experience: true, timeSlot: true },
        });

        if (!booking) throw new NotFoundError('Reservación no encontrada');
        if (booking.userId !== userId && booking.experience.hostId !== userId) {
          throw new AppError('No tienes permiso para cancelar esta reservación', 403);
        }
        if (booking.status === 'CANCELLED') {
          throw new AppError('Esta reservación ya fue cancelada', 400);
        }
        if (booking.status === 'COMPLETED') {
          throw new AppError('No puedes cancelar una reservación completada', 400);
        }

        const currentVersion = booking.timeSlot.version;

        // Procesar reembolso si aplica
        if (booking.status === 'CONFIRMED' && booking.stripePaymentId) {
          try {
            await stripeService.createRefund(booking.stripePaymentId);
          } catch (refundError) {
            throw new AppError(
              'Error al procesar el reembolso. Por favor contacta soporte.',
              500,
              refundError instanceof Error ? refundError.message : undefined
            );
          }
        }

        const cancelled = await this.prisma.$transaction(async (tx) => {
          await updateTimeSlotWithLocking(tx, booking.timeSlotId, currentVersion, {
            bookedCount: { decrement: booking.guestCount },
            isAvailable: true,
          });

          return tx.booking.update({
            where: { id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
            },
            include: {
              experience: {
                include: {
                  host: { select: { id: true } },
                },
              },
              timeSlot: true,
            },
          });
        });

        // Invalidar cache
        if (this.cache) {
          await Promise.all([
            this.cache.del(`user:${booking.userId}:bookings`),
            this.cache.del(`host:${booking.experience.hostId}:bookings`),
            this.cache.del(`experience:${booking.experienceId}:slots`),
          ]);
        }

        // Emitir evento BookingCancelled
        if (this.eventBus) {
          const event = createEvent(EventTypes.BOOKING_CANCELLED, {
            bookingId: cancelled.id,
            userId: cancelled.userId,
            experienceId: cancelled.experienceId,
            experienceTitle: cancelled.experience.title,
            hostId: cancelled.experience.host.id,
            cancelledBy: userId,
            guestCount: cancelled.guestCount,
          });
          this.eventBus.emitAsync(event);
        }

        return cancelled;
      },
      { maxRetries: 3, retryDelay: 100 }
    );
  }

  // ============================================
  // BOOKING - COMPLETE (con eventos)
  // ============================================

  async completeBooking(id: string, hostId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        experience: true,
        user: { select: { nombre: true, apellido: true } },
      },
    });

    if (!booking) throw new NotFoundError('Reservación no encontrada');
    if (booking.experience.hostId !== hostId) {
      throw new AppError('No tienes permiso para completar esta reservación', 403);
    }
    if (booking.status !== 'CONFIRMED') {
      throw new AppError('Solo puedes completar reservaciones confirmadas', 400);
    }

    const completed = await this.prisma.booking.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: {
        experience: true,
        timeSlot: true,
        user: { select: { nombre: true, apellido: true } },
      },
    });

    // Invalidar cache
    if (this.cache) {
      await Promise.all([
        this.cache.del(`user:${booking.userId}:bookings`),
        this.cache.del(`host:${hostId}:bookings`),
      ]);
    }

    // Emitir evento BookingCompleted
    if (this.eventBus) {
      const event = createEvent(EventTypes.BOOKING_COMPLETED, {
        bookingId: completed.id,
        userId: completed.userId,
        userName: `${completed.user.nombre} ${completed.user.apellido || ''}`.trim(),
        experienceId: completed.experienceId,
        experienceTitle: completed.experience.title,
        hostId: completed.experience.hostId,
        totalPrice: Number(completed.totalPrice),
        guestCount: completed.guestCount,
      });
      this.eventBus.emitAsync(event);
    }

    return completed;
  }

  // Nota: Los demás métodos (getExperiences, getTimeSlots, etc.) permanecen igual.
  // Solo se modifican los métodos que generan eventos del dominio.
}
