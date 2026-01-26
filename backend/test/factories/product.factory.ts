/**
 * ProductFactory - Generador de productos de marketplace
 */

import type { Product, ProductCategory, ProductStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

let productCounter = 0;

interface ProductData {
  name: string;
  description: string;
  category: ProductCategory;
  basePrice: number;
}

const PRODUCTS: ProductData[] = [
  // ARTESANIA
  {
    name: 'Alebrijes de madera tallada',
    description: 'Figuras fantásticas talladas y pintadas a mano por artesanos oaxaqueños',
    category: 'ARTESANIA',
    basePrice: 850,
  },
  {
    name: 'Barro negro de Coyotepec',
    description: 'Cerámica tradicional en barro negro bruñido, técnica ancestral zapoteca',
    category: 'CERAMICA',
    basePrice: 450,
  },
  // TEXTIL
  {
    name: 'Huipil bordado a mano',
    description: 'Blusa tradicional oaxaqueña con bordados de flores y animales',
    category: 'TEXTIL',
    basePrice: 1200,
  },
  {
    name: 'Rebozo de algodón',
    description: 'Rebozo tejido en telar de pedal con diseños tradicionales',
    category: 'TEXTIL',
    basePrice: 650,
  },
  // MEZCAL
  {
    name: 'Mezcal Espadín artesanal',
    description: 'Mezcal 100% agave espadín, destilación tradicional, 750ml',
    category: 'MEZCAL',
    basePrice: 380,
  },
  {
    name: 'Mezcal Tobalá Premium',
    description: 'Mezcal de agave silvestre tobalá, edición limitada, 750ml',
    category: 'MEZCAL',
    basePrice: 980,
  },
  // JOYERIA
  {
    name: 'Aretes de plata con filigrana',
    description: 'Joyería en plata .925 con técnica de filigrana oaxaqueña',
    category: 'JOYERIA',
    basePrice: 420,
  },
  {
    name: 'Collar de coral y plata',
    description: 'Collar artesanal con cuentas de coral y detalles en plata',
    category: 'JOYERIA',
    basePrice: 580,
  },
  // GASTRONOMIA
  {
    name: 'Mole negro tradicional',
    description: 'Pasta de mole negro oaxaqueño, 500g, receta tradicional',
    category: 'GASTRONOMIA',
    basePrice: 180,
  },
  {
    name: 'Chocolate de Metate',
    description: 'Chocolate molido en metate, 1kg, ideal para bebidas',
    category: 'GASTRONOMIA',
    basePrice: 220,
  },
];

export interface ProductFactoryOptions {
  id?: string;
  sellerId?: string;
  name?: string;
  description?: string;
  price?: number | Decimal;
  category?: ProductCategory;
  status?: ProductStatus;
  stock?: number;
  images?: string[];
}

/**
 * Genera un producto de prueba
 */
export function createProduct(options: ProductFactoryOptions = {}): Omit<Product, 'createdAt' | 'updatedAt'> {
  const index = productCounter++;
  const productData = PRODUCTS[index % PRODUCTS.length];
  const variation = Math.random() * 0.2 - 0.1; // +/- 10% variación

  return {
    id: options.id ?? `product-${index}-${Date.now()}`,
    sellerId: options.sellerId ?? `seller-${index % 5}`,
    name: options.name ?? productData.name,
    description: options.description ?? productData.description,
    price: new Decimal(options.price ?? (productData.basePrice * (1 + variation)).toFixed(2)),
    category: options.category ?? productData.category,
    status: options.status ?? 'ACTIVE',
    stock: options.stock ?? Math.floor(Math.random() * 50) + 5,
    images: options.images ?? [
      `https://picsum.photos/seed/product${index}-1/800/800`,
      `https://picsum.photos/seed/product${index}-2/800/800`,
      `https://picsum.photos/seed/product${index}-3/800/800`,
    ],
  };
}

/**
 * Crea un producto en estado borrador
 */
export function createDraftProduct(options: ProductFactoryOptions = {}): Omit<Product, 'createdAt' | 'updatedAt'> {
  return createProduct({
    ...options,
    status: 'DRAFT',
  });
}

/**
 * Crea un producto agotado
 */
export function createSoldOutProduct(options: ProductFactoryOptions = {}): Omit<Product, 'createdAt' | 'updatedAt'> {
  return createProduct({
    ...options,
    status: 'SOLD_OUT',
    stock: 0,
  });
}

/**
 * Crea un producto archivado
 */
export function createArchivedProduct(options: ProductFactoryOptions = {}): Omit<Product, 'createdAt' | 'updatedAt'> {
  return createProduct({
    ...options,
    status: 'ARCHIVED',
  });
}

/**
 * Crea productos por categoría
 */
export function createProductsByCategory(category: ProductCategory, count: number, options: ProductFactoryOptions = {}): Omit<Product, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createProduct({ ...options, category }));
}

/**
 * Crea productos para un vendedor específico
 */
export function createProductsForSeller(sellerId: string, count: number, options: ProductFactoryOptions = {}): Omit<Product, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createProduct({ ...options, sellerId }));
}

/**
 * Crea múltiples productos
 */
export function createManyProducts(count: number, options: ProductFactoryOptions = {}): Omit<Product, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createProduct(options));
}

/**
 * Resetea el contador de productos (útil entre tests)
 */
export function resetProductCounter(): void {
  productCounter = 0;
}
