export class GuestCount {
  private constructor(
    public readonly value: number,
    private readonly capacity: number
  ) {
    if (value < 1) {
      throw new Error('Guest count must be at least 1');
    }
    if (value > capacity) {
      throw new Error(`Guest count (${value}) exceeds capacity (${capacity})`);
    }
  }

  static create(value: number, capacity: number): GuestCount {
    return new GuestCount(value, capacity);
  }

  canFitInCapacity(availableSpots: number): boolean {
    return this.value <= availableSpots;
  }

  equals(other: GuestCount): boolean {
    return this.value === other.value;
  }

  greaterThan(other: GuestCount): boolean {
    return this.value > other.value;
  }
}
