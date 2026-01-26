import { describe, it, expect } from 'vitest';
import { OrderStatus, OrderStatusEnum } from './OrderStatus.js';

describe('OrderStatus Value Object', () => {
  describe('creation', () => {
    it('should create status from valid string', () => {
      const status = OrderStatus.create('PENDING');

      expect(status.value).toBe(OrderStatusEnum.PENDING);
      expect(status.toString()).toBe('PENDING');
    });

    it('should throw error for invalid status', () => {
      expect(() => OrderStatus.create('INVALID_STATUS')).toThrow(/Invalid order status/);
    });

    it('should create pending payment status', () => {
      const status = OrderStatus.pendingPayment();

      expect(status.isPendingPayment()).toBe(true);
    });

    it('should create pending status', () => {
      const status = OrderStatus.pending();

      expect(status.isPending()).toBe(true);
    });

    it('should create paid status', () => {
      const status = OrderStatus.paid();

      expect(status.isPaid()).toBe(true);
    });

    it('should create processing status', () => {
      const status = OrderStatus.processing();

      expect(status.isProcessing()).toBe(true);
    });

    it('should create shipped status', () => {
      const status = OrderStatus.shipped();

      expect(status.isShipped()).toBe(true);
    });

    it('should create delivered status', () => {
      const status = OrderStatus.delivered();

      expect(status.isDelivered()).toBe(true);
    });

    it('should create cancelled status', () => {
      const status = OrderStatus.cancelled();

      expect(status.isCancelled()).toBe(true);
    });
  });

  describe('state checks', () => {
    it('should check all status states', () => {
      expect(OrderStatus.pendingPayment().isPendingPayment()).toBe(true);
      expect(OrderStatus.pending().isPending()).toBe(true);
      expect(OrderStatus.paid().isPaid()).toBe(true);
      expect(OrderStatus.processing().isProcessing()).toBe(true);
      expect(OrderStatus.shipped().isShipped()).toBe(true);
      expect(OrderStatus.delivered().isDelivered()).toBe(true);
      expect(OrderStatus.cancelled().isCancelled()).toBe(true);
    });
  });

  describe('state transitions', () => {
    it('should allow processing from paid status', () => {
      const status = OrderStatus.paid();

      expect(status.canBeProcessed()).toBe(true);
    });

    it('should not allow processing from pending status', () => {
      const status = OrderStatus.pending();

      expect(status.canBeProcessed()).toBe(false);
    });

    it('should allow shipping from processing status', () => {
      const status = OrderStatus.processing();

      expect(status.canBeShipped()).toBe(true);
    });

    it('should not allow shipping from pending status', () => {
      const status = OrderStatus.pending();

      expect(status.canBeShipped()).toBe(false);
    });

    it('should allow delivery from shipped status', () => {
      const status = OrderStatus.shipped();

      expect(status.canBeDelivered()).toBe(true);
    });

    it('should not allow delivery from processing status', () => {
      const status = OrderStatus.processing();

      expect(status.canBeDelivered()).toBe(false);
    });

    it('should allow cancellation from pending payment', () => {
      const status = OrderStatus.pendingPayment();

      expect(status.canBeCancelled()).toBe(true);
    });

    it('should allow cancellation from pending', () => {
      const status = OrderStatus.pending();

      expect(status.canBeCancelled()).toBe(true);
    });

    it('should allow cancellation from paid', () => {
      const status = OrderStatus.paid();

      expect(status.canBeCancelled()).toBe(true);
    });

    it('should not allow cancellation from shipped', () => {
      const status = OrderStatus.shipped();

      expect(status.canBeCancelled()).toBe(false);
    });

    it('should not allow cancellation from delivered', () => {
      const status = OrderStatus.delivered();

      expect(status.canBeCancelled()).toBe(false);
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const status1 = OrderStatus.paid();
      const status2 = OrderStatus.paid();
      const status3 = OrderStatus.pending();

      expect(status1.equals(status2)).toBe(true);
      expect(status1.equals(status3)).toBe(false);
    });
  });

  describe('string representation', () => {
    it('should convert to string', () => {
      expect(OrderStatus.pendingPayment().toString()).toBe('PENDING_PAYMENT');
      expect(OrderStatus.pending().toString()).toBe('PENDING');
      expect(OrderStatus.paid().toString()).toBe('PAID');
      expect(OrderStatus.processing().toString()).toBe('PROCESSING');
      expect(OrderStatus.shipped().toString()).toBe('SHIPPED');
      expect(OrderStatus.delivered().toString()).toBe('DELIVERED');
      expect(OrderStatus.cancelled().toString()).toBe('CANCELLED');
    });
  });
});
