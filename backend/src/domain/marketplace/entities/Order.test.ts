import { describe, it, expect } from 'vitest';
import { Order, OrderItemData } from './Order.js';
import { Money } from '../../booking/value-objects/Money.js';
import { OrderStatus } from '../value-objects/OrderStatus.js';
import { DomainError } from '../../shared/errors/DomainError.js';

describe('Order Entity', () => {
  const createValidOrderItems = (): OrderItemData[] => {
    return [
      {
        productId: 'prod-1',
        quantity: 2,
        price: Money.create(100),
      },
      {
        productId: 'prod-2',
        quantity: 1,
        price: Money.create(50),
      },
    ];
  };

  const createValidOrder = () => {
    return Order.create({
      userId: 'user-123',
      sellerId: 'seller-456',
      items: createValidOrderItems(),
      shippingAddress: {
        street: 'Calle Principal 123',
        city: 'Oaxaca',
        state: 'Oaxaca',
        zipCode: '68000',
      },
    });
  };

  describe('creation', () => {
    it('should create order with valid data', () => {
      const order = createValidOrder();

      expect(order.userId).toBe('user-123');
      expect(order.sellerId).toBe('seller-456');
      expect(order.items.length).toBe(2);
      expect(order.status.isPendingPayment()).toBe(true);
    });

    it('should calculate total from items', () => {
      const order = createValidOrder();

      // (100 * 2) + (50 * 1) = 250
      expect(order.total.amount).toBe(250);
    });

    it('should throw error when order has no items', () => {
      expect(() =>
        Order.create({
          userId: 'user-123',
          sellerId: 'seller-456',
          items: [],
          shippingAddress: {},
        })
      ).toThrow(DomainError);
      expect(() =>
        Order.create({
          userId: 'user-123',
          sellerId: 'seller-456',
          items: [],
          shippingAddress: {},
        })
      ).toThrow(/must have at least one item/);
    });

    it('should throw error when missing userId', () => {
      expect(() =>
        Order.create({
          userId: '',
          sellerId: 'seller-456',
          items: createValidOrderItems(),
          shippingAddress: {},
        })
      ).toThrow(DomainError);
      expect(() =>
        Order.create({
          userId: '',
          sellerId: 'seller-456',
          items: createValidOrderItems(),
          shippingAddress: {},
        })
      ).toThrow(/must have a userId/);
    });

    it('should throw error when missing sellerId', () => {
      expect(() =>
        Order.create({
          userId: 'user-123',
          sellerId: '',
          items: createValidOrderItems(),
          shippingAddress: {},
        })
      ).toThrow(DomainError);
      expect(() =>
        Order.create({
          userId: 'user-123',
          sellerId: '',
          items: createValidOrderItems(),
          shippingAddress: {},
        })
      ).toThrow(/must have a sellerId/);
    });
  });

  describe('state transitions', () => {
    it('should mark order as pending', () => {
      const order = createValidOrder();

      order.markPending();

      expect(order.status.isPending()).toBe(true);
    });

    it('should mark order as paid', () => {
      const order = createValidOrder();

      order.markPaid();

      expect(order.status.isPaid()).toBe(true);
    });

    it('should process paid order', () => {
      const order = createValidOrder();
      order.markPaid();

      order.process();

      expect(order.status.isProcessing()).toBe(true);
    });

    it('should throw error when processing non-paid order', () => {
      const order = createValidOrder();

      expect(() => order.process()).toThrow(DomainError);
      expect(() => order.process()).toThrow(/Cannot process order/);
    });

    it('should ship processing order', () => {
      const order = createValidOrder();
      order.markPaid();
      order.process();

      order.ship();

      expect(order.status.isShipped()).toBe(true);
    });

    it('should throw error when shipping non-processing order', () => {
      const order = createValidOrder();
      order.markPaid();

      expect(() => order.ship()).toThrow(DomainError);
      expect(() => order.ship()).toThrow(/Cannot ship order/);
    });

    it('should deliver shipped order', () => {
      const order = createValidOrder();
      order.markPaid();
      order.process();
      order.ship();

      order.deliver();

      expect(order.status.isDelivered()).toBe(true);
    });

    it('should throw error when delivering non-shipped order', () => {
      const order = createValidOrder();
      order.markPaid();
      order.process();

      expect(() => order.deliver()).toThrow(DomainError);
      expect(() => order.deliver()).toThrow(/Cannot deliver order/);
    });

    it('should cancel pending order', () => {
      const order = createValidOrder();

      order.cancel();

      expect(order.status.isCancelled()).toBe(true);
    });

    it('should throw error when cancelling shipped order', () => {
      const order = createValidOrder();
      order.markPaid();
      order.process();
      order.ship();

      expect(() => order.cancel()).toThrow(DomainError);
      expect(() => order.cancel()).toThrow(/Cannot cancel order/);
    });

    it('should mark payment as failed', () => {
      const order = createValidOrder();

      order.markPaymentFailed();

      expect(order.status.toString()).toBe('PAYMENT_FAILED');
    });

    it('should attach payment intent', () => {
      const order = createValidOrder();

      order.attachPaymentIntent('pi_abc123');

      expect(order.stripePaymentId).toBe('pi_abc123');
    });
  });

  describe('business rules', () => {
    it('should check if order can be cancelled', () => {
      const order = createValidOrder();
      expect(order.canBeCancelled()).toBe(true);

      order.markPaid();
      expect(order.canBeCancelled()).toBe(true);

      order.process();
      order.ship();
      expect(order.canBeCancelled()).toBe(false);
    });

    it('should check if order requires refund', () => {
      const order = createValidOrder();
      order.markPaid();
      order.attachPaymentIntent('pi_123');

      expect(order.requiresRefund()).toBe(true);
    });

    it('should not require refund when not paid', () => {
      const order = createValidOrder();
      order.attachPaymentIntent('pi_123');

      expect(order.requiresRefund()).toBe(false);
    });

    it('should check ownership correctly', () => {
      const order = createValidOrder();

      expect(order.isOwnedBy('user-123')).toBe(true);
      expect(order.isOwnedBy('user-999')).toBe(false);
    });

    it('should check seller ownership correctly', () => {
      const order = createValidOrder();

      expect(order.belongsToSeller('seller-456')).toBe(true);
      expect(order.belongsToSeller('seller-999')).toBe(false);
    });
  });

  describe('getters', () => {
    it('should expose order properties via getters', () => {
      const order = createValidOrder();

      expect(order.userId).toBe('user-123');
      expect(order.sellerId).toBe('seller-456');
      expect(order.total.amount).toBe(250);
      expect(order.items.length).toBe(2);
      expect(order.createdAt).toBeInstanceOf(Date);
    });

    it('should return immutable items array', () => {
      const order = createValidOrder();
      const items = order.items;

      // Modifying returned array should not affect order
      items.push({
        productId: 'prod-3',
        quantity: 1,
        price: Money.create(75),
      });

      expect(order.items.length).toBe(2); // Original unchanged
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const order = createValidOrder();

      const json = order.toJSON();

      expect(json.userId).toBe('user-123');
      expect(json.sellerId).toBe('seller-456');
      expect(json.total).toBe(250);
      expect(json.status).toBe('PENDING_PAYMENT');
      expect(json.items.length).toBe(2);
      expect(json.items[0].price).toBe(100);
    });
  });

  describe('reconstitution', () => {
    it('should reconstitute order from persistence data', () => {
      const order = Order.reconstitute({
        id: 'order-123',
        userId: 'user-456',
        sellerId: 'seller-789',
        status: 'PAID',
        total: 300,
        shippingAddress: { street: 'Test St' },
        stripePaymentId: 'pi_abc',
        items: [
          { productId: 'p1', quantity: 2, price: 100 },
          { productId: 'p2', quantity: 1, price: 100 },
        ],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-02'),
      });

      expect(order.id).toBe('order-123');
      expect(order.userId).toBe('user-456');
      expect(order.status.isPaid()).toBe(true);
      expect(order.total.amount).toBe(300);
      expect(order.items.length).toBe(2);
      expect(order.stripePaymentId).toBe('pi_abc');
    });
  });
});
