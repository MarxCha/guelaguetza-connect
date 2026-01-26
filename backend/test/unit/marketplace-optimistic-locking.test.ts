import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConcurrencyError } from '../../src/utils/errors.js';
import {
  withRetry,
  updateProductWithLocking,
  getProductWithVersion,
} from '../../src/utils/optimistic-locking.js';

describe('Optimistic Locking for Products', () => {
  describe('withRetry', () => {
    it('should succeed on first attempt', async () => {
      const mockOperation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(mockOperation);

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should retry on ConcurrencyError and succeed', async () => {
      const mockOperation = vi
        .fn()
        .mockRejectedValueOnce(new ConcurrencyError('Version mismatch'))
        .mockRejectedValueOnce(new ConcurrencyError('Version mismatch'))
        .mockResolvedValueOnce('success');

      const result = await withRetry(mockOperation, {
        maxRetries: 3,
        retryDelay: 10,
      });

      expect(result).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should throw after max retries exceeded', async () => {
      const mockOperation = vi.fn().mockRejectedValue(
        new ConcurrencyError('Persistent version mismatch')
      );

      await expect(
        withRetry(mockOperation, { maxRetries: 3, retryDelay: 10 })
      ).rejects.toThrow(ConcurrencyError);

      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-ConcurrencyError', async () => {
      const mockOperation = vi.fn().mockRejectedValue(
        new Error('Some other error')
      );

      await expect(
        withRetry(mockOperation, { maxRetries: 3, retryDelay: 10 })
      ).rejects.toThrow('Some other error');

      expect(mockOperation).toHaveBeenCalledTimes(1);
    });

    it('should apply exponential backoff', async () => {
      const timestamps: number[] = [];
      const mockOperation = vi.fn().mockImplementation(async () => {
        timestamps.push(Date.now());
        throw new ConcurrencyError('Version mismatch');
      });

      await expect(
        withRetry(mockOperation, { maxRetries: 3, retryDelay: 50 })
      ).rejects.toThrow();

      // Verificar que hay delays crecientes entre intentos
      expect(timestamps).toHaveLength(3);
      const delay1 = timestamps[1] - timestamps[0];
      const delay2 = timestamps[2] - timestamps[1];

      // Delay 2 debería ser aproximadamente el doble de delay 1 (backoff exponencial)
      expect(delay2).toBeGreaterThan(delay1);
    });
  });

  describe('updateProductWithLocking', () => {
    it('should update product when version matches', async () => {
      const mockProduct = {
        id: 'prod-1',
        version: 5,
        stock: 10,
      };

      const mockPrisma = {
        product: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUnique: vi.fn().mockResolvedValue({
            ...mockProduct,
            version: 6,
            stock: 8,
          }),
        },
      };

      const result = await updateProductWithLocking(
        mockPrisma as any,
        'prod-1',
        5,
        { stock: { decrement: 2 } }
      );

      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod-1', version: 5 },
        data: {
          stock: { decrement: 2 },
          version: { increment: 1 },
        },
      });

      expect(result.stock).toBe(8);
      expect(result.version).toBe(6);
    });

    it('should throw ConcurrencyError when version does not match', async () => {
      const mockPrisma = {
        product: {
          updateMany: vi.fn().mockResolvedValue({ count: 0 }),
        },
      };

      await expect(
        updateProductWithLocking(mockPrisma as any, 'prod-1', 5, {
          stock: { decrement: 2 },
        })
      ).rejects.toThrow(ConcurrencyError);

      await expect(
        updateProductWithLocking(mockPrisma as any, 'prod-1', 5, {
          stock: { decrement: 2 },
        })
      ).rejects.toThrow(
        'El producto ha sido modificado por otro usuario'
      );
    });

    it('should support stock increment', async () => {
      const mockPrisma = {
        product: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'prod-1',
            version: 3,
            stock: 15,
          }),
        },
      };

      await updateProductWithLocking(mockPrisma as any, 'prod-1', 2, {
        stock: { increment: 5 },
      });

      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod-1', version: 2 },
        data: {
          stock: { increment: 5 },
          version: { increment: 1 },
        },
      });
    });

    it('should support updating status along with stock', async () => {
      const mockPrisma = {
        product: {
          updateMany: vi.fn().mockResolvedValue({ count: 1 }),
          findUnique: vi.fn().mockResolvedValue({
            id: 'prod-1',
            version: 4,
            stock: 0,
            status: 'SOLD_OUT',
          }),
        },
      };

      await updateProductWithLocking(mockPrisma as any, 'prod-1', 3, {
        stock: { decrement: 10 },
        status: 'SOLD_OUT',
      });

      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: { id: 'prod-1', version: 3 },
        data: {
          stock: { decrement: 10 },
          status: 'SOLD_OUT',
          version: { increment: 1 },
        },
      });
    });
  });

  describe('getProductWithVersion', () => {
    it('should return product when it exists', async () => {
      const mockProduct = {
        id: 'prod-1',
        version: 5,
        stock: 10,
      };

      const mockPrisma = {
        product: {
          findUnique: vi.fn().mockResolvedValue(mockProduct),
        },
      };

      const result = await getProductWithVersion(
        mockPrisma as any,
        'prod-1'
      );

      expect(result).toEqual(mockProduct);
    });

    it('should throw error when product not found', async () => {
      const mockPrisma = {
        product: {
          findUnique: vi.fn().mockResolvedValue(null),
        },
      };

      await expect(
        getProductWithVersion(mockPrisma as any, 'prod-1')
      ).rejects.toThrow('Producto no encontrado');
    });

    it('should throw ConcurrencyError when version does not match', async () => {
      const mockProduct = {
        id: 'prod-1',
        version: 7,
        stock: 10,
      };

      const mockPrisma = {
        product: {
          findUnique: vi.fn().mockResolvedValue(mockProduct),
        },
      };

      await expect(
        getProductWithVersion(mockPrisma as any, 'prod-1', 5)
      ).rejects.toThrow(ConcurrencyError);

      await expect(
        getProductWithVersion(mockPrisma as any, 'prod-1', 5)
      ).rejects.toThrow('El producto ha sido modificado');
    });

    it('should succeed when version matches', async () => {
      const mockProduct = {
        id: 'prod-1',
        version: 5,
        stock: 10,
      };

      const mockPrisma = {
        product: {
          findUnique: vi.fn().mockResolvedValue(mockProduct),
        },
      };

      const result = await getProductWithVersion(
        mockPrisma as any,
        'prod-1',
        5
      );

      expect(result).toEqual(mockProduct);
    });
  });

  describe('Concurrent Stock Updates Simulation', () => {
    it('should handle race condition correctly with optimistic locking', async () => {
      let currentVersion = 1;
      let currentStock = 10;

      // Simular dos transacciones concurrentes
      const mockPrisma = {
        product: {
          updateMany: vi.fn().mockImplementation(({ where, data }) => {
            if (where.version === currentVersion) {
              currentVersion++;
              if (data.stock?.decrement) {
                currentStock -= data.stock.decrement;
              }
              return { count: 1 };
            }
            return { count: 0 }; // Version mismatch
          }),
          findUnique: vi.fn().mockImplementation(() => ({
            id: 'prod-1',
            version: currentVersion,
            stock: currentStock,
          })),
        },
      };

      // Primera transacción intenta decrementar 5
      const tx1 = updateProductWithLocking(mockPrisma as any, 'prod-1', 1, {
        stock: { decrement: 5 },
      });

      // Segunda transacción intenta decrementar 3 (con versión antigua)
      const tx2Promise = updateProductWithLocking(
        mockPrisma as any,
        'prod-1',
        1,
        { stock: { decrement: 3 } }
      );

      await tx1; // Primera tiene éxito
      await expect(tx2Promise).rejects.toThrow(ConcurrencyError); // Segunda falla

      expect(currentStock).toBe(5); // Solo la primera decrementó
      expect(currentVersion).toBe(2); // Version incrementada una vez
    });

    it('should succeed with retry when version conflict is resolved', async () => {
      let currentVersion = 1;
      let currentStock = 10;
      let attemptCount = 0;

      const mockOperation = vi.fn().mockImplementation(async () => {
        attemptCount++;

        const mockPrisma = {
          product: {
            updateMany: vi.fn().mockImplementation(({ where }) => {
              // Primera vez falla, segunda vez tiene éxito
              if (attemptCount === 1) {
                return { count: 0 }; // Simula conflicto
              }

              if (where.version === currentVersion) {
                currentVersion++;
                currentStock -= 2;
                return { count: 1 };
              }
              return { count: 0 };
            }),
            findUnique: vi.fn().mockImplementation(() => ({
              id: 'prod-1',
              version: currentVersion,
              stock: currentStock,
            })),
          },
        };

        return updateProductWithLocking(mockPrisma as any, 'prod-1', currentVersion, {
          stock: { decrement: 2 },
        });
      });

      const result = await withRetry(mockOperation, {
        maxRetries: 3,
        retryDelay: 10,
      });

      expect(attemptCount).toBe(2); // Falló una vez, luego tuvo éxito
      expect(result.stock).toBe(8);
    });
  });
});
