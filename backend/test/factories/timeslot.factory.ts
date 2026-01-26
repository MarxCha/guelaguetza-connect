/**
 * TimeSlotFactory - Generador de horarios disponibles para experiencias
 */

import type { ExperienceTimeSlot } from '@prisma/client';

let timeslotCounter = 0;

const HORARIOS = [
  { startTime: '09:00', endTime: '12:00' },
  { startTime: '10:00', endTime: '13:00' },
  { startTime: '11:00', endTime: '14:00' },
  { startTime: '12:00', endTime: '15:00' },
  { startTime: '14:00', endTime: '17:00' },
  { startTime: '15:00', endTime: '18:00' },
  { startTime: '16:00', endTime: '19:00' },
  { startTime: '17:00', endTime: '20:00' },
];

export interface TimeSlotFactoryOptions {
  id?: string;
  experienceId?: string;
  date?: Date;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  bookedCount?: number;
  isAvailable?: boolean;
}

/**
 * Genera un time slot de prueba
 */
export function createTimeSlot(options: TimeSlotFactoryOptions = {}): Omit<ExperienceTimeSlot, 'createdAt'> {
  const index = timeslotCounter++;
  const horario = HORARIOS[index % HORARIOS.length];

  // Fecha por defecto: próximos 30 días
  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + (index % 30));
  defaultDate.setHours(0, 0, 0, 0);

  const capacity = options.capacity ?? Math.floor(Math.random() * 10) + 5;
  const bookedCount = options.bookedCount ?? Math.floor(Math.random() * capacity * 0.7);

  return {
    id: options.id ?? `timeslot-${index}-${Date.now()}`,
    experienceId: options.experienceId ?? `experience-${index % 5}`,
    date: options.date ?? defaultDate,
    startTime: options.startTime ?? horario.startTime,
    endTime: options.endTime ?? horario.endTime,
    capacity,
    bookedCount,
    isAvailable: options.isAvailable ?? (bookedCount < capacity),
  };
}

/**
 * Crea un time slot disponible
 */
export function createAvailableTimeSlot(options: TimeSlotFactoryOptions = {}): Omit<ExperienceTimeSlot, 'createdAt'> {
  const capacity = options.capacity ?? 10;
  return createTimeSlot({
    ...options,
    capacity,
    bookedCount: options.bookedCount ?? Math.floor(capacity * 0.5),
    isAvailable: true,
  });
}

/**
 * Crea un time slot lleno (sin disponibilidad)
 */
export function createFullTimeSlot(options: TimeSlotFactoryOptions = {}): Omit<ExperienceTimeSlot, 'createdAt'> {
  const capacity = options.capacity ?? 10;
  return createTimeSlot({
    ...options,
    capacity,
    bookedCount: capacity,
    isAvailable: false,
  });
}

/**
 * Crea un time slot no disponible
 */
export function createUnavailableTimeSlot(options: TimeSlotFactoryOptions = {}): Omit<ExperienceTimeSlot, 'createdAt'> {
  return createTimeSlot({
    ...options,
    isAvailable: false,
  });
}

/**
 * Crea time slots para una experiencia específica
 */
export function createTimeSlotsForExperience(experienceId: string, count: number, options: TimeSlotFactoryOptions = {}): Omit<ExperienceTimeSlot, 'createdAt'>[] {
  return Array.from({ length: count }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() + i);
    date.setHours(0, 0, 0, 0);

    return createTimeSlot({
      ...options,
      experienceId,
      date,
    });
  });
}

/**
 * Crea time slots para una fecha específica
 */
export function createTimeSlotsForDate(date: Date, count: number, options: TimeSlotFactoryOptions = {}): Omit<ExperienceTimeSlot, 'createdAt'>[] {
  return Array.from({ length: count }, () => createTimeSlot({ ...options, date }));
}

/**
 * Crea time slots para múltiples días
 */
export function createTimeSlotsForDateRange(
  startDate: Date,
  days: number,
  slotsPerDay: number = 2,
  options: TimeSlotFactoryOptions = {}
): Omit<ExperienceTimeSlot, 'createdAt'>[] {
  const slots: Omit<ExperienceTimeSlot, 'createdAt'>[] = [];

  for (let day = 0; day < days; day++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + day);
    date.setHours(0, 0, 0, 0);

    for (let slot = 0; slot < slotsPerDay; slot++) {
      const horario = HORARIOS[slot % HORARIOS.length];
      slots.push(createTimeSlot({
        ...options,
        date,
        startTime: horario.startTime,
        endTime: horario.endTime,
      }));
    }
  }

  return slots;
}

/**
 * Crea múltiples time slots
 */
export function createManyTimeSlots(count: number, options: TimeSlotFactoryOptions = {}): Omit<ExperienceTimeSlot, 'createdAt'>[] {
  return Array.from({ length: count }, () => createTimeSlot(options));
}

/**
 * Resetea el contador de time slots (útil entre tests)
 */
export function resetTimeSlotCounter(): void {
  timeslotCounter = 0;
}
