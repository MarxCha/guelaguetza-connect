/**
 * StoryFactory - Generador de historias/posts de prueba
 */

import type { Story, MediaType } from '@prisma/client';

let storyCounter = 0;

const DESCRIPCIONES = [
  'Disfrutando de la Guelaguetza 2026! 🎉',
  'Increíble experiencia en el Cerro del Fortín',
  'La danza de la pluma es impresionante',
  'Probando el mejor mezcal de Oaxaca 🥃',
  'Artesanías hermosas en el mercado',
  'Textiles zapotecos únicos',
  'Tlayudas deliciosas en el centro',
  'Mole negro tradicional, una maravilla',
  'Visita a Monte Albán, historia viva',
  'Atardecer en Hierve el Agua',
];

const LOCATIONS = [
  'Cerro del Fortín, Oaxaca',
  'Centro Histórico, Oaxaca',
  'Monte Albán, Oaxaca',
  'Hierve el Agua, Oaxaca',
  'Mercado 20 de Noviembre',
  'Tlacolula de Matamoros',
  'Mitla, Oaxaca',
  'Puerto Escondido',
  'Mazunte, Oaxaca',
  'San Bartolo Coyotepec',
];

export interface StoryFactoryOptions {
  id?: string;
  description?: string;
  mediaUrl?: string;
  mediaType?: MediaType;
  thumbnailUrl?: string;
  duration?: number;
  location?: string;
  views?: number;
  userId?: string;
}

/**
 * Genera una historia de prueba
 */
export function createStory(options: StoryFactoryOptions = {}): Omit<Story, 'createdAt' | 'updatedAt'> {
  const index = storyCounter++;
  const isVideo = options.mediaType === 'VIDEO' || (Math.random() > 0.7 && !options.mediaType);
  const mediaType = options.mediaType ?? (isVideo ? 'VIDEO' : 'IMAGE');

  return {
    id: options.id ?? `story-${index}-${Date.now()}`,
    description: options.description ?? DESCRIPCIONES[index % DESCRIPCIONES.length],
    mediaUrl: options.mediaUrl ?? (
      isVideo
        ? `https://example.com/videos/story-${index}.mp4`
        : `https://picsum.photos/seed/story${index}/1080/1920`
    ),
    mediaType,
    thumbnailUrl: options.thumbnailUrl ?? (
      isVideo ? `https://picsum.photos/seed/thumb${index}/1080/1920` : null
    ),
    duration: options.duration ?? (isVideo ? Math.floor(Math.random() * 30) + 10 : null),
    location: options.location ?? LOCATIONS[index % LOCATIONS.length],
    views: options.views ?? Math.floor(Math.random() * 1000),
    userId: options.userId ?? `user-${index}`,
  };
}

/**
 * Crea una historia de imagen
 */
export function createImageStory(options: StoryFactoryOptions = {}): Omit<Story, 'createdAt' | 'updatedAt'> {
  return createStory({
    ...options,
    mediaType: 'IMAGE',
    duration: null,
    thumbnailUrl: null,
  });
}

/**
 * Crea una historia de video
 */
export function createVideoStory(options: StoryFactoryOptions = {}): Omit<Story, 'createdAt' | 'updatedAt'> {
  const index = storyCounter;
  return createStory({
    ...options,
    mediaType: 'VIDEO',
    duration: options.duration ?? Math.floor(Math.random() * 30) + 10,
    thumbnailUrl: options.thumbnailUrl ?? `https://picsum.photos/seed/thumb${index}/1080/1920`,
  });
}

/**
 * Crea una historia popular (muchas vistas)
 */
export function createPopularStory(options: StoryFactoryOptions = {}): Omit<Story, 'createdAt' | 'updatedAt'> {
  return createStory({
    ...options,
    views: options.views ?? Math.floor(Math.random() * 5000) + 5000,
  });
}

/**
 * Crea múltiples historias
 */
export function createManyStories(count: number, options: StoryFactoryOptions = {}): Omit<Story, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createStory(options));
}

/**
 * Crea historias para un usuario específico
 */
export function createStoriesForUser(userId: string, count: number, options: StoryFactoryOptions = {}): Omit<Story, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createStory({ ...options, userId }));
}

/**
 * Resetea el contador de historias (útil entre tests)
 */
export function resetStoryCounter(): void {
  storyCounter = 0;
}
