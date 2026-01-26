import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { BookingService } from '../services/booking.service.js';
import {
  CreateExperienceSchema,
  UpdateExperienceSchema,
  CreateMultipleTimeSlotsSchema,
  CreateBookingSchema,
  ExperienceQuerySchema,
  TimeSlotQuerySchema,
  BookingQuerySchema,
  CreateExperienceReviewSchema,
} from '../schemas/booking.schema.js';
import { ConcurrencyError } from '../utils/errors.js';

const bookingsRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const bookingService = new BookingService(fastify.prisma, fastify.cache, fastify.eventBus);

  // ============================================
  // EXPERIENCES (Public & Host)
  // ============================================

  // List experiences (public)
  app.get(
    '/experiences',
    {
      schema: {
        querystring: ExperienceQuerySchema,
      },
    },
    async (request) => {
      const query = request.query;
      return bookingService.getExperiences(query);
    }
  );

  // Get experience detail (public)
  app.get(
    '/experiences/:id',
    {
      schema: {
        params: z.object({ id: z.string().cuid() }),
      },
    },
    async (request) => {
      const { id } = request.params;
      return bookingService.getExperienceById(id);
    }
  );

  // Create experience (authenticated)
  app.post(
    '/experiences',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: CreateExperienceSchema,
      },
    },
    async (request, reply) => {
      const experience = await bookingService.createExperience(
        request.user.userId,
        request.body
      );
      return reply.status(201).send(experience);
    }
  );

  // Update experience (host only)
  app.put(
    '/experiences/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
        body: UpdateExperienceSchema,
      },
    },
    async (request) => {
      const { id } = request.params;
      return bookingService.updateExperience(id, request.user.userId, request.body);
    }
  );

  // Delete experience (host only)
  app.delete(
    '/experiences/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
      },
    },
    async (request) => {
      const { id } = request.params;
      return bookingService.deleteExperience(id, request.user.userId);
    }
  );

  // ============================================
  // TIME SLOTS
  // ============================================

  // Get available slots for experience
  app.get(
    '/experiences/:id/slots',
    {
      schema: {
        params: z.object({ id: z.string().cuid() }),
        querystring: TimeSlotQuerySchema,
      },
    },
    async (request) => {
      const { id } = request.params;
      return bookingService.getTimeSlots(id, request.query);
    }
  );

  // Create time slots (host only)
  app.post(
    '/experiences/:id/slots',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
        body: CreateMultipleTimeSlotsSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const result = await bookingService.createTimeSlots(
        id,
        request.user.userId,
        request.body.slots
      );
      return reply.status(201).send(result);
    }
  );

  // Delete time slot (host only)
  app.delete(
    '/slots/:slotId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ slotId: z.string().cuid() }),
      },
    },
    async (request) => {
      const { slotId } = request.params;
      return bookingService.deleteTimeSlot(slotId, request.user.userId);
    }
  );

  // ============================================
  // BOOKINGS (User)
  // ============================================

  // Get my bookings
  app.get(
    '/bookings',
    {
      onRequest: [fastify.authenticate],
      schema: {
        querystring: BookingQuerySchema,
      },
    },
    async (request) => {
      return bookingService.getMyBookings(request.user.userId, request.query);
    }
  );

  // Get booking detail
  app.get(
    '/bookings/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
      },
    },
    async (request) => {
      const { id } = request.params;
      return bookingService.getBookingById(id, request.user.userId);
    }
  );

  // Create booking
  app.post(
    '/bookings',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: CreateBookingSchema,
      },
    },
    async (request, reply) => {
      try {
        const result = await bookingService.createBooking(
          request.user.userId,
          request.body
        );
        return reply.status(201).send(result);
      } catch (error) {
        if (error instanceof ConcurrencyError) {
          return reply.status(409).send({
            error: 'ConcurrencyError',
            message: error.message,
            hint: 'El horario ha sido actualizado. Por favor, recarga los datos e intenta nuevamente.',
          });
        }
        throw error;
      }
    }
  );

  // Confirm booking (after payment)
  app.post(
    '/bookings/:id/confirm',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
      },
    },
    async (request) => {
      const { id } = request.params;
      return bookingService.confirmBooking(id, request.user.userId);
    }
  );

  // Cancel booking
  app.post(
    '/bookings/:id/cancel',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
      },
    },
    async (request, reply) => {
      try {
        const { id } = request.params;
        return await bookingService.cancelBooking(id, request.user.userId);
      } catch (error) {
        if (error instanceof ConcurrencyError) {
          return reply.status(409).send({
            error: 'ConcurrencyError',
            message: error.message,
            hint: 'La reservación ha sido actualizada. Por favor, recarga los datos e intenta nuevamente.',
          });
        }
        throw error;
      }
    }
  );

  // Complete booking (host only)
  app.post(
    '/bookings/:id/complete',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
      },
    },
    async (request) => {
      const { id } = request.params;
      return bookingService.completeBooking(id, request.user.userId);
    }
  );

  // ============================================
  // REVIEWS
  // ============================================

  // Create review for experience
  app.post(
    '/experiences/:id/reviews',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
        body: CreateExperienceReviewSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const review = await bookingService.createReview(
        request.user.userId,
        id,
        request.body
      );
      return reply.status(201).send(review);
    }
  );

  // ============================================
  // HOST DASHBOARD
  // ============================================

  // Get host's experiences
  app.get(
    '/host/experiences',
    {
      onRequest: [fastify.authenticate],
    },
    async (request) => {
      return bookingService.getHostExperiences(request.user.userId);
    }
  );

  // Get bookings for host's experiences
  app.get(
    '/host/bookings',
    {
      onRequest: [fastify.authenticate],
      schema: {
        querystring: BookingQuerySchema,
      },
    },
    async (request) => {
      return bookingService.getHostBookings(request.user.userId, request.query);
    }
  );
};

export default bookingsRoutes;
