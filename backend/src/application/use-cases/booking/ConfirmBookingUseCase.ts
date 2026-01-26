import { IBookingRepository } from '../../../domain/booking/repositories/IBookingRepository.js';
import { Booking } from '../../../domain/booking/entities/Booking.js';
import {
  BookingNotFoundError,
  UnauthorizedActionError,
} from '../../../domain/shared/errors/DomainError.js';

export interface ConfirmBookingInput {
  bookingId: string;
  userId: string;
}

export interface ConfirmBookingOutput {
  booking: Booking;
}

export class ConfirmBookingUseCase {
  constructor(private readonly bookingRepository: IBookingRepository) {}

  async execute(input: ConfirmBookingInput): Promise<ConfirmBookingOutput> {
    // 1. Get booking
    const booking = await this.bookingRepository.findById(input.bookingId);
    if (!booking) {
      throw new BookingNotFoundError(input.bookingId);
    }

    // 2. Validate ownership
    if (!booking.isOwnedBy(input.userId)) {
      throw new UnauthorizedActionError('confirm', 'booking');
    }

    // 3. Confirm booking (domain logic validates state transition)
    booking.confirm();

    // 4. Save
    const savedBooking = await this.bookingRepository.save(booking);

    return { booking: savedBooking };
  }
}
