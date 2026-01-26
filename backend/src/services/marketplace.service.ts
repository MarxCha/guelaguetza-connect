import { PrismaClient, Prisma, OrderStatus } from '@prisma/client';
import {
  CreateProductInput,
  UpdateProductInput,
  ProductQuery,
  AddToCartInput,
  UpdateCartItemInput,
  CreateOrderInput,
  OrderQuery,
  CreateProductReviewInput,
  CreateSellerProfileInput,
  UpdateSellerProfileInput,
} from '../schemas/marketplace.schema.js';
import { stripeService } from './stripe.service.js';
import { AppError, NotFoundError, ConcurrencyError } from '../utils/errors.js';
import {
  withRetry,
  updateProductWithLocking,
  getProductWithVersion
} from '../utils/optimistic-locking.js';
import {
  ordersCreatedTotal,
  ordersCancelledTotal,
  orderCreationDuration,
  concurrencyConflictsTotal,
  startTimer,
} from '../utils/metrics.js';
import { CacheService } from './cache.service.js';
import { EventBus, createEvent, EventTypes } from '../infrastructure/events/index.js';

export class MarketplaceService {
  // Cache TTLs (in seconds)
  private readonly CACHE_TTL = {
    PRODUCT_DETAIL: 120, // 2 minutos - detalle de producto
    PRODUCT_LIST: 600, // 10 minutos - listado de productos
    SELLER_PROFILE: 300, // 5 minutos - perfil de vendedor
    CART: 60, // 1 minuto - carrito cambia frecuentemente
  };

  constructor(
    private prisma: PrismaClient,
    private cache?: CacheService,
    private eventBus?: EventBus
  ) {}

  // ============================================
  // PRODUCTS
  // ============================================

  async getProducts(query: ProductQuery) {
    const { category, minPrice, maxPrice, status, sellerId, search, page, limit } = query;
    const skip = (page - 1) * limit;

    // Cache key based on query params
    const cacheKey = `products:list:cat:${category || 'all'}:status:${status || 'ACTIVE'}:seller:${sellerId || 'all'}:price:${minPrice || 0}-${maxPrice || 'inf'}:search:${search || 'none'}:page:${page}:limit:${limit}`;

    // Try cache first
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const where: Prisma.ProductWhereInput = {
      status: status || 'ACTIVE',
      ...(category && { category }),
      ...(sellerId && { sellerId }),
      ...(minPrice !== undefined && { price: { gte: minPrice } }),
      ...(maxPrice !== undefined && { price: { lte: maxPrice } }),
      ...(search && {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        include: {
          seller: {
            include: {
              user: {
                select: { id: true, nombre: true, avatar: true },
              },
            },
          },
          _count: {
            select: { reviews: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const result = {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKey, result, this.CACHE_TTL.PRODUCT_LIST);
    }

    return result;
  }

  async getProductById(id: string) {
    // Try cache first
    const cacheKey = `product:${id}:detail`;
    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        seller: {
          include: {
            user: {
              select: { id: true, nombre: true, apellido: true, avatar: true },
            },
          },
        },
        reviews: {
          include: {
            user: {
              select: { id: true, nombre: true, avatar: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
        _count: {
          select: { reviews: true },
        },
      },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    // Cache the result
    if (this.cache) {
      await this.cache.set(cacheKey, product, this.CACHE_TTL.PRODUCT_DETAIL);
    }

    return product;
  }

  async createProduct(userId: string, data: CreateProductInput) {
    // Get or create seller profile
    let seller = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!seller) {
      throw new AppError('Necesitas crear un perfil de vendedor primero', 400);
    }

    const product = await this.prisma.product.create({
      data: {
        ...data,
        price: new Prisma.Decimal(data.price),
        sellerId: seller.id,
        status: 'ACTIVE',
      },
      include: {
        seller: true,
      },
    });

    // Invalidate product listings cache
    if (this.cache) {
      await this.cache.invalidate('products:list:*');
    }

    return product;
  }

  async updateProduct(id: string, userId: string, data: UpdateProductInput) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    if (product.seller.userId !== userId) {
      throw new AppError('No tienes permiso para editar este producto', 403);
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: {
        ...data,
        ...(data.price && { price: new Prisma.Decimal(data.price) }),
      },
    });

    // Invalidate cache
    if (this.cache) {
      await Promise.all([
        this.cache.del(`product:${id}:detail`),
        this.cache.invalidate('products:list:*'),
      ]);
    }

    return updated;
  }

  async deleteProduct(id: string, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { seller: true },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    if (product.seller.userId !== userId) {
      throw new AppError('No tienes permiso para eliminar este producto', 403);
    }

    await this.prisma.product.update({
      where: { id },
      data: { status: 'ARCHIVED' },
    });

    // Invalidate cache
    if (this.cache) {
      await Promise.all([
        this.cache.del(`product:${id}:detail`),
        this.cache.invalidate('products:list:*'),
      ]);
    }

    return { message: 'Producto eliminado' };
  }

  // ============================================
  // CART
  // ============================================

  async getCart(userId: string) {
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

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + Number(item.product.price) * item.quantity;
    }, 0);

    return {
      ...cart,
      subtotal,
      itemCount: cart.items.reduce((sum, item) => sum + item.quantity, 0),
    };
  }

  async addToCart(userId: string, data: AddToCartInput) {
    const { productId, quantity } = data;

    // Get product
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      throw new NotFoundError('Producto no encontrado');
    }

    if (product.status !== 'ACTIVE') {
      throw new AppError('Este producto no está disponible', 400);
    }

    if (product.stock < quantity) {
      throw new AppError(`Solo hay ${product.stock} unidades disponibles`, 400);
    }

    // Get or create cart
    let cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { userId },
      });
    }

    // Check if item already in cart
    const existingItem = await this.prisma.cartItem.findUnique({
      where: { cartId_productId: { cartId: cart.id, productId } },
    });

    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > product.stock) {
        throw new AppError(`Solo hay ${product.stock} unidades disponibles`, 400);
      }

      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId,
          quantity,
        },
      });
    }

    return this.getCart(userId);
  }

  async updateCartItem(userId: string, itemId: string, data: UpdateCartItemInput) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundError('Carrito no encontrado');
    }

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
      include: { product: true },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundError('Item no encontrado');
    }

    if (data.quantity > item.product.stock) {
      throw new AppError(`Solo hay ${item.product.stock} unidades disponibles`, 400);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: data.quantity },
    });

    return this.getCart(userId);
  }

  async removeFromCart(userId: string, itemId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (!cart) {
      throw new NotFoundError('Carrito no encontrado');
    }

    const item = await this.prisma.cartItem.findUnique({
      where: { id: itemId },
    });

    if (!item || item.cartId !== cart.id) {
      throw new NotFoundError('Item no encontrado');
    }

    await this.prisma.cartItem.delete({
      where: { id: itemId },
    });

    return this.getCart(userId);
  }

  async clearCart(userId: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { userId },
    });

    if (cart) {
      await this.prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return { message: 'Carrito vaciado' };
  }

  // ============================================
  // ORDERS
  // ============================================

  async createOrder(userId: string, data: CreateOrderInput) {
    // Start timing for metrics
    const endTimer = startTimer(orderCreationDuration);

    const cart = await this.getCart(userId);

    if (cart.items.length === 0) {
      endTimer();
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

    // FASE 1: Crear órdenes y reservar inventario en BD con optimistic locking
    // =========================================================================
    const pendingOrders = await withRetry(
      async () => {
        return this.prisma.$transaction(async (tx) => {
          const createdOrders = [];

          for (const [sellerId, items] of itemsBySeller) {
            // Validate stock availability and get current versions
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

            // Create order in PENDING_PAYMENT status
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

              // Update with optimistic locking
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

    // FASE 2: Crear payment intents en Stripe (FUERA de la transacción)
    // ==================================================================
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

        // FASE 3: Actualizar orden con payment intent ID
        // ===============================================
        if (payment?.paymentIntentId) {
          await this.prisma.order.update({
            where: { id: order.id },
            data: {
              stripePaymentId: payment.paymentIntentId,
              status: 'PENDING', // Ready for payment
            },
          });

          ordersWithPayment.push({
            order,
            clientSecret: payment.clientSecret,
          });
        }
      } catch (stripeError) {
        // Si Stripe falla, marcar orden como PAYMENT_FAILED
        // El stock ya está reservado - se puede reintentar el pago
        await this.prisma.order.update({
          where: { id: order.id },
          data: { status: 'PAYMENT_FAILED' },
        });

        // Continuar con las demás órdenes
        ordersWithPayment.push({
          order,
          error: stripeError instanceof Error ? stripeError.message : 'Error al procesar pago',
        });
      }
    }

    // Si todas las órdenes fallaron, lanzar error
    const allFailed = ordersWithPayment.every((o) => 'error' in o);
    if (allFailed) {
      ordersCreatedTotal.inc({ status: 'failed' });
      endTimer();
      throw new AppError(
        'Error al procesar los pagos. Por favor intenta nuevamente.',
        500
      );
    }

    // Emit order.created events (fire-and-forget)
    if (this.eventBus) {
      for (const { order } of ordersWithPayment) {
        const user = await this.prisma.user.findUnique({
          where: { id: userId },
          select: { nombre: true, apellido: true },
        });

        const seller = await this.prisma.sellerProfile.findUnique({
          where: { id: order.sellerId },
          include: {
            user: {
              select: { nombre: true, apellido: true },
            },
          },
        });

        this.eventBus.emitAsync(
          createEvent(EventTypes.ORDER_CREATED, {
            orderId: order.id,
            userId,
            userName: user ? `${user.nombre} ${user.apellido || ''}`.trim() : 'Usuario',
            sellerId: order.sellerId,
            sellerName: seller
              ? `${seller.user.nombre} ${seller.user.apellido || ''}`.trim()
              : 'Vendedor',
            total: Number(order.total),
            itemCount: order.items.length,
            items: order.items.map((item) => ({
              productId: item.productId,
              productName: item.product.name,
              quantity: item.quantity,
              price: Number(item.price),
            })),
          })
        );
      }
    }

    // Record success metrics
    ordersCreatedTotal.inc({ status: 'pending' });
    endTimer();

    return ordersWithPayment;
  }

  async getMyOrders(userId: string, query: OrderQuery) {
    const { status, page, limit } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(status && { status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
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
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(id: string, userId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: true },
        },
        seller: {
          include: {
            user: {
              select: { id: true, nombre: true, apellido: true },
            },
          },
        },
        user: {
          select: { id: true, nombre: true, apellido: true, email: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Orden no encontrada');
    }

    // Check permission
    if (order.userId !== userId && order.seller.userId !== userId) {
      throw new AppError('No tienes permiso para ver esta orden', 403);
    }

    return order;
  }

  async updateOrderStatus(id: string, userId: string, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        seller: {
          include: {
            user: {
              select: { nombre: true, apellido: true },
            },
          },
        },
        items: {
          include: { product: true },
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
      },
    });

    // Emit events based on status change
    if (this.eventBus) {
      const sellerName = `${order.seller.user.nombre} ${order.seller.user.apellido || ''}`.trim();

      if (status === 'SHIPPED') {
        this.eventBus.emitAsync(
          createEvent(EventTypes.ORDER_SHIPPED, {
            orderId: id,
            userId: order.userId,
            sellerId: order.sellerId,
            trackingNumber: undefined, // TODO: Add tracking number to order model
          })
        );
      } else if (status === 'DELIVERED') {
        this.eventBus.emitAsync(
          createEvent(EventTypes.ORDER_DELIVERED, {
            orderId: id,
            userId: order.userId,
            sellerId: order.sellerId,
            total: Number(order.total),
            deliveredAt: new Date(),
          })
        );
      }
    }

    return updated;
  }

  // ============================================
  // CLEANUP & MAINTENANCE
  // ============================================

  /**
   * Limpia órdenes en estado PENDING_PAYMENT o PAYMENT_FAILED
   * que han superado el timeout (por defecto 30 minutos).
   * Restaura el stock de productos.
   */
  async cleanupFailedOrders(timeoutMinutes: number = 30) {
    const cutoffTime = new Date(Date.now() - timeoutMinutes * 60 * 1000);

    const failedOrders = await this.prisma.order.findMany({
      where: {
        status: {
          in: ['PENDING_PAYMENT', 'PAYMENT_FAILED'],
        },
        createdAt: {
          lt: cutoffTime,
        },
      },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    if (failedOrders.length === 0) {
      return {
        cleaned: 0,
        details: [],
      };
    }

    // Agrupar items por producto para optimizar las actualizaciones
    const productRestores = new Map<string, number>();
    const details: Array<{
      orderId: string;
      itemCount: number;
      totalAmount: number;
      status: string;
      createdAt: Date;
    }> = [];

    for (const order of failedOrders) {
      for (const item of order.items) {
        const current = productRestores.get(item.productId) || 0;
        productRestores.set(item.productId, current + item.quantity);
      }

      details.push({
        orderId: order.id,
        itemCount: order.items.length,
        totalAmount: Number(order.total),
        status: order.status,
        createdAt: order.createdAt,
      });
    }

    // Ejecutar limpieza en transacción con optimistic locking
    await withRetry(
      async () => {
        return this.prisma.$transaction(async (tx) => {
          // Restaurar stock de productos usando optimistic locking
          for (const [productId, quantity] of productRestores) {
            const product = await tx.product.findUnique({
              where: { id: productId },
              select: { version: true },
            });

            if (product) {
              await updateProductWithLocking(
                tx,
                productId,
                product.version,
                {
                  stock: { increment: quantity },
                }
              );
            }
          }

          // Marcar órdenes como canceladas
          await tx.order.updateMany({
            where: {
              id: {
                in: failedOrders.map((o) => o.id),
              },
            },
            data: {
              status: 'CANCELLED',
            },
          });
        });
      },
      { maxRetries: 3, retryDelay: 100 }
    );

    return {
      cleaned: failedOrders.length,
      details,
      productsUpdated: productRestores.size,
    };
  }

  // ============================================
  // SELLER PROFILE
  // ============================================

  async getSellerProfile(userId: string) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: { id: true, nombre: true, apellido: true, avatar: true },
        },
        products: {
          where: { status: 'ACTIVE' },
          take: 10,
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { products: true, orders: true },
        },
      },
    });

    return profile;
  }

  async createSellerProfile(userId: string, data: CreateSellerProfileInput) {
    const existing = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (existing) {
      throw new AppError('Ya tienes un perfil de vendedor', 400);
    }

    return this.prisma.sellerProfile.create({
      data: {
        ...data,
        userId,
      },
    });
  }

  async updateSellerProfile(userId: string, data: UpdateSellerProfileInput) {
    const profile = await this.prisma.sellerProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Perfil de vendedor no encontrado');
    }

    return this.prisma.sellerProfile.update({
      where: { userId },
      data,
    });
  }

  // ============================================
  // REVIEWS
  // ============================================

  async createProductReview(userId: string, productId: string, data: CreateProductReviewInput) {
    // Check if user has purchased this product
    const hasPurchased = await this.prisma.order.findFirst({
      where: {
        userId,
        status: 'DELIVERED',
        items: {
          some: { productId },
        },
      },
    });

    if (!hasPurchased) {
      throw new AppError('Solo puedes resenar productos que hayas comprado', 403);
    }

    // Check for existing review
    const existingReview = await this.prisma.productReview.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existingReview) {
      throw new AppError('Ya has resenado este producto', 400);
    }

    const review = await this.prisma.productReview.create({
      data: {
        userId,
        productId,
        rating: data.rating,
        comment: data.comment,
      },
      include: {
        user: {
          select: { id: true, nombre: true, avatar: true },
        },
      },
    });

    // Update seller rating
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
    });

    if (product) {
      const stats = await this.prisma.productReview.aggregate({
        where: { product: { sellerId: product.sellerId } },
        _avg: { rating: true },
        _count: { rating: true },
      });

      await this.prisma.sellerProfile.update({
        where: { id: product.sellerId },
        data: {
          rating: stats._avg.rating || 0,
          reviewCount: stats._count.rating,
        },
      });
    }

    return review;
  }
}
