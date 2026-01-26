/**
 * MarketplaceService con Event-Driven Architecture
 *
 * Este archivo muestra cómo integrar eventos en el MarketplaceService.
 * Implementa emisión de eventos para:
 * - ORDER_CREATED
 * - ORDER_PAID
 * - ORDER_SHIPPED
 * - ORDER_DELIVERED
 *
 * CAMBIOS NECESARIOS EN routes/marketplace.ts:
 *
 * const marketplaceService = new MarketplaceService(fastify.prisma, fastify.eventBus);
 *
 */

import { PrismaClient, Prisma, OrderStatus } from '@prisma/client';
import {
  CreateOrderInput,
  OrderQuery,
} from '../schemas/marketplace.schema.js';
import { stripeService } from './stripe.service.js';
import { AppError, NotFoundError } from '../utils/errors.js';
import {
  withRetry,
  updateProductWithLocking,
} from '../utils/optimistic-locking.js';
import { EventBus, createEvent, EventTypes } from '../infrastructure/events/index.js';

export class MarketplaceService {
  constructor(
    private prisma: PrismaClient,
    private eventBus?: EventBus
  ) {}

  // ============================================
  // ORDERS - CREATE (con eventos)
  // ============================================

  async createOrder(userId: string, data: CreateOrderInput) {
    const cart = await this.getCart(userId);

    if (cart.items.length === 0) {
      throw new AppError('El carrito está vacío', 400);
    }

    // Group items by seller
    const itemsBySeller = new Map<string, typeof cart.items>();
    for (const item of cart.items) {
      const sellerId = item.product.sellerId;
      if (!itemsBySeller.has(sellerId)) {
        itemsBySeller.set(sellerId, []);
      }
      itemsBySeller.get(sellerId)!.push(item);
    }

    // FASE 1: Crear órdenes y reservar inventario
    const pendingOrders = await withRetry(
      async () => {
        return this.prisma.$transaction(async (tx) => {
          const createdOrders = [];

          for (const [sellerId, items] of itemsBySeller) {
            // Validate stock availability
            for (const item of items) {
              const product = await tx.product.findUnique({
                where: { id: item.productId },
              });

              if (!product) {
                throw new NotFoundError(`Producto ${item.productId} no encontrado`);
              }

              if (product.stock < item.quantity) {
                throw new AppError(
                  `Stock insuficiente para ${product.name}. Disponible: ${product.stock}`,
                  400
                );
              }
            }

            const total = items.reduce(
              (sum, item) => sum + Number(item.product.price) * item.quantity,
              0
            );

            // Create order
            const order = await tx.order.create({
              data: {
                userId,
                sellerId,
                total: new Prisma.Decimal(total),
                shippingAddress: data.shippingAddress as object,
                status: 'PENDING_PAYMENT',
                items: {
                  create: items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    price: item.product.price,
                  })),
                },
              },
              include: {
                items: {
                  include: { product: true },
                },
                seller: {
                  include: {
                    user: {
                      select: { id: true, nombre: true },
                    },
                  },
                },
              },
            });

            // Reserve stock using optimistic locking
            for (const item of items) {
              const product = await tx.product.findUnique({
                where: { id: item.productId },
                select: { version: true },
              });

              if (!product) {
                throw new NotFoundError(`Producto ${item.productId} no encontrado`);
              }

              await updateProductWithLocking(
                tx,
                item.productId,
                product.version,
                {
                  stock: { decrement: item.quantity },
                }
              );
            }

            createdOrders.push(order);
          }

          // Clear cart
          const userCart = await tx.cart.findUnique({ where: { userId } });
          if (userCart) {
            await tx.cartItem.deleteMany({ where: { cartId: userCart.id } });
          }

          return createdOrders;
        });
      },
      { maxRetries: 3, retryDelay: 100 }
    );

    // FASE 2: Crear payment intents en Stripe
    const ordersWithPayment = [];

    for (const order of pendingOrders) {
      try {
        const payment = await stripeService.createPaymentIntent({
          amount: Math.round(Number(order.total) * 100),
          description: `Orden #${order.id} - Guelaguetza Connect`,
          metadata: {
            orderId: order.id,
            userId,
            sellerId: order.sellerId,
          },
        });

        if (payment?.paymentIntentId) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              stripePaymentId: payment.paymentIntentId,
              status: 'PENDING',
            },
          });

          ordersWithPayment.push({
            order,
            clientSecret: payment.clientSecret,
          });
        }

        // FASE 3: Emitir evento OrderCreated
        if (this.eventBus) {
          const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: { nombre: true, apellido: true },
          });

          const event = createEvent(EventTypes.ORDER_CREATED, {
            orderId: order.id,
            userId,
            userName: user ? `${user.nombre} ${user.apellido || ''}`.trim() : 'Usuario',
            sellerId: order.sellerId,
            sellerName: order.seller.user.nombre,
            total: Number(order.total),
            itemCount: order.items.length,
            items: order.items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantity,
              price: Number(item.price),
            })),
          });
          this.eventBus.emitAsync(event);
        }
      } catch (stripeError) {
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'PAYMENT_FAILED' },
        });

        ordersWithPayment.push({
          order,
          error: stripeError instanceof Error ? stripeError.message : 'Error al procesar pago',
        });
      }
    }

    const allFailed = ordersWithPayment.every((o) => 'error' in o);
    if (allFailed) {
      throw new AppError(
        'Error al procesar los pagos. Por favor intenta nuevamente.',
        500
      );
    }

    return ordersWithPayment;
  }

  // ============================================
  // ORDERS - UPDATE STATUS (con eventos)
  // ============================================

  async updateOrderStatus(id: string, userId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        seller: true,
        user: { select: { nombre: true, apellido: true } },
        items: {
          include: {
            product: { select: { name: true } },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Orden no encontrada');
    }

    // Only seller can update status
    if (order.seller.userId !== userId) {
      throw new AppError('No tienes permiso para actualizar esta orden', 403);
    }

    const updated = await this.prisma.order.update({
      where: { id },
      data: { status },
      include: {
        items: {
          include: { product: true },
        },
        seller: {
          include: {
            user: { select: { nombre: true } },
          },
        },
      },
    });

    // Emitir eventos según el nuevo estado
    if (this.eventBus) {
      // ORDER_PAID
      if (status === 'PAID' && order.stripePaymentId) {
        const event = createEvent(EventTypes.ORDER_PAID, {
          orderId: updated.id,
          userId: updated.userId,
          sellerId: updated.sellerId,
          sellerName: updated.seller.user.nombre,
          paymentId: order.stripePaymentId,
          amount: Number(updated.total),
          items: updated.items.map((item) => ({
            productId: item.productId,
            productName: item.product.name,
            quantity: item.quantity,
          })),
        });
        this.eventBus.emitAsync(event);
      }

      // ORDER_SHIPPED
      if (status === 'SHIPPED') {
        const event = createEvent(EventTypes.ORDER_SHIPPED, {
          orderId: updated.id,
          userId: updated.userId,
          sellerId: updated.sellerId,
          trackingNumber: undefined, // TODO: Añadir tracking number a schema
        });
        this.eventBus.emitAsync(event);
      }

      // ORDER_DELIVERED
      if (status === 'DELIVERED') {
        const event = createEvent(EventTypes.ORDER_DELIVERED, {
          orderId: updated.id,
          userId: updated.userId,
          sellerId: updated.sellerId,
          total: Number(updated.total),
          deliveredAt: new Date(),
        });
        this.eventBus.emitAsync(event);
      }
    }

    return updated;
  }

  // ============================================
  // Helper: Get Cart (reutilizado de original)
  // ============================================

  private async getCart(userId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              include: {
                seller: {
                  include: {
                    user: {
                      select: { id: true, nombre: true },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
        include: {
          items: {
            include: {
              product: {
                include: {
                  seller: {
                    include: {
                      user: {
                        select: { id: true, nombre: true },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }

    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    return {
      ...cart,
      subtotal,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  // Nota: Los demás métodos (getProducts, addToCart, etc.) permanecen igual.
  // Solo se modifican createOrder y updateOrderStatus para emitir eventos.
}
