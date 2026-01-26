import { PrismaClient } from '@prisma/client';
import {
  DomainEvent,
  EventTypes,
  BookingCreatedPayload,
  BookingConfirmedPayload,
  BookingCancelledPayload,
  BookingCompletedPayload,
  OrderCreatedPayload,
  OrderPaidPayload,
  OrderShippedPayload,
  OrderDeliveredPayload,
  ReviewCreatedPayload,
  StoryCreatedPayload,
  UserFollowedPayload,
  UserRegisteredPayload,
  XPAwardedPayload,
  BadgeUnlockedPayload,
  LevelUpPayload,
} from '../types.js';

/**
 * AnalyticsHandler - Registra actividad del usuario para analytics
 *
 * Este handler escucha eventos del dominio y registra actividad en ActivityLog.
 * Permite realizar análisis de comportamiento, métricas de uso, y reportes.
 */
export class AnalyticsHandler {
  constructor(private prisma: PrismaClient) {}

  /**
   * Registra todos los event listeners
   */
  register(eventBus: any): void {
    // Booking Events
    eventBus.on(EventTypes.BOOKING_CREATED, this.onBookingCreated.bind(this), 'AnalyticsHandler.onBookingCreated');
    eventBus.on(EventTypes.BOOKING_CONFIRMED, this.onBookingConfirmed.bind(this), 'AnalyticsHandler.onBookingConfirmed');
    eventBus.on(EventTypes.BOOKING_CANCELLED, this.onBookingCancelled.bind(this), 'AnalyticsHandler.onBookingCancelled');
    eventBus.on(EventTypes.BOOKING_COMPLETED, this.onBookingCompleted.bind(this), 'AnalyticsHandler.onBookingCompleted');

    // Marketplace Events
    eventBus.on(EventTypes.ORDER_CREATED, this.onOrderCreated.bind(this), 'AnalyticsHandler.onOrderCreated');
    eventBus.on(EventTypes.ORDER_PAID, this.onOrderPaid.bind(this), 'AnalyticsHandler.onOrderPaid');
    eventBus.on(EventTypes.ORDER_SHIPPED, this.onOrderShipped.bind(this), 'AnalyticsHandler.onOrderShipped');
    eventBus.on(EventTypes.ORDER_DELIVERED, this.onOrderDelivered.bind(this), 'AnalyticsHandler.onOrderDelivered');

    // User Events
    eventBus.on(EventTypes.USER_REGISTERED, this.onUserRegistered.bind(this), 'AnalyticsHandler.onUserRegistered');

    // Gamification Events
    eventBus.on(EventTypes.XP_AWARDED, this.onXPAwarded.bind(this), 'AnalyticsHandler.onXPAwarded');
    eventBus.on(EventTypes.BADGE_UNLOCKED, this.onBadgeUnlocked.bind(this), 'AnalyticsHandler.onBadgeUnlocked');
    eventBus.on(EventTypes.LEVEL_UP, this.onLevelUp.bind(this), 'AnalyticsHandler.onLevelUp');

    // Review Events
    eventBus.on(EventTypes.REVIEW_CREATED, this.onReviewCreated.bind(this), 'AnalyticsHandler.onReviewCreated');

    // Social Events
    eventBus.on(EventTypes.STORY_CREATED, this.onStoryCreated.bind(this), 'AnalyticsHandler.onStoryCreated');
    eventBus.on(EventTypes.USER_FOLLOWED, this.onUserFollowed.bind(this), 'AnalyticsHandler.onUserFollowed');
  }

  // ============================================
  // BOOKING EVENT HANDLERS
  // ============================================

  private async onBookingCreated(event: DomainEvent<BookingCreatedPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'CREATE_BOOKING',
      targetType: 'BOOKING',
      targetId: event.payload.bookingId,
      metadata: {
        experienceId: event.payload.experienceId,
        experienceTitle: event.payload.experienceTitle,
        hostId: event.payload.hostId,
        guestCount: event.payload.guestCount,
        totalPrice: event.payload.totalPrice,
        timeSlot: event.payload.timeSlot,
        correlationId: event.correlationId,
      },
    });
  }

  private async onBookingConfirmed(event: DomainEvent<BookingConfirmedPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'CONFIRM_BOOKING',
      targetType: 'BOOKING',
      targetId: event.payload.bookingId,
      metadata: {
        experienceId: event.payload.experienceId,
        totalPrice: event.payload.totalPrice,
        correlationId: event.correlationId,
      },
    });
  }

  private async onBookingCancelled(event: DomainEvent<BookingCancelledPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.cancelledBy,
      action: 'CANCEL_BOOKING',
      targetType: 'BOOKING',
      targetId: event.payload.bookingId,
      metadata: {
        experienceId: event.payload.experienceId,
        reason: event.payload.reason,
        cancelledByRole: event.payload.cancelledBy === event.payload.userId ? 'guest' : 'host',
        correlationId: event.correlationId,
      },
    });
  }

  private async onBookingCompleted(event: DomainEvent<BookingCompletedPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'COMPLETE_BOOKING',
      targetType: 'BOOKING',
      targetId: event.payload.bookingId,
      metadata: {
        experienceId: event.payload.experienceId,
        totalPrice: event.payload.totalPrice,
        correlationId: event.correlationId,
      },
    });

    // Log for host as well
    await this.logActivity({
      userId: event.payload.hostId,
      action: 'HOST_COMPLETE_BOOKING',
      targetType: 'BOOKING',
      targetId: event.payload.bookingId,
      metadata: {
        experienceId: event.payload.experienceId,
        guestCount: event.payload.guestCount,
        totalPrice: event.payload.totalPrice,
        correlationId: event.correlationId,
      },
    });
  }

  // ============================================
  // MARKETPLACE EVENT HANDLERS
  // ============================================

  private async onOrderCreated(event: DomainEvent<OrderCreatedPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'CREATE_ORDER',
      targetType: 'ORDER',
      targetId: event.payload.orderId,
      metadata: {
        sellerId: event.payload.sellerId,
        total: event.payload.total,
        itemCount: event.payload.itemCount,
        items: event.payload.items,
        correlationId: event.correlationId,
      },
    });
  }

  private async onOrderPaid(event: DomainEvent<OrderPaidPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'PAY_ORDER',
      targetType: 'ORDER',
      targetId: event.payload.orderId,
      metadata: {
        paymentId: event.payload.paymentId,
        amount: event.payload.amount,
        sellerId: event.payload.sellerId,
        correlationId: event.correlationId,
      },
    });

    // Log for seller
    await this.logActivity({
      userId: event.payload.sellerId,
      action: 'RECEIVE_PAYMENT',
      targetType: 'ORDER',
      targetId: event.payload.orderId,
      metadata: {
        amount: event.payload.amount,
        buyerId: event.payload.userId,
        correlationId: event.correlationId,
      },
    });
  }

  private async onOrderShipped(event: DomainEvent<OrderShippedPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.sellerId,
      action: 'SHIP_ORDER',
      targetType: 'ORDER',
      targetId: event.payload.orderId,
      metadata: {
        trackingNumber: event.payload.trackingNumber,
        buyerId: event.payload.userId,
        correlationId: event.correlationId,
      },
    });
  }

  private async onOrderDelivered(event: DomainEvent<OrderDeliveredPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'RECEIVE_ORDER',
      targetType: 'ORDER',
      targetId: event.payload.orderId,
      metadata: {
        sellerId: event.payload.sellerId,
        total: event.payload.total,
        deliveredAt: event.payload.deliveredAt,
        correlationId: event.correlationId,
      },
    });
  }

  // ============================================
  // USER EVENT HANDLERS
  // ============================================

  private async onUserRegistered(event: DomainEvent<UserRegisteredPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'USER_REGISTERED',
      targetType: 'USER',
      targetId: event.payload.userId,
      metadata: {
        email: event.payload.email,
        nombre: event.payload.nombre,
        correlationId: event.correlationId,
      },
    });
  }

  // ============================================
  // GAMIFICATION EVENT HANDLERS
  // ============================================

  private async onXPAwarded(event: DomainEvent<XPAwardedPayload>): Promise<void> {
    // Only log significant XP awards (> 10) to avoid noise
    if (event.payload.amount < 10) return;

    await this.logActivity({
      userId: event.payload.userId,
      action: 'EARN_XP',
      targetType: event.payload.targetType || 'GAMIFICATION',
      targetId: event.payload.targetId,
      metadata: {
        amount: event.payload.amount,
        actionType: event.payload.action,
        previousXP: event.payload.previousXP,
        newXP: event.payload.newXP,
        level: event.payload.newLevel,
        correlationId: event.correlationId,
      },
    });
  }

  private async onBadgeUnlocked(event: DomainEvent<BadgeUnlockedPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'UNLOCK_BADGE',
      targetType: 'BADGE',
      targetId: event.payload.badgeId,
      metadata: {
        badgeCode: event.payload.badgeCode,
        badgeName: event.payload.badgeName,
        xpReward: event.payload.xpReward,
        correlationId: event.correlationId,
      },
    });
  }

  private async onLevelUp(event: DomainEvent<LevelUpPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'LEVEL_UP',
      targetType: 'GAMIFICATION',
      targetId: event.payload.userId,
      metadata: {
        previousLevel: event.payload.previousLevel,
        newLevel: event.payload.newLevel,
        currentXP: event.payload.currentXP,
        correlationId: event.correlationId,
      },
    });
  }

  // ============================================
  // REVIEW EVENT HANDLERS
  // ============================================

  private async onReviewCreated(event: DomainEvent<ReviewCreatedPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'CREATE_REVIEW',
      targetType: event.payload.targetType,
      targetId: event.payload.targetId,
      metadata: {
        reviewId: event.payload.reviewId,
        rating: event.payload.rating,
        hasComment: !!event.payload.comment,
        ownerId: event.payload.ownerId,
        correlationId: event.correlationId,
      },
    });
  }

  // ============================================
  // SOCIAL EVENT HANDLERS
  // ============================================

  private async onStoryCreated(event: DomainEvent<StoryCreatedPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.userId,
      action: 'CREATE_STORY',
      targetType: 'STORY',
      targetId: event.payload.storyId,
      metadata: {
        mediaType: event.payload.mediaType,
        location: event.payload.location,
        correlationId: event.correlationId,
      },
    });
  }

  private async onUserFollowed(event: DomainEvent<UserFollowedPayload>): Promise<void> {
    await this.logActivity({
      userId: event.payload.followerId,
      action: 'FOLLOW_USER',
      targetType: 'USER',
      targetId: event.payload.followingId,
      metadata: {
        correlationId: event.correlationId,
      },
    });

    await this.logActivity({
      userId: event.payload.followingId,
      action: 'GAIN_FOLLOWER',
      targetType: 'USER',
      targetId: event.payload.followerId,
      metadata: {
        correlationId: event.correlationId,
      },
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async logActivity(data: {
    userId: string;
    action: string;
    targetType?: string;
    targetId?: string;
    metadata?: any;
  }): Promise<void> {
    try {
      await this.prisma.activityLog.create({
        data: {
          userId: data.userId,
          action: data.action,
          targetType: data.targetType,
          targetId: data.targetId,
          metadata: data.metadata || {},
        },
      });
    } catch (error) {
      // Analytics failures should not break the application
      console.error('[AnalyticsHandler] Error logging activity:', error);
    }
  }
}
