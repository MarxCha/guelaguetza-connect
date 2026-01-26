import { PrismaClient, BadgeCategory } from '@prisma/client';
import { XP_VALUES, calculateLevel, getXpForNextLevel } from '../schemas/gamification.schema.js';
import { CacheService } from './cache.service.js';

export interface UserStatsResponse {
  xp: number;
  level: number;
  xpForNextLevel: number;
  xpProgress: number;
  currentStreak: number;
  longestStreak: number;
}

export interface BadgeResponse {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
  xpReward: number;
  threshold: number;
  unlockedAt?: string;
  isUnlocked: boolean;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nombre: string;
  avatar: string | null;
  xp: number;
  level: number;
}

export class GamificationService {
  // Cache TTLs (in seconds)
  private readonly CACHE_TTL = {
    BADGES_ALL: 3600, // 1 hora - los badges casi nunca cambian
    USER_BADGES: 300, // 5 minutos
    USER_STATS: 60, // 1 minuto - se actualizan frecuentemente
    LEADERBOARD: 300, // 5 minutos
    USER_RANK: 300, // 5 minutos
  };

  constructor(
    private prisma: PrismaClient,
    private cache?: CacheService
  ) {}

  // Get or create user stats
  async getOrCreateStats(userId: string): Promise<UserStatsResponse> {
    // Try cache first
    const cacheKey = `user:${userId}:stats`;
    if (this.cache) {
      const cached = await this.cache.get<UserStatsResponse>(cacheKey);
      if (cached) return cached;
    }

    let stats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      stats = await this.prisma.userStats.create({
        data: { userId },
      });
    }

    const level = calculateLevel(stats.xp);
    const currentLevelXp = getXpForNextLevel(level - 1);
    const nextLevelXp = getXpForNextLevel(level);
    const xpProgress = ((stats.xp - currentLevelXp) / (nextLevelXp - currentLevelXp)) * 100;

    const result = {
      xp: stats.xp,
      level,
      xpForNextLevel: nextLevelXp,
      xpProgress: Math.min(Math.max(xpProgress, 0), 100),
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
    };

    // Cache result
    if (this.cache) {
      await this.cache.set(cacheKey, result, this.CACHE_TTL.USER_STATS);
    }

    return result;
  }

  // Add XP to user
  async addXP(
    userId: string,
    amount: number,
    reason: keyof typeof XP_VALUES
  ): Promise<{ newXp: number; leveledUp: boolean; newLevel?: number }> {
    const stats = await this.prisma.userStats.upsert({
      where: { userId },
      update: { xp: { increment: amount } },
      create: { userId, xp: amount },
    });

    const oldLevel = calculateLevel(stats.xp - amount);
    const newLevel = calculateLevel(stats.xp);
    const leveledUp = newLevel > oldLevel;

    // Update level in stats if changed
    if (leveledUp) {
      await this.prisma.userStats.update({
        where: { userId },
        data: { level: newLevel },
      });
    }

    // Invalidate user cache when XP changes
    if (this.cache) {
      await Promise.all([
        this.cache.del(`user:${userId}:stats`),
        this.cache.del(`user:${userId}:rank`),
        this.invalidateLeaderboardCache(),
      ]);
    }

    return {
      newXp: stats.xp,
      leveledUp,
      newLevel: leveledUp ? newLevel : undefined,
    };
  }

  // Check and update daily streak
  async checkDailyStreak(userId: string): Promise<{ streak: number; isNewDay: boolean; xpAwarded: number }> {
    const stats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let result: { streak: number; isNewDay: boolean; xpAwarded: number };

    if (!stats) {
      // First visit
      await this.prisma.userStats.create({
        data: {
          userId,
          currentStreak: 1,
          longestStreak: 1,
          lastVisitDate: today,
          xp: XP_VALUES.DAILY_CHECK_IN,
        },
      });
      result = { streak: 1, isNewDay: true, xpAwarded: XP_VALUES.DAILY_CHECK_IN };
    } else {
      const lastVisit = stats.lastVisitDate ? new Date(stats.lastVisitDate) : null;

      if (!lastVisit) {
        // First tracked visit
        await this.prisma.userStats.update({
          where: { userId },
          data: {
            currentStreak: 1,
            longestStreak: Math.max(1, stats.longestStreak),
            lastVisitDate: today,
            xp: { increment: XP_VALUES.DAILY_CHECK_IN },
          },
        });
        result = { streak: 1, isNewDay: true, xpAwarded: XP_VALUES.DAILY_CHECK_IN };
      } else {
        lastVisit.setHours(0, 0, 0, 0);
        const dayDiff = Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24));

        if (dayDiff === 0) {
          // Same day
          result = { streak: stats.currentStreak, isNewDay: false, xpAwarded: 0 };
        } else if (dayDiff === 1) {
          // Consecutive day
          const newStreak = stats.currentStreak + 1;
          const newLongest = Math.max(newStreak, stats.longestStreak);

          await this.prisma.userStats.update({
            where: { userId },
            data: {
              currentStreak: newStreak,
              longestStreak: newLongest,
              lastVisitDate: today,
              xp: { increment: XP_VALUES.DAILY_CHECK_IN },
            },
          });

          result = { streak: newStreak, isNewDay: true, xpAwarded: XP_VALUES.DAILY_CHECK_IN };
        } else {
          // Streak broken
          await this.prisma.userStats.update({
            where: { userId },
            data: {
              currentStreak: 1,
              lastVisitDate: today,
              xp: { increment: XP_VALUES.DAILY_CHECK_IN },
            },
          });

          result = { streak: 1, isNewDay: true, xpAwarded: XP_VALUES.DAILY_CHECK_IN };
        }
      }
    }

    // Invalidate cache if data changed
    if (result.isNewDay && this.cache) {
      await this.invalidateUserCache(userId);
    }

    return result;
  }

  // Get all badges for a user
  async getUserBadges(userId: string): Promise<BadgeResponse[]> {
    // Try cache first
    const cacheKey = `user:${userId}:badges`;
    if (this.cache) {
      const cached = await this.cache.get<BadgeResponse[]>(cacheKey);
      if (cached) return cached;
    }

    // Fetch all badges (cache them separately as they rarely change)
    const allBadges = await this.getAllBadges();

    const userBadges = await this.prisma.userBadge.findMany({
      where: { userId },
      select: { badgeId: true, unlockedAt: true },
    });

    const userBadgeMap = new Map(
      userBadges.map((ub) => [ub.badgeId, ub.unlockedAt])
    );

    const result = allBadges.map((badge) => ({
      id: badge.id,
      code: badge.code,
      name: badge.name,
      description: badge.description,
      icon: badge.icon,
      category: badge.category,
      xpReward: badge.xpReward,
      threshold: badge.threshold,
      unlockedAt: userBadgeMap.get(badge.id)?.toISOString(),
      isUnlocked: userBadgeMap.has(badge.id),
    }));

    // Cache result
    if (this.cache) {
      await this.cache.set(cacheKey, result, this.CACHE_TTL.USER_BADGES);
    }

    return result;
  }

  // Helper: Get all badges (cached)
  private async getAllBadges() {
    const cacheKey = 'badges:all';
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const badges = await this.prisma.badge.findMany({
      orderBy: [{ category: 'asc' }, { threshold: 'asc' }],
    });

    if (this.cache) {
      await this.cache.set(cacheKey, badges, this.CACHE_TTL.BADGES_ALL);
    }

    return badges;
  }

  // Check and award badges based on user actions
  async checkAndAwardBadges(userId: string): Promise<BadgeResponse[]> {
    const newBadges: BadgeResponse[] = [];

    // Get user statistics
    const [storiesCount, followersCount, likesReceived, commentsReceived, stats] =
      await Promise.all([
        this.prisma.story.count({ where: { userId } }),
        this.prisma.follow.count({ where: { followingId: userId } }),
        this.prisma.like.count({
          where: { story: { userId } },
        }),
        this.prisma.comment.count({
          where: { story: { userId } },
        }),
        this.prisma.userStats.findUnique({ where: { userId } }),
      ]);

    // Get all badges not yet earned
    const earnedBadgeIds = (
      await this.prisma.userBadge.findMany({
        where: { userId },
        select: { badgeId: true },
      })
    ).map((ub) => ub.badgeId);

    const availableBadges = await this.prisma.badge.findMany({
      where: { id: { notIn: earnedBadgeIds } },
    });

    // Check each badge
    for (const badge of availableBadges) {
      let earned = false;

      switch (badge.code) {
        // Stories badges
        case 'FIRST_STORY':
          earned = storiesCount >= 1;
          break;
        case 'STORIES_10':
          earned = storiesCount >= 10;
          break;
        case 'STORIES_50':
          earned = storiesCount >= 50;
          break;
        case 'STORIES_100':
          earned = storiesCount >= 100;
          break;

        // Social badges
        case 'FOLLOWERS_10':
          earned = followersCount >= 10;
          break;
        case 'FOLLOWERS_50':
          earned = followersCount >= 50;
          break;
        case 'FOLLOWERS_100':
          earned = followersCount >= 100;
          break;
        case 'FOLLOWERS_500':
          earned = followersCount >= 500;
          break;

        // Engagement badges
        case 'LIKES_100':
          earned = likesReceived >= 100;
          break;
        case 'LIKES_500':
          earned = likesReceived >= 500;
          break;
        case 'COMMENTS_50':
          earned = commentsReceived >= 50;
          break;

        // Streak badges
        case 'STREAK_7':
          earned = (stats?.longestStreak || 0) >= 7;
          break;
        case 'STREAK_30':
          earned = (stats?.longestStreak || 0) >= 30;
          break;
        case 'STREAK_100':
          earned = (stats?.longestStreak || 0) >= 100;
          break;

        default:
          // Check threshold-based badges
          if (badge.category === 'STORIES') {
            earned = storiesCount >= badge.threshold;
          } else if (badge.category === 'SOCIAL') {
            earned = followersCount >= badge.threshold;
          }
      }

      if (earned) {
        // Award badge
        await this.prisma.userBadge.create({
          data: { userId, badgeId: badge.id },
        });

        // Award XP
        if (badge.xpReward > 0) {
          await this.addXP(userId, badge.xpReward, 'UNLOCK_BADGE');
        }

        newBadges.push({
          id: badge.id,
          code: badge.code,
          name: badge.name,
          description: badge.description,
          icon: badge.icon,
          category: badge.category,
          xpReward: badge.xpReward,
          threshold: badge.threshold,
          unlockedAt: new Date().toISOString(),
          isUnlocked: true,
        });
      }
    }

    // Invalidate badges cache if new badges were awarded
    if (newBadges.length > 0 && this.cache) {
      await this.cache.del(`user:${userId}:badges`);
    }

    return newBadges;
  }

  // Get leaderboard
  async getLeaderboard(
    page: number = 1,
    limit: number = 20
  ): Promise<{ entries: LeaderboardEntry[]; total: number }> {
    // Try cache first
    const cacheKey = `leaderboard:page:${page}:limit:${limit}`;
    if (this.cache) {
      const cached = await this.cache.get<{ entries: LeaderboardEntry[]; total: number }>(cacheKey);
      if (cached) return cached;
    }

    const skip = (page - 1) * limit;

    const [entries, total] = await Promise.all([
      this.prisma.userStats.findMany({
        orderBy: { xp: 'desc' },
        skip,
        take: limit,
        include: {
          user: {
            select: { id: true, nombre: true, avatar: true },
          },
        },
      }),
      this.prisma.userStats.count(),
    ]);

    const result = {
      entries: entries.map((entry, index) => ({
        rank: skip + index + 1,
        userId: entry.user.id,
        nombre: entry.user.nombre,
        avatar: entry.user.avatar,
        xp: entry.xp,
        level: calculateLevel(entry.xp),
      })),
      total,
    };

    // Cache result
    if (this.cache) {
      await this.cache.set(cacheKey, result, this.CACHE_TTL.LEADERBOARD);
    }

    return result;
  }

  // Get user rank
  async getUserRank(userId: string): Promise<number> {
    // Try cache first
    const cacheKey = `user:${userId}:rank`;
    if (this.cache) {
      const cached = await this.cache.get<number>(cacheKey);
      if (cached !== null) return cached;
    }

    const userStats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    if (!userStats) return 0;

    const higherRanked = await this.prisma.userStats.count({
      where: { xp: { gt: userStats.xp } },
    });

    const rank = higherRanked + 1;

    // Cache result
    if (this.cache) {
      await this.cache.set(cacheKey, rank, this.CACHE_TTL.USER_RANK);
    }

    return rank;
  }

  // Invalidate leaderboard cache (call when XP changes)
  async invalidateLeaderboardCache(): Promise<void> {
    if (!this.cache) return;
    await this.cache.invalidate('leaderboard:*');
  }

  // Invalidate user cache (call when user data changes)
  async invalidateUserCache(userId: string): Promise<void> {
    if (!this.cache) return;
    await Promise.all([
      this.cache.del(`user:${userId}:badges`),
      this.cache.del(`user:${userId}:rank`),
      this.cache.del(`user:${userId}:stats`),
    ]);
  }
}
