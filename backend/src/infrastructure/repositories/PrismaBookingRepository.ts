import { PrismaClient, Prisma } from '@prisma/client';
import {
  IBookingRepository,
  BookingFilters,
  PaginatedResult,
} from '../../domain/booking/repositories/IBookingRepository.js';
import { Booking } from '../../domain/booking/entities/Booking.js';
import { Experience } from '../../domain/booking/entities/Experience.js';
import { TimeSlot } from '../../domain/booking/entities/TimeSlot.js';
import { Money } from '../../domain/booking/value-objects/Money.js';
import { GuestCount } from '../../domain/booking/value-objects/GuestCount.js';
import { BookingStatus } from '../../domain/booking/value-objects/BookingStatus.js';

export class PrismaBookingRepository implements IBookingRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  // ==================== BOOKING OPERATIONS ====================

  async save(booking: Booking): Promise<Booking> {
    const data = {
      userId: booking.userId,
      experienceId: booking.experienceId,
      timeSlotId: booking.timeSlotId,
      status: booking.status.toString(),
      guestCount: booking.guestCount.value,
      totalPrice: booking.totalPrice.toDecimal(),
      specialRequests: booking.toJSON().specialRequests,
      stripePaymentId: booking.stripePaymentId,
      confirmedAt: booking.confirmedAt,
      cancelledAt: booking.cancelledAt,
    };

    let saved;
    if (booking.id) {
      // Update existing
      saved = await this.prisma.booking.update({
        where: { id: booking.id },
        data,
        include: { experience: true },
      });
    } else {
      // Create new
      saved = await this.prisma.booking.create({
        data,
        include: { experience: true },
      });
    }

    return this.toDomainBooking(saved);
  }

  async findById(id: string): Promise<Booking | null> {
    const booking = await this.prisma.booking.findUnique({
      where: { id },
      include: { experience: true },
    });

    return booking ? this.toDomainBooking(booking) : null;
  }

  async findByUser(
    userId: string,
    filters?: BookingFilters
  ): Promise<PaginatedResult<Booking>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      userId,
      ...(filters?.status && { status: filters.status }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: { experience: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings.map((b) => this.toDomainBooking(b)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByExperience(
    experienceId: string,
    filters?: BookingFilters
  ): Promise<PaginatedResult<Booking>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.BookingWhereInput = {
      experienceId,
      ...(filters?.status && { status: filters.status }),
    };

    const [bookings, total] = await Promise.all([
      this.prisma.booking.findMany({
        where,
        skip,
        take: limit,
        include: { experience: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.booking.count({ where }),
    ]);

    return {
      data: bookings.map((b) => this.toDomainBooking(b)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== EXPERIENCE OPERATIONS ====================

  async saveExperience(experience: Experience): Promise<Experience> {
    const data = {
      hostId: experience.hostId,
      title: experience.title,
      description: experience.description,
      price: experience.price.toDecimal(),
      isActive: experience.isActive,
      rating: experience.rating,
      reviewCount: experience.reviewCount,
      // Add other fields from toJSON()
      ...experience.toJSON(),
    };

    let saved;
    if (experience.id) {
      saved = await this.prisma.experience.update({
        where: { id: experience.id },
        data,
      });
    } else {
      saved = await this.prisma.experience.create({ data });
    }

    return this.toDomainExperience(saved);
  }

  async findExperienceById(id: string): Promise<Experience | null> {
    const experience = await this.prisma.experience.findUnique({
      where: { id },
    });

    return experience ? this.toDomainExperience(experience) : null;
  }

  async findExperiencesByHost(hostId: string): Promise<Experience[]> {
    const experiences = await this.prisma.experience.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
    });

    return experiences.map((e) => this.toDomainExperience(e));
  }

  // ==================== TIMESLOT OPERATIONS ====================

  async saveTimeSlot(timeSlot: TimeSlot): Promise<TimeSlot> {
    const data = {
      experienceId: timeSlot.experienceId,
      date: timeSlot.date,
      startTime: timeSlot.startTime,
      endTime: timeSlot.endTime,
      capacity: timeSlot.capacity,
      bookedCount: timeSlot.bookedCount,
      isAvailable: timeSlot.isAvailable,
      version: timeSlot.version,
    };

    let saved;
    if (timeSlot.id) {
      // Update using optimistic locking
      const result = await this.prisma.experienceTimeSlot.updateMany({
        where: {
          id: timeSlot.id,
          version: timeSlot.version - 1, // Previous version
        },
        data: {
          ...data,
          version: timeSlot.version,
        },
      });

      if (result.count === 0) {
        throw new Error('Concurrency conflict: time slot was modified');
      }

      saved = await this.prisma.experienceTimeSlot.findUnique({
        where: { id: timeSlot.id },
      });

      if (!saved) {
        throw new Error('Time slot not found after update');
      }
    } else {
      saved = await this.prisma.experienceTimeSlot.create({ data });
    }

    return this.toDomainTimeSlot(saved);
  }

  async findTimeSlotById(id: string): Promise<TimeSlot | null> {
    const slot = await this.prisma.experienceTimeSlot.findUnique({
      where: { id },
    });

    return slot ? this.toDomainTimeSlot(slot) : null;
  }

  async findTimeSlotsByExperience(
    experienceId: string,
    startDate: Date,
    endDate?: Date
  ): Promise<TimeSlot[]> {
    const slots = await this.prisma.experienceTimeSlot.findMany({
      where: {
        experienceId,
        date: {
          gte: startDate,
          ...(endDate && { lte: endDate }),
        },
        isAvailable: true,
      },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    });

    return slots.map((s) => this.toDomainTimeSlot(s));
  }

  // ==================== TRANSACTION SUPPORT ====================

  async withTransaction<T>(
    callback: (repository: IBookingRepository) => Promise<T>
  ): Promise<T> {
    if ('$transaction' in this.prisma) {
      return (this.prisma as PrismaClient).$transaction(async (tx) => {
        const txRepo = new PrismaBookingRepository(tx);
        return callback(txRepo);
      });
    } else {
      // Already in transaction
      return callback(this);
    }
  }

  // ==================== MAPPERS ====================

  private toDomainBooking(data: any): Booking {
    return Booking.reconstitute({
      id: data.id,
      userId: data.userId,
      experienceId: data.experienceId,
      timeSlotId: data.timeSlotId,
      status: data.status,
      guestCount: data.guestCount,
      capacity: data.experience.maxCapacity,
      totalPrice: Number(data.totalPrice),
      specialRequests: data.specialRequests,
      stripePaymentId: data.stripePaymentId,
      confirmedAt: data.confirmedAt,
      cancelledAt: data.cancelledAt,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private toDomainExperience(data: any): Experience {
    return Experience.reconstitute({
      id: data.id,
      hostId: data.hostId,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      images: data.images || [],
      category: data.category,
      price: Money.fromDecimal(data.price),
      duration: data.duration,
      maxCapacity: data.maxCapacity,
      location: data.location,
      latitude: data.latitude,
      longitude: data.longitude,
      includes: data.includes || [],
      languages: data.languages || [],
      isActive: data.isActive,
      rating: data.rating,
      reviewCount: data.reviewCount,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private toDomainTimeSlot(data: any): TimeSlot {
    return TimeSlot.reconstitute({
      id: data.id,
      experienceId: data.experienceId,
      date: data.date,
      startTime: data.startTime,
      endTime: data.endTime,
      capacity: data.capacity,
      bookedCount: data.bookedCount,
      isAvailable: data.isAvailable,
      version: data.version,
      createdAt: data.createdAt,
    });
  }
}
