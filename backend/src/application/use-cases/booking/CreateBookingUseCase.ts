import { IBookingRepository } from '../../../domain/booking/repositories/IBookingRepository.js';
import { BookingDomainService } from '../../../domain/booking/services/BookingDomainService.js';
import { GuestCount } from '../../../domain/booking/value-objects/GuestCount.js';
import { Booking } from '../../../domain/booking/entities/Booking.js';
import {
  ExperienceNotFoundError,
  TimeSlotNotFoundError,
} from '../../../domain/shared/errors/DomainError.js';

export interface CreateBookingInput {
  userId: string;
  experienceId: string;
  timeSlotId: string;
  guestCount: number;
  specialRequests?: string;
}

export interface CreateBookingOutput {
  booking: Booking;
}

export class CreateBookingUseCase {
  constructor(private readonly bookingRepository: IBookingRepository) {}

  async execute(input: CreateBookingInput): Promise<CreateBookingOutput> {
    return this.bookingRepository.withTransaction(async (repo) => {
      // 1. Get experience
      const experience = await repo.findExperienceById(input.experienceId);
      if (!experience) {
        throw new ExperienceNotFoundError(input.experienceId);
      }

      // 2. Get time slot
      const timeSlot = await repo.findTimeSlotById(input.timeSlotId);
      if (!timeSlot) {
        throw new TimeSlotNotFoundError(input.timeSlotId);
      }

      // 3. Create booking using domain service
      const booking = BookingDomainService.createBooking(
        experience,
        timeSlot,
        input.userId,
        input.guestCount,
        input.specialRequests
      );

      // 4. Reserve capacity in time slot
      timeSlot.reserve(input.guestCount);

      // 5. Save entities
      const savedBooking = await repo.save(booking);
      await repo.saveTimeSlot(timeSlot);

      return { booking: savedBooking };
    });
  }
}
