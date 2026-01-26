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
import { AppError, NotFoundError, ConcurrencyError } from '../utils/errors.js';
import {
  updateTimeSlotWithLocking,
  getTimeSlotWithVersion,
  withRetry,
} from '../utils/optimistic-locking.js';
import { CacheService } from './cache.service.js';
import {
  bookingsCreatedTotal,
  bookingsCancelledTotal,
  bookingCreationDuration,
  concurrencyConflictsTotal,
  startTimer,
} from '../utils/metrics.js';
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
  // EXPERIENCES
  // ============================================

  async getExperiences(query: ExperienceQuery) {
    const { category, minPrice, maxPrice, date, search, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ExperienceWhereInput = {
      isActive: true,
      ...(category && { category }),
      ...(minPrice !== undefined && { price: { gte: minPrice } }),
      ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
      ...(search && {
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { location: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(date && {
        timeSlots: {
          some: {
            date: new Date(date),
            isAvailable: true,
          },
        },
      }),
    };

    const [experiences, total] = await Promise.all([
      this.prisma.experience.findMany({
        where,
        skip,
        take: limit,
        include: {
          host: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              avatar: true,
            },
          },
          _count: {
            select: {
              reviews: true,
              bookings: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.experience.count({ where }),
    ]);

    return {
      experiences,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getExperienceById(id: string) {
    // Try cache first
    const cacheKey = `experience:${id}:detail`;
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const experience = await this.prisma.experience.findUnique({
      where: { id },
      include: {
        host: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatar: true,
          },
        },
        reviews: {
          include: {
            user: {
              select: {
                id: true,
                nombre: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: {
            reviews: true,
            bookings: true,
          },
        },
      },
    });

    if (!experience) {
      throw new NotFoundError('Experiencia no encontrada');
    }

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKey, experience, this.CACHE_TTL.EXPERIENCE_DETAIL);
    }

    return experience;
  }

  async createExperience(hostId: string, data: CreateExperienceInput) {
    return this.prisma.experience.create({
      data: {
        ...data,
        price: new Prisma.Decimal(data.price),
        hostId,
      },
      include: {
        host: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            avatar: true,
          },
        },
      },
    });
  }

  async updateExperience(id: string, hostId: string, data: UpdateExperienceInput) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
    });

    if (!experience) {
      throw new NotFoundError('Experiencia no encontrada');
    }

    if (experience.hostId !== hostId) {
      throw new AppError('No tienes permiso para editar esta experiencia', 403);
    }

    const updated = await this.prisma.experience.update({
      where: { id },
      data: {
        ...data,
        ...(data.price && { price: new Prisma.Decimal(data.price) }),
      },
    });

    // Invalidate cache
    if (this.cache) {
      await Promise.all([
        this.cache.del(`experience:${id}:detail`),
        this.cache.invalidate(`experiences:*`),
      ]);
    }

    return updated;
  }

  async deleteExperience(id: string, hostId: string) {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
    });

    if (!experience) {
      throw new NotFoundError('Experiencia no encontrada');
    }

    if (experience.hostId !== hostId) {
      throw new AppError('No tienes permiso para eliminar esta experiencia', 403);
    }

    // Soft delete by deactivating
    await this.prisma.experience.update({
      where: { id },
      data: { isActive: false },
    });

    return { message: 'Experiencia eliminada' };
  }

  // ============================================
  // TIME SLOTS
  // ============================================

  async getTimeSlots(experienceId: string, query: TimeSlotQuery) {
    // Cache key includes dates for specificity
    const cacheKey = `experience:${experienceId}:slots:${query.startDate}:${query.endDate || query.startDate}`;
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      throw new NotFoundError('Experiencia no encontrada');
    }

    const startDate = new Date(query.startDate);
    const endDate = query.endDate ? new Date(query.endDate) : startDate;

    const slots = await this.prisma.experienceTimeSlot.findMany({
      where: {
        experienceId,
        date: {
          gte: startDate,
          lte: endDate,
        },
        isAvailable: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    const result = slots.map((slot) => ({
      ...slot,
      availableSpots: slot.capacity - slot.bookedCount,
    }));

    // Cache with shorter TTL as availability changes frequently
    if (this.cache) {
      await this.cache.set(cacheKey, result, this.CACHE_TTL.TIME_SLOTS);
    }

    return result;
  }

  async createTimeSlots(experienceId: string, hostId: string, slots: CreateTimeSlotInput[]) {
    const experience = await this.prisma.experience.findUnique({
      where: { id: experienceId },
    });

    if (!experience) {
      throw new NotFoundError('Experiencia no encontrada');
    }

    if (experience.hostId !== hostId) {
      throw new AppError('No tienes permiso para crear horarios', 403);
    }

    const createdSlots = await this.prisma.experienceTimeSlot.createMany({
      data: slots.map((slot) => ({
        experienceId,
        date: new Date(slot.date),
        startTime: slot.startTime,
        endTime: slot.endTime,
        capacity: slot.capacity || experience.maxCapacity,
      })),
    });

    return { created: createdSlots.count };
  }

  async deleteTimeSlot(slotId: string, hostId: string) {
    const slot = await this.prisma.experienceTimeSlot.findUnique({
      where: { id: slotId },
      include: { experience: true },
    });

    if (!slot) {
      throw new NotFoundError('Horario no encontrado');
    }

    if (slot.experience.hostId !== hostId) {
      throw new AppError('No tienes permiso para eliminar este horario', 403);
    }

    if (slot.bookedCount > 0) {
      throw new AppError('No puedes eliminar un horario con reservaciones', 400);
    }

    await this.prisma.experienceTimeSlot.delete({
      where: { id: slotId },
    });

    return { message: 'Horario eliminado' };
  }

  // ============================================
  // BOOKINGS
  // ============================================

  async getMyBookings(userId: string, query: BookingQuery) {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          experience: {
            include: {
              host: {
                select: {
                  id: true,
                  nombre: true,
                  apellido: true,
                  avatar: true,
                },
              },
            },
          },
          timeSlot: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getBookingById(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        experience: {
          include: {
            host: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                avatar: true,
              },
            },
          },
        },
        timeSlot: true,
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            email: true,
          },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Reservación no encontrada');
    }

    // User can see their own booking, host can see bookings for their experiences
    if (booking.userId !== userId && booking.experience.hostId !== userId) {
      throw new AppError('No tienes permiso para ver esta reservación', 403);
    }

    return booking;
  }

  async createBooking(userId: string, data: CreateBookingInput) {
    const { experienceId, timeSlotId, guestCount, specialRequests } = data;

    // Start timing for metrics
    const endTimer = startTimer(bookingCreationDuration);

    try {
      // Ejecutar la operación con retry automático en caso de conflicto
      const result = await withRetry(
      async () => {
        // FASE 1: Validación y reserva de inventario en BD
        // ================================================

        // Get experience and slot in parallel
        const [experience, timeSlot] = await Promise.all([
          this.prisma.experience.findUnique({ where: { id: experienceId } }),
          this.prisma.experienceTimeSlot.findUnique({ where: { id: timeSlotId } }),
        ]);

        if (!experience) {
          throw new NotFoundError('Experiencia no encontrada');
        }

        if (!timeSlot) {
          throw new NotFoundError('Horario no encontrado');
        }

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

        // Guardar la versión actual para el locking optimista
        const currentVersion = timeSlot.version;

        // Calculate total price
        const totalPrice = Number(experience.price) * guestCount;

        // Create booking in PENDING_PAYMENT status and update slot count in transaction
        let booking;

        try {
          booking = await this.prisma.$transaction(async (tx) => {
            // Update slot booked count with optimistic locking
            await updateTimeSlotWithLocking(
              tx,
              timeSlotId,
              currentVersion,
              {
                bookedCount: { increment: guestCount },
                isAvailable: timeSlot.bookedCount + guestCount < timeSlot.capacity,
              }
            );

            // Create booking in PENDING_PAYMENT status
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
          // Manejar el error de unique constraint (doble reserva)
          if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
              throw new AppError(
                'Ya tienes una reservación activa para este horario',
                409
              );
            }
          }
          // Re-lanzar cualquier otro error
          throw error;
        }

        // FASE 2: Crear payment intent en Stripe (FUERA de la transacción)
        // =================================================================
        let clientSecret: string | undefined;

        try {
          const payment = await stripeService.createPaymentIntent({
            amount: Math.round(totalPrice * 100), // Convert to cents
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

          // FASE 3: Actualizar booking con el payment intent ID
          // ====================================================
          if (payment?.paymentIntentId) {
            await this.prisma.booking.update({
              where: { id: booking.id },
              data: {
                stripePaymentId: payment.paymentIntentId,
                status: 'PENDING', // Ready for payment
              },
            });
          }
        } catch (stripeError) {
          // Si Stripe falla, marcar booking como PAYMENT_FAILED
          // No restauramos el slot aquí - el usuario puede reintentar
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

        // Invalidate cache after successful booking
        if (this.cache) {
          await Promise.all([
            this.cache.del(`experience:${experienceId}:detail`),
            this.cache.invalidate(`experience:${experienceId}:slots:*`),
            this.cache.invalidate(`experiences:*`),
          ]);
        }

        // Emit booking.created event (fire-and-forget)
        if (this.eventBus) {
          const host = await this.prisma.user.findUnique({
            where: { id: experience.hostId },
            select: { id: true, nombre: true, apellido: true },
          });

          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { nombre: true, apellido: true },
          });

          this.eventBus.emitAsync(
            createEvent(EventTypes.BOOKING_CREATED, {
              bookingId: booking.id,
              userId,
              userName: user ? `${user.nombre} ${user.apellido || ''}`.trim() : undefined,
              experienceId,
              experienceTitle: experience.title,
              hostId: experience.hostId,
              hostName: host ? `${host.nombre} ${host.apellido || ''}`.trim() : 'Host',
              guestCount,
              totalPrice,
              timeSlot: {
                date: timeSlot.date.toISOString().split('T')[0],
                startTime: timeSlot.startTime,
                endTime: timeSlot.endTime,
              },
            })
          );
        }

        return {
          booking,
          clientSecret,
        };
      },
      { maxRetries: 3, retryDelay: 100 }
    );

      // Record success metrics
      bookingsCreatedTotal.inc({ status: 'pending' });
      endTimer();

      return result;
    } catch (error) {
      // Record failure metrics
      if (error instanceof ConcurrencyError) {
        concurrencyConflictsTotal.inc({ resource_type: 'time_slot' });
        bookingsCreatedTotal.inc({ status: 'conflict' });
      } else {
        bookingsCreatedTotal.inc({ status: 'failed' });
      }
      endTimer();
      throw error;
    }
  }

  async confirmBooking(id: string, userId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        experience: true,
        timeSlot: true,
        user: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Reservación no encontrada');
    }

    if (booking.userId !== userId) {
      throw new AppError('No tienes permiso para confirmar esta reservación', 403);
    }

    if (!['PENDING', 'PENDING_PAYMENT'].includes(booking.status)) {
      throw new AppError('Esta reservación ya fue procesada', 400);
    }

    // Verify payment if Stripe is enabled
    if (booking.stripePaymentId && stripeService.isEnabled()) {
      const status = await stripeService.getPaymentStatus(booking.stripePaymentId);
      if (status !== 'succeeded') {
        throw new AppError('El pago no ha sido completado', 400);
      }
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      },
      include: {
        experience: true,
        timeSlot: true,
      },
    });

    // Emit booking.confirmed event (fire-and-forget)
    if (this.eventBus && booking.user) {
      this.eventBus.emitAsync(
        createEvent(EventTypes.BOOKING_CONFIRMED, {
          bookingId: id,
          userId,
          userName: `${booking.user.nombre} ${booking.user.apellido || ''}`.trim(),
          experienceId: booking.experienceId,
          experienceTitle: booking.experience.title,
          hostId: booking.experience.hostId,
          guestCount: booking.guestCount,
          totalPrice: Number(booking.totalPrice),
          timeSlot: {
            date: booking.timeSlot.date.toISOString().split('T')[0],
            startTime: booking.timeSlot.startTime,
          },
        })
      );
    }

    return updated;
  }

  async cancelBooking(id: string, userId: string) {
    // Ejecutar la operación con retry automático en caso de conflicto
    return withRetry(
      async () => {
        const booking = await this.prisma.booking.findUnique({
          where: { id },
          include: { experience: true, timeSlot: true },
        });

        if (!booking) {
          throw new NotFoundError('Reservación no encontrada');
        }

        // User or host can cancel
        if (booking.userId !== userId && booking.experience.hostId !== userId) {
          throw new AppError('No tienes permiso para cancelar esta reservación', 403);
        }

        if (booking.status === 'CANCELLED') {
          throw new AppError('Esta reservación ya fue cancelada', 400);
        }

        if (booking.status === 'COMPLETED') {
          throw new AppError('No puedes cancelar una reservación completada', 400);
        }

        // Guardar la versión actual para el locking optimista
        const currentVersion = booking.timeSlot.version;

        // FASE 1: Procesar reembolso en Stripe ANTES de actualizar BD
        // ============================================================
        if (booking.status === 'CONFIRMED' && booking.stripePaymentId) {
          try {
            await stripeService.createRefund(booking.stripePaymentId);
          } catch (refundError) {
            // Si el reembolso falla, no cancelamos la reservación
            throw new AppError(
              'Error al procesar el reembolso. Por favor contacta soporte.',
              500,
              refundError instanceof Error ? refundError.message : undefined
            );
          }
        }

        // FASE 2: Cancelar y restaurar capacidad en transacción
        // ======================================================
        const result = await this.prisma.$transaction(async (tx) => {
          // Restore slot capacity with optimistic locking
          await updateTimeSlotWithLocking(tx, booking.timeSlotId, currentVersion, {
            bookedCount: { decrement: booking.guestCount },
            isAvailable: true,
          });

          // Update booking status
          return tx.booking.update({
            where: { id },
            data: {
              status: 'CANCELLED',
              cancelledAt: new Date(),
            },
            include: {
              experience: true,
              timeSlot: true,
            },
          });
        });

        // Invalidate cache after cancellation
        if (this.cache) {
          await Promise.all([
            this.cache.del(`experience:${booking.experienceId}:detail`),
            this.cache.invalidate(`experience:${booking.experienceId}:slots:*`),
            this.cache.invalidate(`experiences:*`),
          ]);
        }

        // Emit booking.cancelled event (fire-and-forget)
        if (this.eventBus) {
          this.eventBus.emitAsync(
            createEvent(EventTypes.BOOKING_CANCELLED, {
              bookingId: id,
              userId: booking.userId,
              experienceId: booking.experienceId,
              experienceTitle: booking.experience.title,
              hostId: booking.experience.hostId,
              cancelledBy: userId,
              guestCount: booking.guestCount,
            })
          );
        }

        // Record cancellation metric
        bookingsCancelledTotal.inc();

        return result;
      },
      { maxRetries: 3, retryDelay: 100 }
    );
  }

  // Host marks booking as completed
  async completeBooking(id: string, hostId: string) {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: {
        experience: true,
        user: {
          select: { id: true, nombre: true, apellido: true },
        },
      },
    });

    if (!booking) {
      throw new NotFoundError('Reservación no encontrada');
    }

    if (booking.experience.hostId !== hostId) {
      throw new AppError('No tienes permiso para completar esta reservación', 403);
    }

    if (booking.status !== 'CONFIRMED') {
      throw new AppError('Solo puedes completar reservaciones confirmadas', 400);
    }

    const updated = await this.prisma.booking.update({
      where: { id },
      data: { status: 'COMPLETED' },
      include: {
        experience: true,
        timeSlot: true,
      },
    });

    // Emit booking.completed event (fire-and-forget)
    if (this.eventBus && booking.user) {
      this.eventBus.emitAsync(
        createEvent(EventTypes.BOOKING_COMPLETED, {
          bookingId: id,
          userId: booking.userId,
          userName: `${booking.user.nombre} ${booking.user.apellido || ''}`.trim(),
          experienceId: booking.experienceId,
          experienceTitle: booking.experience.title,
          hostId,
          totalPrice: Number(booking.totalPrice),
          guestCount: booking.guestCount,
        })
      );
    }

    return updated;
  }

  // ============================================
  // REVIEWS
  // ============================================

  async createReview(userId: string, experienceId: string, data: CreateExperienceReviewInput) {
    // Check if user has a completed booking for this experience
    const completedBooking = await this.prisma.booking.findFirst({
      where: {
        userId,
        experienceId,
        status: 'COMPLETED',
      },
    });

    if (!completedBooking) {
      throw new AppError('Solo puedes reseñar experiencias que hayas completado', 403);
    }

    // Check for existing review
    const existingReview = await this.prisma.experienceReview.findUnique({
      where: {
        userId_experienceId: { userId, experienceId },
      },
    });

    if (existingReview) {
      throw new AppError('Ya has reseñado esta experiencia', 400);
    }

    // Create review and update experience rating in transaction
    const review = await this.prisma.$transaction(async (tx) => {
      const newReview = await tx.experienceReview.create({
        data: {
          userId,
          experienceId,
          rating: data.rating,
          comment: data.comment,
        },
        include: {
          user: {
            select: {
              id: true,
              nombre: true,
              avatar: true,
            },
          },
        },
      });

      // Calculate new average rating
      const stats = await tx.experienceReview.aggregate({
        where: { experienceId },
        _avg: { rating: true },
        _count: { rating: true },
      });

      // Update experience
      await tx.experience.update({
        where: { id: experienceId },
        data: {
          rating: stats._avg.rating || 0,
          reviewCount: stats._count.rating,
        },
      });

      return newReview;
    });

    return review;
  }

  // ============================================
  // CLEANUP & MAINTENANCE
  // ============================================

  /**
   * Limpia bookings en estado PENDING_PAYMENT o PAYMENT_FAILED
   * que han superado el timeout (por defecto 30 minutos).
   * Restaura la capacidad de los slots.
   */
  async cleanupFailedBookings(timeoutMinutes: number = 30) {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const failedBookings = await this.prisma.booking.findMany({
      where: {
        status: {
          in: ['PENDING_PAYMENT', 'PAYMENT_FAILED'],
        },
        createdAt: {
          lt: cutoffTime,
        },
      },
      include: {
        timeSlot: true,
        experience: {
          select: { id: true, title: true },
        },
      },
    });

    if (failedBookings.length === 0) {
      return {
        cleaned: 0,
        details: [],
      };
    }

    // Agrupar por timeSlot para optimizar las actualizaciones
    const slotUpdates = new Map<string, number>();
    const details: Array<{
      bookingId: string;
      experienceTitle: string;
      guestCount: number;
      status: string;
      createdAt: Date;
    }> = [];

    for (const booking of failedBookings) {
      const current = slotUpdates.get(booking.timeSlotId) || 0;
      slotUpdates.set(booking.timeSlotId, current + booking.guestCount);

      details.push({
        bookingId: booking.id,
        experienceTitle: booking.experience.title,
        guestCount: booking.guestCount,
        status: booking.status,
        createdAt: booking.createdAt,
      });
    }

    // Ejecutar limpieza en transacción
    await this.prisma.$transaction(async (tx) => {
      // Restaurar capacidad de slots
      for (const [timeSlotId, guestCount] of slotUpdates) {
        await tx.experienceTimeSlot.update({
          where: { id: timeSlotId },
          data: {
            bookedCount: { decrement: guestCount },
            isAvailable: true,
          },
        });
      }

      // Marcar bookings como cancelados
      await tx.booking.updateMany({
        where: {
          id: {
            in: failedBookings.map((b) => b.id),
          },
        },
        data: {
          status: 'CANCELLED',
          cancelledAt: new Date(),
        },
      });
    });

    return {
      cleaned: failedBookings.length,
      details,
      slotsUpdated: slotUpdates.size,
    };
  }

  // ============================================
  // HOST DASHBOARD
  // ============================================

  async getHostExperiences(hostId: string) {
    return this.prisma.experience.findMany({
      where: { hostId },
      include: {
        _count: {
          select: {
            bookings: true,
            reviews: true,
            timeSlots: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getHostBookings(hostId: string, query: BookingQuery) {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      experience: { hostId },
      ...(status && { status }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: {
          experience: true,
          timeSlot: true,
          user: {
            select: {
              id: true,
              nombre: true,
              apellido: true,
              email: true,
              avatar: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
