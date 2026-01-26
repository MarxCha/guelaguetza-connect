import { describe, it, expect, beforeEach } from 'vitest';
import { MarketplaceService } from '../../src/services/marketplace.service.js';
import { AppError, NotFoundError } from '../../src/utils/errors.js';
import { prisma } from './setup-integration.js';
import bcrypt from 'bcryptjs';

describe('MarketplaceService Integration Tests', () => {
  let marketplaceService: MarketplaceService;
  let testUserId: string;
  let testSellerId: string;
  let testSellerProfileId: string;
  let testProductId: string;
  let testProduct2Id: string;

  beforeEach(async () => {
    marketplaceService = new MarketplaceService(prisma);

    // Crear usuario comprador
    const hashedPassword = await bcrypt.hash('Password123!', 10);
    const user = await prisma.user.create({
      data: {
        email: `test-buyer-${Date.now()}@example.com`,
        password: hashedPassword,
        nombre: 'Test',
        apellido: 'Buyer',
      },
    });
    testUserId = user.id;

    // Crear usuario vendedor
    const seller = await prisma.user.create({
      data: {
        email: `test-seller-${Date.now()}@example.com`,
        password: hashedPassword,
        nombre: 'Test',
        apellido: 'Seller',
        role: 'SELLER',
      },
    });
    testSellerId = seller.id;

    // Crear perfil de vendedor
    const sellerProfile = await prisma.sellerProfile.create({
      data: {
        userId: testSellerId,
        storeName: 'Artesanías Oaxaqueñas',
        description: 'Productos artesanales auténticos',
        phoneNumber: '9511234567',
      },
    });
    testSellerProfileId = sellerProfile.id;

    // Crear producto de prueba
    const product = await prisma.product.create({
      data: {
        sellerId: testSellerProfileId,
        name: 'Alebrijes Pequeños',
        description: 'Figuras de madera tallada y pintada a mano',
        price: 250,
        category: 'ARTESANIAS',
        stock: 10,
        images: ['alebrije1.jpg'],
        status: 'ACTIVE',
      },
    });
    testProductId = product.id;

    // Crear segundo producto
    const product2 = await prisma.product.create({
      data: {
        sellerId: testSellerProfileId,
        name: 'Textil Zapoteco',
        description: 'Tapete tejido a mano',
        price: 800,
        category: 'ARTESANIAS',
        stock: 5,
        images: ['textil1.jpg'],
        status: 'ACTIVE',
      },
    });
    testProduct2Id = product2.id;
  });

  describe('createOrder', () => {
    it('should create order successfully', async () => {
      // Agregar productos al carrito
      await marketplaceService.addToCart(testUserId, {
        productId: testProductId,
        quantity: 2,
      });

      // Crear orden
      const result = await marketplaceService.createOrder(testUserId, {
        shippingAddress: {
          street: 'Calle Reforma 123',
          city: 'Oaxaca',
          state: 'Oaxaca',
          zipCode: '68000',
        },
      });

      expect(result).toHaveLength(1);
      expect(result[0].order).toBeDefined();
      expect(result[0].order.userId).toBe(testUserId);
      expect(Number(result[0].order.total)).toBe(500); // 250 * 2
      expect(result[0].order.status).toBe('PENDING');
      expect(result[0].clientSecret).toBeDefined();

      // Verificar que el stock fue reducido
      const updatedProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(updatedProduct?.stock).toBe(8); // 10 - 2
    });

    it('should create multiple orders for multi-seller cart', async () => {
      // Crear segundo vendedor
      const seller2 = await prisma.user.create({
        data: {
          email: `seller2-${Date.now()}@example.com`,
          password: await bcrypt.hash('Password123!', 10),
          nombre: 'Seller',
          apellido: 'Two',
          role: 'SELLER',
        },
      });

      const sellerProfile2 = await prisma.sellerProfile.create({
        data: {
          userId: seller2.id,
          storeName: 'Tienda 2',
          description: 'Otra tienda',
          phoneNumber: '9517654321',
        },
      });

      const product3 = await prisma.product.create({
        data: {
          sellerId: sellerProfile2.id,
          name: 'Producto del Seller 2',
          description: 'Otro producto',
          price: 300,
          category: 'ARTESANIAS',
          stock: 15,
          images: ['prod3.jpg'],
          status: 'ACTIVE',
        },
      });

      // Agregar productos de diferentes vendedores al carrito
      await marketplaceService.addToCart(testUserId, {
        productId: testProductId, // Seller 1
        quantity: 1,
      });

      await marketplaceService.addToCart(testUserId, {
        productId: product3.id, // Seller 2
        quantity: 2,
      });

      // Crear orden
      const result = await marketplaceService.createOrder(testUserId, {
        shippingAddress: {
          street: 'Calle Principal 456',
          city: 'Oaxaca',
          state: 'Oaxaca',
          zipCode: '68000',
        },
      });

      // Deberían crearse 2 órdenes (una por vendedor)
      expect(result).toHaveLength(2);
      expect(result.every((r) => r.order.status === 'PENDING')).toBe(true);

      // Verificar totales
      const order1Total = Number(result[0].order.total);
      const order2Total = Number(result[1].order.total);
      const totalSum = order1Total + order2Total;
      expect(totalSum).toBe(850); // 250 + (300 * 2)
    });

    it('should throw error if cart is empty', async () => {
      await expect(
        marketplaceService.createOrder(testUserId, {
          shippingAddress: {
            street: 'Test',
            city: 'Test',
            state: 'Test',
            zipCode: '00000',
          },
        })
      ).rejects.toThrow('El carrito está vacío');
    });

    it('should validate stock availability', async () => {
      // Agregar más cantidad de la disponible
      await marketplaceService.addToCart(testUserId, {
        productId: testProductId,
        quantity: 5, // Stock es 10
      });

      // Reducir stock manualmente para simular compra concurrente
      await prisma.product.update({
        where: { id: testProductId },
        data: { stock: 3 },
      });

      // Intentar crear orden
      await expect(
        marketplaceService.createOrder(testUserId, {
          shippingAddress: {
            street: 'Test',
            city: 'Test',
            state: 'Test',
            zipCode: '00000',
          },
        })
      ).rejects.toThrow('Stock insuficiente');
    });

    it('should handle concurrent orders for limited stock with optimistic locking', async () => {
      // Crear producto con stock limitado
      const limitedProduct = await prisma.product.create({
        data: {
          sellerId: testSellerProfileId,
          name: 'Producto Limitado',
          description: 'Solo quedan 3',
          price: 500,
          category: 'ARTESANIAS',
          stock: 3,
          images: ['limited.jpg'],
          status: 'ACTIVE',
        },
      });

      // Crear dos usuarios
      const user1 = await prisma.user.create({
        data: {
          email: `user1-${Date.now()}@example.com`,
          password: await bcrypt.hash('Password123!', 10),
          nombre: 'User',
          apellido: 'One',
        },
      });

      const user2 = await prisma.user.create({
        data: {
          email: `user2-${Date.now()}@example.com`,
          password: await bcrypt.hash('Password123!', 10),
          nombre: 'User',
          apellido: 'Two',
        },
      });

      // Agregar producto al carrito de ambos usuarios (pidiendo 2 unidades cada uno)
      await marketplaceService.addToCart(user1.id, {
        productId: limitedProduct.id,
        quantity: 2,
      });

      await marketplaceService.addToCart(user2.id, {
        productId: limitedProduct.id,
        quantity: 2,
      });

      // Intentar crear órdenes simultáneamente
      const orderPromises = [
        marketplaceService.createOrder(user1.id, {
          shippingAddress: {
            street: 'Test 1',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
          },
        }),
        marketplaceService.createOrder(user2.id, {
          shippingAddress: {
            street: 'Test 2',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
          },
        }),
      ];

      const results = await Promise.allSettled(orderPromises);

      // Solo una debería completarse exitosamente (ya que 2+2 > 3 stock disponible)
      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      expect(successful).toBe(1);
      expect(failed).toBe(1);

      // Verificar el error del pedido fallido
      const failedResult = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
      expect(failedResult.reason.message).toContain('Stock insuficiente');

      // Verificar que el stock final es correcto (debe ser 1, ya que 3 - 2 = 1)
      const finalProduct = await prisma.product.findUnique({
        where: { id: limitedProduct.id },
      });
      expect(finalProduct?.stock).toBe(1);
      expect(finalProduct?.version).toBeGreaterThan(1); // Version incrementada por optimistic locking
    });

    it('should prevent overselling with stock validation', async () => {
      // Producto con stock de 5
      const product = await prisma.product.create({
        data: {
          sellerId: testSellerProfileId,
          name: 'Producto Stock Limitado',
          description: 'Solo 5 unidades',
          price: 400,
          category: 'ARTESANIAS',
          stock: 5,
          images: ['stock.jpg'],
          status: 'ACTIVE',
        },
      });

      // Usuario 1 agrega 3 al carrito
      const user1 = await prisma.user.create({
        data: {
          email: `buyer1-${Date.now()}@example.com`,
          password: await bcrypt.hash('Password123!', 10),
          nombre: 'Buyer',
          apellido: 'One',
        },
      });

      await marketplaceService.addToCart(user1.id, {
        productId: product.id,
        quantity: 3,
      });

      // Usuario 2 agrega 4 al carrito (antes de que user1 complete)
      const user2 = await prisma.user.create({
        data: {
          email: `buyer2-${Date.now()}@example.com`,
          password: await bcrypt.hash('Password123!', 10),
          nombre: 'Buyer',
          apellido: 'Two',
        },
      });

      await marketplaceService.addToCart(user2.id, {
        productId: product.id,
        quantity: 4,
      });

      // Usuario 1 crea orden primero (debería tomar 3 unidades)
      const order1 = await marketplaceService.createOrder(user1.id, {
        shippingAddress: {
          street: 'Street 1',
          city: 'Oaxaca',
          state: 'Oaxaca',
          zipCode: '68000',
        },
      });

      expect(order1).toHaveLength(1);

      // Usuario 2 intenta crear orden (debería fallar porque solo quedan 2 unidades)
      await expect(
        marketplaceService.createOrder(user2.id, {
          shippingAddress: {
            street: 'Street 2',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
          },
        })
      ).rejects.toThrow('Stock insuficiente');

      // Verificar stock final (5 - 3 = 2)
      const finalProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(finalProduct?.stock).toBe(2);
    });

    it('should retry on version conflict and succeed', async () => {
      // Crear producto con stock
      const product = await prisma.product.create({
        data: {
          sellerId: testSellerProfileId,
          name: 'Producto con Retry',
          description: 'Test de retry',
          price: 300,
          category: 'ARTESANIAS',
          stock: 10,
          images: ['retry.jpg'],
          status: 'ACTIVE',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: `retry-user-${Date.now()}@example.com`,
          password: await bcrypt.hash('Password123!', 10),
          nombre: 'Retry',
          apellido: 'User',
        },
      });

      await marketplaceService.addToCart(user.id, {
        productId: product.id,
        quantity: 2,
      });

      // Simular actualizaciones concurrentes
      const updatePromise = prisma.product.update({
        where: { id: product.id },
        data: { stock: 9, version: { increment: 1 } },
      });

      const orderPromise = marketplaceService.createOrder(user.id, {
        shippingAddress: {
          street: 'Test',
          city: 'Oaxaca',
          state: 'Oaxaca',
          zipCode: '68000',
        },
      });

      await Promise.all([updatePromise, orderPromise]);

      // Debería completarse exitosamente gracias al retry
      const finalProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });

      // Stock debería ser 7 (9 después de update manual - 2 de la orden)
      expect(finalProduct?.stock).toBe(7);
      expect(finalProduct?.version).toBeGreaterThan(2);
    });

    it('should handle 5 concurrent orders correctly', async () => {
      // Crear producto con stock de 10
      const product = await prisma.product.create({
        data: {
          sellerId: testSellerProfileId,
          name: 'Producto Multi-Concurrent',
          description: 'Test de múltiple concurrencia',
          price: 200,
          category: 'ARTESANIAS',
          stock: 10,
          images: ['multi.jpg'],
          status: 'ACTIVE',
        },
      });

      // Crear 5 usuarios y carritos
      const users = await Promise.all(
        Array.from({ length: 5 }, async (_, i) => {
          const user = await prisma.user.create({
            data: {
              email: `concurrent-${i}-${Date.now()}@example.com`,
              password: await bcrypt.hash('Password123!', 10),
              nombre: `User${i}`,
              apellido: 'Test',
            },
          });

          // Cada uno pide 3 unidades (total = 15, pero solo hay 10)
          await marketplaceService.addToCart(user.id, {
            productId: product.id,
            quantity: 3,
          });

          return user;
        })
      );

      // Crear 5 órdenes simultáneamente
      const orderPromises = users.map((user) =>
        marketplaceService.createOrder(user.id, {
          shippingAddress: {
            street: `Test ${user.nombre}`,
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
          },
        })
      );

      const results = await Promise.allSettled(orderPromises);

      const successful = results.filter((r) => r.status === 'fulfilled').length;
      const failed = results.filter((r) => r.status === 'rejected').length;

      // Solo 3 deberían completarse (3 * 3 = 9), las otras 2 deberían fallar
      expect(successful).toBe(3);
      expect(failed).toBe(2);

      // Verificar stock final
      const finalProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });
      expect(finalProduct?.stock).toBe(1); // 10 - 9 = 1
      expect(finalProduct?.version).toBeGreaterThan(1);

      // Verificar que todos los errores son por stock insuficiente
      const errors = results
        .filter((r) => r.status === 'rejected')
        .map((r) => (r as PromiseRejectedResult).reason.message);

      errors.forEach((error) => {
        expect(error).toContain('Stock insuficiente');
      });
    });
  });

  describe('addToCart / removeFromCart', () => {
    it('should add product to cart', async () => {
      const cart = await marketplaceService.addToCart(testUserId, {
        productId: testProductId,
        quantity: 2,
      });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(2);
      expect(cart.subtotal).toBe(500); // 250 * 2
      expect(cart.itemCount).toBe(2);
    });

    it('should update quantity if product already in cart', async () => {
      await marketplaceService.addToCart(testUserId, {
        productId: testProductId,
        quantity: 2,
      });

      const cart = await marketplaceService.addToCart(testUserId, {
        productId: testProductId,
        quantity: 3,
      });

      expect(cart.items).toHaveLength(1);
      expect(cart.items[0].quantity).toBe(5); // 2 + 3
    });

    it('should throw error if adding more than available stock', async () => {
      await expect(
        marketplaceService.addToCart(testUserId, {
          productId: testProductId,
          quantity: 15, // Stock es 10
        })
      ).rejects.toThrow('Solo hay 10 unidades disponibles');
    });

    it('should remove item from cart', async () => {
      const cartWithItem = await marketplaceService.addToCart(testUserId, {
        productId: testProductId,
        quantity: 2,
      });

      const itemId = cartWithItem.items[0].id;

      const emptyCart = await marketplaceService.removeFromCart(testUserId, itemId);

      expect(emptyCart.items).toHaveLength(0);
      expect(emptyCart.subtotal).toBe(0);
    });

    it('should throw error when removing non-existent item', async () => {
      await expect(
        marketplaceService.removeFromCart(testUserId, 'non-existent-id')
      ).rejects.toThrow(NotFoundError);
    });

    it('should add multiple different products to cart', async () => {
      await marketplaceService.addToCart(testUserId, {
        productId: testProductId,
        quantity: 2,
      });

      const cart = await marketplaceService.addToCart(testUserId, {
        productId: testProduct2Id,
        quantity: 1,
      });

      expect(cart.items).toHaveLength(2);
      expect(cart.subtotal).toBe(1300); // (250 * 2) + (800 * 1)
      expect(cart.itemCount).toBe(3);
    });
  });

  describe('cleanupFailedOrders', () => {
    it('should clean up orders in PENDING_PAYMENT older than timeout', async () => {
      // Agregar al carrito y crear orden
      await marketplaceService.addToCart(testUserId, {
        productId: testProductId,
        quantity: 3,
      });

      const result = await marketplaceService.createOrder(testUserId, {
        shippingAddress: {
          street: 'Test',
          city: 'Oaxaca',
          state: 'Oaxaca',
          zipCode: '68000',
        },
      });

      const orderId = result[0].order.id;

      // Actualizar orden para simular que es antigua
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PENDING_PAYMENT',
          createdAt: new Date(Date.now() - 31 * 60 * 1000), // 31 minutos
        },
      });

      // Ejecutar cleanup
      const cleanupResult = await marketplaceService.cleanupFailedOrders(30);

      expect(cleanupResult.cleaned).toBe(1);

      // Verificar que la orden fue cancelada
      const cleanedOrder = await prisma.order.findUnique({
        where: { id: orderId },
      });
      expect(cleanedOrder?.status).toBe('CANCELLED');

      // Verificar que el stock fue restaurado
      const restoredProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(restoredProduct?.stock).toBe(10); // Restaurado al original
    });

    it('should clean up PAYMENT_FAILED orders', async () => {
      await marketplaceService.addToCart(testUserId, {
        productId: testProductId,
        quantity: 2,
      });

      const result = await marketplaceService.createOrder(testUserId, {
        shippingAddress: {
          street: 'Test',
          city: 'Oaxaca',
          state: 'Oaxaca',
          zipCode: '68000',
        },
      });

      const orderId = result[0].order.id;

      // Marcar como PAYMENT_FAILED y antigua
      await prisma.order.update({
        where: { id: orderId },
        data: {
          status: 'PAYMENT_FAILED',
          createdAt: new Date(Date.now() - 35 * 60 * 1000),
        },
      });

      const cleanupResult = await marketplaceService.cleanupFailedOrders(30);

      expect(cleanupResult.cleaned).toBe(1);

      // Verificar stock restaurado
      const product = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(product?.stock).toBe(10);
    });

    it('should not clean up recent PENDING_PAYMENT orders', async () => {
      await marketplaceService.addToCart(testUserId, {
        productId: testProductId,
        quantity: 2,
      });

      const result = await marketplaceService.createOrder(testUserId, {
        shippingAddress: {
          street: 'Test',
          city: 'Oaxaca',
          state: 'Oaxaca',
          zipCode: '68000',
        },
      });

      const orderId = result[0].order.id;

      await prisma.order.update({
        where: { id: orderId },
        data: { status: 'PENDING_PAYMENT' },
      });

      const cleanupResult = await marketplaceService.cleanupFailedOrders(30);

      expect(cleanupResult.cleaned).toBe(0);

      const uncleaned = await prisma.order.findUnique({
        where: { id: orderId },
      });
      expect(uncleaned?.status).toBe('PENDING_PAYMENT');
    });

    it('should restore stock correctly for multiple failed orders', async () => {
      // Crear 3 órdenes diferentes
      for (let i = 0; i < 3; i++) {
        const user = await prisma.user.create({
          data: {
            email: `user-${i}-${Date.now()}@example.com`,
            password: await bcrypt.hash('Password123!', 10),
            nombre: `User${i}`,
            apellido: 'Test',
          },
        });

        await marketplaceService.addToCart(user.id, {
          productId: testProductId,
          quantity: 1,
        });

        const result = await marketplaceService.createOrder(user.id, {
          shippingAddress: {
            street: 'Test',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
          },
        });

        // Marcar como antigua y PAYMENT_FAILED
        await prisma.order.update({
          where: { id: result[0].order.id },
          data: {
            status: 'PAYMENT_FAILED',
            createdAt: new Date(Date.now() - 31 * 60 * 1000),
          },
        });
      }

      const cleanupResult = await marketplaceService.cleanupFailedOrders(30);

      expect(cleanupResult.cleaned).toBe(3);

      // Verificar que el stock fue restaurado completamente
      const finalProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });
      expect(finalProduct?.stock).toBe(10); // Restaurado al original
    });
  });

  describe('getProducts', () => {
    it('should return products with filters', async () => {
      const result = await marketplaceService.getProducts({
        category: 'ARTESANIAS',
        page: 1,
        limit: 10,
      });

      expect(result.products.length).toBeGreaterThanOrEqual(2);
      expect(result.products.every((p) => p.category === 'ARTESANIAS')).toBe(true);
    });

    it('should filter by price range', async () => {
      const result = await marketplaceService.getProducts({
        minPrice: 200,
        maxPrice: 300,
        page: 1,
        limit: 10,
      });

      expect(result.products).toHaveLength(1);
      expect(Number(result.products[0].price)).toBe(250);
    });

    it('should search by name or description', async () => {
      const result = await marketplaceService.getProducts({
        search: 'Alebrijes',
        page: 1,
        limit: 10,
      });

      expect(result.products.length).toBeGreaterThan(0);
      expect(result.products[0].name).toContain('Alebrijes');
    });

    it('should filter by seller', async () => {
      const result = await marketplaceService.getProducts({
        sellerId: testSellerProfileId,
        page: 1,
        limit: 10,
      });

      expect(result.products.length).toBeGreaterThanOrEqual(2);
      expect(result.products.every((p) => p.sellerId === testSellerProfileId)).toBe(true);
    });
  });

  describe('createSellerProfile', () => {
    it('should create seller profile successfully', async () => {
      const newSeller = await prisma.user.create({
        data: {
          email: `new-seller-${Date.now()}@example.com`,
          password: await bcrypt.hash('Password123!', 10),
          nombre: 'New',
          apellido: 'Seller',
        },
      });

      const profile = await marketplaceService.createSellerProfile(newSeller.id, {
        storeName: 'Nueva Tienda',
        description: 'Descripción de la tienda',
        phoneNumber: '9511111111',
      });

      expect(profile.userId).toBe(newSeller.id);
      expect(profile.storeName).toBe('Nueva Tienda');
    });

    it('should throw error if profile already exists', async () => {
      await expect(
        marketplaceService.createSellerProfile(testSellerId, {
          storeName: 'Duplicate',
          description: 'Test',
          phoneNumber: '9512222222',
        })
      ).rejects.toThrow('Ya tienes un perfil de vendedor');
    });
  });
});
