import Redis, { Redis as RedisClient } from 'ioredis';

export interface CacheConfig {
  host?: string;
  port?: number;
  password?: string;
  db?: number;
  keyPrefix?: string;
  maxRetriesPerRequest?: number;
  retryStrategy?: (times: number) => number | void;
  lazyConnect?: boolean;
}

export interface CacheMetrics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

/**
 * CacheService - Servicio de caching con Redis
 *
 * Características:
 * - Conexión lazy (solo conecta cuando se usa)
 * - Fallback graceful si Redis no está disponible
 * - Serialización/deserialización automática JSON
 * - TTL configurable por operación
 * - Métricas de performance
 * - Soporte para invalidación por patrón
 */
export class CacheService {
  private client: RedisClient | null = null;
  private isConnected = false;
  private isEnabled = true;
  private config: CacheConfig;
  private metrics: CacheMetrics = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  constructor(config: CacheConfig = {}) {
    this.config = {
      keyPrefix: 'guelaguetza:',
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        return delay;
      },
      lazyConnect: true,
      ...config,
    };
  }

  /**
   * Conecta al servidor Redis (lazy connection)
   */
  private async connect(): Promise<void> {
    if (this.isConnected || !this.isEnabled) return;

    try {
      // Parsear REDIS_URL si está disponible
      const redisUrl = process.env.REDIS_URL;

      if (redisUrl) {
        this.client = new Redis(redisUrl, {
          keyPrefix: this.config.keyPrefix,
          maxRetriesPerRequest: this.config.maxRetriesPerRequest,
          retryStrategy: this.config.retryStrategy,
          lazyConnect: this.config.lazyConnect,
        });
      } else {
        // Fallback a configuración manual
        this.client = new Redis({
          host: this.config.host || process.env.REDIS_HOST || '127.0.0.1',
          port: this.config.port || parseInt(process.env.REDIS_PORT || '6379', 10),
          password: this.config.password || process.env.REDIS_PASSWORD,
          db: this.config.db || parseInt(process.env.REDIS_DB || '0', 10),
          keyPrefix: this.config.keyPrefix,
          maxRetriesPerRequest: this.config.maxRetriesPerRequest,
          retryStrategy: this.config.retryStrategy,
          lazyConnect: this.config.lazyConnect,
        });
      }

      // Event handlers
      this.client.on('connect', () => {
        console.log('[Cache] Connected to Redis');
        this.isConnected = true;
      });

      this.client.on('error', (err) => {
        console.error('[Cache] Redis error:', err.message);
        this.metrics.errors++;
        // No deshabilitamos el cache en errores transitorios
      });

      this.client.on('close', () => {
        console.warn('[Cache] Redis connection closed');
        this.isConnected = false;
      });

      // Intentar conectar
      if (this.config.lazyConnect) {
        await this.client.connect();
      }
    } catch (error) {
      console.error('[Cache] Failed to initialize Redis:', error);
      this.isEnabled = false;
      this.client = null;
    }
  }

  /**
   * Verifica si el cache está disponible
   */
  private async ensureConnection(): Promise<boolean> {
    if (!this.isEnabled) return false;

    if (!this.client) {
      await this.connect();
    }

    return this.isConnected && this.client !== null;
  }

  /**
   * Obtiene un valor del cache
   *
   * @param key - Clave del cache
   * @returns El valor deserializado o null si no existe
   */
  async get<T = unknown>(key: string): Promise<T | null> {
    try {
      const isAvailable = await this.ensureConnection();
      if (!isAvailable || !this.client) {
        return null;
      }

      const value = await this.client.get(key);

      if (value === null) {
        this.metrics.misses++;
        return null;
      }

      this.metrics.hits++;
      return JSON.parse(value) as T;
    } catch (error) {
      console.error(`[Cache] Error getting key "${key}":`, error);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Almacena un valor en el cache
   *
   * @param key - Clave del cache
   * @param value - Valor a almacenar (será serializado a JSON)
   * @param ttl - Tiempo de vida en segundos (opcional)
   * @returns true si se almacenó correctamente
   */
  async set<T = unknown>(key: string, value: T, ttl?: number): Promise<boolean> {
    try {
      const isAvailable = await this.ensureConnection();
      if (!isAvailable || !this.client) {
        return false;
      }

      const serialized = JSON.stringify(value);

      if (ttl && ttl > 0) {
        await this.client.setex(key, ttl, serialized);
      } else {
        await this.client.set(key, serialized);
      }

      this.metrics.sets++;
      return true;
    } catch (error) {
      console.error(`[Cache] Error setting key "${key}":`, error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Elimina una clave del cache
   *
   * @param key - Clave a eliminar
   * @returns true si se eliminó correctamente
   */
  async del(key: string): Promise<boolean> {
    try {
      const isAvailable = await this.ensureConnection();
      if (!isAvailable || !this.client) {
        return false;
      }

      await this.client.del(key);
      this.metrics.deletes++;
      return true;
    } catch (error) {
      console.error(`[Cache] Error deleting key "${key}":`, error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Elimina múltiples claves del cache
   *
   * @param keys - Array de claves a eliminar
   * @returns Número de claves eliminadas
   */
  async delMultiple(keys: string[]): Promise<number> {
    try {
      const isAvailable = await this.ensureConnection();
      if (!isAvailable || !this.client || keys.length === 0) {
        return 0;
      }

      const deleted = await this.client.del(...keys);
      this.metrics.deletes += deleted;
      return deleted;
    } catch (error) {
      console.error(`[Cache] Error deleting multiple keys:`, error);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Invalida todas las claves que coincidan con un patrón
   *
   * @param pattern - Patrón de búsqueda (ej: "user:*", "experience:123:*")
   * @returns Número de claves eliminadas
   */
  async invalidate(pattern: string): Promise<number> {
    try {
      const isAvailable = await this.ensureConnection();
      if (!isAvailable || !this.client) {
        return 0;
      }

      // Agregar el prefijo al patrón
      const fullPattern = `${this.config.keyPrefix}${pattern}`;

      // Buscar claves que coincidan con el patrón
      const keys = await this.client.keys(fullPattern);

      if (keys.length === 0) {
        return 0;
      }

      // Eliminar el prefijo antes de borrar (Redis lo agregará automáticamente)
      const keysWithoutPrefix = keys.map((key) =>
        key.replace(this.config.keyPrefix || '', '')
      );

      return await this.delMultiple(keysWithoutPrefix);
    } catch (error) {
      console.error(`[Cache] Error invalidating pattern "${pattern}":`, error);
      this.metrics.errors++;
      return 0;
    }
  }

  /**
   * Verifica si una clave existe en el cache
   *
   * @param key - Clave a verificar
   * @returns true si existe
   */
  async exists(key: string): Promise<boolean> {
    try {
      const isAvailable = await this.ensureConnection();
      if (!isAvailable || !this.client) {
        return false;
      }

      const result = await this.client.exists(key);
      return result === 1;
    } catch (error) {
      console.error(`[Cache] Error checking key existence "${key}":`, error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Establece un TTL para una clave existente
   *
   * @param key - Clave
   * @param ttl - Tiempo de vida en segundos
   * @returns true si se estableció correctamente
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    try {
      const isAvailable = await this.ensureConnection();
      if (!isAvailable || !this.client) {
        return false;
      }

      await this.client.expire(key, ttl);
      return true;
    } catch (error) {
      console.error(`[Cache] Error setting expiration for key "${key}":`, error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Incrementa un contador numérico
   *
   * @param key - Clave del contador
   * @param increment - Valor a incrementar (default: 1)
   * @returns El nuevo valor del contador
   */
  async incr(key: string, increment: number = 1): Promise<number | null> {
    try {
      const isAvailable = await this.ensureConnection();
      if (!isAvailable || !this.client) {
        return null;
      }

      const result = await this.client.incrby(key, increment);
      return result;
    } catch (error) {
      console.error(`[Cache] Error incrementing key "${key}":`, error);
      this.metrics.errors++;
      return null;
    }
  }

  /**
   * Obtiene el tiempo de vida restante de una clave
   *
   * @param key - Clave
   * @returns Segundos restantes o -1 si no tiene TTL, -2 si no existe
   */
  async ttl(key: string): Promise<number> {
    try {
      const isAvailable = await this.ensureConnection();
      if (!isAvailable || !this.client) {
        return -2;
      }

      return await this.client.ttl(key);
    } catch (error) {
      console.error(`[Cache] Error getting TTL for key "${key}":`, error);
      this.metrics.errors++;
      return -2;
    }
  }

  /**
   * Limpia todo el cache (usar con precaución)
   */
  async flush(): Promise<boolean> {
    try {
      const isAvailable = await this.ensureConnection();
      if (!isAvailable || !this.client) {
        return false;
      }

      await this.client.flushdb();
      console.log('[Cache] Cache flushed');
      return true;
    } catch (error) {
      console.error('[Cache] Error flushing cache:', error);
      this.metrics.errors++;
      return false;
    }
  }

  /**
   * Obtiene las métricas actuales del cache
   */
  getMetrics(): CacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Reinicia las métricas
   */
  resetMetrics(): void {
    this.metrics = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
      errors: 0,
    };
  }

  /**
   * Calcula la tasa de aciertos del cache
   */
  getHitRate(): number {
    const total = this.metrics.hits + this.metrics.misses;
    if (total === 0) return 0;
    return (this.metrics.hits / total) * 100;
  }

  /**
   * Verifica si el cache está habilitado y conectado
   */
  isReady(): boolean {
    return this.isEnabled && this.isConnected;
  }

  /**
   * Cierra la conexión a Redis
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.quit();
      this.client = null;
      this.isConnected = false;
      console.log('[Cache] Disconnected from Redis');
    }
  }

  /**
   * Patrón Cache-Aside: Obtiene del cache o ejecuta la función
   *
   * @param key - Clave del cache
   * @param fn - Función a ejecutar si no hay cache
   * @param ttl - Tiempo de vida en segundos
   * @returns El valor cacheado o el resultado de la función
   */
  async wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T> {
    // Intentar obtener del cache
    const cached = await this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    // Ejecutar función
    const result = await fn();

    // Guardar en cache (fire and forget)
    this.set(key, result, ttl).catch((err) => {
      console.error(`[Cache] Error saving wrap result for key "${key}":`, err);
    });

    return result;
  }
}

// Singleton para uso global
let cacheServiceInstance: CacheService | null = null;

export function getCacheService(config?: CacheConfig): CacheService {
  if (!cacheServiceInstance) {
    cacheServiceInstance = new CacheService(config);
  }
  return cacheServiceInstance;
}
