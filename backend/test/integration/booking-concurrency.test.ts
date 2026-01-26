import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { BookingService } from '../../src/services/booking.service.js';
import { ConcurrencyError } from '../../src/utils/errors.js';
import { updateTimeSlotWithLocking } from '../../src/utils/optimistic-locking.js';

const prisma = new PrismaClient();
const bookingService = new BookingService(prisma);

describe('Booking Service - Optimistic Locking', () => {
  let testUserId: string;
  let testExperienceId: string;
  let testTimeSlotId: string;

  beforeAll(async () => {
    // Create test user
    const user = await prisma.user.create({
      data: {
        email: `test-concurrency-${Date.now()}@example.com`,
        password: 'hashedpassword',
        nombre: 'Test User',
      },
    });
    testUserId = user.id;

    // Create test experience
    const experience = await prisma.experience.create({
      data: {
        hostId: testUserId,
        title: 'Test Experience for Concurrency',
        description: 'Testing optimistic locking',
        category: 'TOUR',
        price: 100,
        duration: 120,
        maxCapacity: 10,
        location: 'Test Location',
        languages: ['Español'],
        includes: [],
        images: [],
      },
    });
    testExperienceId = experience.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testExperienceId) {
      await prisma.booking.deleteMany({
        where: { experienceId: testExperienceId },
      });
      await prisma.experienceTimeSlot.deleteMany({
        where: { experienceId: testExperienceId },
      });
      await prisma.experience.delete({
        where: { id: testExperienceId },
      });
    }
    if (testUserId) {
      await prisma.user.delete({
        where: { id: testUserId },
      });
    }
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Create a fresh time slot for each test
    const timeSlot = await prisma.experienceTimeSlot.create({
      data: {
        experienceId: testExperienceId,
        date: new Date('2026-12-31'),
        startTime: '10:00',
        endTime: '12:00',
        capacity: 10,
        bookedCount: 0,
        isAvailable: true,
      },
    });
    testTimeSlotId = timeSlot.id;
  });

  afterEach(async () => {
    // Clean up bookings and time slot
    if (testTimeSlotId) {
      await prisma.booking.deleteMany({
        where: { timeSlotId: testTimeSlotId },
      });
      await prisma.experienceTimeSlot.delete({
        where: { id: testTimeSlotId },
      });
    }
  });

  it('should successfully create a booking with optimistic locking', async () => {
    const result = await bookingService.createBooking(testUserId, {
      experienceId: testExperienceId,
      timeSlotId: testTimeSlotId,
      guestCount: 2,
    });

    expect(result.booking).toBeDefined();
    expect(result.booking.guestCount).toBe(2);

    // Verify slot was updated
    const updatedSlot = await prisma.experienceTimeSlot.findUnique({
      where: { id: testTimeSlotId },
    });
    expect(updatedSlot?.bookedCount).toBe(2);
    expect(updatedSlot?.version).toBe(2); // Version incremented
  });

  it('should detect concurrent updates and throw ConcurrencyError', async () => {
    const timeSlot = await prisma.experienceTimeSlot.findUnique({
      where: { id: testTimeSlotId },
    });

    expect(timeSlot).toBeDefined();
    const initialVersion = timeSlot!.version;

    // Simulate concurrent update by another process
    await prisma.experienceTimeSlot.update({
      where: { id: testTimeSlotId },
      data: {
        bookedCount: { increment: 1 },
        version: { increment: 1 },
      },
    });

    // Try to update with stale version
    await expect(
      updateTimeSlotWithLocking(prisma, testTimeSlotId, initialVersion, {
        bookedCount: { increment: 1 },
      })
    ).rejects.toThrow(ConcurrencyError);
  });

  it('should handle concurrent bookings with retry mechanism', async () => {
    // Create multiple concurrent booking requests
    const bookingPromises = [
      bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 3,
      }),
      bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      }),
      bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 1,
      }),
    ];

    // All should succeed due to retry mechanism
    const results = await Promise.all(bookingPromises);

    expect(results).toHaveLength(3);
    expect(results.every((r) => r.booking !== undefined)).toBe(true);

    // Verify final booked count
    const finalSlot = await prisma.experienceTimeSlot.findUnique({
      where: { id: testTimeSlotId },
    });
    expect(finalSlot?.bookedCount).toBe(6); // 3 + 2 + 1
    expect(finalSlot?.version).toBe(4); // 1 initial + 3 increments
  });

  it('should prevent overbooking even with concurrent requests', async () => {
    // Create time slot with limited capacity
    const limitedSlot = await prisma.experienceTimeSlot.create({
      data: {
        experienceId: testExperienceId,
        date: new Date('2026-12-30'),
        startTime: '14:00',
        endTime: '16:00',
        capacity: 5,
        bookedCount: 0,
        isAvailable: true,
      },
    });

    // Try to book more than capacity
    const bookingPromises = [
      bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: limitedSlot.id,
        guestCount: 3,
      }),
      bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: limitedSlot.id,
        guestCount: 3,
      }),
    ];

    // One should fail due to capacity
    const results = await Promise.allSettled(bookingPromises);

    const successful = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;

    expect(successful).toBe(1);
    expect(failed).toBe(1);

    // Verify no overbooking occurred
    const finalSlot = await prisma.experienceTimeSlot.findUnique({
      where: { id: limitedSlot.id },
    });
    expect(finalSlot?.bookedCount).toBeLessThanOrEqual(5);

    // Cleanup
    await prisma.booking.deleteMany({
      where: { timeSlotId: limitedSlot.id },
    });
    await prisma.experienceTimeSlot.delete({
      where: { id: limitedSlot.id },
    });
  });

  it('should handle cancellation with optimistic locking', async () => {
    // Create a booking first
    const { booking } = await bookingService.createBooking(testUserId, {
      experienceId: testExperienceId,
      timeSlotId: testTimeSlotId,
      guestCount: 2,
    });

    // Confirm the booking
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'CONFIRMED' },
    });

    // Cancel the booking
    const cancelled = await bookingService.cancelBooking(booking.id, testUserId);

    expect(cancelled.status).toBe('CANCELLED');

    // Verify slot capacity was restored
    const updatedSlot = await prisma.experienceTimeSlot.findUnique({
      where: { id: testTimeSlotId },
    });
    expect(updatedSlot?.bookedCount).toBe(0);
    expect(updatedSlot?.isAvailable).toBe(true);
    expect(updatedSlot?.version).toBe(3); // 1 initial + 1 booking + 1 cancellation
  });

  it('should handle version correctly across multiple operations', async () => {
    const initialSlot = await prisma.experienceTimeSlot.findUnique({
      where: { id: testTimeSlotId },
    });
    expect(initialSlot?.version).toBe(1);

    // First booking
    await bookingService.createBooking(testUserId, {
      experienceId: testExperienceId,
      timeSlotId: testTimeSlotId,
      guestCount: 1,
    });

    let slot = await prisma.experienceTimeSlot.findUnique({
      where: { id: testTimeSlotId },
    });
    expect(slot?.version).toBe(2);

    // Second booking
    await bookingService.createBooking(testUserId, {
      experienceId: testExperienceId,
      timeSlotId: testTimeSlotId,
      guestCount: 1,
    });

    slot = await prisma.experienceTimeSlot.findUnique({
      where: { id: testTimeSlotId },
    });
    expect(slot?.version).toBe(3);

    // Third booking
    await bookingService.createBooking(testUserId, {
      experienceId: testExperienceId,
      timeSlotId: testTimeSlotId,
      guestCount: 1,
    });

    slot = await prisma.experienceTimeSlot.findUnique({
      where: { id: testTimeSlotId },
    });
    expect(slot?.version).toBe(4);
    expect(slot?.bookedCount).toBe(3);
  });
});
