import { describe, it, expect, vi } from 'vitest';
import { withRetry } from '../../src/utils/optimistic-locking.js';
import { ConcurrencyError } from '../../src/utils/errors.js';

describe('Optimistic Locking Utilities', () => {
  describe('withRetry', () => {
    it('should execute operation successfully on first attempt', async () => {
      const operation = vi.fn().mockResolvedValue('success');

      const result = await withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should retry on ConcurrencyError and succeed', async () => {
      let attemptCount = 0;
      const operation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          return Promise.reject(new ConcurrencyError('Conflict'));
        }
        return Promise.resolve('success');
      });

      const result = await withRetry(operation, { maxRetries: 3, retryDelay: 10 });

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should throw ConcurrencyError after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new ConcurrencyError('Conflict'));

      await expect(withRetry(operation, { maxRetries: 3, retryDelay: 10 })).rejects.toThrow(
        ConcurrencyError
      );

      expect(operation).toHaveBeenCalledTimes(3);
    });

    it('should not retry on non-ConcurrencyError', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Other error'));

      await expect(withRetry(operation, { maxRetries: 3, retryDelay: 10 })).rejects.toThrow(
        'Other error'
      );

      expect(operation).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff for retries', async () => {
      const timestamps: number[] = [];
      let attemptCount = 0;

      const operation = vi.fn().mockImplementation(() => {
        attemptCount++;
        timestamps.push(Date.now());

        if (attemptCount < 3) {
          return Promise.reject(new ConcurrencyError('Conflict'));
        }
        return Promise.resolve('success');
      });

      await withRetry(operation, { maxRetries: 3, retryDelay: 50 });

      // Verify exponential backoff (at least some delay between attempts)
      expect(timestamps).toHaveLength(3);

      // First retry should wait ~50ms (2^0 * 50)
      // Second retry should wait ~100ms (2^1 * 50)
      // Allow some tolerance for timing
      const firstDelay = timestamps[1] - timestamps[0];
      const secondDelay = timestamps[2] - timestamps[1];

      expect(firstDelay).toBeGreaterThanOrEqual(40); // 50ms with some tolerance
      expect(secondDelay).toBeGreaterThanOrEqual(90); // 100ms with some tolerance
      expect(secondDelay).toBeGreaterThan(firstDelay); // Exponential increase
    });

    it('should use default options when not provided', async () => {
      let attemptCount = 0;
      const operation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new ConcurrencyError('Conflict'));
        }
        return Promise.resolve('success');
      });

      const result = await withRetry(operation);

      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should propagate the original result from successful operation', async () => {
      const complexResult = {
        id: '123',
        data: { foo: 'bar' },
        nested: { deep: { value: 42 } },
      };

      const operation = vi.fn().mockResolvedValue(complexResult);

      const result = await withRetry(operation);

      expect(result).toEqual(complexResult);
    });

    it('should handle async errors correctly', async () => {
      let attemptCount = 0;
      const operation = vi.fn().mockImplementation(async () => {
        attemptCount++;
        // Simulate async operation
        await new Promise((resolve) => setTimeout(resolve, 5));

        if (attemptCount < 2) {
          throw new ConcurrencyError('Async conflict');
        }
        return 'async success';
      });

      const result = await withRetry(operation, { retryDelay: 10 });

      expect(result).toBe('async success');
      expect(operation).toHaveBeenCalledTimes(2);
    });

    it('should respect custom maxRetries option', async () => {
      const operation = vi.fn().mockRejectedValue(new ConcurrencyError('Conflict'));

      await expect(withRetry(operation, { maxRetries: 5, retryDelay: 10 })).rejects.toThrow(
        ConcurrencyError
      );

      expect(operation).toHaveBeenCalledTimes(5);
    });

    it('should handle zero retry delay', async () => {
      let attemptCount = 0;
      const operation = vi.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 2) {
          return Promise.reject(new ConcurrencyError('Conflict'));
        }
        return Promise.resolve('success');
      });

      const startTime = Date.now();
      const result = await withRetry(operation, { maxRetries: 3, retryDelay: 0 });
      const endTime = Date.now();

      expect(result).toBe('success');
      expect(endTime - startTime).toBeLessThan(50); // Should be very fast
    });
  });
});
