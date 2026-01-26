/**
 * ExperienceFactory - Generador de experiencias/tours
 */

import type { Experience, ExperienceCategory } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

let experienceCounter = 0;

interface ExperienceData {
  title: string;
  description: string;
  category: ExperienceCategory;
  basePrice: number;
  duration: number;
  location: string;
  includes: string[];
  languages: string[];
}

const EXPERIENCES: ExperienceData[] = [
  {
    title: 'Tour por Monte Albán y artesanías',
    description: 'Visita guiada a la zona arqueológica de Monte Albán seguida de talleres de artesanías en San Bartolo Coyotepec',
    category: 'TOUR',
    basePrice: 650,
    duration: 300,
    location: 'Monte Albán, Oaxaca',
    includes: ['Transporte', 'Guía certificado', 'Entrada a zona arqueológica', 'Agua embotellada'],
    languages: ['Español', 'Inglés', 'Zapoteco'],
  },
  {
    title: 'Taller de barro negro',
    description: 'Aprende la técnica ancestral del barro negro con maestros artesanos de Coyotepec',
    category: 'TALLER',
    basePrice: 450,
    duration: 180,
    location: 'San Bartolo Coyotepec',
    includes: ['Materiales', 'Instructor experto', 'Pieza terminada para llevar', 'Refrigerio'],
    languages: ['Español', 'Zapoteco'],
  },
  {
    title: 'Degustación de mezcal artesanal',
    description: 'Experiencia completa de cata de mezcales con maridaje de quesos oaxaqueños',
    category: 'DEGUSTACION',
    basePrice: 550,
    duration: 120,
    location: 'Santiago Matatlán',
    includes: ['6 variedades de mezcal', 'Tabla de quesos', 'Guía de cata', 'Transporte desde Oaxaca'],
    languages: ['Español', 'Inglés'],
  },
  {
    title: 'Clase de cocina oaxaqueña',
    description: 'Aprende a preparar mole negro, tlayudas y otras delicias con chef local',
    category: 'CLASE',
    basePrice: 780,
    duration: 240,
    location: 'Teotitlán del Valle',
    includes: ['Ingredientes', 'Recetario', 'Comida completa', 'Delantal de regalo'],
    languages: ['Español', 'Inglés', 'Zapoteco'],
  },
  {
    title: 'Visita a palenque tradicional',
    description: 'Conoce el proceso completo de elaboración del mezcal desde la cosecha hasta la destilación',
    category: 'VISITA',
    basePrice: 420,
    duration: 150,
    location: 'Santa Catarina Minas',
    includes: ['Transporte', 'Degustación', 'Guía experto', 'Botana tradicional'],
    languages: ['Español', 'Inglés'],
  },
  {
    title: 'Taller de telar de pedal',
    description: 'Experiencia práctica de tejido en telar de pedal con artesanos zapotecos',
    category: 'TALLER',
    basePrice: 520,
    duration: 210,
    location: 'Teotitlán del Valle',
    includes: ['Uso de telar', 'Materiales', 'Instructor certificado', 'Pieza tejida'],
    languages: ['Español', 'Zapoteco'],
  },
  {
    title: 'Tour gastronómico por mercados',
    description: 'Recorrido guiado por los mejores mercados de Oaxaca con degustaciones',
    category: 'TOUR',
    basePrice: 380,
    duration: 180,
    location: 'Centro Histórico, Oaxaca',
    includes: ['Guía local', 'Degustaciones', 'Bebidas', 'Historia culinaria'],
    languages: ['Español', 'Inglés'],
  },
  {
    title: 'Clase de alebrijes',
    description: 'Talla y pinta tu propio alebrije con maestros artesanos de San Martín Tilcajete',
    category: 'CLASE',
    basePrice: 590,
    duration: 270,
    location: 'San Martín Tilcajete',
    includes: ['Madera', 'Herramientas', 'Pinturas', 'Tu alebrije terminado'],
    languages: ['Español', 'Zapoteco'],
  },
];

export interface ExperienceFactoryOptions {
  id?: string;
  hostId?: string;
  title?: string;
  description?: string;
  imageUrl?: string;
  images?: string[];
  category?: ExperienceCategory;
  price?: number | Decimal;
  duration?: number;
  maxCapacity?: number;
  location?: string;
  latitude?: number;
  longitude?: number;
  includes?: string[];
  languages?: string[];
  isActive?: boolean;
  rating?: number;
  reviewCount?: number;
}

/**
 * Genera una experiencia de prueba
 */
export function createExperience(options: ExperienceFactoryOptions = {}): Omit<Experience, 'createdAt' | 'updatedAt'> {
  const index = experienceCounter++;
  const experienceData = EXPERIENCES[index % EXPERIENCES.length];

  return {
    id: options.id ?? `experience-${index}-${Date.now()}`,
    hostId: options.hostId ?? `host-${index % 5}`,
    title: options.title ?? experienceData.title,
    description: options.description ?? experienceData.description,
    imageUrl: options.imageUrl ?? `https://picsum.photos/seed/exp${index}/1200/800`,
    images: options.images ?? [
      `https://picsum.photos/seed/exp${index}-1/1200/800`,
      `https://picsum.photos/seed/exp${index}-2/1200/800`,
      `https://picsum.photos/seed/exp${index}-3/1200/800`,
    ],
    category: options.category ?? experienceData.category,
    price: new Decimal(options.price ?? experienceData.basePrice),
    duration: options.duration ?? experienceData.duration,
    maxCapacity: options.maxCapacity ?? Math.floor(Math.random() * 10) + 5,
    location: options.location ?? experienceData.location,
    latitude: options.latitude ?? (17.0 + Math.random() * 0.5),
    longitude: options.longitude ?? (-96.7 - Math.random() * 0.5),
    includes: options.includes ?? experienceData.includes,
    languages: options.languages ?? experienceData.languages,
    isActive: options.isActive ?? true,
    rating: options.rating ?? (Math.random() * 1.5 + 3.5),
    reviewCount: options.reviewCount ?? Math.floor(Math.random() * 100),
  };
}

/**
 * Crea una experiencia inactiva
 */
export function createInactiveExperience(options: ExperienceFactoryOptions = {}): Omit<Experience, 'createdAt' | 'updatedAt'> {
  return createExperience({
    ...options,
    isActive: false,
  });
}

/**
 * Crea una experiencia popular (alta calificación)
 */
export function createPopularExperience(options: ExperienceFactoryOptions = {}): Omit<Experience, 'createdAt' | 'updatedAt'> {
  return createExperience({
    ...options,
    rating: options.rating ?? (Math.random() * 0.5 + 4.5),
    reviewCount: options.reviewCount ?? Math.floor(Math.random() * 200) + 100,
  });
}

/**
 * Crea experiencias por categoría
 */
export function createExperiencesByCategory(category: ExperienceCategory, count: number, options: ExperienceFactoryOptions = {}): Omit<Experience, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createExperience({ ...options, category }));
}

/**
 * Crea experiencias para un host específico
 */
export function createExperiencesForHost(hostId: string, count: number, options: ExperienceFactoryOptions = {}): Omit<Experience, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createExperience({ ...options, hostId }));
}

/**
 * Crea múltiples experiencias
 */
export function createManyExperiences(count: number, options: ExperienceFactoryOptions = {}): Omit<Experience, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createExperience(options));
}

/**
 * Resetea el contador de experiencias (útil entre tests)
 */
export function resetExperienceCounter(): void {
  experienceCounter = 0;
}
