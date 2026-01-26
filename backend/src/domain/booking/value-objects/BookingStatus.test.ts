import { describe, it, expect } from 'vitest';
import { BookingStatus, BookingStatusEnum } from './BookingStatus.js';

describe('BookingStatus Value Object', () => {
  describe('creation', () => {
    it('should create status from valid string', () => {
      const status = BookingStatus.create('PENDING');

      expect(status.value).toBe(BookingStatusEnum.PENDING);
      expect(status.toString()).toBe('PENDING');
    });

    it('should throw error for invalid status', () => {
      expect(() => BookingStatus.create('INVALID_STATUS')).toThrow(/Invalid booking status/);
    });

    it('should create pending payment status', () => {
      const status = BookingStatus.pendingPayment();

      expect(status.isPendingPayment()).toBe(true);
      expect(status.toString()).toBe('PENDING_PAYMENT');
    });

    it('should create pending status', () => {
      const status = BookingStatus.pending();

      expect(status.isPending()).toBe(true);
    });

    it('should create confirmed status', () => {
      const status = BookingStatus.confirmed();

      expect(status.isConfirmed()).toBe(true);
    });

    it('should create cancelled status', () => {
      const status = BookingStatus.cancelled();

      expect(status.isCancelled()).toBe(true);
    });

    it('should create completed status', () => {
      const status = BookingStatus.completed();

      expect(status.isCompleted()).toBe(true);
    });

    it('should create payment failed status', () => {
      const status = BookingStatus.paymentFailed();

      expect(status.isPaymentFailed()).toBe(true);
    });
  });

  describe('state checks', () => {
    it('should check if status is pending payment', () => {
      const status = BookingStatus.pendingPayment();

      expect(status.isPendingPayment()).toBe(true);
      expect(status.isPending()).toBe(false);
      expect(status.isConfirmed()).toBe(false);
    });

    it('should check if status is pending', () => {
      const status = BookingStatus.pending();

      expect(status.isPending()).toBe(true);
      expect(status.isPendingPayment()).toBe(false);
    });

    it('should check if status is confirmed', () => {
      const status = BookingStatus.confirmed();

      expect(status.isConfirmed()).toBe(true);
      expect(status.isPending()).toBe(false);
    });

    it('should check if status is cancelled', () => {
      const status = BookingStatus.cancelled();

      expect(status.isCancelled()).toBe(true);
      expect(status.isConfirmed()).toBe(false);
    });

    it('should check if status is completed', () => {
      const status = BookingStatus.completed();

      expect(status.isCompleted()).toBe(true);
      expect(status.isCancelled()).toBe(false);
    });

    it('should check if status is payment failed', () => {
      const status = BookingStatus.paymentFailed();

      expect(status.isPaymentFailed()).toBe(true);
      expect(status.isPending()).toBe(false);
    });
  });

  describe('state transitions', () => {
    it('should allow confirmation from pending payment', () => {
      const status = BookingStatus.pendingPayment();

      expect(status.canBeConfirmed()).toBe(true);
    });

    it('should allow confirmation from pending', () => {
      const status = BookingStatus.pending();

      expect(status.canBeConfirmed()).toBe(true);
    });

    it('should not allow confirmation from confirmed', () => {
      const status = BookingStatus.confirmed();

      expect(status.canBeConfirmed()).toBe(false);
    });

    it('should not allow confirmation from cancelled', () => {
      const status = BookingStatus.cancelled();

      expect(status.canBeConfirmed()).toBe(false);
    });

    it('should allow cancellation from pending payment', () => {
      const status = BookingStatus.pendingPayment();

      expect(status.canBeCancelled()).toBe(true);
    });

    it('should allow cancellation from pending', () => {
      const status = BookingStatus.pending();

      expect(status.canBeCancelled()).toBe(true);
    });

    it('should allow cancellation from confirmed', () => {
      const status = BookingStatus.confirmed();

      expect(status.canBeCancelled()).toBe(true);
    });

    it('should not allow cancellation from completed', () => {
      const status = BookingStatus.completed();

      expect(status.canBeCancelled()).toBe(false);
    });

    it('should not allow cancellation from already cancelled', () => {
      const status = BookingStatus.cancelled();

      expect(status.canBeCancelled()).toBe(false);
    });

    it('should allow completion from confirmed', () => {
      const status = BookingStatus.confirmed();

      expect(status.canBeCompleted()).toBe(true);
    });

    it('should not allow completion from pending', () => {
      const status = BookingStatus.pending();

      expect(status.canBeCompleted()).toBe(false);
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const status1 = BookingStatus.confirmed();
      const status2 = BookingStatus.confirmed();
      const status3 = BookingStatus.pending();

      expect(status1.equals(status2)).toBe(true);
      expect(status1.equals(status3)).toBe(false);
    });
  });

  describe('string representation', () => {
    it('should convert to string', () => {
      expect(BookingStatus.pendingPayment().toString()).toBe('PENDING_PAYMENT');
      expect(BookingStatus.pending().toString()).toBe('PENDING');
      expect(BookingStatus.confirmed().toString()).toBe('CONFIRMED');
      expect(BookingStatus.cancelled().toString()).toBe('CANCELLED');
      expect(BookingStatus.completed().toString()).toBe('COMPLETED');
      expect(BookingStatus.paymentFailed().toString()).toBe('PAYMENT_FAILED');
    });
  });
});
