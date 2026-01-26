import { Money } from '../value-objects/Money.js';
import { DomainError } from '../../shared/errors/DomainError.js';

export interface ExperienceProps {
  id: string;
  hostId: string;
  title: string;
  description: string;
  imageUrl?: string;
  images: string[];
  category: string;
  price: Money;
  duration: number;
  maxCapacity: number;
  location: string;
  latitude?: number;
  longitude?: number;
  includes: string[];
  languages: string[];
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Experience {
  private constructor(private props: ExperienceProps) {
    this.validate();
  }

  static create(
    props: Omit<ExperienceProps, 'id' | 'rating' | 'reviewCount' | 'createdAt' | 'updatedAt'>
  ): Experience {
    return new Experience({
      ...props,
      id: '', // Will be set by repository
      rating: 0,
      reviewCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static reconstitute(props: ExperienceProps): Experience {
    return new Experience(props);
  }

  private validate(): void {
    if (!this.props.title || this.props.title.trim().length < 3) {
      throw new DomainError('Experience title must be at least 3 characters');
    }

    if (!this.props.description || this.props.description.trim().length < 10) {
      throw new DomainError('Experience description must be at least 10 characters');
    }

    if (this.props.duration < 15) {
      throw new DomainError('Experience duration must be at least 15 minutes');
    }

    if (this.props.maxCapacity < 1) {
      throw new DomainError('Experience capacity must be at least 1');
    }

    if (this.props.rating < 0 || this.props.rating > 5) {
      throw new DomainError('Experience rating must be between 0 and 5');
    }
  }

  deactivate(): void {
    this.props.isActive = false;
    this.props.updatedAt = new Date();
  }

  activate(): void {
    this.props.isActive = true;
    this.props.updatedAt = new Date();
  }

  updateRating(newRating: number, reviewCount: number): void {
    if (newRating < 0 || newRating > 5) {
      throw new DomainError('Rating must be between 0 and 5');
    }
    this.props.rating = newRating;
    this.props.reviewCount = reviewCount;
    this.props.updatedAt = new Date();
  }

  isOwnedBy(hostId: string): boolean {
    return this.props.hostId === hostId;
  }

  // Getters
  get id(): string {
    return this.props.id;
  }

  get hostId(): string {
    return this.props.hostId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get price(): Money {
    return this.props.price;
  }

  get maxCapacity(): number {
    return this.props.maxCapacity;
  }

  get isActive(): boolean {
    return this.props.isActive;
  }

  get rating(): number {
    return this.props.rating;
  }

  get reviewCount(): number {
    return this.props.reviewCount;
  }

  toJSON() {
    return {
      ...this.props,
      price: this.props.price.amount,
    };
  }
}
