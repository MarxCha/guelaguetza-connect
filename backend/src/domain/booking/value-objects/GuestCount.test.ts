import { describe, it, expect } from 'vitest';
import { GuestCount } from './GuestCount.js';

describe('GuestCount Value Object', () => {
  describe('creation', () => {
    it('should create guest count with valid value', () => {
      const guestCount = GuestCount.create(5, 10);

      expect(guestCount.value).toBe(5);
    });

    it('should throw error for zero guests', () => {
      expect(() => GuestCount.create(0, 10)).toThrow('Guest count must be at least 1');
    });

    it('should throw error for negative guests', () => {
      expect(() => GuestCount.create(-1, 10)).toThrow('Guest count must be at least 1');
    });

    it('should throw error when exceeding capacity', () => {
      expect(() => GuestCount.create(15, 10)).toThrow(/exceeds capacity/);
    });

    it('should allow guest count equal to capacity', () => {
      const guestCount = GuestCount.create(10, 10);

      expect(guestCount.value).toBe(10);
    });
  });

  describe('business rules', () => {
    it('should check if guest count can fit in available spots', () => {
      const guestCount = GuestCount.create(5, 10);

      expect(guestCount.canFitInCapacity(10)).toBe(true);
      expect(guestCount.canFitInCapacity(5)).toBe(true);
      expect(guestCount.canFitInCapacity(4)).toBe(false);
    });

    it('should check equality', () => {
      const gc1 = GuestCount.create(5, 10);
      const gc2 = GuestCount.create(5, 10);
      const gc3 = GuestCount.create(3, 10);

      expect(gc1.equals(gc2)).toBe(true);
      expect(gc1.equals(gc3)).toBe(false);
    });

    it('should compare greater than', () => {
      const gc1 = GuestCount.create(5, 10);
      const gc2 = GuestCount.create(3, 10);

      expect(gc1.greaterThan(gc2)).toBe(true);
      expect(gc2.greaterThan(gc1)).toBe(false);
    });
  });

  describe('immutability', () => {
    it('should be immutable', () => {
      const guestCount = GuestCount.create(5, 10);

      // Cannot modify value (readonly)
      expect(guestCount.value).toBe(5);
    });
  });
});
