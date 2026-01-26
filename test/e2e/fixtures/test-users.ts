/**
 * Fixtures con datos de usuarios de prueba para tests E2E
 */

export interface TestUser {
  email: string;
  password: string;
  nombre: string;
  apellido: string;
  role?: 'USER' | 'ADMIN' | 'GUIDE' | 'SELLER';
}

/**
 * Usuario regular para tests de flujos normales
 */
export const REGULAR_USER: TestUser = {
  email: 'test.user@guelaguetza.com',
  password: 'Test123!',
  nombre: 'Test',
  apellido: 'User'
};

/**
 * Usuario administrador para tests de panel admin
 */
export const ADMIN_USER: TestUser = {
  email: 'admin@guelaguetza.com',
  password: 'Admin123!',
  nombre: 'Admin',
  apellido: 'Test',
  role: 'ADMIN'
};

/**
 * Usuario guía para tests de experiencias
 */
export const GUIDE_USER: TestUser = {
  email: 'guide@guelaguetza.com',
  password: 'Guide123!',
  nombre: 'Guide',
  apellido: 'Test',
  role: 'GUIDE'
};

/**
 * Usuario vendedor para tests de marketplace
 */
export const SELLER_USER: TestUser = {
  email: 'seller@guelaguetza.com',
  password: 'Seller123!',
  nombre: 'Seller',
  apellido: 'Test',
  role: 'SELLER'
};

/**
 * Usuario que será baneado en tests de admin
 */
export const USER_TO_BAN: TestUser = {
  email: 'ban.me@guelaguetza.com',
  password: 'BanMe123!',
  nombre: 'Ban',
  apellido: 'Me'
};

/**
 * Datos de prueba para crear nuevos usuarios
 */
export const NEW_USER_DATA = {
  email: `test.${Date.now()}@guelaguetza.com`,
  password: 'NewUser123!',
  nombre: 'Nuevo',
  apellido: 'Usuario'
};

/**
 * Datos de tarjeta de prueba de Stripe
 * @see https://stripe.com/docs/testing
 */
export const STRIPE_TEST_CARDS = {
  SUCCESS: {
    number: '4242424242424242',
    expiry: '12/34',
    cvc: '123',
    zip: '12345'
  },
  DECLINED: {
    number: '4000000000000002',
    expiry: '12/34',
    cvc: '123',
    zip: '12345'
  },
  INSUFFICIENT_FUNDS: {
    number: '4000000000009995',
    expiry: '12/34',
    cvc: '123',
    zip: '12345'
  },
  REQUIRES_AUTHENTICATION: {
    number: '4000002500003155',
    expiry: '12/34',
    cvc: '123',
    zip: '12345'
  }
};

/**
 * Datos de prueba para experiencias
 */
export const TEST_EXPERIENCE = {
  title: 'Tour por Monte Albán',
  description: 'Descubre la majestuosa zona arqueológica',
  category: 'TOUR',
  price: 500,
  duration: 180,
  maxCapacity: 10,
  location: 'Monte Albán, Oaxaca'
};

/**
 * Datos de prueba para productos del marketplace
 */
export const TEST_PRODUCT = {
  name: 'Alebrijes Artesanales',
  description: 'Artesanía tradicional oaxaqueña',
  price: 350,
  stock: 10,
  category: 'ARTESANIAS'
};

/**
 * Tiempo de espera para diferentes operaciones
 */
export const TIMEOUTS = {
  SHORT: 2000,
  MEDIUM: 5000,
  LONG: 10000,
  API_CALL: 15000,
  PAYMENT: 30000
};
