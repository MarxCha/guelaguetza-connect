import { describe, it, expect } from 'vitest';
import { Booking } from './Booking.js';
import { Money } from '../value-objects/Money.js';
import { GuestCount } from '../value-objects/GuestCount.js';
import { BookingStatus } from '../value-objects/BookingStatus.js';
import { DomainError } from '../../shared/errors/DomainError.js';

describe('Booking Entity', () => {
  const createValidBooking = () => {
    return Booking.create({
      userId: 'user-123',
      experienceId: 'exp-456',
      timeSlotId: 'slot-789',
      guestCount: GuestCount.create(2, 10),
      totalPrice: Money.create(200),
      specialRequests: 'Vegetarian meal',
    });
  };

  describe('creation', () => {
    it('should create booking in PENDING_PAYMENT status', () => {
      const booking = createValidBooking();

      expect(booking.status.isPendingPayment()).toBe(true);
      expect(booking.userId).toBe('user-123');
      expect(booking.guestCount.value).toBe(2);
      expect(booking.totalPrice.amount).toBe(200);
    });

    it('should throw error when missing required fields', () => {
      expect(() =>
        Booking.create({
          userId: '',
          experienceId: 'exp-456',
          timeSlotId: 'slot-789',
          guestCount: GuestCount.create(2, 10),
          totalPrice: Money.create(200),
        })
      ).toThrow(DomainError);
    });
  });

  describe('confirm', () => {
    it('should confirm booking from PENDING_PAYMENT status', () => {
      const booking = createValidBooking();

      booking.confirm();

      expect(booking.status.isConfirmed()).toBe(true);
      expect(booking.confirmedAt).toBeDefined();
      expect(booking.confirmedAt).toBeInstanceOf(Date);
    });

    it('should confirm booking from PENDING status', () => {
      const booking = createValidBooking();
      booking.markPending();

      booking.confirm();

      expect(booking.status.isConfirmed()).toBe(true);
    });

    it('should throw error when confirming cancelled booking', () => {
      const booking = createValidBooking();
      booking.cancel();

      expect(() => booking.confirm()).toThrow(DomainError);
      expect(() => booking.confirm()).toThrow(/Cannot confirm booking/);
    });

    it('should throw error when confirming completed booking', () => {
      const booking = createValidBooking();
      booking.confirm();
      booking.complete();

      expect(() => booking.confirm()).toThrow(DomainError);
    });
  });

  describe('cancel', () => {
    it('should cancel booking from PENDING_PAYMENT status', () => {
      const booking = createValidBooking();

      booking.cancel();

      expect(booking.status.isCancelled()).toBe(true);
      expect(booking.cancelledAt).toBeDefined();
    });

    it('should cancel confirmed booking', () => {
      const booking = createValidBooking();
      booking.confirm();

      booking.cancel();

      expect(booking.status.isCancelled()).toBe(true);
    });

    it('should throw error when cancelling completed booking', () => {
      const booking = createValidBooking();
      booking.confirm();
      booking.complete();

      expect(() => booking.cancel()).toThrow(DomainError);
      expect(() => booking.cancel()).toThrow(/Cannot cancel booking/);
    });

    it('should throw error when cancelling already cancelled booking', () => {
      const booking = createValidBooking();
      booking.cancel();

      expect(() => booking.cancel()).toThrow(DomainError);
    });
  });

  describe('complete', () => {
    it('should complete confirmed booking', () => {
      const booking = createValidBooking();
      booking.confirm();

      booking.complete();

      expect(booking.status.isCompleted()).toBe(true);
    });

    it('should throw error when completing non-confirmed booking', () => {
      const booking = createValidBooking();

      expect(() => booking.complete()).toThrow(DomainError);
      expect(() => booking.complete()).toThrow(/Cannot complete booking/);
    });
  });

  describe('business rules', () => {
    it('should identify when booking requires refund', () => {
      const booking = createValidBooking();
      booking.confirm();
      booking.attachPaymentIntent('pi_123');

      expect(booking.requiresRefund()).toBe(true);
    });

    it('should not require refund when not confirmed', () => {
      const booking = createValidBooking();
      booking.attachPaymentIntent('pi_123');

      expect(booking.requiresRefund()).toBe(false);
    });

    it('should check ownership correctly', () => {
      const booking = createValidBooking();

      expect(booking.isOwnedBy('user-123')).toBe(true);
      expect(booking.isOwnedBy('user-999')).toBe(false);
    });

    it('should validate if booking can be cancelled', () => {
      const booking = createValidBooking();
      expect(booking.canBeCancelled()).toBe(true);

      booking.confirm();
      booking.complete();
      expect(booking.canBeCancelled()).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should handle payment failure', () => {
      const booking = createValidBooking();

      booking.markPaymentFailed();

      expect(booking.status.isPaymentFailed()).toBe(true);
    });

    it('should attach payment intent', () => {
      const booking = createValidBooking();

      booking.attachPaymentIntent('pi_abc123');

      expect(booking.stripePaymentId).toBe('pi_abc123');
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const booking = createValidBooking();
      const json = booking.toJSON();

      expect(json.userId).toBe('user-123');
      expect(json.guestCount).toBe(2);
      expect(json.totalPrice).toBe(200);
      expect(json.status).toBe('PENDING_PAYMENT');
    });
  });

  describe('reconstitution', () => {
    it('should reconstitute booking from persistence data', () => {
      const booking = Booking.reconstitute({
        id: 'booking-123',
        userId: 'user-123',
        experienceId: 'exp-456',
        timeSlotId: 'slot-789',
        status: 'CONFIRMED',
        guestCount: 2,
        capacity: 10,
        totalPrice: 200,
        specialRequests: 'Test',
        stripePaymentId: 'pi_123',
        confirmedAt: new Date('2024-01-01'),
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      });

      expect(booking.id).toBe('booking-123');
      expect(booking.status.isConfirmed()).toBe(true);
      expect(booking.guestCount.value).toBe(2);
    });
  });
});
