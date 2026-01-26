/**
 * Ejemplo de uso de Factory Functions en tests
 *
 * Este archivo muestra diferentes patrones y casos de uso de las factories.
 * NO es un test real - solo ejemplos de referencia.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../helpers';
import {
  // User factories
  createUser,
  createAdmin,
  createModerator,
  createUserWithProfile,
  createManyUsers,
  resetUserCounter,
  // Story factories
  createStory,
  createImageStory,
  createVideoStory,
  createStoriesForUser,
  resetStoryCounter,
  // Product factories
  createProduct,
  createProductsByCategory,
  createProductsForSeller,
  resetProductCounter,
  // Order factories
  createOrder,
  createPendingOrder,
  createPaidOrder,
  createOrdersForUser,
  resetOrderCounter,
  // Experience factories
  createExperience,
  createPopularExperience,
  createExperiencesForHost,
  resetExperienceCounter,
  // TimeSlot factories
  createTimeSlot,
  createTimeSlotsForExperience,
  createTimeSlotsForDateRange,
  resetTimeSlotCounter,
  // Booking factories
  createBooking,
  createConfirmedBooking,
  createBookingsForUser,
  resetBookingCounter,
} from './index';

// NOTA: Estos tests requieren base de datos real (Sprint 1.4)
// Se habilitarán después de configurar docker-compose.test.yml
describe.skip('Factory Functions - Ejemplos de Uso (Integration)', () => {
  beforeEach(async () => {
    // Limpiar base de datos antes de cada test
    await prisma.$transaction([
      prisma.booking.deleteMany(),
      prisma.experienceTimeSlot.deleteMany(),
      prisma.experience.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.product.deleteMany(),
      prisma.sellerProfile.deleteMany(),
      prisma.story.deleteMany(),
      prisma.user.deleteMany(),
    ]);

    // Resetear contadores
    resetUserCounter();
    resetStoryCounter();
    resetProductCounter();
    resetOrderCounter();
    resetExperienceCounter();
    resetTimeSlotCounter();
    resetBookingCounter();
  });

  describe('Ejemplo 1: Crear usuarios básicos', () => {
    it('debe crear diferentes tipos de usuarios', async () => {
      // Usuario regular
      const regularUser = createUser();

      // Usuario con datos específicos
      const specificUser = createUser({
        email: 'maria@example.com',
        nombre: 'María',
        apellido: 'García',
        region: 'Valles Centrales',
      });

      // Usuario administrador
      const admin = createAdmin({
        email: 'admin@guelaguetza.com',
      });

      // Crear en base de datos
      await prisma.user.createMany({
        data: [regularUser, specificUser, admin],
      });

      // Verificar
      const users = await prisma.user.findMany();
      expect(users).toHaveLength(3);
      expect(users.find(u => u.role === 'ADMIN')).toBeDefined();
    });

    it('debe crear múltiples usuarios de una vez', async () => {
      const users = createManyUsers(10);

      await prisma.user.createMany({ data: users });

      const count = await prisma.user.count();
      expect(count).toBe(10);
    });
  });

  describe('Ejemplo 2: Crear historias con relaciones', () => {
    it('debe crear historias para un usuario específico', async () => {
      // Crear usuario primero
      const user = createUser({ nombre: 'Carlos' });
      await prisma.user.create({ data: user });

      // Crear historias para este usuario
      const stories = createStoriesForUser(user.id, 5);
      await prisma.story.createMany({ data: stories });

      // Verificar
      const userStories = await prisma.story.findMany({
        where: { userId: user.id },
      });
      expect(userStories).toHaveLength(5);
    });

    it('debe crear diferentes tipos de historias', async () => {
      const user = createUser();
      await prisma.user.create({ data: user });

      // Historia de imagen
      const imageStory = createImageStory({
        userId: user.id,
        description: 'Hermoso atardecer en Monte Albán',
      });

      // Historia de video
      const videoStory = createVideoStory({
        userId: user.id,
        description: 'Danza de la pluma en vivo',
        duration: 45,
      });

      await prisma.story.createMany({
        data: [imageStory, videoStory],
      });

      const stories = await prisma.story.findMany({
        where: { userId: user.id },
      });

      expect(stories.find(s => s.mediaType === 'IMAGE')).toBeDefined();
      expect(stories.find(s => s.mediaType === 'VIDEO')).toBeDefined();
    });
  });

  describe('Ejemplo 3: Marketplace - Productos y Órdenes', () => {
    it('debe crear un flujo completo de compra', async () => {
      // 1. Crear vendedor
      const seller = createUser({ nombre: 'Artesano' });
      await prisma.user.create({ data: seller });

      const sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: seller.id,
          businessName: 'Artesanías Oaxaqueñas',
          description: 'Alebrijes y barro negro',
          verified: true,
        },
      });

      // 2. Crear productos del vendedor
      const products = createProductsForSeller(sellerProfile.id, 5, {
        category: 'ARTESANIA',
      });
      await prisma.product.createMany({ data: products });

      // 3. Crear cliente
      const customer = createUser({ nombre: 'Cliente' });
      await prisma.user.create({ data: customer });

      // 4. Crear orden
      const order = createPaidOrder({
        userId: customer.id,
        sellerId: sellerProfile.id,
        total: 1500,
      });
      await prisma.order.create({ data: order });

      // Verificar
      const orders = await prisma.order.findMany({
        where: { userId: customer.id },
        include: { seller: true },
      });

      expect(orders).toHaveLength(1);
      expect(orders[0].status).toBe('PAID');
      expect(orders[0].seller.businessName).toBe('Artesanías Oaxaqueñas');
    });

    it('debe crear productos por categoría', async () => {
      const seller = createUser();
      await prisma.user.create({ data: seller });

      const sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: seller.id,
          businessName: 'Tienda de Mezcal',
        },
      });

      // Crear solo productos de mezcal
      const mezcales = createProductsByCategory('MEZCAL', 3, {
        sellerId: sellerProfile.id,
      });

      await prisma.product.createMany({ data: mezcales });

      const products = await prisma.product.findMany({
        where: { category: 'MEZCAL' },
      });

      expect(products).toHaveLength(3);
      expect(products.every(p => p.category === 'MEZCAL')).toBe(true);
    });
  });

  describe('Ejemplo 4: Sistema de Reservas Completo', () => {
    it('debe crear un flujo completo de reserva', async () => {
      // 1. Crear host
      const host = createUser({ nombre: 'Guía Turístico' });
      await prisma.user.create({ data: host });

      // 2. Crear experiencia
      const experience = createExperience({
        hostId: host.id,
        title: 'Tour por Monte Albán',
        category: 'TOUR',
        price: 650,
        maxCapacity: 10,
      });
      await prisma.experience.create({ data: experience });

      // 3. Crear horarios disponibles para los próximos 7 días
      const startDate = new Date();
      startDate.setDate(startDate.getDate() + 1); // Empezar mañana

      const timeSlots = createTimeSlotsForDateRange(
        startDate,
        7,  // 7 días
        2   // 2 horarios por día
      ).map(slot => ({
        ...slot,
        experienceId: experience.id,
      }));

      await prisma.experienceTimeSlot.createMany({ data: timeSlots });

      // 4. Crear clientes y reservas
      const customers = createManyUsers(3);
      await prisma.user.createMany({ data: customers });

      const slots = await prisma.experienceTimeSlot.findMany({
        where: { experienceId: experience.id },
        take: 3,
      });

      const bookings = customers.map((customer, index) =>
        createConfirmedBooking({
          userId: customer.id,
          experienceId: experience.id,
          timeSlotId: slots[index].id,
          guestCount: 2,
        })
      );

      await prisma.booking.createMany({ data: bookings });

      // Verificar
      const experienceBookings = await prisma.booking.findMany({
        where: { experienceId: experience.id },
        include: {
          user: true,
          experience: true,
          timeSlot: true,
        },
      });

      expect(experienceBookings).toHaveLength(3);
      expect(experienceBookings.every(b => b.status === 'CONFIRMED')).toBe(true);
    });

    it('debe crear experiencias populares con alta calificación', async () => {
      const host = createUser();
      await prisma.user.create({ data: host });

      const popularExperience = createPopularExperience({
        hostId: host.id,
        rating: 4.8,
        reviewCount: 150,
      });

      await prisma.experience.create({ data: popularExperience });

      const experiences = await prisma.experience.findMany({
        where: { rating: { gte: 4.5 } },
      });

      expect(experiences).toHaveLength(1);
      expect(experiences[0].rating).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Ejemplo 5: Datos en Bulk para Testing de Performance', () => {
    it('debe crear muchos datos rápidamente', async () => {
      // Crear 100 usuarios
      const users = createManyUsers(100);
      await prisma.user.createMany({ data: users });

      // Crear 10 vendedores con productos
      const sellers = users.slice(0, 10);
      const sellerProfiles = await Promise.all(
        sellers.map(seller =>
          prisma.sellerProfile.create({
            data: {
              userId: seller.id,
              businessName: `Tienda ${seller.nombre}`,
            },
          })
        )
      );

      // 50 productos por vendedor = 500 productos total
      for (const seller of sellerProfiles) {
        const products = createProductsForSeller(seller.id, 50);
        await prisma.product.createMany({ data: products });
      }

      // Verificar
      const productCount = await prisma.product.count();
      expect(productCount).toBe(500);
    });
  });

  describe('Ejemplo 6: Testing de Estados y Transiciones', () => {
    it('debe probar diferentes estados de órdenes', async () => {
      const user = createUser();
      await prisma.user.create({ data: user });

      const seller = createUser();
      await prisma.user.create({ data: seller });

      const sellerProfile = await prisma.sellerProfile.create({
        data: {
          userId: seller.id,
          businessName: 'Tienda Test',
        },
      });

      // Crear órdenes en diferentes estados
      const pendingOrder = createPendingOrder({
        userId: user.id,
        sellerId: sellerProfile.id,
      });

      const paidOrder = createPaidOrder({
        userId: user.id,
        sellerId: sellerProfile.id,
      });

      await prisma.order.createMany({
        data: [pendingOrder, paidOrder],
      });

      // Verificar diferentes estados
      const pending = await prisma.order.findFirst({
        where: { status: 'PENDING' },
      });
      expect(pending).toBeDefined();
      expect(pending?.stripePaymentId).toBeNull();

      const paid = await prisma.order.findFirst({
        where: { status: 'PAID' },
      });
      expect(paid).toBeDefined();
      expect(paid?.stripePaymentId).toBeTruthy();
    });
  });
});
