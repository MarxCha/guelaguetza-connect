#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const badges = [
  // ============================================
  // BOOKING BADGES
  // ============================================
  {
    code: 'FIRST_BOOKING',
    name: 'Primera Reservación',
    description: 'Completaste tu primera reservación de una experiencia',
    icon: '🎉',
    category: 'ENGAGEMENT',
    xpReward: 25,
    threshold: 1,
  },
  {
    code: 'EXPLORER',
    name: 'Explorador',
    description: 'Completaste 5 reservaciones de experiencias',
    icon: '🗺️',
    category: 'ENGAGEMENT',
    xpReward: 50,
    threshold: 5,
  },
  {
    code: 'ADVENTURER',
    name: 'Aventurero',
    description: 'Completaste 10 reservaciones de experiencias',
    icon: '⛰️',
    category: 'ENGAGEMENT',
    xpReward: 100,
    threshold: 10,
  },
  {
    code: 'CULTURE_LOVER',
    name: 'Amante de la Cultura',
    description: 'Completaste 25 reservaciones de experiencias',
    icon: '🎭',
    category: 'ENGAGEMENT',
    xpReward: 250,
    threshold: 25,
  },

  // ============================================
  // MARKETPLACE BADGES
  // ============================================
  {
    code: 'FIRST_SALE',
    name: 'Primera Venta',
    description: 'Realizaste tu primera venta en el marketplace',
    icon: '🛒',
    category: 'ENGAGEMENT',
    xpReward: 25,
    threshold: 1,
  },
  {
    code: 'MERCHANT',
    name: 'Comerciante',
    description: 'Realizaste 10 ventas en el marketplace',
    icon: '🏪',
    category: 'ENGAGEMENT',
    xpReward: 100,
    threshold: 10,
  },
  {
    code: 'MASTER_CRAFTSMAN',
    name: 'Maestro Artesano',
    description: 'Realizaste 50 ventas en el marketplace',
    icon: '👨‍🎨',
    category: 'ENGAGEMENT',
    xpReward: 500,
    threshold: 50,
  },

  // ============================================
  // STORY BADGES
  // ============================================
  {
    code: 'STORYTELLER',
    name: 'Narrador',
    description: 'Publicaste tu primera historia',
    icon: '📖',
    category: 'STORIES',
    xpReward: 10,
    threshold: 1,
  },
  {
    code: 'CONTENT_CREATOR',
    name: 'Creador de Contenido',
    description: 'Publicaste 10 historias',
    icon: '📸',
    category: 'STORIES',
    xpReward: 50,
    threshold: 10,
  },
  {
    code: 'INFLUENCER',
    name: 'Influencer',
    description: 'Publicaste 50 historias',
    icon: '⭐',
    category: 'STORIES',
    xpReward: 200,
    threshold: 50,
  },

  // ============================================
  // SOCIAL BADGES
  // ============================================
  {
    code: 'POPULAR',
    name: 'Popular',
    description: 'Tienes 10 seguidores',
    icon: '👥',
    category: 'SOCIAL',
    xpReward: 25,
    threshold: 10,
  },
  {
    code: 'CELEBRITY',
    name: 'Celebridad',
    description: 'Tienes 50 seguidores',
    icon: '🌟',
    category: 'SOCIAL',
    xpReward: 100,
    threshold: 50,
  },
  {
    code: 'LEGEND',
    name: 'Leyenda',
    description: 'Tienes 100 seguidores',
    icon: '👑',
    category: 'SOCIAL',
    xpReward: 250,
    threshold: 100,
  },

  // ============================================
  // ENGAGEMENT BADGES (Reviews)
  // ============================================
  {
    code: 'CRITIC',
    name: 'Crítico',
    description: 'Escribiste 5 reseñas',
    icon: '✍️',
    category: 'ENGAGEMENT',
    xpReward: 25,
    threshold: 5,
  },
  {
    code: 'EXPERT_REVIEWER',
    name: 'Experto Revisor',
    description: 'Escribiste 20 reseñas',
    icon: '🏆',
    category: 'ENGAGEMENT',
    xpReward: 100,
    threshold: 20,
  },

  // ============================================
  // LEVEL BADGES
  // ============================================
  {
    code: 'LEVEL_5',
    name: 'Nivel 5 Alcanzado',
    description: 'Alcanzaste el nivel 5',
    icon: '🎖️',
    category: 'SPECIAL',
    xpReward: 50,
    threshold: 1,
  },
  {
    code: 'LEVEL_10',
    name: 'Nivel 10 Alcanzado',
    description: 'Alcanzaste el nivel 10 - ¡Eres un maestro!',
    icon: '🏅',
    category: 'SPECIAL',
    xpReward: 150,
    threshold: 1,
  },

  // ============================================
  // SPECIAL BADGES
  // ============================================
  {
    code: 'EARLY_ADOPTER',
    name: 'Adoptante Temprano',
    description: 'Fuiste uno de los primeros usuarios de la plataforma',
    icon: '🚀',
    category: 'SPECIAL',
    xpReward: 100,
    threshold: 1,
  },
  {
    code: 'COMMUNITY_BUILDER',
    name: 'Constructor de Comunidad',
    description: 'Ayudaste a construir la comunidad de Guelaguetza',
    icon: '🏗️',
    category: 'SPECIAL',
    xpReward: 200,
    threshold: 1,
  },
];

async function main() {
  console.log('🌱 Seeding badges...');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  let created = 0;
  let updated = 0;

  for (const badge of badges) {
    const existing = await prisma.badge.findUnique({
      where: { code: badge.code },
    });

    if (existing) {
      await prisma.badge.update({
        where: { code: badge.code },
        data: badge,
      });
      updated++;
      console.log(`✏️  Updated: ${badge.name} (${badge.code})`);
    } else {
      await prisma.badge.create({
        data: badge,
      });
      created++;
      console.log(`✨ Created: ${badge.name} (${badge.code})`);
    }
  }

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`✅ Seed completed!`);
  console.log(`   Created: ${created} badges`);
  console.log(`   Updated: ${updated} badges`);
  console.log(`   Total:   ${badges.length} badges`);
  console.log('');

  // Show badge categories summary
  const categories = badges.reduce((acc, badge) => {
    acc[badge.category] = (acc[badge.category] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  console.log('📊 Badges by category:');
  Object.entries(categories).forEach(([category, count]) => {
    console.log(`   ${category}: ${count}`);
  });
  console.log('');
}

main()
  .catch((e) => {
    console.error('❌ Error seeding badges:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
