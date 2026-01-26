import { DomainError } from '../../shared/errors/DomainError.js';

export interface TimeSlotProps {
  id: string;
  experienceId: string;
  date: Date;
  startTime: string;
  endTime: string;
  capacity: number;
  bookedCount: number;
  isAvailable: boolean;
  version: number;
  createdAt: Date;
}

export class TimeSlot {
  private constructor(private props: TimeSlotProps) {
    this.validate();
  }

  static create(props: Omit<TimeSlotProps, 'id' | 'bookedCount' | 'isAvailable' | 'version' | 'createdAt'>): TimeSlot {
    return new TimeSlot({
      ...props,
      id: '', // Will be set by repository
      bookedCount: 0,
      isAvailable: true,
      version: 1,
      createdAt: new Date(),
    });
  }

  static reconstitute(props: TimeSlotProps): TimeSlot {
    return new TimeSlot(props);
  }

  private validate(): void {
    if (this.props.capacity < 1) {
      throw new DomainError('TimeSlot capacity must be at least 1');
    }

    if (this.props.bookedCount < 0) {
      throw new DomainError('TimeSlot bookedCount cannot be negative');
    }

    if (this.props.bookedCount > this.props.capacity) {
      throw new DomainError('TimeSlot bookedCount cannot exceed capacity');
    }

    const [startHour, startMin] = this.props.startTime.split(':').map(Number);
    const [endHour, endMin] = this.props.endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    if (endMinutes <= startMinutes) {
      throw new DomainError('TimeSlot end time must be after start time');
    }
  }

  reserve(guestCount: number): void {
    const availableSpots = this.getAvailableSpots();
    if (guestCount > availableSpots) {
      throw new DomainError(`Only ${availableSpots} spots available in this time slot`);
    }

    this.props.bookedCount += guestCount;

    if (this.props.bookedCount >= this.props.capacity) {
      this.props.isAvailable = false;
    }

    this.props.version += 1;
  }

  release(guestCount: number): void {
    if (guestCount > this.props.bookedCount) {
      throw new DomainError('Cannot release more guests than booked');
    }

    this.props.bookedCount -= guestCount;
    this.props.isAvailable = true;
    this.props.version += 1;
  }

  getAvailableSpots(): number {
    return this.props.capacity - this.props.bookedCount;
  }

  hasAvailableSpots(guestCount: number): boolean {
    return this.getAvailableSpots() >= guestCount;
  }

  isFull(): boolean {
    return this.props.bookedCount >= this.props.capacity;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get experienceId(): string {
    return this.props.experienceId;
  }

  get date(): Date {
    return this.props.date;
  }

  get startTime(): string {
    return this.props.startTime;
  }

  get endTime(): string {
    return this.props.endTime;
  }

  get capacity(): number {
    return this.props.capacity;
  }

  get bookedCount(): number {
    return this.props.bookedCount;
  }

  get isAvailable(): boolean {
    return this.props.isAvailable;
  }

  get version(): number {
    return this.props.version;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON() {
    return {
      ...this.props,
      availableSpots: this.getAvailableSpots(),
    };
  }
}
