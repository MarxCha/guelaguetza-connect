import { describe, it, expect } from 'vitest';
import { Product } from './Product.js';
import { Money } from '../../booking/value-objects/Money.js';
import { Stock } from '../value-objects/Stock.js';
import { DomainError } from '../../shared/errors/DomainError.js';

describe('Product Entity', () => {
  const createValidProduct = () => {
    return Product.create({
      sellerId: 'seller-123',
      name: 'Alebrijes de Madera',
      description: 'Artesanía tradicional de Oaxaca tallada a mano',
      price: Money.create(500),
      category: 'ARTESANIA',
      status: 'ACTIVE',
      stock: Stock.create(20),
      images: ['image1.jpg', 'image2.jpg'],
    });
  };

  describe('creation', () => {
    it('should create product with valid data', () => {
      const product = createValidProduct();

      expect(product.sellerId).toBe('seller-123');
      expect(product.name).toBe('Alebrijes de Madera');
      expect(product.price.amount).toBe(500);
      expect(product.stock.quantity).toBe(20);
      expect(product.status).toBe('ACTIVE');
      expect(product.version).toBe(1);
    });

    it('should throw error for name less than 3 characters', () => {
      expect(() =>
        Product.create({
          sellerId: 'seller-123',
          name: 'ab',
          description: 'Valid description here',
          price: Money.create(500),
          category: 'ARTESANIA',
          status: 'ACTIVE',
          stock: Stock.create(20),
          images: ['image1.jpg'],
        })
      ).toThrow(DomainError);
      expect(() =>
        Product.create({
          sellerId: 'seller-123',
          name: 'ab',
          description: 'Valid description here',
          price: Money.create(500),
          category: 'ARTESANIA',
          status: 'ACTIVE',
          stock: Stock.create(20),
          images: ['image1.jpg'],
        })
      ).toThrow(/name must be at least 3 characters/);
    });

    it('should throw error for description less than 10 characters', () => {
      expect(() =>
        Product.create({
          sellerId: 'seller-123',
          name: 'Valid Name',
          description: 'short',
          price: Money.create(500),
          category: 'ARTESANIA',
          status: 'ACTIVE',
          stock: Stock.create(20),
          images: ['image1.jpg'],
        })
      ).toThrow(DomainError);
      expect(() =>
        Product.create({
          sellerId: 'seller-123',
          name: 'Valid Name',
          description: 'short',
          price: Money.create(500),
          category: 'ARTESANIA',
          status: 'ACTIVE',
          stock: Stock.create(20),
          images: ['image1.jpg'],
        })
      ).toThrow(/description must be at least 10 characters/);
    });

    it('should throw error when product has no images', () => {
      expect(() =>
        Product.create({
          sellerId: 'seller-123',
          name: 'Valid Name',
          description: 'Valid description here',
          price: Money.create(500),
          category: 'ARTESANIA',
          status: 'ACTIVE',
          stock: Stock.create(20),
          images: [],
        })
      ).toThrow(DomainError);
      expect(() =>
        Product.create({
          sellerId: 'seller-123',
          name: 'Valid Name',
          description: 'Valid description here',
          price: Money.create(500),
          category: 'ARTESANIA',
          status: 'ACTIVE',
          stock: Stock.create(20),
          images: [],
        })
      ).toThrow(/must have at least one image/);
    });
  });

  describe('stock management', () => {
    it('should reserve stock successfully', () => {
      const product = createValidProduct();

      product.reserveStock(5);

      expect(product.stock.quantity).toBe(15);
      expect(product.version).toBe(2); // Version incremented
      expect(product.status).toBe('ACTIVE');
    });

    it('should mark as sold out when reserving all stock', () => {
      const product = createValidProduct();

      product.reserveStock(20);

      expect(product.stock.quantity).toBe(0);
      expect(product.status).toBe('SOLD_OUT');
    });

    it('should throw error when reserving more than available', () => {
      const product = createValidProduct();

      expect(() => product.reserveStock(25)).toThrow(DomainError);
    });

    it('should throw error when reserving stock from inactive product', () => {
      const product = createValidProduct();
      product.archive();

      expect(() => product.reserveStock(5)).toThrow(DomainError);
      expect(() => product.reserveStock(5)).toThrow(/Cannot reserve stock for inactive product/);
    });

    it('should release stock successfully', () => {
      const product = createValidProduct();
      product.reserveStock(10);

      product.releaseStock(5);

      expect(product.stock.quantity).toBe(15);
      expect(product.version).toBe(3); // Incremented twice
    });

    it('should reactivate product when releasing stock to sold out product', () => {
      const product = createValidProduct();
      product.reserveStock(20);
      expect(product.status).toBe('SOLD_OUT');

      product.releaseStock(10);

      expect(product.stock.quantity).toBe(10);
      expect(product.status).toBe('ACTIVE');
    });

    it('should check if has available stock', () => {
      const product = createValidProduct();

      expect(product.hasAvailableStock(10)).toBe(true);
      expect(product.hasAvailableStock(20)).toBe(true);
      expect(product.hasAvailableStock(21)).toBe(false);
    });
  });

  describe('status management', () => {
    it('should activate product', () => {
      const product = createValidProduct();
      product.archive();

      product.activate();

      expect(product.status).toBe('ACTIVE');
    });

    it('should mark product as sold out', () => {
      const product = createValidProduct();

      product.markSoldOut();

      expect(product.status).toBe('SOLD_OUT');
    });

    it('should archive product', () => {
      const product = createValidProduct();

      product.archive();

      expect(product.status).toBe('ARCHIVED');
    });

    it('should check if product is active', () => {
      const product = createValidProduct();

      expect(product.isActive()).toBe(true);

      product.archive();
      expect(product.isActive()).toBe(false);
    });
  });

  describe('ownership', () => {
    it('should check ownership correctly', () => {
      const product = createValidProduct();

      expect(product.isOwnedBy('seller-123')).toBe(true);
      expect(product.isOwnedBy('seller-999')).toBe(false);
    });
  });

  describe('getters', () => {
    it('should expose product properties via getters', () => {
      const product = createValidProduct();

      expect(product.name).toBe('Alebrijes de Madera');
      expect(product.description).toBeTruthy();
      expect(product.price.amount).toBe(500);
      expect(product.stock.quantity).toBe(20);
      expect(product.images.length).toBe(2);
    });

    it('should return immutable images array', () => {
      const product = createValidProduct();
      const images = product.images;

      images.push('image3.jpg');

      expect(product.images.length).toBe(2); // Original unchanged
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const product = createValidProduct();

      const json = product.toJSON();

      expect(json.sellerId).toBe('seller-123');
      expect(json.name).toBe('Alebrijes de Madera');
      expect(json.price).toBe(500);
      expect(json.stock).toBe(20);
      expect(json.status).toBe('ACTIVE');
      expect(json.version).toBe(1);
    });
  });

  describe('reconstitution', () => {
    it('should reconstitute product from persistence data', () => {
      const product = Product.reconstitute({
        id: 'prod-123',
        sellerId: 'seller-456',
        name: 'Mezcal Artesanal',
        description: 'Mezcal tradicional de Santiago Matatlán',
        price: 800,
        category: 'MEZCAL',
        status: 'ACTIVE',
        stock: 50,
        images: ['mezcal1.jpg', 'mezcal2.jpg'],
        version: 5,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      });

      expect(product.id).toBe('prod-123');
      expect(product.sellerId).toBe('seller-456');
      expect(product.name).toBe('Mezcal Artesanal');
      expect(product.price.amount).toBe(800);
      expect(product.stock.quantity).toBe(50);
      expect(product.version).toBe(5);
    });
  });

  describe('version tracking', () => {
    it('should increment version on stock changes', () => {
      const product = createValidProduct();
      expect(product.version).toBe(1);

      product.reserveStock(5);
      expect(product.version).toBe(2);

      product.releaseStock(2);
      expect(product.version).toBe(3);
    });

    it('should update timestamp on modifications', () => {
      const product = createValidProduct();
      const originalUpdatedAt = product.toJSON().updatedAt;

      // Wait a tiny bit to ensure timestamp difference
      setTimeout(() => {
        product.reserveStock(5);
        const newUpdatedAt = product.toJSON().updatedAt;

        expect(newUpdatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
      }, 10);
    });
  });
});
