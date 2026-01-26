import { ProductCategory, ProductStatus } from '@prisma/client';
import { testUsers } from './users.js';

/**
 * Datos de productos de prueba
 */

export const testSellerProfile = {
  id: 'seller_profile_001',
  userId: testUsers.sellerUser.id,
  businessName: 'Artesanías Oaxaqueñas',
  description: 'Productos artesanales de alta calidad',
  bannerUrl: 'https://example.com/banner.jpg',
  location: 'Oaxaca de Juárez',
  rating: 4.9,
  reviewCount: 25,
  verified: true,
  stripeAccountId: null,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
};

export const testProducts = {
  alebrije: {
    id: 'prod_alebrije_001',
    sellerId: testSellerProfile.id,
    name: 'Alebrije de Madera Copal',
    description: 'Alebrije tallado a mano en madera de copal, pintado con colores tradicionales',
    price: 850,
    category: 'ARTESANIA' as ProductCategory,
    status: 'ACTIVE' as ProductStatus,
    stock: 5,
    images: ['https://example.com/alebrije1.jpg', 'https://example.com/alebrije2.jpg'],
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  mezcal: {
    id: 'prod_mezcal_001',
    sellerId: testSellerProfile.id,
    name: 'Mezcal Artesanal Espadín',
    description: 'Mezcal 100% artesanal, destilado en olla de barro',
    price: 450,
    category: 'MEZCAL' as ProductCategory,
    status: 'ACTIVE' as ProductStatus,
    stock: 20,
    images: ['https://example.com/mezcal1.jpg'],
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  textil: {
    id: 'prod_textil_001',
    sellerId: testSellerProfile.id,
    name: 'Tapete Zapoteco',
    description: 'Tapete tejido en telar de pedal con lana natural teñida con grana cochinilla',
    price: 1200,
    category: 'TEXTIL' as ProductCategory,
    status: 'ACTIVE' as ProductStatus,
    stock: 3,
    images: ['https://example.com/tapete1.jpg', 'https://example.com/tapete2.jpg'],
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  ceramica: {
    id: 'prod_ceramica_001',
    sellerId: testSellerProfile.id,
    name: 'Olla de Barro Negro',
    description: 'Olla de barro negro de San Bartolo Coyotepec',
    price: 320,
    category: 'CERAMICA' as ProductCategory,
    status: 'ACTIVE' as ProductStatus,
    stock: 10,
    images: ['https://example.com/olla1.jpg'],
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  soldOut: {
    id: 'prod_soldout_001',
    sellerId: testSellerProfile.id,
    name: 'Producto Agotado',
    description: 'Este producto está agotado',
    price: 500,
    category: 'ARTESANIA' as ProductCategory,
    status: 'SOLD_OUT' as ProductStatus,
    stock: 0,
    images: [],
    version: 1,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

/**
 * Helper: Obtener producto por tipo
 */
export function getTestProduct(type: keyof typeof testProducts) {
  return testProducts[type];
}

/**
 * Helper: Obtener perfil de vendedor
 */
export function getTestSellerProfile() {
  return testSellerProfile;
}

/**
 * Helper: Crear datos de dirección de envío
 */
export function createShippingAddress() {
  return {
    name: 'Juan Pérez',
    street: 'Calle Reforma 123',
    city: 'Oaxaca de Juárez',
    state: 'Oaxaca',
    zipCode: '68000',
    country: 'México',
    phone: '+52 951 123 4567',
  };
}
