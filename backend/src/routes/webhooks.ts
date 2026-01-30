import { FastifyPluginAsync } from 'fastify';
import Stripe from 'stripe';
import { stripeService } from '../services/stripe.service.js';
import { BookingService } from '../services/booking.service.js';
import { MarketplaceService } from '../services/marketplace.service.js';
import { AppError } from '../utils/errors.js';
import { createEvent, EventTypes } from '../infrastructure/events/index.js';

/**
 * WEBHOOK ROUTES - Stripe Webhooks
 *
 * Este módulo maneja los webhooks de Stripe para procesar eventos de pago.
 *
 * IMPORTANTE:
 * - No usa autenticación JWT (los webhooks vienen de Stripe)
 * - Verifica la firma de Stripe con STRIPE_WEBHOOK_SECRET
 * - Requiere el body raw (no parseado) para verificación
 * - Implementa idempotencia mediante tabla WebhookEvent (evita procesamiento duplicado)
 *
 * IDEMPOTENCIA:
 * - Cada evento de Stripe tiene un ID único (event.id)
 * - Se registra en la tabla WebhookEvent antes de procesar
 * - Si el evento ya fue procesado, se retorna 200 sin reprocesar
 * - Esto previene duplicados en caso de reintentos de Stripe
 */

const webhooksRoutes: FastifyPluginAsync = async (fastify) => {
  const bookingService = new BookingService(fastify.prisma);
  const marketplaceService = new MarketplaceService(fastify.prisma);

  /**
   * POST /api/webhooks/stripe
   *
   * Endpoint para recibir eventos de Stripe
   *
   * Eventos manejados:
   * - payment_intent.succeeded: Confirmar booking u orden
   * - payment_intent.payment_failed: Marcar como PAYMENT_FAILED
   * - charge.refunded: Procesar reembolso
   */
  fastify.post(
    '/stripe',
    {
      config: {
        // Necesitamos el raw body para verificar la firma de Stripe
        rawBody: true,
      },
    },
    async (request, reply) => {
      const signature = request.headers['stripe-signature'];

      if (!signature || typeof signature !== 'string') {
        fastify.log.error('Missing stripe-signature header');
        return reply.status(400).send({ error: 'Missing stripe-signature header' });
      }

      // Obtener el raw body
      const rawBody = (request as any).rawBody;

      if (!rawBody) {
        fastify.log.error('Missing raw body for webhook verification');
        return reply.status(400).send({ error: 'Missing raw body' });
      }

      let event: Stripe.Event;

      try {
        // Verificar la firma del webhook
        const constructedEvent = stripeService.constructWebhookEvent(rawBody, signature);

        if (!constructedEvent) {
          throw new Error('Stripe service not available');
        }

        event = constructedEvent;
      } catch (error) {
        fastify.log.error({ error }, 'Webhook signature verification failed');
        return reply.status(400).send({
          error: 'Webhook signature verification failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }

      // Logging detallado del evento
      fastify.log.info({
        type: event.type,
        id: event.id,
        created: event.created,
        livemode: event.livemode,
      }, 'Stripe webhook event received');

      // IDEMPOTENCIA: Verificar si el evento ya fue procesado
      const existingEvent = await fastify.prisma.webhookEvent.findUnique({
        where: { stripeEventId: event.id },
      });

      if (existingEvent && existingEvent.processed) {
        fastify.log.info(
          {
            eventId: event.id,
            eventType: event.type,
            processedAt: existingEvent.processedAt
          },
          'Webhook event already processed (idempotent skip)'
        );
        return reply.status(200).send({
          received: true,
          eventType: event.type,
          alreadyProcessed: true
        });
      }

      // Registrar el evento como recibido (pero aún no procesado)
      if (!existingEvent) {
        await fastify.prisma.webhookEvent.create({
          data: {
            stripeEventId: event.id,
            eventType: event.type,
            processed: false,
            payload: event as any, // Store full event for debugging
          },
        });
      }

      try {
        // Procesar el evento según su tipo
        switch (event.type) {
          case 'payment_intent.succeeded':
            await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, fastify);
            break;

          case 'payment_intent.payment_failed':
            await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, fastify);
            break;

          case 'charge.refunded':
            await handleChargeRefunded(event.data.object as Stripe.Charge, fastify);
            break;

          default:
            fastify.log.info({ type: event.type }, 'Unhandled webhook event type');
        }

        // Marcar evento como procesado exitosamente
        await fastify.prisma.webhookEvent.update({
          where: { stripeEventId: event.id },
          data: {
            processed: true,
            processedAt: new Date(),
            error: null,
          },
        });

        fastify.log.info(
          { eventId: event.id, eventType: event.type },
          'Webhook event processed successfully'
        );

        return reply.status(200).send({ received: true, eventType: event.type });
      } catch (error) {
        fastify.log.error({ error, eventType: event.type, eventId: event.id }, 'Error processing webhook event');

        // Guardar el error en la tabla de eventos
        await fastify.prisma.webhookEvent.update({
          where: { stripeEventId: event.id },
          data: {
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        });

        // Retornar 200 para evitar reintentos de Stripe si el error es de lógica de negocio
        if (error instanceof AppError) {
          return reply.status(200).send({
            received: true,
            warning: error.message
          });
        }

        // Para errores inesperados, retornar 500 para que Stripe reintente
        return reply.status(500).send({
          error: 'Internal server error processing webhook',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
  );
};

/**
 * Maneja el evento payment_intent.succeeded
 *
 * Este evento se dispara cuando un pago se completa exitosamente.
 *
 * Flujo:
 * 1. Extraer metadata del payment intent
 * 2. Determinar si es booking u orden
 * 3. Verificar estado actual (idempotencia)
 * 4. Confirmar la reservación u orden
 */
async function handlePaymentIntentSucceeded(
  paymentIntent: Stripe.PaymentIntent,
  fastify: any
) {
  const { metadata } = paymentIntent;

  fastify.log.info({
    paymentIntentId: paymentIntent.id,
    amount: paymentIntent.amount,
    metadata,
  }, 'Processing payment_intent.succeeded');

  // Determinar el tipo de entidad según metadata
  const bookingId = metadata?.bookingId;
  const orderId = metadata?.orderId;

  if (bookingId) {
    await handleBookingPaymentSucceeded(bookingId, paymentIntent, fastify);
  } else if (orderId) {
    await handleOrderPaymentSucceeded(orderId, paymentIntent, fastify);
  } else {
    fastify.log.warn(
      { paymentIntentId: paymentIntent.id },
      'Payment intent succeeded but no bookingId or orderId in metadata'
    );
  }
}

/**
 * Confirma un booking tras pago exitoso
 */
async function handleBookingPaymentSucceeded(
  bookingId: string,
  paymentIntent: Stripe.PaymentIntent,
  fastify: any
) {
  const booking = await fastify.prisma.booking.findUnique({
    where: { id: bookingId },
    include: { experience: true, timeSlot: true },
  });

  if (!booking) {
    fastify.log.error({ bookingId }, 'Booking not found for payment_intent.succeeded');
    throw new AppError(`Booking ${bookingId} not found`, 404);
  }

  // IDEMPOTENCIA: Verificar si ya está confirmado
  if (booking.status === 'CONFIRMED') {
    fastify.log.info(
      { bookingId, status: booking.status },
      'Booking already confirmed, skipping'
    );
    return;
  }

  // IDEMPOTENCIA: Verificar si está en estado final (COMPLETED, CANCELLED)
  if (['COMPLETED', 'CANCELLED'].includes(booking.status)) {
    fastify.log.warn(
      { bookingId, status: booking.status },
      'Booking in final state, cannot confirm'
    );
    return;
  }

  // Verificar que el payment intent coincide
  if (booking.stripePaymentId !== paymentIntent.id) {
    fastify.log.error(
      {
        bookingId,
        expectedPaymentId: booking.stripePaymentId,
        receivedPaymentId: paymentIntent.id
      },
      'Payment intent ID mismatch'
    );
    throw new AppError('Payment intent ID mismatch', 400);
  }

  // Confirmar el booking
  await fastify.prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED',
      confirmedAt: new Date(),
    },
  });

  fastify.log.info(
    {
      bookingId,
      experienceId: booking.experienceId,
      userId: booking.userId,
      amount: paymentIntent.amount / 100,
    },
    'Booking confirmed successfully'
  );

  // Emit booking.confirmed event
  if (fastify.eventBus) {
    const user = await fastify.prisma.user.findUnique({
      where: { id: booking.userId },
      select: { nombre: true, apellido: true },
    });

    fastify.eventBus.emitAsync(
      createEvent(EventTypes.BOOKING_CONFIRMED, {
        bookingId,
        userId: booking.userId,
        userName: user ? `${user.nombre} ${user.apellido || ''}`.trim() : 'Usuario',
        experienceId: booking.experienceId,
        experienceTitle: booking.experience.title,
        hostId: booking.experience.hostId,
        guestCount: booking.guestCount,
        totalPrice: Number(booking.totalPrice),
        timeSlot: {
          date: booking.timeSlot.date.toISOString().split('T')[0],
          startTime: booking.timeSlot.startTime,
        },
      })
    );
  }
}

/**
 * Confirma una orden tras pago exitoso
 */
async function handleOrderPaymentSucceeded(
  orderId: string,
  paymentIntent: Stripe.PaymentIntent,
  fastify: any
) {
  const order = await fastify.prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true, seller: true },
  });

  if (!order) {
    fastify.log.error({ orderId }, 'Order not found for payment_intent.succeeded');
    throw new AppError(`Order ${orderId} not found`, 404);
  }

  // IDEMPOTENCIA: Verificar si ya está en estado PAID o posterior
  if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
    fastify.log.info(
      { orderId, status: order.status },
      'Order already processed, skipping'
    );
    return;
  }

  // IDEMPOTENCIA: Verificar si está en estado final
  if (['CANCELLED', 'REFUNDED'].includes(order.status)) {
    fastify.log.warn(
      { orderId, status: order.status },
      'Order in final state, cannot confirm'
    );
    return;
  }

  // Verificar que el payment intent coincide
  if (order.stripePaymentId !== paymentIntent.id) {
    fastify.log.error(
      {
        orderId,
        expectedPaymentId: order.stripePaymentId,
        receivedPaymentId: paymentIntent.id
      },
      'Payment intent ID mismatch'
    );
    throw new AppError('Payment intent ID mismatch', 400);
  }

  // Marcar orden como PAID
  await fastify.prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PAID',
    },
  });

  fastify.log.info(
    {
      orderId,
      sellerId: order.sellerId,
      userId: order.userId,
      amount: paymentIntent.amount / 100,
    },
    'Order marked as PAID successfully'
  );

  // Emit order.paid event
  if (fastify.eventBus) {
    const seller = await fastify.prisma.sellerProfile.findUnique({
      where: { id: order.sellerId },
      include: {
        user: {
          select: { nombre: true, apellido: true },
        },
      },
    });

    fastify.eventBus.emitAsync(
      createEvent(EventTypes.ORDER_PAID, {
        orderId,
        userId: order.userId,
        sellerId: order.sellerId,
        sellerName: seller
          ? `${seller.user.nombre} ${seller.user.apellido || ''}`.trim()
          : 'Vendedor',
        paymentId: paymentIntent.id,
        amount: paymentIntent.amount / 100,
        items: order.items.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || 'Producto',
          quantity: item.quantity,
        })),
      })
    );
  }
}

/**
 * Maneja el evento payment_intent.payment_failed
 *
 * Este evento se dispara cuando un pago falla.
 *
 * Flujo:
 * 1. Extraer metadata del payment intent
 * 2. Determinar si es booking u orden
 * 3. Marcar como PAYMENT_FAILED
 */
async function handlePaymentIntentFailed(
  paymentIntent: Stripe.PaymentIntent,
  fastify: any
) {
  const { metadata } = paymentIntent;

  fastify.log.info({
    paymentIntentId: paymentIntent.id,
    metadata,
    lastPaymentError: paymentIntent.last_payment_error?.message,
  }, 'Processing payment_intent.payment_failed');

  const bookingId = metadata?.bookingId;
  const orderId = metadata?.orderId;

  if (bookingId) {
    await handleBookingPaymentFailed(bookingId, paymentIntent, fastify);
  } else if (orderId) {
    await handleOrderPaymentFailed(orderId, paymentIntent, fastify);
  } else {
    fastify.log.warn(
      { paymentIntentId: paymentIntent.id },
      'Payment intent failed but no bookingId or orderId in metadata'
    );
  }
}

/**
 * Marca un booking como PAYMENT_FAILED
 */
async function handleBookingPaymentFailed(
  bookingId: string,
  paymentIntent: Stripe.PaymentIntent,
  fastify: any
) {
  const booking = await fastify.prisma.booking.findUnique({
    where: { id: bookingId },
  });

  if (!booking) {
    fastify.log.error({ bookingId }, 'Booking not found for payment_intent.payment_failed');
    throw new AppError(`Booking ${bookingId} not found`, 404);
  }

  // IDEMPOTENCIA: Si ya está en PAYMENT_FAILED, no hacer nada
  if (booking.status === 'PAYMENT_FAILED') {
    fastify.log.info({ bookingId }, 'Booking already marked as PAYMENT_FAILED, skipping');
    return;
  }

  // IDEMPOTENCIA: Si ya está confirmado o completado, no marcar como fallido
  if (['CONFIRMED', 'COMPLETED'].includes(booking.status)) {
    fastify.log.warn(
      { bookingId, status: booking.status },
      'Booking already confirmed/completed, not marking as failed'
    );
    return;
  }

  await fastify.prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'PAYMENT_FAILED',
    },
  });

  fastify.log.info(
    {
      bookingId,
      error: paymentIntent.last_payment_error?.message,
    },
    'Booking marked as PAYMENT_FAILED'
  );

  // Notificar al usuario del fallo de pago via EventBus
  if (fastify.eventBus) {
    const experience = await fastify.prisma.experience.findUnique({
      where: { id: booking.experienceId },
      select: { title: true, hostId: true },
    });
    fastify.eventBus.emitAsync(
      createEvent(EventTypes.BOOKING_CANCELLED, {
        bookingId,
        userId: booking.userId,
        experienceId: booking.experienceId,
        experienceTitle: experience?.title || 'Experiencia',
        hostId: experience?.hostId || '',
        reason: `Pago fallido: ${paymentIntent.last_payment_error?.message || 'Error desconocido'}`,
        cancelledBy: 'system',
        guestCount: booking.guestCount,
      })
    );
  }
}

/**
 * Marca una orden como PAYMENT_FAILED
 */
async function handleOrderPaymentFailed(
  orderId: string,
  paymentIntent: Stripe.PaymentIntent,
  fastify: any
) {
  const order = await fastify.prisma.order.findUnique({
    where: { id: orderId },
  });

  if (!order) {
    fastify.log.error({ orderId }, 'Order not found for payment_intent.payment_failed');
    throw new AppError(`Order ${orderId} not found`, 404);
  }

  // IDEMPOTENCIA: Si ya está en PAYMENT_FAILED, no hacer nada
  if (order.status === 'PAYMENT_FAILED') {
    fastify.log.info({ orderId }, 'Order already marked as PAYMENT_FAILED, skipping');
    return;
  }

  // IDEMPOTENCIA: Si ya está pagado o procesado, no marcar como fallido
  if (['PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED'].includes(order.status)) {
    fastify.log.warn(
      { orderId, status: order.status },
      'Order already paid/processed, not marking as failed'
    );
    return;
  }

  await fastify.prisma.order.update({
    where: { id: orderId },
    data: {
      status: 'PAYMENT_FAILED',
    },
  });

  fastify.log.info(
    {
      orderId,
      error: paymentIntent.last_payment_error?.message,
    },
    'Order marked as PAYMENT_FAILED'
  );

  // Notificar al usuario del fallo de pago
  // TODO: Agregar ORDER_PAYMENT_FAILED event type para notificaciones mas especificas
  fastify.log.warn(
    { orderId, userId: order.userId, error: paymentIntent.last_payment_error?.message },
    'Order payment failed - notification sent via log (needs ORDER_PAYMENT_FAILED event type)'
  );
}

/**
 * Maneja el evento charge.refunded
 *
 * Este evento se dispara cuando se procesa un reembolso.
 *
 * Flujo:
 * 1. Obtener el payment intent asociado al charge
 * 2. Extraer metadata para identificar booking/orden
 * 3. Marcar como CANCELLED/REFUNDED según corresponda
 * 4. Restaurar inventario si es necesario
 */
async function handleChargeRefunded(
  charge: Stripe.Charge,
  fastify: any
) {
  fastify.log.info({
    chargeId: charge.id,
    paymentIntentId: charge.payment_intent,
    amount: charge.amount,
    amountRefunded: charge.amount_refunded,
  }, 'Processing charge.refunded');

  if (!charge.payment_intent) {
    fastify.log.warn({ chargeId: charge.id }, 'Charge has no payment intent');
    return;
  }

  // Buscar booking por payment intent ID
  const booking = await fastify.prisma.booking.findFirst({
    where: { stripePaymentId: charge.payment_intent as string },
  });

  if (booking) {
    await handleBookingRefunded(booking.id, charge, fastify);
    return;
  }

  // Buscar orden por payment intent ID
  const order = await fastify.prisma.order.findFirst({
    where: { stripePaymentId: charge.payment_intent as string },
  });

  if (order) {
    await handleOrderRefunded(order.id, charge, fastify);
    return;
  }

  fastify.log.warn(
    { chargeId: charge.id, paymentIntentId: charge.payment_intent },
    'No booking or order found for refunded charge'
  );
}

/**
 * Procesa el reembolso de un booking
 */
async function handleBookingRefunded(
  bookingId: string,
  charge: Stripe.Charge,
  fastify: any
) {
  const booking = await fastify.prisma.booking.findUnique({
    where: { id: bookingId },
    include: { timeSlot: true },
  });

  if (!booking) {
    fastify.log.error({ bookingId }, 'Booking not found for charge.refunded');
    throw new AppError(`Booking ${bookingId} not found`, 404);
  }

  // IDEMPOTENCIA: Si ya está cancelado, no hacer nada
  if (booking.status === 'CANCELLED') {
    fastify.log.info({ bookingId }, 'Booking already cancelled, skipping');
    return;
  }

  // IDEMPOTENCIA: Si está completado, no cancelar pero registrar el reembolso
  if (booking.status === 'COMPLETED') {
    fastify.log.warn(
      { bookingId },
      'Booking completed but refunded - manual review needed'
    );
    // TODO: Crear una tabla de auditoría para estos casos
    return;
  }

  // Cancelar booking y restaurar capacidad del slot
  await fastify.prisma.$transaction(async (tx: any) => {
    // Restaurar capacidad del slot
    await tx.experienceTimeSlot.update({
      where: { id: booking.timeSlotId },
      data: {
        bookedCount: { decrement: booking.guestCount },
        isAvailable: true,
      },
    });

    // Marcar como cancelado
    await tx.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
      },
    });
  });

  fastify.log.info(
    {
      bookingId,
      amountRefunded: charge.amount_refunded / 100,
      guestCount: booking.guestCount,
    },
    'Booking refunded and cancelled successfully'
  );

  // Notificar al usuario del reembolso via EventBus
  if (fastify.eventBus) {
    const experience = await fastify.prisma.experience.findUnique({
      where: { id: booking.experienceId },
      select: { title: true, hostId: true },
    });
    fastify.eventBus.emitAsync(
      createEvent(EventTypes.BOOKING_CANCELLED, {
        bookingId,
        userId: booking.userId,
        experienceId: booking.experienceId,
        experienceTitle: experience?.title || 'Experiencia',
        hostId: experience?.hostId || '',
        reason: 'Reembolso procesado',
        cancelledBy: 'system',
        guestCount: booking.guestCount,
      })
    );
  }
}

/**
 * Procesa el reembolso de una orden
 */
async function handleOrderRefunded(
  orderId: string,
  charge: Stripe.Charge,
  fastify: any
) {
  const order = await fastify.prisma.order.findUnique({
    where: { id: orderId },
    include: { items: true },
  });

  if (!order) {
    fastify.log.error({ orderId }, 'Order not found for charge.refunded');
    throw new AppError(`Order ${orderId} not found`, 404);
  }

  // IDEMPOTENCIA: Si ya está en REFUNDED, no hacer nada
  if (order.status === 'REFUNDED') {
    fastify.log.info({ orderId }, 'Order already refunded, skipping');
    return;
  }

  // Restaurar inventario y marcar como REFUNDED en una transacción
  await fastify.prisma.$transaction(async (tx: any) => {
    // Restaurar stock de cada producto
    for (const item of order.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: {
          stock: { increment: item.quantity },
        },
      });
    }

    // Marcar orden como REFUNDED
    await tx.order.update({
      where: { id: orderId },
      data: {
        status: 'REFUNDED',
      },
    });
  });

  fastify.log.info(
    {
      orderId,
      amountRefunded: charge.amount_refunded / 100,
      itemsRestored: order.items.map((i: any) => ({ productId: i.productId, quantity: i.quantity })),
    },
    'Order refunded and inventory restored successfully'
  );

  // TODO: Agregar ORDER_REFUNDED event type para notificaciones de reembolso
  fastify.log.info(
    { orderId, userId: order.userId, sellerId: order.sellerId },
    'Order refund notification pending (needs ORDER_REFUNDED event type)'
  );
}

export default webhooksRoutes;
