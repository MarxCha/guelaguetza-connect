import { PrismaClient } from '@prisma/client';
import { EventBus } from '../EventBus.js';
import {
  EventTypes,
  DomainEvent,
  BookingConfirmedPayload,
  OrderPaidPayload,
  UserRegisteredPayload,
} from '../types.js';
import { EmailService } from '../../../services/email.service.js';

/**
 * EmailHandler - Sends emails in response to domain events
 */
export class EmailHandler {
  constructor(private prisma: PrismaClient) {}

  register(eventBus: EventBus): void {
    eventBus.on(EventTypes.USER_REGISTERED, this.handleUserRegistered.bind(this));
    eventBus.on(EventTypes.BOOKING_CONFIRMED, this.handleBookingConfirmed.bind(this));
    eventBus.on(EventTypes.ORDER_PAID, this.handleOrderPaid.bind(this));
  }

  private async handleUserRegistered(event: DomainEvent<UserRegisteredPayload>): Promise<void> {
    const { email, nombre } = event.payload;
    await EmailService.sendWelcome(email, nombre);
  }

  private async handleBookingConfirmed(event: DomainEvent<BookingConfirmedPayload>): Promise<void> {
    const { userId, userName, experienceTitle, guestCount, totalPrice, timeSlot } = event.payload;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });

    if (user) {
      await EmailService.sendBookingConfirmed(user.email, {
        userName,
        experienceTitle,
        date: timeSlot.date,
        startTime: timeSlot.startTime,
        guestCount,
        totalPrice,
      });
    }
  }

  private async handleOrderPaid(event: DomainEvent<OrderPaidPayload>): Promise<void> {
    const { userId, orderId, items, amount } = event.payload;

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, nombre: true },
    });

    if (user) {
      await EmailService.sendOrderPaid(user.email, {
        userName: user.nombre || 'Usuario',
        orderId,
        items: items.map(i => ({ productName: i.productName, quantity: i.quantity })),
        amount,
      });
    }
  }
}
