import { describe, it, expect } from 'vitest';
import { BookingDomainService } from './BookingDomainService.js';
import { Experience } from '../entities/Experience.js';
import { TimeSlot } from '../entities/TimeSlot.js';
import { Money } from '../value-objects/Money.js';
import { DomainError } from '../../shared/errors/DomainError.js';

describe('BookingDomainService', () => {
  const createExperience = () => {
    return Experience.reconstitute({
      id: 'exp-123',
      hostId: 'host-123',
      title: 'Taller de Cerámica',
      description: 'Aprende técnicas tradicionales de cerámica',
      images: ['image1.jpg'],
      category: 'TALLER',
      price: Money.create(500),
      duration: 120,
      maxCapacity: 10,
      location: 'Oaxaca',
      includes: ['Materiales'],
      languages: ['Español'],
      isActive: true,
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  };

  const createTimeSlot = () => {
    return TimeSlot.reconstitute({
      id: 'slot-123',
      experienceId: 'exp-123',
      date: new Date('2024-12-31'),
      startTime: '10:00',
      endTime: '12:00',
      capacity: 10,
      bookedCount: 0,
      isAvailable: true,
      version: 1,
      createdAt: new Date(),
    });
  };

  describe('createBooking', () => {
    it('should create booking with calculated total price', () => {
      const experience = createExperience();
      const timeSlot = createTimeSlot();

      const booking = BookingDomainService.createBooking(
        experience,
        timeSlot,
        'user-123',
        3,
        'Dietary restrictions: vegetarian'
      );

      expect(booking.userId).toBe('user-123');
      expect(booking.guestCount.value).toBe(3);
      expect(booking.totalPrice.amount).toBe(1500); // 500 * 3
    });

    it('should throw error when time slot is not for the experience', () => {
      const experience = createExperience();
      const timeSlot = TimeSlot.create({
        experienceId: 'different-exp',
        date: new Date('2024-12-31'),
        startTime: '10:00',
        endTime: '12:00',
        capacity: 10,
      });

      expect(() =>
        BookingDomainService.createBooking(
          experience,
          timeSlot,
          'user-123',
          3
        )
      ).toThrow(DomainError);
      expect(() =>
        BookingDomainService.createBooking(
          experience,
          timeSlot,
          'user-123',
          3
        )
      ).toThrow(/Time slot does not belong/);
    });

    it('should throw error when experience is not active', () => {
      const experience = createExperience();
      experience.deactivate();
      const timeSlot = createTimeSlot();

      expect(() =>
        BookingDomainService.createBooking(
          experience,
          timeSlot,
          'user-123',
          3
        )
      ).toThrow(DomainError);
      expect(() =>
        BookingDomainService.createBooking(
          experience,
          timeSlot,
          'user-123',
          3
        )
      ).toThrow(/inactive experience/);
    });

    it('should throw error when guest count exceeds available spots', () => {
      const experience = createExperience();
      const timeSlot = createTimeSlot();
      timeSlot.reserve(7); // 3 spots left

      expect(() =>
        BookingDomainService.createBooking(
          experience,
          timeSlot,
          'user-123',
          5 // More than available
        )
      ).toThrow();
    });

    it('should accept booking with exact available spots', () => {
      const experience = createExperience();
      const timeSlot = createTimeSlot();
      timeSlot.reserve(7); // 3 spots left

      const booking = BookingDomainService.createBooking(
        experience,
        timeSlot,
        'user-123',
        3
      );

      expect(booking.guestCount.value).toBe(3);
    });

    it('should include special requests in booking', () => {
      const experience = createExperience();
      const timeSlot = createTimeSlot();

      const booking = BookingDomainService.createBooking(
        experience,
        timeSlot,
        'user-123',
        2,
        'Need wheelchair access'
      );

      expect(booking.toJSON().specialRequests).toBe('Need wheelchair access');
    });
  });

  describe('validateCancellation', () => {
    it('should allow cancellation for pending booking', () => {
      const experience = createExperience();
      const timeSlot = createTimeSlot();
      const booking = BookingDomainService.createBooking(
        experience,
        timeSlot,
        'user-123',
        2
      );

      const result = BookingDomainService.validateCancellation(booking);

      expect(result.canCancel).toBe(true);
      expect(result.requiresRefund).toBe(false);
    });

    it('should not allow cancellation for completed booking', () => {
      const experience = createExperience();
      const timeSlot = createTimeSlot();
      const booking = BookingDomainService.createBooking(
        experience,
        timeSlot,
        'user-123',
        2
      );
      booking.confirm();
      booking.complete();

      const result = BookingDomainService.validateCancellation(booking);

      expect(result.canCancel).toBe(false);
      expect(result.reason).toContain('completed');
    });

    it('should require refund for confirmed booking with payment', () => {
      const experience = createExperience();
      const timeSlot = createTimeSlot();
      const booking = BookingDomainService.createBooking(
        experience,
        timeSlot,
        'user-123',
        2
      );
      booking.confirm();
      booking.attachPaymentIntent('pi_123');

      const result = BookingDomainService.validateCancellation(booking);

      expect(result.canCancel).toBe(true);
      expect(result.requiresRefund).toBe(true);
    });
  });

  describe('canUserConfirmBooking', () => {
    it('should allow user to confirm their own booking', () => {
      const experience = createExperience();
      const timeSlot = createTimeSlot();
      const booking = BookingDomainService.createBooking(
        experience,
        timeSlot,
        'user-123',
        2
      );

      expect(BookingDomainService.canUserConfirmBooking(booking, 'user-123')).toBe(true);
    });

    it('should not allow other user to confirm booking', () => {
      const experience = createExperience();
      const timeSlot = createTimeSlot();
      const booking = BookingDomainService.createBooking(
        experience,
        timeSlot,
        'user-123',
        2
      );

      expect(BookingDomainService.canUserConfirmBooking(booking, 'user-999')).toBe(false);
    });
  });

  describe('calculateRefundAmount', () => {
    it('should calculate full refund', () => {
      const experience = createExperience();
      const timeSlot = createTimeSlot();
      const booking = BookingDomainService.createBooking(
        experience,
        timeSlot,
        'user-123',
        3
      );

      const refund = BookingDomainService.calculateRefundAmount(booking);

      expect(refund.amount).toBe(1500); // Full booking amount
    });
  });
});
