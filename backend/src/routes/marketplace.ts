import { FastifyPluginAsync } from 'fastify';
import { ZodTypeProvider } from 'fastify-type-provider-zod';
import { z } from 'zod';
import { MarketplaceService } from '../services/marketplace.service.js';
import { ConcurrencyError } from '../utils/errors.js';
import {
  CreateProductSchema,
  UpdateProductSchema,
  ProductQuerySchema,
  AddToCartSchema,
  UpdateCartItemSchema,
  CreateOrderSchema,
  OrderQuerySchema,
  UpdateOrderStatusSchema,
  CreateProductReviewSchema,
  CreateSellerProfileSchema,
  UpdateSellerProfileSchema,
} from '../schemas/marketplace.schema.js';

const marketplaceRoutes: FastifyPluginAsync = async (fastify) => {
  const app = fastify.withTypeProvider<ZodTypeProvider>();
  const marketplaceService = new MarketplaceService(fastify.prisma, fastify.cache, fastify.eventBus);

  // ============================================
  // PRODUCTS (Public)
  // ============================================

  // List products
  app.get(
    '/products',
    {
      schema: {
        querystring: ProductQuerySchema,
      },
    },
    async (request) => {
      return marketplaceService.getProducts(request.query);
    }
  );

  // Get product detail
  app.get(
    '/products/:id',
    {
      schema: {
        params: z.object({ id: z.string().cuid() }),
      },
    },
    async (request) => {
      const { id } = request.params;
      return marketplaceService.getProductById(id);
    }
  );

  // ============================================
  // PRODUCTS (Seller)
  // ============================================

  // Create product
  app.post(
    '/products',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: CreateProductSchema,
      },
    },
    async (request, reply) => {
      const product = await marketplaceService.createProduct(
        request.user.userId,
        request.body
      );
      return reply.status(201).send(product);
    }
  );

  // Update product
  app.put(
    '/products/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
        body: UpdateProductSchema,
      },
    },
    async (request) => {
      const { id } = request.params;
      return marketplaceService.updateProduct(id, request.user.userId, request.body);
    }
  );

  // Delete product
  app.delete(
    '/products/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
      },
    },
    async (request) => {
      const { id } = request.params;
      return marketplaceService.deleteProduct(id, request.user.userId);
    }
  );

  // ============================================
  // CART
  // ============================================

  // Get cart
  app.get(
    '/cart',
    {
      onRequest: [fastify.authenticate],
    },
    async (request) => {
      return marketplaceService.getCart(request.user.userId);
    }
  );

  // Add to cart
  app.post(
    '/cart/items',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: AddToCartSchema,
      },
    },
    async (request, reply) => {
      const cart = await marketplaceService.addToCart(
        request.user.userId,
        request.body
      );
      return reply.status(201).send(cart);
    }
  );

  // Update cart item
  app.put(
    '/cart/items/:itemId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ itemId: z.string().cuid() }),
        body: UpdateCartItemSchema,
      },
    },
    async (request) => {
      const { itemId } = request.params;
      return marketplaceService.updateCartItem(
        request.user.userId,
        itemId,
        request.body
      );
    }
  );

  // Remove from cart
  app.delete(
    '/cart/items/:itemId',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ itemId: z.string().cuid() }),
      },
    },
    async (request) => {
      const { itemId } = request.params;
      return marketplaceService.removeFromCart(request.user.userId, itemId);
    }
  );

  // Clear cart
  app.delete(
    '/cart',
    {
      onRequest: [fastify.authenticate],
    },
    async (request) => {
      return marketplaceService.clearCart(request.user.userId);
    }
  );

  // ============================================
  // ORDERS
  // ============================================

  // Create order (checkout)
  app.post(
    '/checkout',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: CreateOrderSchema,
      },
    },
    async (request, reply) => {
      try {
        const orders = await marketplaceService.createOrder(
          request.user.userId,
          request.body
        );
        return reply.status(201).send(orders);
      } catch (error) {
        if (error instanceof ConcurrencyError) {
          return reply.status(409).send({
            error: 'ConcurrencyError',
            message: error.message,
          });
        }
        throw error;
      }
    }
  );

  // Get my orders
  app.get(
    '/orders',
    {
      onRequest: [fastify.authenticate],
      schema: {
        querystring: OrderQuerySchema,
      },
    },
    async (request) => {
      return marketplaceService.getMyOrders(request.user.userId, request.query);
    }
  );

  // Get order detail
  app.get(
    '/orders/:id',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
      },
    },
    async (request) => {
      const { id } = request.params;
      return marketplaceService.getOrderById(id, request.user.userId);
    }
  );

  // Update order status (seller only)
  app.put(
    '/orders/:id/status',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
        body: UpdateOrderStatusSchema,
      },
    },
    async (request) => {
      const { id } = request.params;
      return marketplaceService.updateOrderStatus(
        id,
        request.user.userId,
        request.body.status
      );
    }
  );

  // ============================================
  // SELLER PROFILE
  // ============================================

  // Get my seller profile
  app.get(
    '/seller/profile',
    {
      onRequest: [fastify.authenticate],
    },
    async (request) => {
      return marketplaceService.getSellerProfile(request.user.userId);
    }
  );

  // Create seller profile
  app.post(
    '/seller/profile',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: CreateSellerProfileSchema,
      },
    },
    async (request, reply) => {
      const profile = await marketplaceService.createSellerProfile(
        request.user.userId,
        request.body
      );
      return reply.status(201).send(profile);
    }
  );

  // Update seller profile
  app.put(
    '/seller/profile',
    {
      onRequest: [fastify.authenticate],
      schema: {
        body: UpdateSellerProfileSchema,
      },
    },
    async (request) => {
      return marketplaceService.updateSellerProfile(
        request.user.userId,
        request.body
      );
    }
  );

  // Get seller's orders
  app.get(
    '/seller/orders',
    {
      onRequest: [fastify.authenticate],
      schema: {
        querystring: OrderQuerySchema,
      },
    },
    async (request) => {
      const profile = await marketplaceService.getSellerProfile(request.user.userId);
      if (!profile) {
        return { orders: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } };
      }
      // This would need a separate method for seller orders
      return marketplaceService.getMyOrders(request.user.userId, request.query);
    }
  );

  // ============================================
  // REVIEWS
  // ============================================

  // Create product review
  app.post(
    '/products/:id/reviews',
    {
      onRequest: [fastify.authenticate],
      schema: {
        params: z.object({ id: z.string().cuid() }),
        body: CreateProductReviewSchema,
      },
    },
    async (request, reply) => {
      const { id } = request.params;
      const review = await marketplaceService.createProductReview(
        request.user.userId,
        id,
        request.body
      );
      return reply.status(201).send(review);
    }
  );
};

export default marketplaceRoutes;
