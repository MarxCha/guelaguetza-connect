import { PrismaClient } from '@prisma/client';
import {
  DomainEvent,
  EventTypes,
  BookingCompletedPayload,
  OrderDeliveredPayload,
  ReviewCreatedPayload,
  StoryCreatedPayload,
  UserFollowedPayload,
  createEvent,
  XPAwardedPayload,
  BadgeUnlockedPayload,
  LevelUpPayload,
} from '../types.js';

/**
 * GamificationHandler - Sistema de XP y badges
 *
 * Este handler escucha eventos del dominio y otorga XP/badges según corresponda.
 * Emite sus propios eventos cuando se desbloquean badges o se sube de nivel.
 */

// XP Awards por acción
const XP_REWARDS = {
  COMPLETE_BOOKING: 50,
  RECEIVE_ORDER: 30,
  CREATE_REVIEW: 20,
  RECEIVE_REVIEW: 10,
  CREATE_STORY: 15,
  GAIN_FOLLOWER: 5,
  DAILY_LOGIN: 10,
} as const;

// Niveles y XP requerido
const LEVELS = [
  { level: 1, xpRequired: 0 },
  { level: 2, xpRequired: 100 },
  { level: 3, xpRequired: 250 },
  { level: 4, xpRequired: 500 },
  { level: 5, xpRequired: 1000 },
  { level: 6, xpRequired: 2000 },
  { level: 7, xpRequired: 3500 },
  { level: 8, xpRequired: 5500 },
  { level: 9, xpRequired: 8000 },
  { level: 10, xpRequired: 12000 },
];

export class GamificationHandler {
  constructor(private prisma: PrismaClient, private eventBus?: any) {}

  /**
   * Registra todos los event listeners
   */
  register(eventBus: any): void {
    this.eventBus = eventBus;

    // Booking Events
    eventBus.on(EventTypes.BOOKING_COMPLETED, this.onBookingCompleted.bind(this), 'GamificationHandler.onBookingCompleted');

    // Marketplace Events
    eventBus.on(EventTypes.ORDER_DELIVERED, this.onOrderDelivered.bind(this), 'GamificationHandler.onOrderDelivered');

    // Review Events
    eventBus.on(EventTypes.REVIEW_CREATED, this.onReviewCreated.bind(this), 'GamificationHandler.onReviewCreated');

    // Social Events
    eventBus.on(EventTypes.STORY_CREATED, this.onStoryCreated.bind(this), 'GamificationHandler.onStoryCreated');
    eventBus.on(EventTypes.USER_FOLLOWED, this.onUserFollowed.bind(this), 'GamificationHandler.onUserFollowed');
  }

  // ============================================
  // EVENT HANDLERS
  // ============================================

  private async onBookingCompleted(event: DomainEvent<BookingCompletedPayload>): Promise<void> {
    const { userId } = event.payload;

    await this.awardXP(
      userId,
      XP_REWARDS.COMPLETE_BOOKING,
      'COMPLETE_BOOKING',
      'BOOKING',
      event.payload.bookingId,
      event.correlationId
    );

    // Check for booking-related badges
    await this.checkBookingBadges(userId);
  }

  private async onOrderDelivered(event: DomainEvent<OrderDeliveredPayload>): Promise<void> {
    const { userId, sellerId } = event.payload;

    // Award XP to buyer
    await this.awardXP(
      userId,
      XP_REWARDS.RECEIVE_ORDER,
      'RECEIVE_ORDER',
      'ORDER',
      event.payload.orderId,
      event.correlationId
    );

    // Award XP to seller
    await this.awardXP(
      sellerId,
      XP_REWARDS.RECEIVE_ORDER,
      'SELL_ORDER',
      'ORDER',
      event.payload.orderId,
      event.correlationId
    );

    // Check for marketplace badges
    await this.checkMarketplaceBadges(sellerId);
  }

  private async onReviewCreated(event: DomainEvent<ReviewCreatedPayload>): Promise<void> {
    const { userId, ownerId } = event.payload;

    // Award XP to reviewer
    await this.awardXP(
      userId,
      XP_REWARDS.CREATE_REVIEW,
      'CREATE_REVIEW',
      'REVIEW',
      event.payload.reviewId,
      event.correlationId
    );

    // Award XP to reviewed user (host/seller)
    await this.awardXP(
      ownerId,
      XP_REWARDS.RECEIVE_REVIEW,
      'RECEIVE_REVIEW',
      'REVIEW',
      event.payload.reviewId,
      event.correlationId
    );

    // Check for engagement badges
    await this.checkEngagementBadges(userId);
  }

  private async onStoryCreated(event: DomainEvent<StoryCreatedPayload>): Promise<void> {
    const { userId } = event.payload;

    await this.awardXP(
      userId,
      XP_REWARDS.CREATE_STORY,
      'CREATE_STORY',
      'STORY',
      event.payload.storyId,
      event.correlationId
    );

    // Check for story badges
    await this.checkStoryBadges(userId);
  }

  private async onUserFollowed(event: DomainEvent<UserFollowedPayload>): Promise<void> {
    const { followingId } = event.payload;

    await this.awardXP(
      followingId,
      XP_REWARDS.GAIN_FOLLOWER,
      'GAIN_FOLLOWER',
      'USER',
      event.payload.followerId,
      event.correlationId
    );

    // Check for social badges
    await this.checkSocialBadges(followingId);
  }

  // ============================================
  // CORE GAMIFICATION LOGIC
  // ============================================

  /**
   * Otorga XP a un usuario y verifica si sube de nivel
   */
  private async awardXP(
    userId: string,
    amount: number,
    action: string,
    targetType?: string,
    targetId?: string,
    correlationId?: string
  ): Promise<void> {
    // Get or create user stats
    let stats = await this.prisma.userStats.findUnique({
      where: { userId },
    });

    if (!stats) {
      stats = await this.prisma.userStats.create({
        data: { userId, xp: 0, level: 1 },
      });
    }

    const previousXP = stats.xp;
    const previousLevel = stats.level;
    const newXP = previousXP + amount;

    // Calculate new level
    const newLevel = this.calculateLevel(newXP);

    // Update stats
    await this.prisma.userStats.update({
      where: { userId },
      data: {
        xp: newXP,
        level: newLevel,
      },
    });

    // Emit XP awarded event
    if (this.eventBus) {
      const xpEvent = createEvent<typeof EventTypes.XP_AWARDED>(
        EventTypes.XP_AWARDED,
        {
          userId,
          amount,
          action,
          targetType,
          targetId,
          previousXP,
          newXP,
          previousLevel,
          newLevel,
        },
        correlationId
      );
      this.eventBus.emitAsync(xpEvent);
    }

    // Check for level up
    if (newLevel > previousLevel) {
      await this.handleLevelUp(userId, previousLevel, newLevel, newXP, correlationId);
    }
  }

  /**
   * Maneja el evento de subir de nivel
   */
  private async handleLevelUp(
    userId: string,
    previousLevel: number,
    newLevel: number,
    currentXP: number,
    correlationId?: string
  ): Promise<void> {
    const xpForNextLevel = this.getXPForNextLevel(newLevel);

    // Emit level up event
    if (this.eventBus) {
      const levelUpEvent = createEvent<typeof EventTypes.LEVEL_UP>(
        EventTypes.LEVEL_UP,
        {
          userId,
          previousLevel,
          newLevel,
          currentXP,
          xpForNextLevel,
        },
        correlationId
      );
      await this.eventBus.emit(levelUpEvent);
    }

    // Check for level-based badges
    await this.checkLevelBadges(userId, newLevel);
  }

  /**
   * Desbloquea una insignia para un usuario
   */
  private async unlockBadge(userId: string, badgeCode: string, correlationId?: string): Promise<void> {
    // Check if already unlocked
    const existing = await this.prisma.userBadge.findFirst({
      where: {
        userId,
        badge: { code: badgeCode },
      },
    });

    if (existing) return;

    // Get badge
    const badge = await this.prisma.badge.findUnique({
      where: { code: badgeCode },
    });

    if (!badge) {
      console.warn(`[GamificationHandler] Badge not found: ${badgeCode}`);
      return;
    }

    // Unlock badge
    await this.prisma.userBadge.create({
      data: {
        userId,
        badgeId: badge.id,
      },
    });

    // Award XP bonus
    if (badge.xpReward > 0) {
      await this.awardXP(userId, badge.xpReward, 'BADGE_UNLOCKED', 'BADGE', badge.id, correlationId);
    }

    // Emit badge unlocked event
    if (this.eventBus) {
      const badgeEvent = createEvent<typeof EventTypes.BADGE_UNLOCKED>(
        EventTypes.BADGE_UNLOCKED,
        {
          userId,
          badgeId: badge.id,
          badgeCode: badge.code,
          badgeName: badge.name,
          badgeDescription: badge.description,
          badgeIcon: badge.icon,
          xpReward: badge.xpReward,
          unlockedAt: new Date(),
        },
        correlationId
      );
      await this.eventBus.emit(badgeEvent);
    }
  }

  // ============================================
  // BADGE CHECKS
  // ============================================

  private async checkBookingBadges(userId: string): Promise<void> {
    const completedCount = await this.prisma.booking.count({
      where: { userId, status: 'COMPLETED' },
    });

    if (completedCount >= 1) await this.unlockBadge(userId, 'FIRST_BOOKING');
    if (completedCount >= 5) await this.unlockBadge(userId, 'EXPLORER');
    if (completedCount >= 10) await this.unlockBadge(userId, 'ADVENTURER');
    if (completedCount >= 25) await this.unlockBadge(userId, 'CULTURE_LOVER');
  }

  private async checkMarketplaceBadges(sellerId: string): Promise<void> {
    const sellerProfile = await this.prisma.sellerProfile.findUnique({
      where: { userId: sellerId },
      include: {
        orders: {
          where: { status: 'DELIVERED' },
        },
      },
    });

    if (!sellerProfile) return;

    const salesCount = sellerProfile.orders.length;

    if (salesCount >= 1) await this.unlockBadge(sellerId, 'FIRST_SALE');
    if (salesCount >= 10) await this.unlockBadge(sellerId, 'MERCHANT');
    if (salesCount >= 50) await this.unlockBadge(sellerId, 'MASTER_CRAFTSMAN');
  }

  private async checkStoryBadges(userId: string): Promise<void> {
    const storyCount = await this.prisma.story.count({
      where: { userId },
    });

    if (storyCount >= 1) await this.unlockBadge(userId, 'STORYTELLER');
    if (storyCount >= 10) await this.unlockBadge(userId, 'CONTENT_CREATOR');
    if (storyCount >= 50) await this.unlockBadge(userId, 'INFLUENCER');
  }

  private async checkSocialBadges(userId: string): Promise<void> {
    const followerCount = await this.prisma.follow.count({
      where: { followingId: userId },
    });

    if (followerCount >= 10) await this.unlockBadge(userId, 'POPULAR');
    if (followerCount >= 50) await this.unlockBadge(userId, 'CELEBRITY');
    if (followerCount >= 100) await this.unlockBadge(userId, 'LEGEND');
  }

  private async checkEngagementBadges(userId: string): Promise<void> {
    const reviewCount = await this.prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*) as count FROM (
        SELECT id FROM "ExperienceReview" WHERE "userId" = ${userId}
        UNION ALL
        SELECT id FROM "ProductReview" WHERE "userId" = ${userId}
      ) reviews
    `;

    const total = Number(reviewCount[0]?.count || 0);

    if (total >= 5) await this.unlockBadge(userId, 'CRITIC');
    if (total >= 20) await this.unlockBadge(userId, 'EXPERT_REVIEWER');
  }

  private async checkLevelBadges(userId: string, level: number): Promise<void> {
    if (level >= 5) await this.unlockBadge(userId, 'LEVEL_5');
    if (level >= 10) await this.unlockBadge(userId, 'LEVEL_10');
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private calculateLevel(xp: number): number {
    let level = 1;
    for (const levelData of LEVELS) {
      if (xp >= levelData.xpRequired) {
        level = levelData.level;
      } else {
        break;
      }
    }
    return level;
  }

  private getXPForNextLevel(currentLevel: number): number {
    const nextLevel = LEVELS.find((l) => l.level === currentLevel + 1);
    return nextLevel?.xpRequired || 0;
  }
}
