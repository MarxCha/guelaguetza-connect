import { describe, it, expect } from 'vitest';
import { Money } from './Money.js';
import { Decimal } from '@prisma/client/runtime/library';

describe('Money Value Object', () => {
  describe('creation', () => {
    it('should create money with positive amount', () => {
      const money = Money.create(100);

      expect(money.amount).toBe(100);
      expect(money.currency).toBe('MXN');
    });

    it('should create money with custom currency', () => {
      const money = Money.create(50, 'USD');

      expect(money.amount).toBe(50);
      expect(money.currency).toBe('USD');
    });

    it('should throw error for negative amount', () => {
      expect(() => Money.create(-10)).toThrow('Money amount cannot be negative');
    });

    it('should create from Decimal', () => {
      const decimal = new Decimal('99.99');
      const money = Money.fromDecimal(decimal);

      expect(money.amount).toBe(99.99);
    });
  });

  describe('operations', () => {
    it('should add two money values with same currency', () => {
      const m1 = Money.create(100);
      const m2 = Money.create(50);

      const result = m1.add(m2);

      expect(result.amount).toBe(150);
      expect(result.currency).toBe('MXN');
    });

    it('should throw error when adding different currencies', () => {
      const m1 = Money.create(100, 'MXN');
      const m2 = Money.create(50, 'USD');

      expect(() => m1.add(m2)).toThrow(/Cannot operate on different currencies/);
    });

    it('should subtract money values', () => {
      const m1 = Money.create(100);
      const m2 = Money.create(30);

      const result = m1.subtract(m2);

      expect(result.amount).toBe(70);
    });

    it('should throw error when subtraction results in negative', () => {
      const m1 = Money.create(50);
      const m2 = Money.create(100);

      expect(() => m1.subtract(m2)).toThrow('Subtraction would result in negative money');
    });

    it('should multiply money by positive factor', () => {
      const money = Money.create(50);

      const result = money.multiply(3);

      expect(result.amount).toBe(150);
    });

    it('should throw error when multiplying by negative factor', () => {
      const money = Money.create(50);

      expect(() => money.multiply(-2)).toThrow('Cannot multiply money by negative factor');
    });
  });

  describe('comparisons', () => {
    it('should check equality', () => {
      const m1 = Money.create(100, 'MXN');
      const m2 = Money.create(100, 'MXN');
      const m3 = Money.create(100, 'USD');

      expect(m1.equals(m2)).toBe(true);
      expect(m1.equals(m3)).toBe(false);
    });

    it('should compare greater than', () => {
      const m1 = Money.create(100);
      const m2 = Money.create(50);

      expect(m1.greaterThan(m2)).toBe(true);
      expect(m2.greaterThan(m1)).toBe(false);
    });

    it('should compare less than', () => {
      const m1 = Money.create(50);
      const m2 = Money.create(100);

      expect(m1.lessThan(m2)).toBe(true);
      expect(m2.lessThan(m1)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should not modify original money when adding', () => {
      const original = Money.create(100);
      const added = Money.create(50);

      original.add(added);

      expect(original.amount).toBe(100); // Original unchanged
    });

    it('should not modify original money when multiplying', () => {
      const original = Money.create(50);

      original.multiply(2);

      expect(original.amount).toBe(50); // Original unchanged
    });
  });

  describe('conversion', () => {
    it('should convert to Decimal', () => {
      const money = Money.create(123.45);

      const decimal = money.toDecimal();

      expect(decimal).toBeInstanceOf(Decimal);
      expect(Number(decimal)).toBe(123.45);
    });
  });
});
