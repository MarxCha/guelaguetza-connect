import { Booking } from '../entities/Booking.js';
import { Experience } from '../entities/Experience.js';
import { TimeSlot } from '../entities/TimeSlot.js';

export interface BookingFilters {
  userId?: string;
  experienceId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IBookingRepository {
  // Booking operations
  save(booking: Booking): Promise<Booking>;
  findById(id: string): Promise<Booking | null>;
  findByUser(userId: string, filters?: BookingFilters): Promise<PaginatedResult<Booking>>;
  findByExperience(experienceId: string, filters?: BookingFilters): Promise<PaginatedResult<Booking>>;

  // Experience operations
  saveExperience(experience: Experience): Promise<Experience>;
  findExperienceById(id: string): Promise<Experience | null>;
  findExperiencesByHost(hostId: string): Promise<Experience[]>;

  // TimeSlot operations
  saveTimeSlot(timeSlot: TimeSlot): Promise<TimeSlot>;
  findTimeSlotById(id: string): Promise<TimeSlot | null>;
  findTimeSlotsByExperience(experienceId: string, startDate: Date, endDate?: Date): Promise<TimeSlot[]>;

  // Transaction support
  withTransaction<T>(callback: (repository: IBookingRepository) => Promise<T>): Promise<T>;
}
