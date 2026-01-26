import { describe, it, expect, beforeEach } from 'vitest';
import { getTestApp, getTestPrisma, authenticatedRequest, generateAuthToken } from './setup.js';
import {
  testUsers,
  getTestUser,
  getTestCredentials,
  TEST_PASSWORD,
} from './fixtures/users.js';
import {
  testExperiences,
  testTimeSlots,
  getTestExperience,
  getTestTimeSlot,
} from './fixtures/experiences.js';

/**
 * E2E Test: Flujo completo de reservación de experiencia
 *
 * User Journey:
 * 1. Login como usuario
 * 2. Navegar a experiencias
 * 3. Buscar por categoría
 * 4. Ver detalle de experiencia
 * 5. Seleccionar horario disponible
 * 6. Crear booking
 * 7. Verificar que booking aparece en "Mis Reservaciones"
 */
describe('E2E: Booking Flow - Reservar experiencia', () => {
  const app = getTestApp();
  const prisma = getTestPrisma();

  let userId: string;
  let experienceId: string;
  let timeSlotId: string;

  beforeEach(async () => {
    // Seed: Crear usuario de prueba
    const regularUser = await prisma.user.create({
      data: testUsers.regularUser,
    });
    userId = regularUser.id;

    // Seed: Crear host
    const hostUser = await prisma.user.create({
      data: testUsers.hostUser,
    });

    // Seed: Crear experiencia
    const experience = await prisma.experience.create({
      data: testExperiences.cookingClass,
    });
    experienceId = experience.id;

    // Seed: Crear horarios disponibles
    const timeSlot = await prisma.experienceTimeSlot.create({
      data: testTimeSlots.cookingSlot1,
    });
    timeSlotId = timeSlot.id;
  });

  it('Usuario puede completar el flujo de reservación exitosamente', async () => {
    // PASO 1: Login
    const loginResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: testUsers.regularUser.email,
        password: TEST_PASSWORD,
      },
    });

    expect(loginResponse.statusCode).toBe(200);
    const loginBody = JSON.parse(loginResponse.body);
    expect(loginBody).toHaveProperty('success', true);
    expect(loginBody).toHaveProperty('token');
    expect(loginBody.user).toHaveProperty('email', testUsers.regularUser.email);

    const token = loginBody.token;

    // PASO 2: Listar experiencias (navegar a experiencias)
    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/bookings/experiences',
    });

    expect(listResponse.statusCode).toBe(200);
    const listBody = JSON.parse(listResponse.body);
    expect(listBody.experiences).toBeInstanceOf(Array);
    expect(listBody.experiences.length).toBeGreaterThan(0);

    // PASO 3: Buscar por categoría (CLASE)
    const searchResponse = await app.inject({
      method: 'GET',
      url: '/api/bookings/experiences?category=CLASE',
    });

    expect(searchResponse.statusCode).toBe(200);
    const searchBody = JSON.parse(searchResponse.body);
    expect(searchBody.experiences).toBeInstanceOf(Array);
    expect(searchBody.experiences.length).toBe(1);
    expect(searchBody.experiences[0].category).toBe('CLASE');
    expect(searchBody.experiences[0].title).toContain('Cocina');

    // PASO 4: Ver detalle de experiencia
    const detailResponse = await app.inject({
      method: 'GET',
      url: `/api/bookings/experiences/${experienceId}`,
    });

    expect(detailResponse.statusCode).toBe(200);
    const detailBody = JSON.parse(detailResponse.body);
    expect(detailBody).toHaveProperty('id', experienceId);
    expect(detailBody).toHaveProperty('title', testExperiences.cookingClass.title);
    expect(detailBody).toHaveProperty('price');
    expect(detailBody).toHaveProperty('duration', 180);
    expect(detailBody).toHaveProperty('maxCapacity', 8);

    // PASO 5: Ver horarios disponibles
    const slotsResponse = await app.inject({
      method: 'GET',
      url: `/api/bookings/experiences/${experienceId}/slots`,
    });

    expect(slotsResponse.statusCode).toBe(200);
    const slotsBody = JSON.parse(slotsResponse.body);
    expect(slotsBody).toBeInstanceOf(Array);
    expect(slotsBody.length).toBeGreaterThan(0);

    const availableSlot = slotsBody.find((slot: any) => slot.isAvailable);
    expect(availableSlot).toBeDefined();
    expect(availableSlot.capacity).toBeGreaterThan(availableSlot.bookedCount);

    // PASO 6: Crear booking (autenticado)
    const bookingResponse = await app.inject({
      method: 'POST',
      url: '/api/bookings/bookings',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        experienceId,
        timeSlotId,
        guestCount: 2,
        specialRequests: 'Sin gluten por favor',
      },
    });

    expect(bookingResponse.statusCode).toBe(201);
    const bookingBody = JSON.parse(bookingResponse.body);
    expect(bookingBody).toHaveProperty('id');
    expect(bookingBody).toHaveProperty('status', 'PENDING_PAYMENT');
    expect(bookingBody).toHaveProperty('guestCount', 2);
    expect(bookingBody).toHaveProperty('totalPrice');
    expect(Number(bookingBody.totalPrice)).toBe(500 * 2); // precio * guestCount

    const bookingId = bookingBody.id;

    // PASO 7: Verificar que booking aparece en "Mis Reservaciones"
    const myBookingsResponse = await app.inject({
      method: 'GET',
      url: '/api/bookings/bookings',
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(myBookingsResponse.statusCode).toBe(200);
    const myBookingsBody = JSON.parse(myBookingsResponse.body);
    expect(myBookingsBody.bookings).toBeInstanceOf(Array);
    expect(myBookingsBody.bookings.length).toBe(1);

    const myBooking = myBookingsBody.bookings[0];
    expect(myBooking).toHaveProperty('id', bookingId);
    expect(myBooking).toHaveProperty('status', 'PENDING_PAYMENT');
    expect(myBooking.experience).toHaveProperty('title', testExperiences.cookingClass.title);

    // PASO 8: Ver detalle del booking
    const bookingDetailResponse = await app.inject({
      method: 'GET',
      url: `/api/bookings/bookings/${bookingId}`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(bookingDetailResponse.statusCode).toBe(200);
    const bookingDetailBody = JSON.parse(bookingDetailResponse.body);
    expect(bookingDetailBody).toHaveProperty('id', bookingId);
    expect(bookingDetailBody).toHaveProperty('specialRequests', 'Sin gluten por favor');
    expect(bookingDetailBody.experience).toHaveProperty('title');
    expect(bookingDetailBody.timeSlot).toHaveProperty('date');
  });

  it('No permite reservar horario sin disponibilidad', async () => {
    // Crear slot lleno
    const fullSlot = await prisma.experienceTimeSlot.create({
      data: {
        ...testTimeSlots.cookingSlot2,
        bookedCount: 8, // capacidad máxima
        isAvailable: false,
      },
    });

    const token = generateAuthToken(userId);

    const response = await app.inject({
      method: 'POST',
      url: '/api/bookings/bookings',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        experienceId,
        timeSlotId: fullSlot.id,
        guestCount: 2,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('disponibilidad');
  });

  it('No permite reservar con más personas que la capacidad disponible', async () => {
    const token = generateAuthToken(userId);

    // Intentar reservar para 10 personas cuando solo hay capacidad para 8
    const response = await app.inject({
      method: 'POST',
      url: '/api/bookings/bookings',
      headers: {
        authorization: `Bearer ${token}`,
      },
      payload: {
        experienceId,
        timeSlotId,
        guestCount: 10,
      },
    });

    expect(response.statusCode).toBe(400);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('error');
    expect(body.error).toContain('capacidad');
  });

  it('Usuario puede cancelar su reservación', async () => {
    const token = generateAuthToken(userId);

    // Crear booking
    const booking = await prisma.booking.create({
      data: {
        userId,
        experienceId,
        timeSlotId,
        status: 'CONFIRMED',
        guestCount: 2,
        totalPrice: 1000,
      },
    });

    // Cancelar booking
    const response = await app.inject({
      method: 'POST',
      url: `/api/bookings/bookings/${booking.id}/cancel`,
      headers: {
        authorization: `Bearer ${token}`,
      },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body).toHaveProperty('status', 'CANCELLED');
    expect(body).toHaveProperty('cancelledAt');

    // Verificar que se liberó el espacio en el slot
    const updatedSlot = await prisma.experienceTimeSlot.findUnique({
      where: { id: timeSlotId },
    });
    expect(updatedSlot?.bookedCount).toBe(0);
  });

  it('Requiere autenticación para crear booking', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/bookings/bookings',
      payload: {
        experienceId,
        timeSlotId,
        guestCount: 2,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it('Filtra experiencias por ubicación', async () => {
    // Crear otra experiencia en diferente ubicación
    await prisma.experience.create({
      data: testExperiences.mezcalTour,
    });

    const response = await app.inject({
      method: 'GET',
      url: '/api/bookings/experiences?search=Oaxaca de Juárez',
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.body);
    expect(body.experiences.length).toBe(1);
    expect(body.experiences[0].location).toContain('Oaxaca de Juárez');
  });
});
