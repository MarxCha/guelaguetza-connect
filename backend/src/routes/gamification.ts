import { FastifyPluginAsync } from 'fastify';
import { GamificationService } from '../services/gamification.service.js';
import {
  userIdParamsSchema,
  paginationQuerySchema,
  UserIdParams,
  PaginationQuery,
} from '../schemas/gamification.schema.js';

const gamificationRoutes: FastifyPluginAsync = async (fastify) => {
  const gamificationService = new GamificationService(fastify.prisma, fastify.cache);

  // Get current user's stats
  fastify.get(
    '/me/stats',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const stats = await gamificationService.getOrCreateStats(userId);
      const rank = await gamificationService.getUserRank(userId);

      return reply.send({
        success: true,
        data: { ...stats, rank },
      });
    }
  );

  // Get current user's badges
  fastify.get(
    '/me/badges',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const badges = await gamificationService.getUserBadges(userId);

      return reply.send({
        success: true,
        data: badges,
      });
    }
  );

  // Check daily streak (call on app open)
  fastify.post(
    '/me/check-in',
    {
      onRequest: [fastify.authenticate],
    },
    async (request, reply) => {
      const userId = request.user.userId;
      const result = await gamificationService.checkDailyStreak(userId);

      // Check for new badges
      const newBadges = await gamificationService.checkAndAwardBadges(userId);

      return reply.send({
        success: true,
        data: {
          ...result,
          newBadges,
        },
      });
    }
  );

  // Get another user's stats (public)
  fastify.get<{ Params: UserIdParams }>(
    '/users/:userId/stats',
    {
      schema: {
        params: userIdParamsSchema,
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const stats = await gamificationService.getOrCreateStats(userId);
      const rank = await gamificationService.getUserRank(userId);

      return reply.send({
        success: true,
        data: { ...stats, rank },
      });
    }
  );

  // Get another user's badges (public)
  fastify.get<{ Params: UserIdParams }>(
    '/users/:userId/badges',
    {
      schema: {
        params: userIdParamsSchema,
      },
    },
    async (request, reply) => {
      const { userId } = request.params;
      const badges = await gamificationService.getUserBadges(userId);

      // Only return unlocked badges for other users
      const unlockedBadges = badges.filter((b) => b.isUnlocked);

      return reply.send({
        success: true,
        data: unlockedBadges,
      });
    }
  );

  // Get leaderboard
  fastify.get<{ Querystring: PaginationQuery }>(
    '/leaderboard',
    {
      schema: {
        querystring: paginationQuerySchema,
      },
    },
    async (request, reply) => {
      const { page, limit } = request.query;
      const result = await gamificationService.getLeaderboard(page, limit);

      return reply.send({
        success: true,
        data: result,
      });
    }
  );
};

export default gamificationRoutes;
