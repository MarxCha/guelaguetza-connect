import { ExperienceCategory } from '@prisma/client';
import { testUsers } from './users.js';

/**
 * Datos de experiencias de prueba
 */

export const testExperiences = {
  cookingClass: {
    id: 'exp_cooking_001',
    hostId: testUsers.hostUser.id,
    title: 'Clase de Cocina Oaxaqueña',
    description: 'Aprende a preparar mole negro tradicional',
    imageUrl: 'https://example.com/cooking.jpg',
    images: ['https://example.com/cooking1.jpg', 'https://example.com/cooking2.jpg'],
    category: 'CLASE' as ExperienceCategory,
    price: 500,
    duration: 180, // 3 horas
    maxCapacity: 8,
    location: 'Oaxaca de Juárez',
    latitude: 17.0654,
    longitude: -96.7236,
    includes: ['Ingredientes', 'Recetario', 'Degustación'],
    languages: ['Español', 'Zapoteco'],
    isActive: true,
    rating: 4.8,
    reviewCount: 12,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  mezcalTour: {
    id: 'exp_mezcal_001',
    hostId: testUsers.hostUser.id,
    title: 'Tour de Mezcal',
    description: 'Visita a palenque tradicional con degustación',
    imageUrl: 'https://example.com/mezcal.jpg',
    images: ['https://example.com/mezcal1.jpg'],
    category: 'TOUR' as ExperienceCategory,
    price: 350,
    duration: 240, // 4 horas
    maxCapacity: 12,
    location: 'Santiago Matatlán',
    latitude: 16.8589,
    longitude: -96.3797,
    includes: ['Transporte', 'Degustación', 'Guía certificado'],
    languages: ['Español', 'Inglés'],
    isActive: true,
    rating: 5.0,
    reviewCount: 8,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },

  textileWorkshop: {
    id: 'exp_textile_001',
    hostId: testUsers.hostUser.id,
    title: 'Taller de Tejido Tradicional',
    description: 'Aprende técnicas ancestrales de tejido en telar de cintura',
    imageUrl: 'https://example.com/textile.jpg',
    images: [],
    category: 'TALLER' as ExperienceCategory,
    price: 400,
    duration: 150,
    maxCapacity: 6,
    location: 'Teotitlán del Valle',
    latitude: 17.0333,
    longitude: -96.5333,
    includes: ['Materiales', 'Pieza terminada'],
    languages: ['Español', 'Zapoteco'],
    isActive: true,
    rating: 0,
    reviewCount: 0,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
};

/**
 * Horarios disponibles para experiencias
 */
export const testTimeSlots = {
  cookingSlot1: {
    id: 'slot_cooking_001',
    experienceId: testExperiences.cookingClass.id,
    date: new Date('2024-03-15'),
    startTime: '10:00',
    endTime: '13:00',
    capacity: 8,
    bookedCount: 0,
    isAvailable: true,
    version: 1,
    createdAt: new Date('2024-01-01'),
  },

  cookingSlot2: {
    id: 'slot_cooking_002',
    experienceId: testExperiences.cookingClass.id,
    date: new Date('2024-03-16'),
    startTime: '10:00',
    endTime: '13:00',
    capacity: 8,
    bookedCount: 6,
    isAvailable: true,
    version: 1,
    createdAt: new Date('2024-01-01'),
  },

  mezcalSlot1: {
    id: 'slot_mezcal_001',
    experienceId: testExperiences.mezcalTour.id,
    date: new Date('2024-03-20'),
    startTime: '09:00',
    endTime: '13:00',
    capacity: 12,
    bookedCount: 0,
    isAvailable: true,
    version: 1,
    createdAt: new Date('2024-01-01'),
  },

  textileSlot1: {
    id: 'slot_textile_001',
    experienceId: testExperiences.textileWorkshop.id,
    date: new Date('2024-03-18'),
    startTime: '14:00',
    endTime: '16:30',
    capacity: 6,
    bookedCount: 5,
    isAvailable: true,
    version: 1,
    createdAt: new Date('2024-01-01'),
  },
};

/**
 * Helper: Obtener experiencia por tipo
 */
export function getTestExperience(type: keyof typeof testExperiences) {
  return testExperiences[type];
}

/**
 * Helper: Obtener horario por tipo
 */
export function getTestTimeSlot(type: keyof typeof testTimeSlots) {
  return testTimeSlots[type];
}
