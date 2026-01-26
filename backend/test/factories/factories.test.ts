/**
 * Tests unitarios para las Factory Functions
 *
 * Estos tests validan que las factories generen datos correctos
 * sin necesidad de base de datos.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  createUser,
  createAdmin,
  createModerator,
  createUserWithProfile,
  createManyUsers,
  resetUserCounter,
} from './user.factory';
import {
  createStory,
  createImageStory,
  createVideoStory,
  createStoriesForUser,
  resetStoryCounter,
} from './story.factory';
import {
  createProduct,
  createDraftProduct,
  createSoldOutProduct,
  createProductsByCategory,
  resetProductCounter,
} from './product.factory';
import {
  createOrder,
  createPendingOrder,
  createPaidOrder,
  resetOrderCounter,
} from './order.factory';
import {
  createExperience,
  createPopularExperience,
  resetExperienceCounter,
} from './experience.factory';
import {
  createTimeSlot,
  createAvailableTimeSlot,
  createFullTimeSlot,
  createTimeSlotsForDateRange,
  resetTimeSlotCounter,
} from './timeslot.factory';
import {
  createBooking,
  createConfirmedBooking,
  createCancelledBooking,
  resetBookingCounter,
} from './booking.factory';

describe('UserFactory', () => {
  beforeEach(() => {
    resetUserCounter();
  });

  it('debe crear un usuario básico con campos correctos', () => {
    const user = createUser();

    expect(user.id).toBeDefined();
    expect(user.email).toContain('@example.com');
    expect(user.nombre).toBeDefined();
    expect(user.role).toBe('USER');
    expect(user.isPublic).toBe(true);
  });

  it('debe permitir override de campos', () => {
    const user = createUser({
      email: 'test@test.com',
      nombre: 'TestName',
      role: 'ADMIN',
    });

    expect(user.email).toBe('test@test.com');
    expect(user.nombre).toBe('TestName');
    expect(user.role).toBe('ADMIN');
  });

  it('debe crear un administrador', () => {
    const admin = createAdmin();

    expect(admin.role).toBe('ADMIN');
    expect(admin.nombre).toBe('Admin');
  });

  it('debe crear un moderador', () => {
    const mod = createModerator();

    expect(mod.role).toBe('MODERATOR');
  });

  it('debe crear usuario con perfil completo', () => {
    const user = createUserWithProfile();

    expect(user.bio).toBeDefined();
    expect(user.region).toBeDefined();
    expect(user.avatar).toBeDefined();
  });

  it('debe crear múltiples usuarios', () => {
    const users = createManyUsers(5);

    expect(users).toHaveLength(5);
    expect(users[0].email).not.toBe(users[1].email);
  });

  it('debe hashear el password', () => {
    const user = createUser();

    expect(user.password).toBeDefined();
    expect(user.password).not.toBe('password123');
    expect(user.password.startsWith('$2')).toBe(true); // bcrypt hash
  });
});

describe('StoryFactory', () => {
  beforeEach(() => {
    resetStoryCounter();
  });

  it('debe crear una historia básica', () => {
    const story = createStory();

    expect(story.id).toBeDefined();
    expect(story.description).toBeDefined();
    expect(story.mediaUrl).toBeDefined();
    expect(story.location).toBeDefined();
    expect(story.userId).toBeDefined();
  });

  it('debe crear historia de imagen', () => {
    const story = createImageStory();

    expect(story.mediaType).toBe('IMAGE');
    expect(story.duration).toBeNull();
    expect(story.thumbnailUrl).toBeNull();
  });

  it('debe crear historia de video', () => {
    const story = createVideoStory();

    expect(story.mediaType).toBe('VIDEO');
    expect(story.duration).toBeGreaterThan(0);
    expect(story.thumbnailUrl).toBeDefined();
  });

  it('debe crear historias para un usuario', () => {
    const stories = createStoriesForUser('user-123', 3);

    expect(stories).toHaveLength(3);
    expect(stories.every(s => s.userId === 'user-123')).toBe(true);
  });
});

describe('ProductFactory', () => {
  beforeEach(() => {
    resetProductCounter();
  });

  it('debe crear un producto básico', () => {
    const product = createProduct();

    expect(product.id).toBeDefined();
    expect(product.name).toBeDefined();
    expect(product.description).toBeDefined();
    expect(product.price).toBeDefined();
    expect(product.category).toBeDefined();
    expect(product.status).toBe('ACTIVE');
    expect(product.stock).toBeGreaterThan(0);
    expect(product.images).toHaveLength(3);
  });

  it('debe crear producto en borrador', () => {
    const product = createDraftProduct();

    expect(product.status).toBe('DRAFT');
  });

  it('debe crear producto agotado', () => {
    const product = createSoldOutProduct();

    expect(product.status).toBe('SOLD_OUT');
    expect(product.stock).toBe(0);
  });

  it('debe crear productos por categoría', () => {
    const products = createProductsByCategory('MEZCAL', 3);

    expect(products).toHaveLength(3);
    expect(products.every(p => p.category === 'MEZCAL')).toBe(true);
  });
});

describe('OrderFactory', () => {
  beforeEach(() => {
    resetOrderCounter();
  });

  it('debe crear una orden básica', () => {
    const order = createOrder();

    expect(order.id).toBeDefined();
    expect(order.userId).toBeDefined();
    expect(order.sellerId).toBeDefined();
    expect(order.status).toBe('PENDING');
    expect(order.total).toBeDefined();
    expect(order.shippingAddress).toBeDefined();
  });

  it('debe crear orden pendiente sin payment ID', () => {
    const order = createPendingOrder();

    expect(order.status).toBe('PENDING');
    expect(order.stripePaymentId).toBeNull();
  });

  it('debe crear orden pagada con payment ID', () => {
    const order = createPaidOrder();

    expect(order.status).toBe('PAID');
    expect(order.stripePaymentId).toBeDefined();
    expect(order.stripePaymentId).toContain('pi_');
  });

  it('debe incluir dirección de envío válida', () => {
    const order = createOrder();

    expect(order.shippingAddress.calle).toBeDefined();
    expect(order.shippingAddress.ciudad).toBe('Oaxaca de Juárez');
    expect(order.shippingAddress.estado).toBe('Oaxaca');
  });
});

describe('ExperienceFactory', () => {
  beforeEach(() => {
    resetExperienceCounter();
  });

  it('debe crear una experiencia básica', () => {
    const experience = createExperience();

    expect(experience.id).toBeDefined();
    expect(experience.hostId).toBeDefined();
    expect(experience.title).toBeDefined();
    expect(experience.description).toBeDefined();
    expect(experience.category).toBeDefined();
    expect(experience.price).toBeDefined();
    expect(experience.duration).toBeGreaterThan(0);
    expect(experience.maxCapacity).toBeGreaterThan(0);
    expect(experience.location).toBeDefined();
    expect(experience.includes).toBeInstanceOf(Array);
    expect(experience.languages).toBeInstanceOf(Array);
    expect(experience.isActive).toBe(true);
  });

  it('debe crear experiencia popular con alta calificación', () => {
    const experience = createPopularExperience();

    expect(experience.rating).toBeGreaterThanOrEqual(4.5);
    expect(experience.reviewCount).toBeGreaterThanOrEqual(100);
  });
});

describe('TimeSlotFactory', () => {
  beforeEach(() => {
    resetTimeSlotCounter();
  });

  it('debe crear un time slot básico', () => {
    const slot = createTimeSlot();

    expect(slot.id).toBeDefined();
    expect(slot.experienceId).toBeDefined();
    expect(slot.date).toBeInstanceOf(Date);
    expect(slot.startTime).toMatch(/\d{2}:\d{2}/);
    expect(slot.endTime).toMatch(/\d{2}:\d{2}/);
    expect(slot.capacity).toBeGreaterThan(0);
    expect(slot.bookedCount).toBeGreaterThanOrEqual(0);
  });

  it('debe crear time slot disponible', () => {
    const slot = createAvailableTimeSlot();

    expect(slot.isAvailable).toBe(true);
    expect(slot.bookedCount).toBeLessThan(slot.capacity);
  });

  it('debe crear time slot lleno', () => {
    const slot = createFullTimeSlot();

    expect(slot.isAvailable).toBe(false);
    expect(slot.bookedCount).toBe(slot.capacity);
  });

  it('debe crear time slots para rango de fechas', () => {
    const startDate = new Date('2026-07-20');
    const slots = createTimeSlotsForDateRange(startDate, 3, 2);

    expect(slots).toHaveLength(6); // 3 días * 2 slots
  });
});

describe('BookingFactory', () => {
  beforeEach(() => {
    resetBookingCounter();
  });

  it('debe crear una reserva básica', () => {
    const booking = createBooking();

    expect(booking.id).toBeDefined();
    expect(booking.userId).toBeDefined();
    expect(booking.experienceId).toBeDefined();
    expect(booking.timeSlotId).toBeDefined();
    expect(booking.status).toBe('PENDING');
    expect(booking.guestCount).toBeGreaterThan(0);
    expect(booking.totalPrice).toBeDefined();
  });

  it('debe crear reserva confirmada', () => {
    const booking = createConfirmedBooking();

    expect(booking.status).toBe('CONFIRMED');
    expect(booking.stripePaymentId).toBeDefined();
    expect(booking.confirmedAt).toBeInstanceOf(Date);
    expect(booking.cancelledAt).toBeNull();
  });

  it('debe crear reserva cancelada', () => {
    const booking = createCancelledBooking();

    expect(booking.status).toBe('CANCELLED');
    expect(booking.cancelledAt).toBeInstanceOf(Date);
  });

  it('debe calcular precio total basado en invitados', () => {
    const booking = createBooking({ guestCount: 3 });

    expect(booking.guestCount).toBe(3);
    expect(Number(booking.totalPrice)).toBeGreaterThan(0);
  });
});

describe('Factory Counters', () => {
  it('debe generar IDs únicos incrementales', () => {
    resetUserCounter();

    const user1 = createUser();
    const user2 = createUser();

    expect(user1.id).not.toBe(user2.id);
  });

  it('debe resetear contadores correctamente', () => {
    createUser();
    createUser();
    resetUserCounter();

    const user = createUser();

    expect(user.id).toContain('user-0-');
  });
});
