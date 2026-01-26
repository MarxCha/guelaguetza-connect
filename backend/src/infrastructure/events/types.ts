/**
 * Domain Events Type System
 *
 * Define todos los eventos del dominio con tipado fuerte.
 * Los eventos son inmutables y contienen toda la información necesaria
 * para que los handlers puedan procesarlos sin consultar la BD.
 */

// ============================================
// Base Domain Event Interface
// ============================================
export interface DomainEvent<T = any> {
  type: string;
  payload: T;
  timestamp: Date;
  correlationId: string;
  userId?: string; // Usuario que generó el evento (opcional)
}

// ============================================
// BOOKING EVENTS
// ============================================
export interface BookingCreatedPayload {
  bookingId: string;
  userId: string;
  userName?: string;
  experienceId: string;
  experienceTitle: string;
  hostId: string;
  hostName: string;
  guestCount: number;
  totalPrice: number;
  timeSlot: {
    date: string;
    startTime: string;
    endTime: string;
  };
}

export interface BookingConfirmedPayload {
  bookingId: string;
  userId: string;
  userName: string;
  experienceId: string;
  experienceTitle: string;
  hostId: string;
  guestCount: number;
  totalPrice: number;
  timeSlot: {
    date: string;
    startTime: string;
  };
}

export interface BookingCancelledPayload {
  bookingId: string;
  userId: string;
  experienceId: string;
  experienceTitle: string;
  hostId: string;
  reason?: string;
  cancelledBy: string; // userId who cancelled (user or host)
  guestCount: number;
}

export interface BookingCompletedPayload {
  bookingId: string;
  userId: string;
  userName: string;
  experienceId: string;
  experienceTitle: string;
  hostId: string;
  totalPrice: number;
  guestCount: number;
}

// ============================================
// MARKETPLACE EVENTS
// ============================================
export interface OrderCreatedPayload {
  orderId: string;
  userId: string;
  userName: string;
  sellerId: string;
  sellerName: string;
  total: number;
  itemCount: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
    price: number;
  }>;
}

export interface OrderPaidPayload {
  orderId: string;
  userId: string;
  sellerId: string;
  sellerName: string;
  paymentId: string;
  amount: number;
  items: Array<{
    productId: string;
    productName: string;
    quantity: number;
  }>;
}

export interface OrderShippedPayload {
  orderId: string;
  userId: string;
  sellerId: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
}

export interface OrderDeliveredPayload {
  orderId: string;
  userId: string;
  sellerId: string;
  total: number;
  deliveredAt: Date;
}

// ============================================
// USER EVENTS
// ============================================
export interface UserRegisteredPayload {
  userId: string;
  email: string;
  nombre: string;
  apellido?: string;
}

export interface UserBannedPayload {
  userId: string;
  reason: string;
  bannedBy: string; // Admin userId
  bannedByName: string;
}

// ============================================
// GAMIFICATION EVENTS
// ============================================
export interface XPAwardedPayload {
  userId: string;
  amount: number;
  action: string; // CREATE_STORY, COMPLETE_BOOKING, etc.
  targetType?: string;
  targetId?: string;
  previousXP: number;
  newXP: number;
  previousLevel: number;
  newLevel: number;
}

export interface BadgeUnlockedPayload {
  userId: string;
  badgeId: string;
  badgeCode: string;
  badgeName: string;
  badgeDescription: string;
  badgeIcon: string;
  xpReward: number;
  unlockedAt: Date;
}

export interface LevelUpPayload {
  userId: string;
  previousLevel: number;
  newLevel: number;
  currentXP: number;
  xpForNextLevel: number;
}

// ============================================
// REVIEW EVENTS
// ============================================
export interface ReviewCreatedPayload {
  reviewId: string;
  userId: string;
  userName: string;
  targetType: 'EXPERIENCE' | 'PRODUCT';
  targetId: string;
  targetName: string;
  ownerId: string; // host or seller
  rating: number;
  comment?: string;
}

// ============================================
// SOCIAL EVENTS
// ============================================
export interface UserFollowedPayload {
  followerId: string;
  followerName: string;
  followingId: string;
}

export interface StoryCreatedPayload {
  storyId: string;
  userId: string;
  userName: string;
  mediaType: string;
  location: string;
}

// ============================================
// Event Type Constants
// ============================================
export const EventTypes = {
  // Booking Events
  BOOKING_CREATED: 'booking.created',
  BOOKING_CONFIRMED: 'booking.confirmed',
  BOOKING_CANCELLED: 'booking.cancelled',
  BOOKING_COMPLETED: 'booking.completed',

  // Marketplace Events
  ORDER_CREATED: 'order.created',
  ORDER_PAID: 'order.paid',
  ORDER_SHIPPED: 'order.shipped',
  ORDER_DELIVERED: 'order.delivered',

  // User Events
  USER_REGISTERED: 'user.registered',
  USER_BANNED: 'user.banned',

  // Gamification Events
  XP_AWARDED: 'gamification.xp_awarded',
  BADGE_UNLOCKED: 'gamification.badge_unlocked',
  LEVEL_UP: 'gamification.level_up',

  // Review Events
  REVIEW_CREATED: 'review.created',

  // Social Events
  USER_FOLLOWED: 'social.user_followed',
  STORY_CREATED: 'social.story_created',
} as const;

export type EventType = typeof EventTypes[keyof typeof EventTypes];

// ============================================
// Event Type Mapping
// ============================================
export type EventPayloadMap = {
  [EventTypes.BOOKING_CREATED]: BookingCreatedPayload;
  [EventTypes.BOOKING_CONFIRMED]: BookingConfirmedPayload;
  [EventTypes.BOOKING_CANCELLED]: BookingCancelledPayload;
  [EventTypes.BOOKING_COMPLETED]: BookingCompletedPayload;

  [EventTypes.ORDER_CREATED]: OrderCreatedPayload;
  [EventTypes.ORDER_PAID]: OrderPaidPayload;
  [EventTypes.ORDER_SHIPPED]: OrderShippedPayload;
  [EventTypes.ORDER_DELIVERED]: OrderDeliveredPayload;

  [EventTypes.USER_REGISTERED]: UserRegisteredPayload;
  [EventTypes.USER_BANNED]: UserBannedPayload;

  [EventTypes.XP_AWARDED]: XPAwardedPayload;
  [EventTypes.BADGE_UNLOCKED]: BadgeUnlockedPayload;
  [EventTypes.LEVEL_UP]: LevelUpPayload;

  [EventTypes.REVIEW_CREATED]: ReviewCreatedPayload;

  [EventTypes.USER_FOLLOWED]: UserFollowedPayload;
  [EventTypes.STORY_CREATED]: StoryCreatedPayload;
};

// ============================================
// Typed Event Creators
// ============================================
export function createEvent<T extends EventType>(
  type: T,
  payload: EventPayloadMap[T],
  correlationId?: string,
  userId?: string
): DomainEvent<EventPayloadMap[T]> {
  return {
    type,
    payload,
    timestamp: new Date(),
    correlationId: correlationId || generateCorrelationId(),
    userId,
  };
}

function generateCorrelationId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}
