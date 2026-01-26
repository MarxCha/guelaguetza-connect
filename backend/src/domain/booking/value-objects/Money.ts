import { Decimal } from '@prisma/client/runtime/library';

export class Money {
  private constructor(
    public readonly amount: number,
    public readonly currency: string = 'MXN'
  ) {
    if (amount < 0) {
      throw new Error('Money amount cannot be negative');
    }
  }

  static create(amount: number, currency: string = 'MXN'): Money {
    return new Money(amount, currency);
  }

  static fromDecimal(decimal: Decimal, currency: string = 'MXN'): Money {
    return new Money(Number(decimal), currency);
  }

  toDecimal(): Decimal {
    return new Decimal(this.amount);
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    return new Money(this.amount + other.amount, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const result = this.amount - other.amount;
    if (result < 0) {
      throw new Error('Subtraction would result in negative money');
    }
    return new Money(result, this.currency);
  }

  multiply(factor: number): Money {
    if (factor < 0) {
      throw new Error('Cannot multiply money by negative factor');
    }
    return new Money(this.amount * factor, this.currency);
  }

  equals(other: Money): boolean {
    return this.amount === other.amount && this.currency === other.currency;
  }

  greaterThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount > other.amount;
  }

  lessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.amount < other.amount;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Cannot operate on different currencies: ${this.currency} and ${other.currency}`);
    }
  }
}
