import { DomainError } from '../../shared/errors/DomainError.js';

export class Stock {
  private constructor(public readonly quantity: number) {
    if (quantity < 0) {
      throw new DomainError('Stock quantity cannot be negative');
    }
  }

  static create(quantity: number): Stock {
    return new Stock(quantity);
  }

  reserve(amount: number): Stock {
    if (amount > this.quantity) {
      throw new DomainError(
        `Cannot reserve ${amount} units. Only ${this.quantity} available.`
      );
    }
    return new Stock(this.quantity - amount);
  }

  release(amount: number): Stock {
    return new Stock(this.quantity + amount);
  }

  isAvailable(amount: number): boolean {
    return this.quantity >= amount;
  }

  isEmpty(): boolean {
    return this.quantity === 0;
  }

  equals(other: Stock): boolean {
    return this.quantity === other.quantity;
  }
}
