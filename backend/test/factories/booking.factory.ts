/**
 * BookingFactory - Generador de reservas/bookings
 */

import type { Booking, BookingStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

let bookingCounter = 0;

const SPECIAL_REQUESTS = [
  'Necesito silla de ruedas accesible',
  'Soy vegetariano, por favor considerar en la comida',
  'Tenemos un niño de 5 años, ¿hay descuento?',
  'Preferimos el tour en español',
  'Somos un grupo grande, ¿hay descuento grupal?',
  null,
  null,
  null, // La mayoría no tiene requests especiales
];

export interface BookingFactoryOptions {
  id?: string;
  userId?: string;
  experienceId?: string;
  timeSlotId?: string;
  status?: BookingStatus;
  guestCount?: number;
  totalPrice?: number | Decimal;
  specialRequests?: string | null;
  stripePaymentId?: string | null;
  confirmedAt?: Date | null;
  cancelledAt?: Date | null;
}

/**
 * Genera una reserva de prueba
 */
export function createBooking(options: BookingFactoryOptions = {}): Omit<Booking, 'createdAt' | 'updatedAt'> {
  const index = bookingCounter++;
  const guestCount = options.guestCount ?? Math.floor(Math.random() * 4) + 1;
  const pricePerGuest = 500 + Math.random() * 500;

  return {
    id: options.id ?? `booking-${index}-${Date.now()}`,
    userId: options.userId ?? `user-${index % 10}`,
    experienceId: options.experienceId ?? `experience-${index % 5}`,
    timeSlotId: options.timeSlotId ?? `timeslot-${index % 20}`,
    status: options.status ?? 'PENDING',
    guestCount,
    totalPrice: new Decimal(options.totalPrice ?? (pricePerGuest * guestCount).toFixed(2)),
    specialRequests: options.specialRequests !== undefined
      ? options.specialRequests
      : SPECIAL_REQUESTS[index % SPECIAL_REQUESTS.length],
    stripePaymentId: options.stripePaymentId !== undefined ? options.stripePaymentId : null,
    confirmedAt: options.confirmedAt !== undefined ? options.confirmedAt : null,
    cancelledAt: options.cancelledAt !== undefined ? options.cancelledAt : null,
  };
}

/**
 * Crea una reserva pendiente
 */
export function createPendingBooking(options: BookingFactoryOptions = {}): Omit<Booking, 'createdAt' | 'updatedAt'> {
  return createBooking({
    ...options,
    status: 'PENDING',
    confirmedAt: null,
    cancelledAt: null,
  });
}

/**
 * Crea una reserva confirmada
 */
export function createConfirmedBooking(options: BookingFactoryOptions = {}): Omit<Booking, 'createdAt' | 'updatedAt'> {
  const index = bookingCounter;
  const now = new Date();
  const confirmedAt = new Date(now.getTime() - Math.random() * 86400000); // Último día

  return createBooking({
    ...options,
    status: 'CONFIRMED',
    stripePaymentId: options.stripePaymentId ?? `pi_confirmed_${index}_${Date.now()}`,
    confirmedAt: options.confirmedAt ?? confirmedAt,
    cancelledAt: null,
  });
}

/**
 * Crea una reserva cancelada
 */
export function createCancelledBooking(options: BookingFactoryOptions = {}): Omit<Booking, 'createdAt' | 'updatedAt'> {
  const now = new Date();
  const cancelledAt = new Date(now.getTime() - Math.random() * 86400000); // Último día

  return createBooking({
    ...options,
    status: 'CANCELLED',
    cancelledAt: options.cancelledAt ?? cancelledAt,
  });
}

/**
 * Crea una reserva completada
 */
export function createCompletedBooking(options: BookingFactoryOptions = {}): Omit<Booking, 'createdAt' | 'updatedAt'> {
  const index = bookingCounter;
  const now = new Date();
  const confirmedAt = new Date(now.getTime() - Math.random() * 604800000); // Última semana

  return createBooking({
    ...options,
    status: 'COMPLETED',
    stripePaymentId: options.stripePaymentId ?? `pi_completed_${index}_${Date.now()}`,
    confirmedAt: options.confirmedAt ?? confirmedAt,
    cancelledAt: null,
  });
}

/**
 * Crea una reserva con pago procesado
 */
export function createPaidBooking(options: BookingFactoryOptions = {}): Omit<Booking, 'createdAt' | 'updatedAt'> {
  const index = bookingCounter;

  return createBooking({
    ...options,
    stripePaymentId: options.stripePaymentId ?? `pi_paid_${index}_${Date.now()}`,
  });
}

/**
 * Crea reservas para un usuario específico
 */
export function createBookingsForUser(userId: string, count: number, options: BookingFactoryOptions = {}): Omit<Booking, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createBooking({ ...options, userId }));
}

/**
 * Crea reservas para una experiencia específica
 */
export function createBookingsForExperience(experienceId: string, count: number, options: BookingFactoryOptions = {}): Omit<Booking, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createBooking({ ...options, experienceId }));
}

/**
 * Crea reservas para un time slot específico
 */
export function createBookingsForTimeSlot(timeSlotId: string, count: number, options: BookingFactoryOptions = {}): Omit<Booking, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createBooking({ ...options, timeSlotId }));
}

/**
 * Crea múltiples reservas
 */
export function createManyBookings(count: number, options: BookingFactoryOptions = {}): Omit<Booking, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createBooking(options));
}

/**
 * Resetea el contador de reservas (útil entre tests)
 */
export function resetBookingCounter(): void {
  bookingCounter = 0;
}
