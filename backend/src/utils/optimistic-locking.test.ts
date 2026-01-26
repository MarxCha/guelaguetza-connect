import { describe, it, expect, beforeEach } from 'vitest';
import { PrismaClient } from '@prisma/client';
import {
  updateProductWithLocking,
  getProductWithVersion,
  updateTimeSlotWithLocking,
  withRetry,
} from './optimistic-locking.js';
import { ConcurrencyError } from './errors.js';

// Mock PrismaClient
class MockPrismaClient {
  product = {
    updateMany: async ({ where, data }: any) => {
      // Simular actualización exitosa si version coincide
      if (where.version === 5) {
        return { count: 1 };
      }
      // Simular conflicto de versión
      return { count: 0 };
    },
    findUnique: async ({ where }: any) => {
      if (where.id === 'prod-123') {
        return {
          id: 'prod-123',
          name: 'Test Product',
          version: 5,
          stock: 10,
        };
      }
      return null;
    },
  };
}

describe('Optimistic Locking - Product', () => {
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = new MockPrismaClient();
  });

  describe('updateProductWithLocking', () => {
    it('should update product when version matches', async () => {
      const result = await updateProductWithLocking(
        mockPrisma,
        'prod-123',
        5, // versión correcta
        { stock: { decrement: 1 } }
      );

      expect(result).toEqual({
        id: 'prod-123',
        name: 'Test Product',
        version: 5,
        stock: 10,
      });
    });

    it('should throw ConcurrencyError when version does not match', async () => {
      await expect(
        updateProductWithLocking(
          mockPrisma,
          'prod-123',
          3, // versión incorrecta
          { stock: { decrement: 1 } }
        )
      ).rejects.toThrow(ConcurrencyError);
    });

    it('should throw ConcurrencyError with descriptive message', async () => {
      try {
        await updateProductWithLocking(mockPrisma, 'prod-123', 3, {
          stock: { decrement: 1 },
        });
        expect.fail('Should have thrown ConcurrencyError');
      } catch (error) {
        expect(error).toBeInstanceOf(ConcurrencyError);
        expect((error as ConcurrencyError).message).toContain(
          'El producto ha sido modificado por otro usuario'
        );
      }
    });
  });

  describe('getProductWithVersion', () => {
    it('should return product when it exists', async () => {
      const result = await getProductWithVersion(mockPrisma, 'prod-123');

      expect(result).toEqual({
        id: 'prod-123',
        name: 'Test Product',
        version: 5,
        stock: 10,
      });
    });

    it('should throw error when product does not exist', async () => {
      await expect(
        getProductWithVersion(mockPrisma, 'non-existent')
      ).rejects.toThrow('Producto no encontrado');
    });

    it('should validate version when expectedVersion is provided', async () => {
      await expect(
        getProductWithVersion(
          mockPrisma,
          'prod-123',
          3 // versión esperada incorrecta
        )
      ).rejects.toThrow(ConcurrencyError);
    });

    it('should succeed when expectedVersion matches', async () => {
      const result = await getProductWithVersion(
        mockPrisma,
        'prod-123',
        5 // versión esperada correcta
      );

      expect(result.version).toBe(5);
    });
  });

  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        return 'success';
      };

      const result = await withRetry(operation);

      expect(result).toBe('success');
      expect(attempts).toBe(1);
    });

    it('should retry on ConcurrencyError', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        if (attempts < 3) {
          throw new ConcurrencyError('Conflict');
        }
        return 'success after retries';
      };

      const result = await withRetry(operation, { maxRetries: 3, retryDelay: 10 });

      expect(result).toBe('success after retries');
      expect(attempts).toBe(3);
    });

    it('should throw ConcurrencyError after max retries', async () => {
      const operation = async () => {
        throw new ConcurrencyError('Persistent conflict');
      };

      await expect(
        withRetry(operation, { maxRetries: 2, retryDelay: 10 })
      ).rejects.toThrow(ConcurrencyError);
    });

    it('should not retry on non-ConcurrencyError', async () => {
      let attempts = 0;
      const operation = async () => {
        attempts++;
        throw new Error('Regular error');
      };

      await expect(
        withRetry(operation, { maxRetries: 3, retryDelay: 10 })
      ).rejects.toThrow('Regular error');

      expect(attempts).toBe(1); // No retry
    });

    it('should apply exponential backoff', async () => {
      const timestamps: number[] = [];
      let attempts = 0;

      const operation = async () => {
        timestamps.push(Date.now());
        attempts++;
        if (attempts < 3) {
          throw new ConcurrencyError('Conflict');
        }
        return 'success';
      };

      await withRetry(operation, { maxRetries: 3, retryDelay: 50 });

      // Verificar que los delays aumentan exponencialmente
      if (timestamps.length >= 3) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];

        // Segundo delay debe ser aproximadamente el doble del primero
        // (con cierta tolerancia por scheduling del sistema)
        expect(delay2).toBeGreaterThan(delay1 * 1.5);
      }
    });
  });
});

describe('Optimistic Locking - Integration Scenario', () => {
  it('should demonstrate race condition prevention', async () => {
    // Simular el escenario descrito en la documentación

    // Estado inicial del producto
    let productState = {
      id: 'prod-123',
      version: 5,
      stock: 1,
    };

    // Mock de updateMany que simula actualización real
    const mockPrismaWithState = {
      product: {
        updateMany: async ({ where, data }: any) => {
          if (where.version === productState.version) {
            // Actualizar estado
            productState.stock -= 1;
            productState.version += 1;
            return { count: 1 };
          }
          return { count: 0 };
        },
        findUnique: async () => ({ ...productState }),
      },
    };

    // Thread A: Compra exitosa
    const threadA = updateProductWithLocking(
      mockPrismaWithState,
      'prod-123',
      5, // versión correcta
      { stock: { decrement: 1 } }
    );

    // Thread B: Intentará usar la misma versión
    const threadB = updateProductWithLocking(
      mockPrismaWithState,
      'prod-123',
      5, // misma versión - causará conflicto
      { stock: { decrement: 1 } }
    );

    // Esperar ambas operaciones
    const results = await Promise.allSettled([threadA, threadB]);

    // Thread A debe tener éxito
    expect(results[0].status).toBe('fulfilled');

    // Thread B debe fallar con ConcurrencyError
    expect(results[1].status).toBe('rejected');
    if (results[1].status === 'rejected') {
      expect(results[1].reason).toBeInstanceOf(ConcurrencyError);
    }

    // Stock final debe ser 0
    expect(productState.stock).toBe(0);

    // Versión debe haberse incrementado una sola vez
    expect(productState.version).toBe(6);
  });
});
