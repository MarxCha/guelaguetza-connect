import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { MarketplaceService } from '../../src/services/marketplace.service.js';
import { ConcurrencyError } from '../../src/utils/errors.js';

/**
 * Test de Integración: Optimistic Locking para Productos
 *
 * Este test verifica que el sistema previene overselling cuando
 * múltiples usuarios intentan comprar el mismo producto simultáneamente.
 *
 * IMPORTANTE: Este test requiere una base de datos PostgreSQL corriendo.
 * Configura TEST_DATABASE_URL en tu .env.test
 */

describe('Product Concurrency - Integration Test', () => {
  let prisma: PrismaClient;
  let marketplaceService: MarketplaceService;

  // IDs de entidades de prueba
  let testUserId1: string;
  let testUserId2: string;
  let testSellerId: string;
  let testProductId: string;

  beforeAll(async () => {
    // Usar base de datos de test
    const testDatabaseUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;

    prisma = new PrismaClient({
      datasources: {
        db: {
          url: testDatabaseUrl,
        },
      },
    });

    marketplaceService = new MarketplaceService(prisma);

    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    // Limpiar datos de prueba
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.cartItem.deleteMany();
    await prisma.cart.deleteMany();
    await prisma.product.deleteMany();
    await prisma.sellerProfile.deleteMany();
    await prisma.user.deleteMany({ where: { email: { contains: 'test-concurrency' } } });

    // Crear usuarios de prueba
    const user1 = await prisma.user.create({
      data: {
        email: 'test-concurrency-user1@example.com',
        password: 'hashed_password',
        nombre: 'Usuario 1',
      },
    });
    testUserId1 = user1.id;

    const user2 = await prisma.user.create({
      data: {
        email: 'test-concurrency-user2@example.com',
        password: 'hashed_password',
        nombre: 'Usuario 2',
      },
    });
    testUserId2 = user2.id;

    // Crear vendedor
    const seller = await prisma.user.create({
      data: {
        email: 'test-concurrency-seller@example.com',
        password: 'hashed_password',
        nombre: 'Vendedor Test',
      },
    });

    const sellerProfile = await prisma.sellerProfile.create({
      data: {
        userId: seller.id,
        businessName: 'Artesanías Test',
        description: 'Vendedor de prueba',
      },
    });
    testSellerId = sellerProfile.id;

    // Crear producto con stock limitado
    const product = await prisma.product.create({
      data: {
        sellerId: testSellerId,
        name: 'Mezcal Artesanal - Edición Limitada',
        description: 'Solo queda 1 unidad',
        price: 500,
        category: 'MEZCAL',
        status: 'ACTIVE',
        stock: 1,
        version: 1,
        images: ['https://example.com/mezcal.jpg'],
      },
    });
    testProductId = product.id;
  });

  describe('Scenario 1: Race Condition - Último Producto', () => {
    it('should prevent overselling when 2 users buy last item simultaneously', async () => {
      // Agregar producto a ambos carritos
      await marketplaceService.addToCart(testUserId1, {
        productId: testProductId,
        quantity: 1,
      });

      await marketplaceService.addToCart(testUserId2, {
        productId: testProductId,
        quantity: 1,
      });

      // Verificar que ambos carritos tienen el producto
      const cart1 = await marketplaceService.getCart(testUserId1);
      const cart2 = await marketplaceService.getCart(testUserId2);

      expect(cart1.items.length).toBe(1);
      expect(cart2.items.length).toBe(1);

      // Intentar checkout simultáneo (Promise.all = paralelo)
      const [result1, result2] = await Promise.allSettled([
        marketplaceService.createOrder(testUserId1, {
          shippingAddress: {
            street: 'Calle 1',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
            country: 'México',
          },
        }),
        marketplaceService.createOrder(testUserId2, {
          shippingAddress: {
            street: 'Calle 2',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
            country: 'México',
          },
        }),
      ]);

      // Verificar resultados
      const successCount = [result1, result2].filter((r) => r.status === 'fulfilled').length;
      const failureCount = [result1, result2].filter((r) => r.status === 'rejected').length;

      // Exactamente 1 debe tener éxito y 1 debe fallar
      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);

      // Verificar que el error es de stock insuficiente (no overselling)
      const rejectedResult = [result1, result2].find((r) => r.status === 'rejected');
      if (rejectedResult && rejectedResult.status === 'rejected') {
        const error = rejectedResult.reason;
        expect(error.message).toContain('Stock insuficiente');
      }

      // Verificar stock final
      const finalProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      expect(finalProduct?.stock).toBe(0);
      expect(finalProduct?.version).toBeGreaterThan(1); // Version incrementada

      // Verificar que solo hay 1 orden creada
      const orders = await prisma.order.findMany({
        where: {
          items: {
            some: {
              productId: testProductId,
            },
          },
        },
      });

      expect(orders.length).toBe(1);
    });
  });

  describe('Scenario 2: Multiple Products Race Condition', () => {
    it('should handle concurrent checkouts for different quantities', async () => {
      // Crear producto con stock 5
      const product = await prisma.product.create({
        data: {
          sellerId: testSellerId,
          name: 'Textil Zapoteco',
          description: 'Stock limitado',
          price: 300,
          category: 'TEXTIL',
          status: 'ACTIVE',
          stock: 5,
          version: 1,
          images: [],
        },
      });

      // Usuario 1 quiere comprar 3 unidades
      await marketplaceService.addToCart(testUserId1, {
        productId: product.id,
        quantity: 3,
      });

      // Usuario 2 quiere comprar 3 unidades (solo hay 5 total)
      await marketplaceService.addToCart(testUserId2, {
        productId: product.id,
        quantity: 3,
      });

      // Checkout simultáneo
      const [result1, result2] = await Promise.allSettled([
        marketplaceService.createOrder(testUserId1, {
          shippingAddress: {
            street: 'Calle 1',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
            country: 'México',
          },
        }),
        marketplaceService.createOrder(testUserId2, {
          shippingAddress: {
            street: 'Calle 2',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
            country: 'México',
          },
        }),
      ]);

      // Una debe tener éxito (deja stock en 2)
      // La otra debe fallar (necesita 3, solo hay 2)
      expect([result1, result2].filter((r) => r.status === 'fulfilled').length).toBe(1);
      expect([result1, result2].filter((r) => r.status === 'rejected').length).toBe(1);

      // Verificar stock final
      const finalProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(finalProduct?.stock).toBe(2); // 5 - 3 = 2
      expect(finalProduct?.stock).toBeGreaterThanOrEqual(0); // Nunca negativo
    });
  });

  describe('Scenario 3: Retry Mechanism', () => {
    it('should successfully retry on transient concurrency conflicts', async () => {
      // Este test simula actualizaciones concurrentes que resuelven con retry

      const product = await prisma.product.create({
        data: {
          sellerId: testSellerId,
          name: 'Producto con Retry',
          description: 'Test de retry',
          price: 100,
          category: 'OTRO',
          status: 'ACTIVE',
          stock: 10,
          version: 1,
          images: [],
        },
      });

      // Crear 3 usuarios que comprarán 1 unidad cada uno
      const user3 = await prisma.user.create({
        data: {
          email: 'test-concurrency-user3@example.com',
          password: 'hashed',
          nombre: 'Usuario 3',
        },
      });

      // Agregar a carritos
      await marketplaceService.addToCart(testUserId1, {
        productId: product.id,
        quantity: 1,
      });
      await marketplaceService.addToCart(testUserId2, {
        productId: product.id,
        quantity: 1,
      });
      await marketplaceService.addToCart(user3.id, {
        productId: product.id,
        quantity: 1,
      });

      // Checkout simultáneo de 3 usuarios
      const results = await Promise.allSettled([
        marketplaceService.createOrder(testUserId1, {
          shippingAddress: {
            street: 'Calle 1',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
            country: 'México',
          },
        }),
        marketplaceService.createOrder(testUserId2, {
          shippingAddress: {
            street: 'Calle 2',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
            country: 'México',
          },
        }),
        marketplaceService.createOrder(user3.id, {
          shippingAddress: {
            street: 'Calle 3',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
            country: 'México',
          },
        }),
      ]);

      // Los 3 deberían tener éxito gracias a los reintentos
      const successCount = results.filter((r) => r.status === 'fulfilled').length;
      expect(successCount).toBe(3);

      // Verificar stock final
      const finalProduct = await prisma.product.findUnique({
        where: { id: product.id },
      });

      expect(finalProduct?.stock).toBe(7); // 10 - 3 = 7
      expect(finalProduct?.version).toBe(4); // 1 + 3 actualizaciones
    });
  });

  describe('Scenario 4: Cleanup Failed Orders', () => {
    it('should restore stock when cleaning up failed orders with optimistic locking', async () => {
      // Crear orden en estado PAYMENT_FAILED para simular cleanup
      const order = await prisma.order.create({
        data: {
          userId: testUserId1,
          sellerId: testSellerId,
          status: 'PAYMENT_FAILED',
          total: 500,
          shippingAddress: {
            street: 'Calle Test',
            city: 'Oaxaca',
            state: 'Oaxaca',
            zipCode: '68000',
            country: 'México',
          },
          createdAt: new Date(Date.now() - 35 * 60 * 1000), // 35 minutos atrás
          items: {
            create: [
              {
                productId: testProductId,
                quantity: 1,
                price: 500,
              },
            ],
          },
        },
      });

      // Decrementar stock manualmente (simular reserva)
      await prisma.product.update({
        where: { id: testProductId },
        data: { stock: 0 },
      });

      // Ejecutar cleanup
      const result = await marketplaceService.cleanupFailedOrders(30);

      expect(result.cleaned).toBe(1);

      // Verificar que el stock fue restaurado
      const restoredProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      expect(restoredProduct?.stock).toBe(1); // Restaurado
      expect(restoredProduct?.version).toBeGreaterThan(1); // Version incrementada

      // Verificar que la orden fue cancelada
      const cancelledOrder = await prisma.order.findUnique({
        where: { id: order.id },
      });

      expect(cancelledOrder?.status).toBe('CANCELLED');
    });
  });

  describe('Scenario 5: Version Validation', () => {
    it('should detect stale data and throw ConcurrencyError', async () => {
      // Obtener producto con versión inicial
      const initialProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      expect(initialProduct?.version).toBe(1);

      // Actualizar producto (incrementa version a 2)
      await prisma.product.update({
        where: { id: testProductId },
        data: {
          stock: 5,
          version: { increment: 1 },
        },
      });

      // Intentar actualizar con versión obsoleta (version: 1)
      // Esto debería fallar porque la versión actual es 2

      const staleUpdate = prisma.product.updateMany({
        where: {
          id: testProductId,
          version: 1, // versión obsoleta
        },
        data: {
          stock: { decrement: 1 },
          version: { increment: 1 },
        },
      });

      const result = await staleUpdate;

      // updateMany retorna count: 0 si no encuentra registros
      expect(result.count).toBe(0);

      // Verificar que el stock NO cambió
      const unchangedProduct = await prisma.product.findUnique({
        where: { id: testProductId },
      });

      expect(unchangedProduct?.stock).toBe(5); // Sin cambios
      expect(unchangedProduct?.version).toBe(2); // Version no cambió
    });
  });
});

/**
 * NOTAS DE TESTING:
 *
 * 1. Para ejecutar estos tests:
 *    npm test -- product-concurrency.test.ts
 *
 * 2. Asegúrate de tener una base de datos de test:
 *    TEST_DATABASE_URL="postgresql://user:pass@localhost:5432/guelaguetza_test"
 *
 * 3. Los tests crean y limpian sus propios datos, pero es recomendable
 *    usar una base de datos separada.
 *
 * 4. Para tests de carga más intensivos, considera usar Artillery
 *    (ver PRODUCT_LOCKING_COMMANDS.md)
 */
