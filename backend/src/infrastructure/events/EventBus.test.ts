import { describe, it, expect, beforeEach, vi } from 'vitest';
import { EventBus } from './EventBus.js';
import { DomainEvent } from './types.js';

describe('EventBus', () => {
  let eventBus: EventBus;

  beforeEach(() => {
    eventBus = new EventBus();
  });

  describe('on/off - Handler Registration', () => {
    it('should register a handler for an event type', () => {
      const handler = vi.fn();
      eventBus.on('test.event', handler, 'testHandler');

      const handlers = eventBus.getHandlers('test.event');
      expect(handlers).toHaveLength(1);
      expect(handlers[0].name).toBe('testHandler');
    });

    it('should register multiple handlers for the same event type', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      eventBus.on('test.event', handler1, 'handler1');
      eventBus.on('test.event', handler2, 'handler2');

      const handlers = eventBus.getHandlers('test.event');
      expect(handlers).toHaveLength(2);
    });

    it('should unregister a handler', () => {
      const handler = vi.fn();
      eventBus.on('test.event', handler);
      eventBus.off('test.event', handler);

      const handlers = eventBus.getHandlers('test.event');
      expect(handlers).toHaveLength(0);
    });

    it('should cleanup event type when all handlers are removed', () => {
      const handler = vi.fn();
      eventBus.on('test.event', handler);
      eventBus.off('test.event', handler);

      const eventTypes = eventBus.getEventTypes();
      expect(eventTypes).not.toContain('test.event');
    });
  });

  describe('emit - Event Emission', () => {
    it('should execute all registered handlers when event is emitted', async () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();

      eventBus.on('test.event', handler1);
      eventBus.on('test.event', handler2);

      const event: DomainEvent = {
        type: 'test.event',
        payload: { data: 'test' },
        timestamp: new Date(),
        correlationId: 'test-123',
      };

      const result = await eventBus.emit(event);

      expect(handler1).toHaveBeenCalledWith(event);
      expect(handler2).toHaveBeenCalledWith(event);
      expect(result.success).toBe(true);
      expect(result.handlersExecuted).toBe(2);
      expect(result.handlersFailed).toBe(0);
    });

    it('should return success false when all handlers fail', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Handler failed'));
      eventBus.on('test.event', handler);

      const event: DomainEvent = {
        type: 'test.event',
        payload: {},
        timestamp: new Date(),
        correlationId: 'test-123',
      };

      const result = await eventBus.emit(event);

      expect(result.success).toBe(false);
      expect(result.handlersExecuted).toBe(0);
      expect(result.handlersFailed).toBe(1);
      expect(result.errors).toHaveLength(1);
    });

    it('should execute all handlers even if one fails', async () => {
      const handler1 = vi.fn().mockRejectedValue(new Error('Handler 1 failed'));
      const handler2 = vi.fn();

      eventBus.on('test.event', handler1, 'failingHandler');
      eventBus.on('test.event', handler2, 'successHandler');

      const event: DomainEvent = {
        type: 'test.event',
        payload: {},
        timestamp: new Date(),
        correlationId: 'test-123',
      };

      const result = await eventBus.emit(event);

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
      expect(result.handlersExecuted).toBe(1);
      expect(result.handlersFailed).toBe(1);
    });

    it('should call onError callback when handler fails', async () => {
      const onError = vi.fn();
      const eventBusWithErrorHandler = new EventBus({ onError });

      const handler = vi.fn().mockRejectedValue(new Error('Test error'));
      eventBusWithErrorHandler.on('test.event', handler, 'failingHandler');

      const event: DomainEvent = {
        type: 'test.event',
        payload: {},
        timestamp: new Date(),
        correlationId: 'test-123',
      };

      await eventBusWithErrorHandler.emit(event);

      expect(onError).toHaveBeenCalled();
    });

    it('should return early when no handlers are registered', async () => {
      const event: DomainEvent = {
        type: 'nonexistent.event',
        payload: {},
        timestamp: new Date(),
        correlationId: 'test-123',
      };

      const result = await eventBus.emit(event);

      expect(result.success).toBe(true);
      expect(result.handlersExecuted).toBe(0);
      expect(result.handlersFailed).toBe(0);
    });
  });

  describe('emitAsync - Fire and Forget', () => {
    it('should queue event emission asynchronously', () => {
      const handler = vi.fn();
      eventBus.on('test.event', handler);

      const event: DomainEvent = {
        type: 'test.event',
        payload: {},
        timestamp: new Date(),
        correlationId: 'test-123',
      };

      // emitAsync returns immediately
      eventBus.emitAsync(event);

      // Handler should NOT have been called yet (it's async)
      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('emitWithRetry - Retry Logic', () => {
    it('should retry on failure and succeed eventually', async () => {
      let attempts = 0;
      const handler = vi.fn().mockImplementation(() => {
        attempts++;
        if (attempts < 2) {
          throw new Error('Temporary failure');
        }
        return Promise.resolve();
      });

      eventBus.on('test.event', handler);

      const event: DomainEvent = {
        type: 'test.event',
        payload: {},
        timestamp: new Date(),
        correlationId: 'test-123',
      };

      const result = await eventBus.emitWithRetry(event, {
        maxRetries: 3,
        retryDelay: 10,
      });

      expect(handler).toHaveBeenCalledTimes(2);
      expect(result.success).toBe(true);
    });

    it('should fail after max retries', async () => {
      const handler = vi.fn().mockRejectedValue(new Error('Permanent failure'));
      eventBus.on('test.event', handler);

      const event: DomainEvent = {
        type: 'test.event',
        payload: {},
        timestamp: new Date(),
        correlationId: 'test-123',
      };

      await expect(
        eventBus.emitWithRetry(event, {
          maxRetries: 2,
          retryDelay: 10,
        })
      ).rejects.toThrow('Permanent failure');

      expect(handler).toHaveBeenCalledTimes(2);
    });
  });

  describe('getStats - Statistics', () => {
    it('should return correct stats', () => {
      const handler1 = vi.fn();
      const handler2 = vi.fn();
      const handler3 = vi.fn();

      eventBus.on('event.one', handler1, 'handler1');
      eventBus.on('event.one', handler2, 'handler2');
      eventBus.on('event.two', handler3, 'handler3');

      const stats = eventBus.getStats();

      expect(stats.totalEventTypes).toBe(2);
      expect(stats.totalHandlers).toBe(3);
      expect(stats.eventTypes['event.one'].handlerCount).toBe(2);
      expect(stats.eventTypes['event.two'].handlerCount).toBe(1);
    });
  });

  describe('clear - Cleanup', () => {
    it('should remove all handlers', () => {
      eventBus.on('event.one', vi.fn());
      eventBus.on('event.two', vi.fn());

      eventBus.clear();

      expect(eventBus.getEventTypes()).toHaveLength(0);
      expect(eventBus.getStats().totalHandlers).toBe(0);
    });
  });
});
