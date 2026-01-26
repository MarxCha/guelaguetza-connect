import { describe, it, expect } from 'vitest';
import { Experience } from './Experience.js';
import { Money } from '../value-objects/Money.js';
import { DomainError } from '../../shared/errors/DomainError.js';

describe('Experience Entity', () => {
  const createValidExperience = () => {
    return Experience.create({
      hostId: 'host-123',
      title: 'Taller de Cerámica Oaxaqueña',
      description: 'Aprende las técnicas tradicionales de cerámica de barro negro',
      images: ['image1.jpg', 'image2.jpg'],
      category: 'TALLER',
      price: Money.create(500),
      duration: 120,
      maxCapacity: 8,
      location: 'San Bartolo Coyotepec, Oaxaca',
      includes: ['Materiales', 'Refrigerio'],
      languages: ['Español', 'Zapoteco'],
      isActive: true,
    });
  };

  describe('creation', () => {
    it('should create experience with valid data', () => {
      const experience = createValidExperience();

      expect(experience.hostId).toBe('host-123');
      expect(experience.title).toBe('Taller de Cerámica Oaxaqueña');
      expect(experience.maxCapacity).toBe(8);
      expect(experience.isActive).toBe(true);
      expect(experience.rating).toBe(0);
      expect(experience.reviewCount).toBe(0);
    });

    it('should throw error for title less than 3 characters', () => {
      expect(() =>
        Experience.create({
          hostId: 'host-123',
          title: 'ab',
          description: 'Valid description here',
          images: [],
          category: 'TALLER',
          price: Money.create(500),
          duration: 120,
          maxCapacity: 8,
          location: 'Oaxaca',
          includes: [],
          languages: [],
          isActive: true,
        })
      ).toThrow(DomainError);
      expect(() =>
        Experience.create({
          hostId: 'host-123',
          title: 'ab',
          description: 'Valid description here',
          images: [],
          category: 'TALLER',
          price: Money.create(500),
          duration: 120,
          maxCapacity: 8,
          location: 'Oaxaca',
          includes: [],
          languages: [],
          isActive: true,
        })
      ).toThrow(/title must be at least 3 characters/);
    });

    it('should throw error for description less than 10 characters', () => {
      expect(() =>
        Experience.create({
          hostId: 'host-123',
          title: 'Valid Title',
          description: 'short',
          images: [],
          category: 'TALLER',
          price: Money.create(500),
          duration: 120,
          maxCapacity: 8,
          location: 'Oaxaca',
          includes: [],
          languages: [],
          isActive: true,
        })
      ).toThrow(DomainError);
      expect(() =>
        Experience.create({
          hostId: 'host-123',
          title: 'Valid Title',
          description: 'short',
          images: [],
          category: 'TALLER',
          price: Money.create(500),
          duration: 120,
          maxCapacity: 8,
          location: 'Oaxaca',
          includes: [],
          languages: [],
          isActive: true,
        })
      ).toThrow(/description must be at least 10 characters/);
    });

    it('should throw error for duration less than 15 minutes', () => {
      expect(() =>
        Experience.create({
          hostId: 'host-123',
          title: 'Valid Title',
          description: 'Valid description here',
          images: [],
          category: 'TALLER',
          price: Money.create(500),
          duration: 10,
          maxCapacity: 8,
          location: 'Oaxaca',
          includes: [],
          languages: [],
          isActive: true,
        })
      ).toThrow(DomainError);
      expect(() =>
        Experience.create({
          hostId: 'host-123',
          title: 'Valid Title',
          description: 'Valid description here',
          images: [],
          category: 'TALLER',
          price: Money.create(500),
          duration: 10,
          maxCapacity: 8,
          location: 'Oaxaca',
          includes: [],
          languages: [],
          isActive: true,
        })
      ).toThrow(/duration must be at least 15 minutes/);
    });

    it('should throw error for capacity less than 1', () => {
      expect(() =>
        Experience.create({
          hostId: 'host-123',
          title: 'Valid Title',
          description: 'Valid description here',
          images: [],
          category: 'TALLER',
          price: Money.create(500),
          duration: 120,
          maxCapacity: 0,
          location: 'Oaxaca',
          includes: [],
          languages: [],
          isActive: true,
        })
      ).toThrow(DomainError);
      expect(() =>
        Experience.create({
          hostId: 'host-123',
          title: 'Valid Title',
          description: 'Valid description here',
          images: [],
          category: 'TALLER',
          price: Money.create(500),
          duration: 120,
          maxCapacity: 0,
          location: 'Oaxaca',
          includes: [],
          languages: [],
          isActive: true,
        })
      ).toThrow(/capacity must be at least 1/);
    });
  });

  describe('activate/deactivate', () => {
    it('should deactivate experience', () => {
      const experience = createValidExperience();
      expect(experience.isActive).toBe(true);

      experience.deactivate();

      expect(experience.isActive).toBe(false);
    });

    it('should activate experience', () => {
      const experience = createValidExperience();
      experience.deactivate();
      expect(experience.isActive).toBe(false);

      experience.activate();

      expect(experience.isActive).toBe(true);
    });
  });

  describe('rating', () => {
    it('should update rating correctly', () => {
      const experience = createValidExperience();

      experience.updateRating(4.5, 10);

      expect(experience.rating).toBe(4.5);
      expect(experience.reviewCount).toBe(10);
    });

    it('should throw error for rating less than 0', () => {
      const experience = createValidExperience();

      expect(() => experience.updateRating(-1, 5)).toThrow(DomainError);
      expect(() => experience.updateRating(-1, 5)).toThrow(/Rating must be between 0 and 5/);
    });

    it('should throw error for rating greater than 5', () => {
      const experience = createValidExperience();

      expect(() => experience.updateRating(6, 5)).toThrow(DomainError);
    });

    it('should throw error for invalid rating on creation via reconstitute', () => {
      expect(() =>
        Experience.reconstitute({
          id: 'exp-123',
          hostId: 'host-123',
          title: 'Valid Title',
          description: 'Valid description here',
          images: [],
          category: 'TALLER',
          price: Money.create(500),
          duration: 120,
          maxCapacity: 8,
          location: 'Oaxaca',
          includes: [],
          languages: [],
          isActive: true,
          rating: 6, // Invalid
          reviewCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
      ).toThrow(DomainError);
    });
  });

  describe('ownership', () => {
    it('should check ownership correctly', () => {
      const experience = createValidExperience();

      expect(experience.isOwnedBy('host-123')).toBe(true);
      expect(experience.isOwnedBy('host-999')).toBe(false);
    });
  });

  describe('serialization', () => {
    it('should serialize to JSON correctly', () => {
      const experience = createValidExperience();

      const json = experience.toJSON();

      expect(json.hostId).toBe('host-123');
      expect(json.title).toBe('Taller de Cerámica Oaxaqueña');
      expect(json.price).toBe(500);
      expect(json.maxCapacity).toBe(8);
    });
  });

  describe('reconstitution', () => {
    it('should reconstitute experience from persistence data', () => {
      const experience = Experience.reconstitute({
        id: 'exp-123',
        hostId: 'host-456',
        title: 'Mezcal Tasting Tour',
        description: 'Discover the flavors of traditional mezcal',
        imageUrl: 'main.jpg',
        images: ['img1.jpg'],
        category: 'DEGUSTACION',
        price: Money.create(800),
        duration: 180,
        maxCapacity: 12,
        location: 'Santiago Matatlán',
        latitude: 16.85,
        longitude: -96.37,
        includes: ['Degustación', 'Transporte'],
        languages: ['Español', 'English'],
        isActive: true,
        rating: 4.8,
        reviewCount: 25,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15'),
      });

      expect(experience.id).toBe('exp-123');
      expect(experience.hostId).toBe('host-456');
      expect(experience.title).toBe('Mezcal Tasting Tour');
      expect(experience.rating).toBe(4.8);
      expect(experience.reviewCount).toBe(25);
      expect(experience.price.amount).toBe(800);
    });
  });
});
