import { FastifyPluginAsync } from 'fastify';
import { EventService } from '../services/event.service.js';
import { NotificationService } from '../services/notification.service.js';
import {
  eventsQuerySchema,
  eventIdParamsSchema,
  createReminderBodySchema,
  EventsQuery,
  EventIdParams,
  CreateReminderBody,
} from '../schemas/event.schema.js';

const eventsRoutes: FastifyPluginAsync = async (fastify) => {
  const notificationService = new NotificationService(fastify.prisma);
  const eventService = new EventService(fastify.prisma, notificationService, fastify.cache);

  // Get events with filters
  fastify.get<{ Querystring: EventsQuery }>(
    '/',
    {
      schema: {
        querystring: eventsQuerySchema,
      },
    },
    async (request, reply) => {
      // Try to get userId from token if present
      let userId: string | undefined;
      try {
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = fastify.jwt.verify<{ userId: string }>(token);
          userId = decoded.userId;
        }
      } catch {
        // Ignore token errors - user is just not authenticated
      }

      const result = await eventService.getEvents(request.query, userId);
      return reply.send({
        success: true,
        data: result,
      });
    }
  );

  // Get single event
  fastify.get<{ Params: EventIdParams }>(
    '/:eventId',
    {
      schema: {
        params: eventIdParamsSchema,
      },
    },
    async (request, reply) => {
      // Try to get userId from token if present
      let userId: string | undefined;
      try {
        const authHeader = request.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.substring(7);
          const decoded = fastify.jwt.verify<{ userId: string }>(token);
          userId = decoded.userId;
        }
      } catch {
        // Ignore token errors
      }

      const event = await eventService.getEvent(request.params.eventId, userId);

      if (!event) {
        return reply.status(404).send({
          success: false,
          error: 'Evento no encontrado',
        });
      }

      return reply.send({
        success: true,
        data: event,
      });
    }
  );

  // Create RSVP
  fastify.post<{ Params: EventIdParams }>(
    '/:eventId/rsvp',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: eventIdParamsSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { eventId } = request.params;

      try {
        await eventService.createRSVP(userId, eventId);
        return reply.send({
          success: true,
          message: 'Asistencia confirmada',
        });
      } catch (error) {
        if ((error as Error).message === 'Evento no encontrado') {
          return reply.status(404).send({
            success: false,
            error: 'Evento no encontrado',
          });
        }
        // Unique constraint violation - already RSVPd
        return reply.status(400).send({
          success: false,
          error: 'Ya confirmaste tu asistencia',
        });
      }
    }
  );

  // Delete RSVP
  fastify.delete<{ Params: EventIdParams }>(
    '/:eventId/rsvp',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: eventIdParamsSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { eventId } = request.params;

      await eventService.deleteRSVP(userId, eventId);
      return reply.send({
        success: true,
        message: 'Asistencia cancelada',
      });
    }
  );

  // Create reminder
  fastify.post<{ Params: EventIdParams; Body: CreateReminderBody }>(
    '/:eventId/reminder',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: eventIdParamsSchema,
        body: createReminderBodySchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { eventId } = request.params;
      const { remindAt } = request.body;

      try {
        await eventService.createReminder(userId, eventId, remindAt);
        return reply.send({
          success: true,
          message: 'Recordatorio creado',
        });
      } catch (error) {
        const message = (error as Error).message;
        if (message === 'Evento no encontrado') {
          return reply.status(404).send({
            success: false,
            error: message,
          });
        }
        return reply.status(400).send({
          success: false,
          error: message,
        });
      }
    }
  );

  // Delete reminder
  fastify.delete<{ Params: EventIdParams }>(
    '/:eventId/reminder',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: eventIdParamsSchema,
      },
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const { eventId } = request.params;

      await eventService.deleteReminder(userId, eventId);
      return reply.send({
        success: true,
        message: 'Recordatorio eliminado',
      });
    }
  );

  // Get user's RSVPd events
  fastify.get(
    '/my-rsvps',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const result = await eventService.getMyRSVPs(userId);

      return reply.send({
        success: true,
        data: result,
      });
    }
  );
};

export default eventsRoutes;
