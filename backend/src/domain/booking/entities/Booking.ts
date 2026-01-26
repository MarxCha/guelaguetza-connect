import { Money } from '../value-objects/Money.js';
import { GuestCount } from '../value-objects/GuestCount.js';
import { BookingStatus, BookingStatusEnum } from '../value-objects/BookingStatus.js';
import { DomainError } from '../../shared/errors/DomainError.js';

export interface BookingProps {
  id: string;
  userId: string;
  experienceId: string;
  timeSlotId: string;
  status: BookingStatus;
  guestCount: GuestCount;
  totalPrice: Money;
  specialRequests?: string;
  stripePaymentId?: string;
  confirmedAt?: Date;
  cancelledAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export class Booking {
  private constructor(private props: BookingProps) {
    this.validate();
  }

  static create(data: {
    userId: string;
    experienceId: string;
    timeSlotId: string;
    guestCount: GuestCount;
    totalPrice: Money;
    specialRequests?: string;
  }): Booking {
    return new Booking({
      ...data,
      id: '', // Will be set by repository
      status: BookingStatus.pendingPayment(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: Omit<BookingProps, 'status' | 'guestCount' | 'totalPrice'> & {
    status: string;
    guestCount: number;
    totalPrice: number;
    capacity: number;
  }): Booking {
    return new Booking({
      ...props,
      status: BookingStatus.create(props.status),
      guestCount: GuestCount.create(props.guestCount, props.capacity),
      totalPrice: Money.create(props.totalPrice),
    });
  }

  private validate(): void {
    if (!this.props.userId) {
      throw new DomainError('Booking must have a userId');
    }
    if (!this.props.experienceId) {
      throw new DomainError('Booking must have an experienceId');
    }
    if (!this.props.timeSlotId) {
      throw new DomainError('Booking must have a timeSlotId');
    }
  }

  // State transitions
  confirm(): void {
    if (!this.props.status.canBeConfirmed()) {
      throw new DomainError(
        `Cannot confirm booking in ${this.props.status.toString()} status`
      );
    }
    this.props.status = BookingStatus.confirmed();
    this.props.confirmedAt = new Date();
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (!this.props.status.canBeCancelled()) {
      throw new DomainError(
        `Cannot cancel booking in ${this.props.status.toString()} status`
      );
    }
    this.props.status = BookingStatus.cancelled();
    this.props.cancelledAt = new Date();
    this.props.updatedAt = new Date();
  }

  complete(): void {
    if (!this.props.status.canBeCompleted()) {
      throw new DomainError(
        `Cannot complete booking in ${this.props.status.toString()} status`
      );
    }
    this.props.status = BookingStatus.completed();
    this.props.updatedAt = new Date();
  }

  markPaymentFailed(): void {
    this.props.status = BookingStatus.paymentFailed();
    this.props.updatedAt = new Date();
  }

  markPending(): void {
    this.props.status = BookingStatus.pending();
    this.props.updatedAt = new Date();
  }

  attachPaymentIntent(paymentIntentId: string): void {
    this.props.stripePaymentId = paymentIntentId;
    this.props.updatedAt = new Date();
  }

  // Business rules
  canBeCancelled(): boolean {
    return this.props.status.canBeCancelled();
  }

  canBeConfirmed(): boolean {
    return this.props.status.canBeConfirmed();
  }

  canBeCompleted(): boolean {
    return this.props.status.canBeCompleted();
  }

  isConfirmed(): boolean {
    return this.props.status.isConfirmed();
  }

  isPending(): boolean {
    return this.props.status.isPending() || this.props.status.isPendingPayment();
  }

  requiresRefund(): boolean {
    return this.props.status.isConfirmed() && !!this.props.stripePaymentId;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get experienceId(): string {
    return this.props.experienceId;
  }

  get timeSlotId(): string {
    return this.props.timeSlotId;
  }

  get status(): BookingStatus {
    return this.props.status;
  }

  get guestCount(): GuestCount {
    return this.props.guestCount;
  }

  get totalPrice(): Money {
    return this.props.totalPrice;
  }

  get stripePaymentId(): string | undefined {
    return this.props.stripePaymentId;
  }

  get confirmedAt(): Date | undefined {
    return this.props.confirmedAt;
  }

  get cancelledAt(): Date | undefined {
    return this.props.cancelledAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  toJSON() {
    return {
      ...this.props,
      status: this.props.status.toString(),
      guestCount: this.props.guestCount.value,
      totalPrice: this.props.totalPrice.amount,
    };
  }
}
