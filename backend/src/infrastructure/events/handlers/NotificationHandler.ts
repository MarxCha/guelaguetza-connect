import { PrismaClient, NotificationType } from '@prisma/client';
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
  BadgeUnlockedPayload,
  LevelUpPayload,
  ReviewCreatedPayload,
  UserFollowedPayload,
} from '../types.js';

/**
 * NotificationHandler - Crea notificaciones en respuesta a eventos del dominio
 *
 * Este handler escucha eventos y genera notificaciones apropiadas para los usuarios.
 * Maneja tanto notificaciones en la BD como push notifications (futuro).
 */
export class NotificationHandler {
  constructor(private prisma: PrismaClient) {}

  /**
   * Registra todos los event listeners
   */
  register(eventBus: any): void {
    // Booking Events
    eventBus.on(EventTypes.BOOKING_CREATED, this.onBookingCreated.bind(this), 'NotificationHandler.onBookingCreated');
    eventBus.on(EventTypes.BOOKING_CONFIRMED, this.onBookingConfirmed.bind(this), 'NotificationHandler.onBookingConfirmed');
    eventBus.on(EventTypes.BOOKING_CANCELLED, this.onBookingCancelled.bind(this), 'NotificationHandler.onBookingCancelled');
    eventBus.on(EventTypes.BOOKING_COMPLETED, this.onBookingCompleted.bind(this), 'NotificationHandler.onBookingCompleted');

    // Marketplace Events
    eventBus.on(EventTypes.ORDER_CREATED, this.onOrderCreated.bind(this), 'NotificationHandler.onOrderCreated');
    eventBus.on(EventTypes.ORDER_PAID, this.onOrderPaid.bind(this), 'NotificationHandler.onOrderPaid');
    eventBus.on(EventTypes.ORDER_SHIPPED, this.onOrderShipped.bind(this), 'NotificationHandler.onOrderShipped');

    // Gamification Events
    eventBus.on(EventTypes.BADGE_UNLOCKED, this.onBadgeUnlocked.bind(this), 'NotificationHandler.onBadgeUnlocked');
    eventBus.on(EventTypes.LEVEL_UP, this.onLevelUp.bind(this), 'NotificationHandler.onLevelUp');

    // Review Events
    eventBus.on(EventTypes.REVIEW_CREATED, this.onReviewCreated.bind(this), 'NotificationHandler.onReviewCreated');

    // Social Events
    eventBus.on(EventTypes.USER_FOLLOWED, this.onUserFollowed.bind(this), 'NotificationHandler.onUserFollowed');
  }

  // ============================================
  // BOOKING EVENT HANDLERS
  // ============================================

  private async onBookingCreated(event: DomainEvent<BookingCreatedPayload>): Promise<void> {
    const { hostId, experienceTitle, userName, guestCount, timeSlot } = event.payload;

    await this.createNotification({
      userId: hostId,
      type: 'SYSTEM',
      title: 'Nueva reservación',
      body: `${userName || 'Un usuario'} reservó ${guestCount} lugar(es) para "${experienceTitle}" el ${timeSlot.date}`,
      data: {
        bookingId: event.payload.bookingId,
        experienceId: event.payload.experienceId,
        type: 'booking_created',
      },
    });
  }

  private async onBookingConfirmed(event: DomainEvent<BookingConfirmedPayload>): Promise<void> {
    const { userId, userName, experienceTitle, timeSlot, hostId } = event.payload;

    // Notificar al usuario
    await this.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Reservación confirmada',
      body: `Tu reservación para "${experienceTitle}" el ${timeSlot.date} a las ${timeSlot.startTime} ha sido confirmada`,
      data: {
        bookingId: event.payload.bookingId,
        experienceId: event.payload.experienceId,
        type: 'booking_confirmed',
      },
    });

    // Notificar al host
    await this.createNotification({
      userId: hostId,
      type: 'SYSTEM',
      title: 'Reservación confirmada',
      body: `${userName} confirmó su reservación para "${experienceTitle}"`,
      data: {
        bookingId: event.payload.bookingId,
        experienceId: event.payload.experienceId,
        type: 'booking_confirmed_host',
      },
    });
  }

  private async onBookingCancelled(event: DomainEvent<BookingCancelledPayload>): Promise<void> {
    const { userId, hostId, experienceTitle, cancelledBy, reason } = event.payload;

    // Notificar al usuario (si no fue quien canceló)
    if (cancelledBy !== userId) {
      await this.createNotification({
        userId,
        type: 'SYSTEM',
        title: 'Reservación cancelada',
        body: `Tu reservación para "${experienceTitle}" ha sido cancelada${reason ? `: ${reason}` : ''}`,
        data: {
          bookingId: event.payload.bookingId,
          experienceId: event.payload.experienceId,
          type: 'booking_cancelled',
        },
      });
    }

    // Notificar al host (si no fue quien canceló)
    if (cancelledBy !== hostId) {
      await this.createNotification({
        userId: hostId,
        type: 'SYSTEM',
        title: 'Reservación cancelada',
        body: `Una reservación para "${experienceTitle}" ha sido cancelada`,
        data: {
          bookingId: event.payload.bookingId,
          experienceId: event.payload.experienceId,
          type: 'booking_cancelled_host',
        },
      });
    }
  }

  private async onBookingCompleted(event: DomainEvent<BookingCompletedPayload>): Promise<void> {
    const { userId, experienceTitle, bookingId, experienceId } = event.payload;

    await this.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Experiencia completada',
      body: `¡Esperamos que hayas disfrutado "${experienceTitle}"! ¿Qué te pareció?`,
      data: {
        bookingId,
        experienceId,
        type: 'booking_completed',
        action: 'request_review',
      },
    });
  }

  // ============================================
  // MARKETPLACE EVENT HANDLERS
  // ============================================

  private async onOrderCreated(event: DomainEvent<OrderCreatedPayload>): Promise<void> {
    const { sellerId, userName, total, itemCount } = event.payload;

    await this.createNotification({
      userId: sellerId,
      type: 'SYSTEM',
      title: 'Nueva orden',
      body: `${userName} realizó una orden de ${itemCount} producto(s) por $${total.toFixed(2)}`,
      data: {
        orderId: event.payload.orderId,
        type: 'order_created',
      },
    });
  }

  private async onOrderPaid(event: DomainEvent<OrderPaidPayload>): Promise<void> {
    const { userId, sellerId, orderId, amount, sellerName } = event.payload;

    // Notificar al comprador
    await this.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Pago confirmado',
      body: `Tu pago de $${amount.toFixed(2)} ha sido procesado exitosamente`,
      data: {
        orderId,
        type: 'order_paid',
      },
    });

    // Notificar al vendedor
    await this.createNotification({
      userId: sellerId,
      type: 'SYSTEM',
      title: 'Pago recibido',
      body: `Se ha confirmado el pago de una orden por $${amount.toFixed(2)}`,
      data: {
        orderId,
        type: 'order_paid_seller',
      },
    });
  }

  private async onOrderShipped(event: DomainEvent<OrderShippedPayload>): Promise<void> {
    const { userId, trackingNumber } = event.payload;

    await this.createNotification({
      userId,
      type: 'SYSTEM',
      title: 'Orden enviada',
      body: trackingNumber
        ? `Tu orden ha sido enviada. Número de rastreo: ${trackingNumber}`
        : 'Tu orden ha sido enviada',
      data: {
        orderId: event.payload.orderId,
        trackingNumber,
        type: 'order_shipped',
      },
    });
  }

  // ============================================
  // GAMIFICATION EVENT HANDLERS
  // ============================================

  private async onBadgeUnlocked(event: DomainEvent<BadgeUnlockedPayload>): Promise<void> {
    const { userId, badgeName, badgeDescription, xpReward } = event.payload;

    await this.createNotification({
      userId,
      type: 'BADGE_UNLOCKED',
      title: `¡Insignia desbloqueada: ${badgeName}!`,
      body: `${badgeDescription}${xpReward > 0 ? ` (+${xpReward} XP)` : ''}`,
      data: {
        badgeId: event.payload.badgeId,
        badgeCode: event.payload.badgeCode,
        badgeIcon: event.payload.badgeIcon,
        xpReward,
        type: 'badge_unlocked',
      },
    });
  }

  private async onLevelUp(event: DomainEvent<LevelUpPayload>): Promise<void> {
    const { userId, newLevel, xpForNextLevel } = event.payload;

    await this.createNotification({
      userId,
      type: 'LEVEL_UP',
      title: `¡Nivel ${newLevel}!`,
      body: `¡Felicidades! Has alcanzado el nivel ${newLevel}. Siguiente nivel: ${xpForNextLevel} XP`,
      data: {
        level: newLevel,
        xpForNextLevel,
        type: 'level_up',
      },
    });
  }

  // ============================================
  // REVIEW EVENT HANDLERS
  // ============================================

  private async onReviewCreated(event: DomainEvent<ReviewCreatedPayload>): Promise<void> {
    const { ownerId, userName, targetType, targetName, rating } = event.payload;

    const stars = '⭐'.repeat(rating);

    await this.createNotification({
      userId: ownerId,
      type: 'SYSTEM',
      title: 'Nueva reseña',
      body: `${userName} calificó ${targetType === 'EXPERIENCE' ? 'tu experiencia' : 'tu producto'} "${targetName}" con ${stars}`,
      data: {
        reviewId: event.payload.reviewId,
        targetType,
        targetId: event.payload.targetId,
        rating,
        type: 'review_created',
      },
    });
  }

  // ============================================
  // SOCIAL EVENT HANDLERS
  // ============================================

  private async onUserFollowed(event: DomainEvent<UserFollowedPayload>): Promise<void> {
    const { followingId, followerName } = event.payload;

    await this.createNotification({
      userId: followingId,
      type: 'NEW_FOLLOWER',
      title: 'Nuevo seguidor',
      body: `${followerName} comenzó a seguirte`,
      data: {
        followerId: event.payload.followerId,
        type: 'new_follower',
      },
    });
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  private async createNotification(data: {
    userId: string;
    type: NotificationType;
    title: string;
    body: string;
    data?: any;
  }): Promise<void> {
    try {
      await this.prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          body: data.body,
          data: data.data || {},
          read: false,
        },
      });
    } catch (error) {
      console.error('[NotificationHandler] Error creating notification:', error);
      throw error;
    }
  }
}
