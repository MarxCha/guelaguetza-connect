import { describe, it, expect } from 'vitest';
import { TimeSlot } from './TimeSlot.js';
import { DomainError } from '../../shared/errors/DomainError.js';

describe('TimeSlot Entity', () => {
  const createValidTimeSlot = () => {
    return TimeSlot.create({
      experienceId: 'exp-123',
      date: new Date('2024-12-31'),
      startTime: '10:00',
      endTime: '12:00',
      capacity: 10,
    });
  };

  describe('creation', () => {
    it('should create time slot with valid data', () => {
      const slot = createValidTimeSlot();

      expect(slot.experienceId).toBe('exp-123');
      expect(slot.capacity).toBe(10);
      expect(slot.bookedCount).toBe(0);
      expect(slot.isAvailable).toBe(true);
      expect(slot.version).toBe(1);
    });

    it('should throw error for capacity less than 1', () => {
      expect(() =>
        TimeSlot.create({
          experienceId: 'exp-123',
          date: new Date(),
          startTime: '10:00',
          endTime: '12:00',
          capacity: 0,
        })
      ).toThrow(DomainError);
      expect(() =>
        TimeSlot.create({
          experienceId: 'exp-123',
          date: new Date(),
          startTime: '10:00',
          endTime: '12:00',
          capacity: 0,
        })
      ).toThrow(/capacity must be at least 1/);
    });

    it('should throw error when end time is before start time', () => {
      expect(() =>
        TimeSlot.create({
          experienceId: 'exp-123',
          date: new Date(),
          startTime: '12:00',
          endTime: '10:00',
          capacity: 10,
        })
      ).toThrow(DomainError);
      expect(() =>
        TimeSlot.create({
          experienceId: 'exp-123',
          date: new Date(),
          startTime: '12:00',
          endTime: '10:00',
          capacity: 10,
        })
      ).toThrow(/end time must be after start time/);
    });

    it('should throw error when end time equals start time', () => {
      expect(() =>
        TimeSlot.create({
          experienceId: 'exp-123',
          date: new Date(),
          startTime: '10:00',
          endTime: '10:00',
          capacity: 10,
        })
      ).toThrow(DomainError);
    });
  });

  describe('reserve', () => {
    it('should reserve spots successfully', () => {
      const slot = createValidTimeSlot();

      slot.reserve(3);

      expect(slot.bookedCount).toBe(3);
      expect(slot.getAvailableSpots()).toBe(7);
      expect(slot.isAvailable).toBe(true);
      expect(slot.version).toBe(2); // Version incremented
    });

    it('should mark as unavailable when fully booked', () => {
      const slot = createValidTimeSlot();

      slot.reserve(10);

      expect(slot.bookedCount).toBe(10);
      expect(slot.isAvailable).toBe(false);
      expect(slot.isFull()).toBe(true);
    });

    it('should throw error when reserving more than available spots', () => {
      const slot = createValidTimeSlot();
      slot.reserve(7);

      expect(() => slot.reserve(5)).toThrow(DomainError);
      expect(() => slot.reserve(5)).toThrow(/Only 3 spots available/);
    });

    it('should increment version on each reserve', () => {
      const slot = createValidTimeSlot();

      expect(slot.version).toBe(1);
      slot.reserve(2);
      expect(slot.version).toBe(2);
      slot.reserve(3);
      expect(slot.version).toBe(3);
    });
  });

  describe('release', () => {
    it('should release spots successfully', () => {
      const slot = createValidTimeSlot();
      slot.reserve(5);

      slot.release(2);

      expect(slot.bookedCount).toBe(3);
      expect(slot.getAvailableSpots()).toBe(7);
      expect(slot.isAvailable).toBe(true);
    });

    it('should make slot available again after release', () => {
      const slot = createValidTimeSlot();
      slot.reserve(10);
      expect(slot.isAvailable).toBe(false);

      slot.release(1);

      expect(slot.isAvailable).toBe(true);
      expect(slot.isFull()).toBe(false);
    });

    it('should throw error when releasing more than booked', () => {
      const slot = createValidTimeSlot();
      slot.reserve(3);

      expect(() => slot.release(5)).toThrow(DomainError);
      expect(() => slot.release(5)).toThrow(/Cannot release more guests than booked/);
    });

    it('should increment version on release', () => {
      const slot = createValidTimeSlot();
      slot.reserve(5);
      const versionBefore = slot.version;

      slot.release(2);

      expect(slot.version).toBe(versionBefore + 1);
    });
  });

  describe('availability checks', () => {
    it('should calculate available spots correctly', () => {
      const slot = createValidTimeSlot();

      expect(slot.getAvailableSpots()).toBe(10);

      slot.reserve(3);
      expect(slot.getAvailableSpots()).toBe(7);

      slot.reserve(4);
      expect(slot.getAvailableSpots()).toBe(3);
    });

    it('should check if has available spots', () => {
      const slot = createValidTimeSlot();
      slot.reserve(7);

      expect(slot.hasAvailableSpots(3)).toBe(true);
      expect(slot.hasAvailableSpots(4)).toBe(false);
    });

    it('should check if slot is full', () => {
      const slot = createValidTimeSlot();

      expect(slot.isFull()).toBe(false);

      slot.reserve(9);
      expect(slot.isFull()).toBe(false);

      slot.reserve(1);
      expect(slot.isFull()).toBe(true);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const slot = createValidTimeSlot();
      slot.reserve(3);

      const json = slot.toJSON();

      expect(json.experienceId).toBe('exp-123');
      expect(json.capacity).toBe(10);
      expect(json.bookedCount).toBe(3);
      expect(json.availableSpots).toBe(7);
      expect(json.isAvailable).toBe(true);
    });
  });

  describe('reconstitution', () => {
    it('should reconstitute time slot from persistence data', () => {
      const slot = TimeSlot.reconstitute({
        id: 'slot-123',
        experienceId: 'exp-456',
        date: new Date('2024-12-31'),
        startTime: '14:00',
        endTime: '16:00',
        capacity: 20,
        bookedCount: 5,
        isAvailable: true,
        version: 3,
        createdAt: new Date('2024-01-01'),
      });

      expect(slot.id).toBe('slot-123');
      expect(slot.experienceId).toBe('exp-456');
      expect(slot.capacity).toBe(20);
      expect(slot.bookedCount).toBe(5);
      expect(slot.version).toBe(3);
      expect(slot.getAvailableSpots()).toBe(15);
    });

    it('should validate on reconstitution', () => {
      expect(() =>
        TimeSlot.reconstitute({
          id: 'slot-123',
          experienceId: 'exp-456',
          date: new Date(),
          startTime: '10:00',
          endTime: '12:00',
          capacity: 10,
          bookedCount: 15, // Invalid: exceeds capacity
          isAvailable: false,
          version: 1,
          createdAt: new Date(),
        })
      ).toThrow(DomainError);
    });
  });
});
