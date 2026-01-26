export enum OrderStatusEnum {
  PENDING_PAYMENT = 'PENDING_PAYMENT',
  PENDING = 'PENDING',
  PAYMENT_FAILED = 'PAYMENT_FAILED',
  PAID = 'PAID',
  PROCESSING = 'PROCESSING',
  SHIPPED = 'SHIPPED',
  DELIVERED = 'DELIVERED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
}

export class OrderStatus {
  private constructor(public readonly value: OrderStatusEnum) {}

  static create(value: string): OrderStatus {
    if (!Object.values(OrderStatusEnum).includes(value as OrderStatusEnum)) {
      throw new Error(`Invalid order status: ${value}`);
    }
    return new OrderStatus(value as OrderStatusEnum);
  }

  static pendingPayment(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.PENDING_PAYMENT);
  }

  static pending(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.PENDING);
  }

  static paid(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.PAID);
  }

  static processing(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.PROCESSING);
  }

  static shipped(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.SHIPPED);
  }

  static delivered(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.DELIVERED);
  }

  static cancelled(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.CANCELLED);
  }

  static refunded(): OrderStatus {
    return new OrderStatus(OrderStatusEnum.REFUNDED);
  }

  isPendingPayment(): boolean {
    return this.value === OrderStatusEnum.PENDING_PAYMENT;
  }

  isPending(): boolean {
    return this.value === OrderStatusEnum.PENDING;
  }

  isPaid(): boolean {
    return this.value === OrderStatusEnum.PAID;
  }

  isProcessing(): boolean {
    return this.value === OrderStatusEnum.PROCESSING;
  }

  isShipped(): boolean {
    return this.value === OrderStatusEnum.SHIPPED;
  }

  isDelivered(): boolean {
    return this.value === OrderStatusEnum.DELIVERED;
  }

  isCancelled(): boolean {
    return this.value === OrderStatusEnum.CANCELLED;
  }

  isRefunded(): boolean {
    return this.value === OrderStatusEnum.REFUNDED;
  }

  canBeProcessed(): boolean {
    return this.isPaid();
  }

  canBeShipped(): boolean {
    return this.isProcessing();
  }

  canBeDelivered(): boolean {
    return this.isShipped();
  }

  canBeCancelled(): boolean {
    return this.isPendingPayment() || this.isPending() || this.isPaid();
  }

  equals(other: OrderStatus): boolean {
    return this.value === other.value;
  }

  toString(): string {
    return this.value;
  }
}
