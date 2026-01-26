import { Money } from '../../booking/value-objects/Money.js';
import { Stock } from '../value-objects/Stock.js';
import { DomainError } from '../../shared/errors/DomainError.js';

export interface ProductProps {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  price: Money;
  category: string;
  status: string;
  stock: Stock;
  images: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Product {
  private constructor(private props: ProductProps) {
    this.validate();
  }

  static create(
    props: Omit<ProductProps, 'id' | 'version' | 'createdAt' | 'updatedAt'>
  ): Product {
    return new Product({
      ...props,
      id: '', // Will be set by repository
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: Omit<ProductProps, 'price' | 'stock'> & {
    price: number;
    stock: number;
  }): Product {
    return new Product({
      ...props,
      price: Money.create(props.price),
      stock: Stock.create(props.stock),
    });
  }

  private validate(): void {
    if (!this.props.name || this.props.name.trim().length < 3) {
      throw new DomainError('Product name must be at least 3 characters');
    }

    if (!this.props.description || this.props.description.trim().length < 10) {
      throw new DomainError('Product description must be at least 10 characters');
    }

    if (this.props.images.length === 0) {
      throw new DomainError('Product must have at least one image');
    }
  }

  reserveStock(quantity: number): void {
    if (this.props.status !== 'ACTIVE') {
      throw new DomainError('Cannot reserve stock for inactive product');
    }

    this.props.stock = this.props.stock.reserve(quantity);
    this.props.version += 1;
    this.props.updatedAt = new Date();

    if (this.props.stock.isEmpty()) {
      this.markSoldOut();
    }
  }

  releaseStock(quantity: number): void {
    this.props.stock = this.props.stock.release(quantity);
    this.props.version += 1;
    this.props.updatedAt = new Date();

    if (this.props.status === 'SOLD_OUT' && !this.props.stock.isEmpty()) {
      this.activate();
    }
  }

  hasAvailableStock(quantity: number): boolean {
    return this.props.stock.isAvailable(quantity);
  }

  activate(): void {
    this.props.status = 'ACTIVE';
    this.props.updatedAt = new Date();
  }

  markSoldOut(): void {
    this.props.status = 'SOLD_OUT';
    this.props.updatedAt = new Date();
  }

  archive(): void {
    this.props.status = 'ARCHIVED';
    this.props.updatedAt = new Date();
  }

  isOwnedBy(sellerId: string): boolean {
    return this.props.sellerId === sellerId;
  }

  isActive(): boolean {
    return this.props.status === 'ACTIVE';
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get sellerId(): string {
    return this.props.sellerId;
  }

  get name(): string {
    return this.props.name;
  }

  get description(): string {
    return this.props.description;
  }

  get price(): Money {
    return this.props.price;
  }

  get stock(): Stock {
    return this.props.stock;
  }

  get status(): string {
    return this.props.status;
  }

  get version(): number {
    return this.props.version;
  }

  get images(): string[] {
    return [...this.props.images];
  }

  toJSON() {
    return {
      ...this.props,
      price: this.props.price.amount,
      stock: this.props.stock.quantity,
    };
  }
}
