export enum BookingStatusEnum {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING = 'PENDING',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  CONFIRMED = 'CONFIRMED',
  CANCELLED = 'CANCELLED',
  COMPLETED = 'COMPLETED',
}

export class BookingStatus {
  private constructor(public readonly value: BookingStatusEnum) {}

  static create(value: string): BookingStatus {
    if (!Object.values(BookingStatusEnum).includes(value as BookingStatusEnum)) {
      throw new Error(`Invalid booking status: ${value}`);
    }
    return new BookingStatus(value as BookingStatusEnum);
  }

  static pendingPayment(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.PENDING_PAYMENT);
  }

  static pending(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.PENDING);
  }

  static confirmed(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.CONFIRMED);
  }

  static cancelled(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.CANCELLED);
  }

  static completed(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.COMPLETED);
  }

  static paymentFailed(): BookingStatus {
    return new BookingStatus(BookingStatusEnum.PAYMENT_FAILED);
  }

  isPendingPayment(): boolean {
    return this.value === BookingStatusEnum.PENDING_PAYMENT;
  }

  isPending(): boolean {
    return this.value === BookingStatusEnum.PENDING;
  }

  isConfirmed(): boolean {
    return this.value === BookingStatusEnum.CONFIRMED;
  }

  isCancelled(): boolean {
    return this.value === BookingStatusEnum.CANCELLED;
  }

  isCompleted(): boolean {
    return this.value === BookingStatusEnum.COMPLETED;
  }

  isPaymentFailed(): boolean {
    return this.value === BookingStatusEnum.PAYMENT_FAILED;
  }

  canBeConfirmed(): boolean {
    return this.isPending() || this.isPendingPayment();
  }

  canBeCancelled(): boolean {
    return this.isPendingPayment() || this.isPending() || this.isConfirmed();
  }

  canBeCompleted(): boolean {
    return this.isConfirmed();
  }

  equals(other: BookingStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
