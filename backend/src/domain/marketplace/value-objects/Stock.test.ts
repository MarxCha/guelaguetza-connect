import { describe, it, expect } from 'vitest';
import { Stock } from './Stock.js';
import { DomainError } from '../../shared/errors/DomainError.js';

describe('Stock Value Object', () => {
  describe('creation', () => {
    it('should create stock with valid quantity', () => {
      const stock = Stock.create(100);

      expect(stock.quantity).toBe(100);
    });

    it('should create stock with zero quantity', () => {
      const stock = Stock.create(0);

      expect(stock.quantity).toBe(0);
      expect(stock.isEmpty()).toBe(true);
    });

    it('should throw error for negative quantity', () => {
      expect(() => Stock.create(-1)).toThrow(DomainError);
      expect(() => Stock.create(-1)).toThrow(/cannot be negative/);
    });
  });

  describe('reserve operation', () => {
    it('should reserve stock successfully', () => {
      const stock = Stock.create(100);

      const newStock = stock.reserve(30);

      expect(newStock.quantity).toBe(70);
      expect(stock.quantity).toBe(100); // Original unchanged
    });

    it('should reserve all available stock', () => {
      const stock = Stock.create(50);

      const newStock = stock.reserve(50);

      expect(newStock.quantity).toBe(0);
      expect(newStock.isEmpty()).toBe(true);
    });

    it('should throw error when reserving more than available', () => {
      const stock = Stock.create(10);

      expect(() => stock.reserve(15)).toThrow(DomainError);
      expect(() => stock.reserve(15)).toThrow(/Cannot reserve 15 units/);
    });

    it('should throw error when reserving from empty stock', () => {
      const stock = Stock.create(0);

      expect(() => stock.reserve(1)).toThrow(DomainError);
    });
  });

  describe('release operation', () => {
    it('should release stock back', () => {
      const stock = Stock.create(50);

      const newStock = stock.release(20);

      expect(newStock.quantity).toBe(70);
      expect(stock.quantity).toBe(50); // Original unchanged
    });

    it('should release stock to empty inventory', () => {
      const stock = Stock.create(0);

      const newStock = stock.release(10);

      expect(newStock.quantity).toBe(10);
    });
  });

  describe('availability checks', () => {
    it('should check if amount is available', () => {
      const stock = Stock.create(100);

      expect(stock.isAvailable(50)).toBe(true);
      expect(stock.isAvailable(100)).toBe(true);
      expect(stock.isAvailable(101)).toBe(false);
    });

    it('should check if stock is empty', () => {
      const emptyStock = Stock.create(0);
      const nonEmptyStock = Stock.create(10);

      expect(emptyStock.isEmpty()).toBe(true);
      expect(nonEmptyStock.isEmpty()).toBe(false);
    });
  });

  describe('equality', () => {
    it('should check equality correctly', () => {
      const stock1 = Stock.create(100);
      const stock2 = Stock.create(100);
      const stock3 = Stock.create(50);

      expect(stock1.equals(stock2)).toBe(true);
      expect(stock1.equals(stock3)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should not modify original when reserving', () => {
      const original = Stock.create(100);

      original.reserve(30);

      expect(original.quantity).toBe(100);
    });

    it('should not modify original when releasing', () => {
      const original = Stock.create(50);

      original.release(20);

      expect(original.quantity).toBe(50);
    });

    it('should be readonly', () => {
      const stock = Stock.create(100);

      // Readonly property - cannot reassign
      expect(stock.quantity).toBe(100);
    });
  });
});
