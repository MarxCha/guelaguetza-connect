import { Money } from '../../booking/value-objects/Money.js';
import { OrderStatus, OrderStatusEnum } from '../value-objects/OrderStatus.js';
import { DomainError } from '../../shared/errors/DomainError.js';

export interface OrderItemData {
  productId: string;
  quantity: number;
  price: Money;
}

export interface OrderProps {
  id: string;
  userId: string;
  sellerId: string;
  status: OrderStatus;
  total: Money;
  shippingAddress: any;
  stripePaymentId?: string;
  items: OrderItemData[];
  createdAt: Date;
  updatedAt: Date;
}

export class Order {
  private constructor(private props: OrderProps) {
    this.validate();
  }

  static create(data: {
    userId: string;
    sellerId: string;
    items: OrderItemData[];
    shippingAddress: any;
  }): Order {
    // Calculate total from items
    const total = data.items.reduce(
      (sum, item) => sum.add(item.price.multiply(item.quantity)),
      Money.create(0)
    );

    return new Order({
      ...data,
      id: '', // Will be set by repository
      status: OrderStatus.pendingPayment(),
      total,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: Omit<OrderProps, 'status' | 'total' | 'items'> & {
    status: string;
    total: number;
    items: Array<{ productId: string; quantity: number; price: number }>;
  }): Order {
    return new Order({
      ...props,
      status: OrderStatus.create(props.status),
      total: Money.create(props.total),
      items: props.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        price: Money.create(item.price),
      })),
    });
  }

  private validate(): void {
    if (this.props.items.length === 0) {
      throw new DomainError('Order must have at least one item');
    }

    if (!this.props.userId) {
      throw new DomainError('Order must have a userId');
    }

    if (!this.props.sellerId) {
      throw new DomainError('Order must have a sellerId');
    }
  }

  // State transitions
  markPending(): void {
    this.props.status = OrderStatus.pending();
    this.props.updatedAt = new Date();
  }

  markPaid(): void {
    this.props.status = OrderStatus.paid();
    this.props.updatedAt = new Date();
  }

  process(): void {
    if (!this.props.status.canBeProcessed()) {
      throw new DomainError(
        `Cannot process order in ${this.props.status.toString()} status`
      );
    }
    this.props.status = OrderStatus.processing();
    this.props.updatedAt = new Date();
  }

  ship(): void {
    if (!this.props.status.canBeShipped()) {
      throw new DomainError(
        `Cannot ship order in ${this.props.status.toString()} status`
      );
    }
    this.props.status = OrderStatus.shipped();
    this.props.updatedAt = new Date();
  }

  deliver(): void {
    if (!this.props.status.canBeDelivered()) {
      throw new DomainError(
        `Cannot deliver order in ${this.props.status.toString()} status`
      );
    }
    this.props.status = OrderStatus.delivered();
    this.props.updatedAt = new Date();
  }

  cancel(): void {
    if (!this.props.status.canBeCancelled()) {
      throw new DomainError(
        `Cannot cancel order in ${this.props.status.toString()} status`
      );
    }
    this.props.status = OrderStatus.cancelled();
    this.props.updatedAt = new Date();
  }

  markPaymentFailed(): void {
    this.props.status = OrderStatus.create(OrderStatusEnum.PAYMENT_FAILED);
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

  requiresRefund(): boolean {
    return this.props.status.isPaid() && !!this.props.stripePaymentId;
  }

  isOwnedBy(userId: string): boolean {
    return this.props.userId === userId;
  }

  belongsToSeller(sellerId: string): boolean {
    return this.props.sellerId === sellerId;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get userId(): string {
    return this.props.userId;
  }

  get sellerId(): string {
    return this.props.sellerId;
  }

  get status(): OrderStatus {
    return this.props.status;
  }

  get total(): Money {
    return this.props.total;
  }

  get items(): OrderItemData[] {
    return [...this.props.items];
  }

  get stripePaymentId(): string | undefined {
    return this.props.stripePaymentId;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  toJSON() {
    return {
      ...this.props,
      status: this.props.status.toString(),
      total: this.props.total.amount,
      items: this.props.items.map(item => ({
        ...item,
        price: item.price.amount,
      })),
    };
  }
}
