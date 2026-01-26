import { describe, it, expect, beforeEach } from 'vitest';
import { BookingService } from '../../src/services/booking.service.js';
import { ConcurrencyError, AppError, NotFoundError } from '../../src/utils/errors.js';
import { prisma } from './setup-integration.js';
import bcrypt from 'bcryptjs';

describe('BookingService Integration Tests', () => {
  let bookingService: BookingService;
  let testUserId: string;
  let testHostId: string;
  let testExperienceId: string;
  let testTimeSlotId: string;

  beforeEach(async () => {
    bookingService = new BookingService(prisma);

    // Crear usuario de prueba
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const user = await prisma.user.create({
      data: {
        email: `test-user-${Date.now()}@example.com`,
        password: hashedPassword,
        nombre: 'Test',
        apellido: 'User',
      },
    });
    testUserId = user.id;

    // Crear host de prueba
    const host = await prisma.user.create({
      data: {
        email: `test-host-${Date.now()}@example.com`,
        password: hashedPassword,
        nombre: 'Test',
        apellido: 'Host',
        role: 'HOST',
      },
    });
    testHostId = host.id;

    // Crear experiencia de prueba
    const experience = await prisma.experience.create({
      data: {
        hostId: testHostId,
        title: 'Tour por Monte Albán',
        description: 'Visita guiada a la zona arqueológica',
        category: 'TOUR',
        price: 500,
        duration: 180,
        maxCapacity: 10,
        location: 'Monte Albán, Oaxaca',
        languages: ['Español', 'Inglés'],
        includes: ['Transporte', 'Guía certificado'],
        images: ['image1.jpg'],
      },
    });
    testExperienceId = experience.id;

    // Crear time slot de prueba
    const timeSlot = await prisma.experienceTimeSlot.create({
      data: {
        experienceId: testExperienceId,
        date: new Date('2026-12-31'),
        startTime: '10:00',
        endTime: '13:00',
        capacity: 10,
        bookedCount: 0,
        isAvailable: true,
      },
    });
    testTimeSlotId = timeSlot.id;
  });

  describe('createBooking', () => {
    it('should create booking successfully with payment intent', async () => {
      const result = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      });

      expect(result.booking).toBeDefined();
      expect(result.booking.userId).toBe(testUserId);
      expect(result.booking.experienceId).toBe(testExperienceId);
      expect(result.booking.guestCount).toBe(2);
      expect(Number(result.booking.totalPrice)).toBe(1000); // 500 * 2
      expect(result.booking.status).toBe('PENDING');
      expect(result.clientSecret).toBeDefined();

      // Verificar que el slot fue actualizado
      const updatedSlot = await prisma.experienceTimeSlot.findUnique({
        where: { id: testTimeSlotId },
      });
      expect(updatedSlot?.bookedCount).toBe(2);
      expect(updatedSlot?.version).toBe(2); // Incrementado por optimistic locking
    });

    it('should validate availability before creating booking', async () => {
      // Actualizar slot para tener solo 1 lugar disponible
      await prisma.experienceTimeSlot.update({
        where: { id: testTimeSlotId },
        data: { bookedCount: 9 }, // 10 capacity - 9 booked = 1 available
      });

      await expect(
        bookingService.createBooking(testUserId, {
          experienceId: testExperienceId,
          timeSlotId: testTimeSlotId,
          guestCount: 2, // Intentar reservar 2 cuando solo hay 1
        })
      ).rejects.toThrow('Solo hay 1 lugares disponibles');
    });

    it('should throw error for non-existent experience', async () => {
      await expect(
        bookingService.createBooking(testUserId, {
          experienceId: 'non-existent-id',
          timeSlotId: testTimeSlotId,
          guestCount: 2,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error for non-existent time slot', async () => {
      await expect(
        bookingService.createBooking(testUserId, {
          experienceId: testExperienceId,
          timeSlotId: 'non-existent-id',
          guestCount: 2,
        })
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error if time slot is not available', async () => {
      await prisma.experienceTimeSlot.update({
        where: { id: testTimeSlotId },
        data: { isAvailable: false },
      });

      await expect(
        bookingService.createBooking(testUserId, {
          experienceId: testExperienceId,
          timeSlotId: testTimeSlotId,
          guestCount: 2,
        })
      ).rejects.toThrow('Este horario ya no está disponible');
    });

    it('should handle concurrent bookings correctly', async () => {
      // Crear 5 bookings simultáneos al mismo slot
      const bookingPromises = Array.from({ length: 5 }, () =>
        bookingService.createBooking(testUserId, {
          experienceId: testExperienceId,
          timeSlotId: testTimeSlotId,
          guestCount: 1,
        })
      );

      const results = await Promise.all(bookingPromises);

      // Todos deberían completarse exitosamente gracias al retry mechanism
      expect(results).toHaveLength(5);
      expect(results.every((r) => r.booking !== undefined)).toBe(true);

      // Verificar que el booked count sea correcto
      const finalSlot = await prisma.experienceTimeSlot.findUnique({
        where: { id: testTimeSlotId },
      });
      expect(finalSlot?.bookedCount).toBe(5);
      expect(finalSlot?.version).toBe(6); // 1 inicial + 5 incrementos
    });

    it('should prevent overbooking with concurrent requests', async () => {
      // Crear slot con capacidad limitada
      const limitedSlot = await prisma.experienceTimeSlot.create({
        data: {
          experienceId: testExperienceId,
          date: new Date('2026-12-30'),
          startTime: '14:00',
          endTime: '17:00',
          capacity: 3,
          bookedCount: 0,
          isAvailable: true,
        },
      });

      // Intentar 5 bookings simultáneos de 1 guest cada uno en slot con capacidad 3
      const bookingPromises = Array.from({ length: 5 }, () =>
        bookingService.createBooking(testUserId, {
          experienceId: testExperienceId,
          timeSlotId: limitedSlot.id,
          guestCount: 1,
        })
      );

      const results = await Promise.allSettled(bookingPromises);

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      expect(successful).toBe(3); // Solo 3 deberían completarse
      expect(failed).toBe(2); // 2 deberían fallar

      // Verificar que no hubo overbooking
      const finalSlot = await prisma.experienceTimeSlot.findUnique({
        where: { id: limitedSlot.id },
      });
      expect(finalSlot?.bookedCount).toBeLessThanOrEqual(3);
    });

    it('should handle 5 concurrent bookings to same slot with retry mechanism', async () => {
      // Crear 5 usuarios diferentes
      const users = await Promise.all(
        Array.from({ length: 5 }, async (_, i) =>
          prisma.user.create({
            data: {
              email: `concurrent-${i}-${Date.now()}@example.com`,
              password: await bcrypt.hash('Password123!', 10),
              nombre: `User${i}`,
              apellido: 'Concurrent',
            },
          })
        )
      );

      // Crear slot con capacidad para exactamente 5 bookings
      const slot = await prisma.experienceTimeSlot.create({
        data: {
          experienceId: testExperienceId,
          date: new Date('2027-01-10'),
          startTime: '10:00',
          endTime: '13:00',
          capacity: 5,
          bookedCount: 0,
          isAvailable: true,
        },
      });

      // Ejecutar 5 bookings simultáneos
      const bookingPromises = users.map((user) =>
        bookingService.createBooking(user.id, {
          experienceId: testExperienceId,
          timeSlotId: slot.id,
          guestCount: 1,
        })
      );

      const results = await Promise.all(bookingPromises);

      // Todos deberían completarse gracias al retry mechanism
      expect(results).toHaveLength(5);
      expect(results.every((r) => r.booking !== undefined)).toBe(true);

      // Verificar booked count final
      const finalSlot = await prisma.experienceTimeSlot.findUnique({
        where: { id: slot.id },
      });
      expect(finalSlot?.bookedCount).toBe(5);
      expect(finalSlot?.isAvailable).toBe(false); // Should be full
      expect(finalSlot?.version).toBeGreaterThan(1); // Version incremented
    });

    it('should handle concurrent bookings with different guest counts', async () => {
      // Crear 3 usuarios
      const users = await Promise.all(
        Array.from({ length: 3 }, async (_, i) =>
          prisma.user.create({
            data: {
              email: `guest-${i}-${Date.now()}@example.com`,
              password: await bcrypt.hash('Password123!', 10),
              nombre: `Guest${i}`,
              apellido: 'User',
            },
          })
        )
      );

      // Slot con capacidad 10
      const slot = await prisma.experienceTimeSlot.create({
        data: {
          experienceId: testExperienceId,
          date: new Date('2027-02-01'),
          startTime: '15:00',
          endTime: '18:00',
          capacity: 10,
          bookedCount: 0,
          isAvailable: true,
        },
      });

      // Intentar bookings con diferentes cantidades: 4, 3, 5 (total 12, capacidad 10)
      const bookingPromises = [
        bookingService.createBooking(users[0].id, {
          experienceId: testExperienceId,
          timeSlotId: slot.id,
          guestCount: 4,
        }),
        bookingService.createBooking(users[1].id, {
          experienceId: testExperienceId,
          timeSlotId: slot.id,
          guestCount: 3,
        }),
        bookingService.createBooking(users[2].id, {
          experienceId: testExperienceId,
          timeSlotId: slot.id,
          guestCount: 5,
        }),
      ];

      const results = await Promise.allSettled(bookingPromises);

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      // Al menos 1 debería fallar (4+3+5 = 12 > 10)
      expect(failed).toBeGreaterThanOrEqual(1);

      // Verificar que no hubo overbooking
      const finalSlot = await prisma.experienceTimeSlot.findUnique({
        where: { id: slot.id },
      });
      expect(finalSlot?.bookedCount).toBeLessThanOrEqual(10);
    });
  });

  describe('cancelBooking', () => {
    it('should cancel booking and restore slot capacity', async () => {
      // Crear booking
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 3,
      });

      // Confirmar booking
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'CONFIRMED' },
      });

      // Cancelar booking
      const cancelled = await bookingService.cancelBooking(booking.id, testUserId);

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancelledAt).toBeDefined();

      // Verificar que la capacidad fue restaurada
      const updatedSlot = await prisma.experienceTimeSlot.findUnique({
        where: { id: testTimeSlotId },
      });
      expect(updatedSlot?.bookedCount).toBe(0);
      expect(updatedSlot?.isAvailable).toBe(true);
    });

    it('should cancel CONFIRMED booking with refund', async () => {
      // Crear y confirmar booking
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'CONFIRMED',
          stripePaymentId: 'pi_test_confirmed_123',
          confirmedAt: new Date(),
        },
      });

      // Cancelar (debería intentar reembolso)
      const cancelled = await bookingService.cancelBooking(booking.id, testUserId);

      expect(cancelled.status).toBe('CANCELLED');
      expect(cancelled.cancelledAt).toBeDefined();

      // Verificar restauración de capacidad
      const slot = await prisma.experienceTimeSlot.findUnique({
        where: { id: testTimeSlotId },
      });
      expect(slot?.bookedCount).toBe(0);
    });

    it('should cancel PENDING booking without refund', async () => {
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 3,
      });

      // Cancelar sin confirmar (no debería intentar reembolso)
      const cancelled = await bookingService.cancelBooking(booking.id, testUserId);

      expect(cancelled.status).toBe('CANCELLED');

      // Verificar restauración
      const slot = await prisma.experienceTimeSlot.findUnique({
        where: { id: testTimeSlotId },
      });
      expect(slot?.bookedCount).toBe(0);
    });

    it('should throw error when cancelling non-existent booking', async () => {
      await expect(
        bookingService.cancelBooking('non-existent-id', testUserId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw error when user lacks permission', async () => {
      // Crear otro usuario
      const otherUser = await prisma.user.create({
        data: {
          email: `other-user-${Date.now()}@example.com`,
          password: await bcrypt.hash('Password123!', 10),
          nombre: 'Other',
          apellido: 'User',
        },
      });

      // Crear booking
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      });

      // Intentar cancelar con otro usuario
      await expect(
        bookingService.cancelBooking(booking.id, otherUser.id)
      ).rejects.toThrow('No tienes permiso para cancelar esta reservación');
    });

    it('should allow host to cancel booking', async () => {
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      });

      // Host cancela la reservación
      const cancelled = await bookingService.cancelBooking(booking.id, testHostId);

      expect(cancelled.status).toBe('CANCELLED');
    });

    it('should throw error when cancelling already cancelled booking', async () => {
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      });

      await bookingService.cancelBooking(booking.id, testUserId);

      await expect(
        bookingService.cancelBooking(booking.id, testUserId)
      ).rejects.toThrow('Esta reservación ya fue cancelada');
    });

    it('should throw error when cancelling completed booking', async () => {
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'COMPLETED' },
      });

      await expect(
        bookingService.cancelBooking(booking.id, testUserId)
      ).rejects.toThrow('No puedes cancelar una reservación completada');
    });
  });

  describe('confirmBooking', () => {
    it('should confirm pending booking', async () => {
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      });

      const confirmed = await bookingService.confirmBooking(booking.id, testUserId);

      expect(confirmed.status).toBe('CONFIRMED');
      expect(confirmed.confirmedAt).toBeDefined();
    });

    it('should confirm booking after webhook (simulate Stripe payment success)', async () => {
      // Crear booking
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 3,
      });

      expect(booking.status).toBe('PENDING');

      // Simular webhook de Stripe actualizando el booking a PENDING_PAYMENT
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'PENDING_PAYMENT' },
      });

      // Confirmar booking (simula que el webhook ya validó el pago)
      const confirmed = await bookingService.confirmBooking(booking.id, testUserId);

      expect(confirmed.status).toBe('CONFIRMED');
      expect(confirmed.confirmedAt).toBeDefined();

      // Verificar que el slot no cambió (capacidad ya fue reservada en createBooking)
      const slot = await prisma.experienceTimeSlot.findUnique({
        where: { id: testTimeSlotId },
      });
      expect(slot?.bookedCount).toBe(3);
    });

    it('should throw error for already processed booking', async () => {
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      });

      await bookingService.confirmBooking(booking.id, testUserId);

      await expect(
        bookingService.confirmBooking(booking.id, testUserId)
      ).rejects.toThrow('Esta reservación ya fue procesada');
    });

    it('should throw error if user lacks permission', async () => {
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      });

      const otherUser = await prisma.user.create({
        data: {
          email: `other-${Date.now()}@example.com`,
          password: await bcrypt.hash('Password123!', 10),
          nombre: 'Other',
          apellido: 'User',
        },
      });

      await expect(
        bookingService.confirmBooking(booking.id, otherUser.id)
      ).rejects.toThrow('No tienes permiso para confirmar esta reservación');
    });

    it('should confirm PENDING_PAYMENT booking', async () => {
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 1,
      });

      // Cambiar a PENDING_PAYMENT
      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'PENDING_PAYMENT' },
      });

      const confirmed = await bookingService.confirmBooking(booking.id, testUserId);

      expect(confirmed.status).toBe('CONFIRMED');
    });
  });

  describe('cleanupFailedBookings', () => {
    it('should clean up bookings in PENDING_PAYMENT older than timeout', async () => {
      // Crear booking en PENDING_PAYMENT
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 3,
      });

      // Actualizar booking para simular que es antiguo (31 minutos)
      await prisma.booking.update({
        where: { id: booking.id },
        data: {
          status: 'PENDING_PAYMENT',
          createdAt: new Date(Date.now() - 31 * 60 * 1000),
        },
      });

      // Ejecutar cleanup con timeout de 30 minutos
      const result = await bookingService.cleanupFailedBookings(30);

      expect(result.cleaned).toBe(1);

      // Verificar que el booking fue cancelado
      const cleanedBooking = await prisma.booking.findUnique({
        where: { id: booking.id },
      });
      expect(cleanedBooking?.status).toBe('CANCELLED');

      // Verificar que la capacidad fue restaurada
      const updatedSlot = await prisma.experienceTimeSlot.findUnique({
        where: { id: testTimeSlotId },
      });
      expect(updatedSlot?.bookedCount).toBe(0);
    });

    it('should not clean up recent PENDING_PAYMENT bookings', async () => {
      const { booking } = await bookingService.createBooking(testUserId, {
        experienceId: testExperienceId,
        timeSlotId: testTimeSlotId,
        guestCount: 2,
      });

      await prisma.booking.update({
        where: { id: booking.id },
        data: { status: 'PENDING_PAYMENT' },
      });

      const result = await bookingService.cleanupFailedBookings(30);

      expect(result.cleaned).toBe(0);

      // Verificar que el booking sigue PENDING_PAYMENT
      const uncleaned = await prisma.booking.findUnique({
        where: { id: booking.id },
      });
      expect(uncleaned?.status).toBe('PENDING_PAYMENT');
    });

    it('should clean up multiple failed bookings', async () => {
      // Crear 3 bookings
      const bookings = await Promise.all(
        Array.from({ length: 3 }, () =>
          bookingService.createBooking(testUserId, {
            experienceId: testExperienceId,
            timeSlotId: testTimeSlotId,
            guestCount: 1,
          })
        )
      );

      // Actualizar todos a PAYMENT_FAILED y antiguos
      await Promise.all(
        bookings.map((b) =>
          prisma.booking.update({
            where: { id: b.booking.id },
            data: {
              status: 'PAYMENT_FAILED',
              createdAt: new Date(Date.now() - 31 * 60 * 1000),
            },
          })
        )
      );

      const result = await bookingService.cleanupFailedBookings(30);

      expect(result.cleaned).toBe(3);

      // Verificar que la capacidad fue restaurada completamente
      const updatedSlot = await prisma.experienceTimeSlot.findUnique({
        where: { id: testTimeSlotId },
      });
      expect(updatedSlot?.bookedCount).toBe(0);
    });
  });

  describe('getExperiences', () => {
    it('should return experiences with filters', async () => {
      // Crear otra experiencia
      await prisma.experience.create({
        data: {
          hostId: testHostId,
          title: 'Taller de Mezcal',
          description: 'Aprende el proceso tradicional',
          category: 'WORKSHOP',
          price: 800,
          duration: 240,
          maxCapacity: 6,
          location: 'Oaxaca Centro',
          languages: ['Español'],
          includes: ['Degustación', 'Materiales'],
          images: ['image2.jpg'],
        },
      });

      const result = await bookingService.getExperiences({
        category: 'TOUR',
        page: 1,
        limit: 10,
      });

      expect(result.experiences).toHaveLength(1);
      expect(result.experiences[0].title).toBe('Tour por Monte Albán');
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by price range', async () => {
      const result = await bookingService.getExperiences({
        minPrice: 400,
        maxPrice: 600,
        page: 1,
        limit: 10,
      });

      expect(result.experiences).toHaveLength(1);
      expect(Number(result.experiences[0].price)).toBe(500);
    });

    it('should search by title or description', async () => {
      const result = await bookingService.getExperiences({
        search: 'Monte Albán',
        page: 1,
        limit: 10,
      });

      expect(result.experiences.length).toBeGreaterThan(0);
      expect(result.experiences[0].title).toContain('Monte Albán');
    });
  });

  describe('getTimeSlots', () => {
    it('should return available time slots for experience', async () => {
      // Crear slots adicionales
      await prisma.experienceTimeSlot.create({
        data: {
          experienceId: testExperienceId,
          date: new Date('2027-01-15'),
          startTime: '14:00',
          endTime: '17:00',
          capacity: 8,
          bookedCount: 2,
          isAvailable: true,
        },
      });

      const result = await bookingService.getTimeSlots(testExperienceId, {
        startDate: '2026-12-01',
        endDate: '2027-12-31',
      });

      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result.every((slot) => slot.isAvailable)).toBe(true);
      expect(result[0].availableSpots).toBeDefined();
    });

    it('should throw error for non-existent experience', async () => {
      await expect(
        bookingService.getTimeSlots('non-existent-id', {
          startDate: '2026-12-01',
        })
      ).rejects.toThrow(NotFoundError);
    });
  });
});
