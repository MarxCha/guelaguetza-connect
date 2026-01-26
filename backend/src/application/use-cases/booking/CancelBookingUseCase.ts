import { IBookingRepository } from '../../../domain/booking/repositories/IBookingRepository.js';
import { BookingDomainService } from '../../../domain/booking/services/BookingDomainService.js';
import { Booking } from '../../../domain/booking/entities/Booking.js';
import {
  BookingNotFoundError,
  ExperienceNotFoundError,
  TimeSlotNotFoundError,
  UnauthorizedActionError,
  DomainError,
} from '../../../domain/shared/errors/DomainError.js';

export interface CancelBookingInput {
  bookingId: string;
  userId: string;
}

export interface CancelBookingOutput {
  booking: Booking;
  requiresRefund: boolean;
  refundAmount?: number;
}

export class CancelBookingUseCase {
  constructor(private readonly bookingRepository: IBookingRepository) {}

  async execute(input: CancelBookingInput): Promise<CancelBookingOutput> {
    return this.bookingRepository.withTransaction(async (repo) => {
      // 1. Get booking
      const booking = await repo.findById(input.bookingId);
      if (!booking) {
        throw new BookingNotFoundError(input.bookingId);
      }

      // 2. Get experience to check permissions
      const experience = await repo.findExperienceById(booking.experienceId);
      if (!experience) {
        throw new ExperienceNotFoundError(booking.experienceId);
      }

      // 3. Validate permissions (user or host can cancel)
      const canCancel = BookingDomainService.canCancelBooking(
        booking,
        experience,
        input.userId
      );

      if (!canCancel) {
        throw new UnauthorizedActionError('cancel', 'booking');
      }

      // 4. Validate cancellation
      const validation = BookingDomainService.validateCancellation(booking);
      if (!validation.canCancel) {
        throw new DomainError(validation.reason || 'Cannot cancel booking');
      }

      // 5. Get time slot and release capacity
      const timeSlot = await repo.findTimeSlotById(booking.timeSlotId);
      if (!timeSlot) {
        throw new TimeSlotNotFoundError(booking.timeSlotId);
      }

      timeSlot.release(booking.guestCount.value);

      // 6. Cancel booking
      booking.cancel();

      // 7. Calculate refund amount
      const refundAmount = validation.requiresRefund
        ? BookingDomainService.calculateRefundAmount(booking)
        : undefined;

      // 8. Save entities
      const savedBooking = await repo.save(booking);
      await repo.saveTimeSlot(timeSlot);

      return {
        booking: savedBooking,
        requiresRefund: validation.requiresRefund,
        refundAmount: refundAmount?.amount,
      };
    });
  }
}
