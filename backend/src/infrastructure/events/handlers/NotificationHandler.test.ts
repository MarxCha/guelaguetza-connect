import { describe, it, expect, beforeEach, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { NotificationHandler } from './NotificationHandler.js';
import { createEvent, EventTypes } from '../types.js';

// Mock Prisma
const mockCreate = vi.fn();
const mockPrisma = {
  notification: {
    create: mockCreate,
  },
} as unknown as PrismaClient;

describe('NotificationHandler', () => {
  let handler: NotificationHandler;

  beforeEach(() => {
    handler = new NotificationHandler(mockPrisma);
    mockCreate.mockClear();
  });

  describe('onBookingCreated', () => {
    it('should create notification for host when booking is created', async () => {
      const event = createEvent(EventTypes.BOOKING_CREATED, {
        bookingId: 'booking-123',
        userId: 'user-123',
        userName: 'Juan Pérez',
        experienceId: 'exp-123',
        experienceTitle: 'Tour de Oaxaca',
        hostId: 'host-123',
        hostName: 'María',
        guestCount: 2,
        totalPrice: 500,
        timeSlot: {
          date: '2024-12-01',
          startTime: '10:00',
          endTime: '12:00',
        },
      });

      await (handler as any).onBookingCreated(event);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'host-123',
          type: 'SYSTEM',
          title: 'Nueva reservación',
          body: expect.stringContaining('Juan Pérez'),
          data: expect.objectContaining({
            bookingId: 'booking-123',
            type: 'booking_created',
          }),
        }),
      });
    });
  });

  describe('onBookingConfirmed', () => {
    it('should create notifications for both user and host', async () => {
      const event = createEvent(EventTypes.BOOKING_CONFIRMED, {
        bookingId: 'booking-123',
        userId: 'user-123',
        userName: 'Juan Pérez',
        experienceId: 'exp-123',
        experienceTitle: 'Tour de Oaxaca',
        hostId: 'host-123',
        guestCount: 2,
        totalPrice: 500,
        timeSlot: {
          date: '2024-12-01',
          startTime: '10:00',
        },
      });

      await (handler as any).onBookingConfirmed(event);

      expect(mockCreate).toHaveBeenCalledTimes(2);

      // Notification for user
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'SYSTEM',
          title: 'Reservación confirmada',
        }),
      });

      // Notification for host
      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'host-123',
          type: 'SYSTEM',
          title: 'Reservación confirmada',
        }),
      });
    });
  });

  describe('onBadgeUnlocked', () => {
    it('should create notification with badge details', async () => {
      const event = createEvent(EventTypes.BADGE_UNLOCKED, {
        userId: 'user-123',
        badgeId: 'badge-123',
        badgeCode: 'FIRST_BOOKING',
        badgeName: 'Primera Reservación',
        badgeDescription: 'Completaste tu primera reservación',
        badgeIcon: '🎉',
        xpReward: 50,
        unlockedAt: new Date(),
      });

      await (handler as any).onBadgeUnlocked(event);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'BADGE_UNLOCKED',
          title: '¡Insignia desbloqueada: Primera Reservación!',
          body: expect.stringContaining('+50 XP'),
          data: expect.objectContaining({
            badgeCode: 'FIRST_BOOKING',
            xpReward: 50,
          }),
        }),
      });
    });
  });

  describe('onLevelUp', () => {
    it('should create notification with new level', async () => {
      const event = createEvent(EventTypes.LEVEL_UP, {
        userId: 'user-123',
        previousLevel: 1,
        newLevel: 2,
        currentXP: 150,
        xpForNextLevel: 250,
      });

      await (handler as any).onLevelUp(event);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'user-123',
          type: 'LEVEL_UP',
          title: '¡Nivel 2!',
          body: expect.stringContaining('nivel 2'),
          data: expect.objectContaining({
            level: 2,
            xpForNextLevel: 250,
          }),
        }),
      });
    });
  });

  describe('onOrderCreated', () => {
    it('should create notification for seller', async () => {
      const event = createEvent(EventTypes.ORDER_CREATED, {
        orderId: 'order-123',
        userId: 'buyer-123',
        userName: 'Juan Comprador',
        sellerId: 'seller-123',
        sellerName: 'María Vendedora',
        total: 1500,
        itemCount: 3,
        items: [],
      });

      await (handler as any).onOrderCreated(event);

      expect(mockCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 'seller-123',
          type: 'SYSTEM',
          title: 'Nueva orden',
          body: expect.stringContaining('3 producto(s)'),
        }),
      });
    });
  });

  describe('error handling', () => {
    it('should throw error if notification creation fails', async () => {
      mockCreate.mockRejectedValueOnce(new Error('Database error'));

      const event = createEvent(EventTypes.USER_FOLLOWED, {
        followerId: 'follower-123',
        followerName: 'Juan',
        followingId: 'following-123',
      });

      await expect(
        (handler as any).onUserFollowed(event)
      ).rejects.toThrow('Database error');
    });
  });
});
