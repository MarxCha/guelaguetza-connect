import { Booking } from '../entities/Booking.js';
import { Experience } from '../entities/Experience.js';
import { TimeSlot } from '../entities/TimeSlot.js';
import { Money } from '../value-objects/Money.js';
import { GuestCount } from '../value-objects/GuestCount.js';
import { DomainError, InsufficientCapacityError } from '../../shared/errors/DomainError.js';

/**
 * Domain Service for booking-related business logic
 * that spans multiple aggregates or doesn't naturally fit in one entity
 */
export class BookingDomainService {
  /**
   * Creates a new booking with validation across aggregates
   */
  static createBooking(
    experience: Experience,
    timeSlot: TimeSlot,
    userId: string,
    guestCount: number,
    specialRequests?: string
  ): Booking {
    // Validate experience is active
    if (!experience.isActive) {
      throw new DomainError('Cannot book an inactive experience');
    }

    // Validate time slot belongs to experience
    if (timeSlot.experienceId !== experience.id) {
      throw new DomainError('Time slot does not belong to this experience');
    }

    // Create guest count value object with experience capacity
    const guests = GuestCount.create(guestCount, experience.maxCapacity);

    // Validate availability
    if (!timeSlot.hasAvailableSpots(guests.value)) {
      throw new InsufficientCapacityError(
        timeSlot.getAvailableSpots(),
        guests.value
      );
    }

    // Calculate total price
    const totalPrice = experience.price.multiply(guests.value);

    // Create booking
    return Booking.create({
      userId,
      experienceId: experience.id,
      timeSlotId: timeSlot.id,
      guestCount: guests,
      totalPrice,
      specialRequests,
    });
  }

  /**
   * Validates if a booking can be cancelled and requires refund
   */
  static validateCancellation(booking: Booking): {
    canCancel: boolean;
    requiresRefund: boolean;
    reason?: string;
  } {
    if (booking.status.isCancelled()) {
      return {
        canCancel: false,
        requiresRefund: false,
        reason: 'Booking is already cancelled',
      };
    }

    if (booking.status.isCompleted()) {
      return {
        canCancel: false,
        requiresRefund: false,
        reason: 'Cannot cancel a completed booking',
      };
    }

    return {
      canCancel: true,
      requiresRefund: booking.requiresRefund(),
    };
  }

  /**
   * Validates if a user can confirm a booking
   */
  static canUserConfirmBooking(booking: Booking, userId: string): boolean {
    return booking.isOwnedBy(userId) && booking.canBeConfirmed();
  }

  /**
   * Validates if a host can complete a booking
   */
  static canHostCompleteBooking(
    booking: Booking,
    experience: Experience,
    hostId: string
  ): boolean {
    return experience.isOwnedBy(hostId) && booking.canBeCompleted();
  }

  /**
   * Validates if a user or host can cancel a booking
   */
  static canCancelBooking(
    booking: Booking,
    experience: Experience,
    userId: string
  ): boolean {
    const isOwner = booking.isOwnedBy(userId);
    const isHost = experience.isOwnedBy(userId);
    return (isOwner || isHost) && booking.canBeCancelled();
  }

  /**
   * Calculate refund amount based on cancellation timing
   * (Could be extended with cancellation policies)
   */
  static calculateRefundAmount(booking: Booking): Money {
    // For now, full refund
    // In the future, could implement cancellation policies based on time
    return booking.totalPrice;
  }
}
