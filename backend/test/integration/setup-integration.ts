import { PrismaClient } from '@prisma/client';
import { beforeAll, afterAll, beforeEach } from 'vitest';

export const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
  console.log('Connected to test database');
});

afterAll(async () => {
  await prisma.$disconnect();
  console.log('Disconnected from test database');
});

beforeEach(async () => {
  // Limpiar datos de test antes de cada prueba
  // Orden importante: eliminar en orden inverso a las relaciones
  await prisma.activityLog.deleteMany({});
  await prisma.productReview.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.cartItem.deleteMany({});
  await prisma.cart.deleteMany({});
  await prisma.product.deleteMany({});
  await prisma.sellerProfile.deleteMany({});
  await prisma.experienceReview.deleteMany({});
  await prisma.booking.deleteMany({});
  await prisma.experienceTimeSlot.deleteMany({});
  await prisma.experience.deleteMany({});
  await prisma.pOICheckIn.deleteMany({});
  await prisma.pOIFavorite.deleteMany({});
  await prisma.pOIReview.deleteMany({});
  await prisma.pointOfInterest.deleteMany({});
  await prisma.streamMessage.deleteMany({});
  await prisma.liveStream.deleteMany({});
  await prisma.communityPost.deleteMany({});
  await prisma.communityMember.deleteMany({});
  await prisma.community.deleteMany({});
  await prisma.eventReminder.deleteMany({});
  await prisma.eventRSVP.deleteMany({});
  await prisma.event.deleteMany({});
  await prisma.directMessage.deleteMany({});
  await prisma.directConversation.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.userBadge.deleteMany({});
  await prisma.badge.deleteMany({});
  await prisma.userStats.deleteMany({});
  await prisma.follow.deleteMany({});
  await prisma.pushSubscription.deleteMany({});
  await prisma.message.deleteMany({});
  await prisma.conversation.deleteMany({});
  await prisma.bus.deleteMany({});
  await prisma.stop.deleteMany({});
  await prisma.busRoute.deleteMany({});
  await prisma.comment.deleteMany({});
  await prisma.like.deleteMany({});
  await prisma.story.deleteMany({});
  await prisma.user.deleteMany({});
});
