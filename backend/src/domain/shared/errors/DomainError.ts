export class DomainError extends Error {
  constructor(message: string, public readonly code?: string) {
    super(message);
    this.name = 'DomainError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BookingNotFoundError extends DomainError {
  constructor(bookingId: string) {
    super(`Booking ${bookingId} not found`, 'BOOKING_NOT_FOUND');
  }
}

export class ExperienceNotFoundError extends DomainError {
  constructor(experienceId: string) {
    super(`Experience ${experienceId} not found`, 'EXPERIENCE_NOT_FOUND');
  }
}

export class TimeSlotNotFoundError extends DomainError {
  constructor(timeSlotId: string) {
    super(`Time slot ${timeSlotId} not found`, 'TIME_SLOT_NOT_FOUND');
  }
}

export class InsufficientCapacityError extends DomainError {
  constructor(available: number, requested: number) {
    super(
      `Insufficient capacity: ${available} available, ${requested} requested`,
      'INSUFFICIENT_CAPACITY'
    );
  }
}

export class UnauthorizedActionError extends DomainError {
  constructor(action: string, resourceType: string) {
    super(
      `Unauthorized to ${action} ${resourceType}`,
      'UNAUTHORIZED_ACTION'
    );
  }
}

export class InvalidStateTransitionError extends DomainError {
  constructor(from: string, to: string, entity: string) {
    super(
      `Invalid state transition for ${entity}: cannot go from ${from} to ${to}`,
      'INVALID_STATE_TRANSITION'
    );
  }
}
