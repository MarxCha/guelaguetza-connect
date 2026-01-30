import { DomainEvent } from './types.js';

/**
 * EventBus - Sistema de pub/sub para eventos del dominio
 *
 * Características:
 * - Soporte para handlers síncronos y asíncronos
 * - Manejo robusto de errores (los errores no afectan otros handlers)
 * - Fire-and-forget para operaciones no críticas
 * - Logging detallado para debugging
 * - Retry automático opcional
 */

export type EventHandler<T = any> = (event: DomainEvent<T>) => Promise<void> | void;

interface EventBusOptions {
  logger?: Logger;
  onError?: (error: Error, event: DomainEvent, handlerName: string) => void;
}

interface Logger {
  info: (message: string, meta?: any) => void;
  error: (message: string, meta?: any) => void;
  warn: (message: string, meta?: any) => void;
  debug: (message: string, meta?: any) => void;
}

const defaultLogger: Logger = {
  info: (message: string, meta?: any) => console.log('[EventBus]', message, meta || ''),
  error: (message: string, meta?: any) => console.error('[EventBus ERROR]', message, meta || ''),
  warn: (message: string, meta?: any) => console.warn('[EventBus WARN]', message, meta || ''),
  debug: (message: string, meta?: any) => console.debug('[EventBus DEBUG]', message, meta || ''),
};

export class EventBus {
  private handlers: Map<string, Array<{ handler: EventHandler; name: string }>> = new Map();
  private logger: Logger;
  private onError?: (error: Error, event: DomainEvent, handlerName: string) => void;

  constructor(options: EventBusOptions = {}) {
    this.logger = options.logger || defaultLogger;
    this.onError = options.onError;
  }

  /**
   * Registra un handler para un tipo de evento específico
   */
  on(eventType: string, handler: EventHandler, handlerName?: string): void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, []);
    }

    const name = handlerName || handler.name || 'anonymous';
    this.handlers.get(eventType)!.push({ handler, name });

    this.logger.debug(`Handler registered: ${name} for event ${eventType}`);
  }

  /**
   * Desregistra un handler específico para un tipo de evento
   */
  off(eventType: string, handler: EventHandler): void {
    const handlers = this.handlers.get(eventType);
    if (!handlers) return;

    const index = handlers.findIndex((h) => h.handler === handler);
    if (index !== -1) {
      const removed = handlers.splice(index, 1)[0];
      this.logger.debug(`Handler unregistered: ${removed.name} for event ${eventType}`);
    }

    // Cleanup empty handler lists
    if (handlers.length === 0) {
      this.handlers.delete(eventType);
    }
  }

  /**
   * Emite un evento y espera a que todos los handlers se ejecuten
   * Los errores en handlers NO detienen la ejecución de otros handlers
   * Retorna información sobre handlers exitosos y fallidos
   */
  async emit<T = any>(event: DomainEvent<T>): Promise<EmitResult> {
    const startTime = Date.now();
    const handlers = this.handlers.get(event.type) || [];

    if (handlers.length === 0) {
      this.logger.debug(`No handlers for event: ${event.type}`, {
        correlationId: event.correlationId,
      });
      return {
        success: true,
        handlersExecuted: 0,
        handlersFailed: 0,
        duration: Date.now() - startTime,
      };
    }

    this.logger.info(`Emitting event: ${event.type}`, {
      correlationId: event.correlationId,
      handlerCount: handlers.length,
      userId: event.userId,
    });

    const results = await Promise.allSettled(
      handlers.map(async ({ handler, name }) => {
        try {
          await handler(event);
          this.logger.debug(`Handler completed: ${name}`, {
            eventType: event.type,
            correlationId: event.correlationId,
          });
          return { name, success: true };
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          this.logger.error(`Handler failed: ${name}`, {
            eventType: event.type,
            correlationId: event.correlationId,
            error: err.message,
            stack: err.stack,
          });

          // Call custom error handler if provided
          if (this.onError) {
            try {
              this.onError(err, event, name);
            } catch (onErrorError) {
              this.logger.error('Error in onError callback', {
                error: onErrorError instanceof Error ? onErrorError.message : String(onErrorError),
              });
            }
          }

          return { name, success: false, error: err };
        }
      })
    );

    // Count based on handler return values, not promise status
    // (try/catch means all promises are fulfilled, errors are in the return value)
    const handlerResults = results
      .filter((r): r is PromiseFulfilledResult<{ name: string; success: boolean; error?: Error }> => r.status === 'fulfilled')
      .map((r) => r.value);

    const successCount = handlerResults.filter((r) => r.success).length;
    const failedCount = handlerResults.filter((r) => !r.success).length;
    const errors = handlerResults.filter((r) => !r.success && r.error).map((r) => r.error!);
    const duration = Date.now() - startTime;

    this.logger.info(`Event processing completed: ${event.type}`, {
      correlationId: event.correlationId,
      duration: `${duration}ms`,
      success: successCount,
      failed: failedCount,
    });

    return {
      success: failedCount === 0,
      handlersExecuted: successCount,
      handlersFailed: failedCount,
      duration,
      errors,
    };
  }

  /**
   * Emite un evento de forma asíncrona (fire-and-forget)
   * NO espera a que los handlers terminen
   * Útil para eventos de baja prioridad (analytics, logging, etc.)
   */
  emitAsync<T = any>(event: DomainEvent<T>): void {
    // Execute in next tick to avoid blocking
    setImmediate(() => {
      this.emit(event).catch((error) => {
        this.logger.error('Error in async emit', {
          eventType: event.type,
          correlationId: event.correlationId,
          error: error instanceof Error ? error.message : String(error),
        });
      });
    });

    this.logger.debug(`Async event queued: ${event.type}`, {
      correlationId: event.correlationId,
    });
  }

  /**
   * Emite un evento con retry automático en caso de fallo
   */
  async emitWithRetry<T = any>(
    event: DomainEvent<T>,
    options: { maxRetries?: number; retryDelay?: number } = {}
  ): Promise<EmitResult> {
    const { maxRetries = 3, retryDelay = 1000 } = options;
    let lastError: Error | undefined;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await this.emit(event);

        // Consider partial success as success (some handlers may have failed)
        if (result.handlersExecuted > 0) {
          if (attempt > 1) {
            this.logger.info(`Event succeeded after ${attempt} attempts`, {
              eventType: event.type,
              correlationId: event.correlationId,
            });
          }
          return result;
        }

        // If no handlers executed successfully, retry with the original error
        if (result.errors && result.errors.length > 0) {
          throw result.errors[0];
        }
        throw new Error('All handlers failed');
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          this.logger.warn(`Retrying event (attempt ${attempt}/${maxRetries})`, {
            eventType: event.type,
            correlationId: event.correlationId,
            error: lastError.message,
          });
          await new Promise((resolve) => setTimeout(resolve, retryDelay * attempt));
        }
      }
    }

    this.logger.error(`Event failed after ${maxRetries} attempts`, {
      eventType: event.type,
      correlationId: event.correlationId,
      error: lastError?.message,
    });

    throw lastError || new Error('Event failed after retries');
  }

  /**
   * Obtiene todos los handlers registrados para un evento
   */
  getHandlers(eventType: string): Array<{ name: string }> {
    return (this.handlers.get(eventType) || []).map(({ name }) => ({ name }));
  }

  /**
   * Obtiene todos los tipos de eventos con handlers registrados
   */
  getEventTypes(): string[] {
    return Array.from(this.handlers.keys());
  }

  /**
   * Limpia todos los handlers (útil para testing)
   */
  clear(): void {
    const eventTypes = this.getEventTypes();
    this.handlers.clear();
    this.logger.debug('All handlers cleared', { eventTypes });
  }

  /**
   * Obtiene estadísticas del EventBus
   */
  getStats(): EventBusStats {
    const stats: EventBusStats = {
      totalEventTypes: this.handlers.size,
      totalHandlers: 0,
      eventTypes: {},
    };

    for (const [eventType, handlers] of this.handlers.entries()) {
      stats.totalHandlers += handlers.length;
      stats.eventTypes[eventType] = {
        handlerCount: handlers.length,
        handlers: handlers.map((h) => h.name),
      };
    }

    return stats;
  }
}

// ============================================
// Types
// ============================================
export interface EmitResult {
  success: boolean;
  handlersExecuted: number;
  handlersFailed: number;
  duration: number;
  errors?: Error[];
}

export interface EventBusStats {
  totalEventTypes: number;
  totalHandlers: number;
  eventTypes: Record<string, {
    handlerCount: number;
    handlers: string[];
  }>;
}

// ============================================
// Singleton Instance (for convenience)
// ============================================
let globalEventBus: EventBus | null = null;

export function getEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus();
  }
  return globalEventBus;
}

export function setEventBus(eventBus: EventBus): void {
  globalEventBus = eventBus;
}
