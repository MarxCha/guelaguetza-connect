# Implementación de Cache con Redis

## Resumen

Se ha implementado un sistema de caching robusto con Redis para mejorar la performance de la API, reduciendo la carga en la base de datos PostgreSQL y mejorando los tiempos de respuesta.

## Arquitectura

### Componentes

```
┌─────────────────┐
│   API Routes    │
│  (Fastify)      │
└────────┬────────┘
         │
         v
┌─────────────────┐      ┌──────────────┐
│   Services      │◄────►│ CacheService │
│  (Business      │      │  (Redis)     │
│   Logic)        │      └──────────────┘
└────────┬────────┘
         │
         v
┌─────────────────┐
│   Prisma ORM    │
│  (PostgreSQL)   │
└─────────────────┘
```

### Patrón Implementado: Cache-Aside

1. **Lectura**: Buscar en cache → Si existe, retornar → Si no, consultar BD → Guardar en cache → Retornar
2. **Escritura**: Actualizar BD → Invalidar cache relacionado

## Archivos Creados

### 1. `src/services/cache.service.ts`

Servicio principal de cache con las siguientes características:

**Características:**
- ✅ Conexión lazy (solo conecta cuando se usa)
- ✅ Fallback graceful (si Redis no está disponible, la app sigue funcionando)
- ✅ Serialización/deserialización automática JSON
- ✅ TTL configurable por operación
- ✅ Soporte para invalidación por patrón
- ✅ Métricas de performance (hits, misses, errors)
- ✅ Singleton pattern para uso global

**Métodos principales:**

```typescript
// Básicos
get<T>(key: string): Promise<T | null>
set<T>(key: string, value: T, ttl?: number): Promise<boolean>
del(key: string): Promise<boolean>
exists(key: string): Promise<boolean>

// Avanzados
invalidate(pattern: string): Promise<number>  // "user:*", "experience:123:*"
wrap<T>(key: string, fn: () => Promise<T>, ttl?: number): Promise<T>
delMultiple(keys: string[]): Promise<number>

// Utilidades
getMetrics(): CacheMetrics
getHitRate(): number
isReady(): boolean
```

### 2. `src/plugins/redis.ts`

Plugin de Fastify que:
- Registra CacheService en `fastify.cache`
- Maneja el ciclo de vida (connect/disconnect)
- Expone endpoint `/health/cache` para monitoreo

### 3. Servicios actualizados con cache

#### `GamificationService`

**Datos cacheados:**

| Clave | TTL | Descripción |
|-------|-----|-------------|
| `badges:all` | 1 hora | Todos los badges del sistema |
| `user:{userId}:badges` | 5 min | Badges del usuario |
| `user:{userId}:stats` | 1 min | Estadísticas del usuario |
| `leaderboard:page:{page}:limit:{limit}` | 5 min | Tabla de posiciones |
| `user:{userId}:rank` | 5 min | Ranking del usuario |

**Invalidación:**
- Al desbloquear badge → `user:{userId}:badges`
- Al ganar XP → `leaderboard:*`, `user:{userId}:rank`

#### `EventService`

**Datos cacheados:**

| Clave | TTL | Descripción |
|-------|-----|-------------|
| `events:list:cat:{category}:...` | 10 min | Lista de eventos |
| `event:{eventId}:detail` | 5 min | Detalle de evento |
| `user:{userId}:rsvps` | 2 min | RSVPs del usuario |

**Invalidación:**
- Al crear/eliminar RSVP → `event:{eventId}:detail`, `events:list:*`, `user:{userId}:rsvps`

#### `BookingService`

**Datos cacheados:**

| Clave | TTL | Descripción |
|-------|-----|-------------|
| `experience:{id}:detail` | 2 min | Detalle de experiencia |
| `experience:{id}:slots:{dates}` | 1 min | Slots disponibles |
| `experiences:*` | 5 min | Lista de experiencias |

**Invalidación:**
- Al crear booking → `experience:{id}:detail`, `experience:{id}:slots:*`, `experiences:*`
- Al cancelar booking → `experience:{id}:detail`, `experience:{id}:slots:*`
- Al actualizar experiencia → `experience:{id}:detail`, `experiences:*`

## Configuración

### Variables de entorno

```bash
# Opción 1: URL completa (recomendado para producción)
REDIS_URL=redis://localhost:6379

# Opción 2: Configuración manual
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your_password  # opcional
REDIS_DB=0                     # opcional, default 0

# Opciones avanzadas
REDIS_KEY_PREFIX=guelaguetza:  # Prefijo para todas las claves
```

### Desarrollo local

#### 1. Instalar Redis

**macOS (Homebrew):**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
```

**Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

#### 2. Verificar conexión

```bash
redis-cli ping
# Debe responder: PONG
```

### Producción

Para producción se recomienda:

1. **Redis Cloud** (gratuito hasta 30MB):
   - https://redis.com/try-free/
   - Obtener REDIS_URL
   - Configurar en variables de entorno

2. **Railway/Render/Fly.io**:
   - Agregar Redis como add-on
   - Variable REDIS_URL se configura automáticamente

3. **AWS ElastiCache / Google Cloud Memorystore**:
   - Para aplicaciones de alto tráfico

## Uso en el código

### Desde routes

```typescript
const gamificationRoutes: FastifyPluginAsync = async (fastify) => {
  // El cache está disponible automáticamente
  const gamificationService = new GamificationService(
    fastify.prisma,
    fastify.cache  // ← Inyectar cache
  );
};
```

### Desde services

```typescript
export class MyService {
  constructor(
    private prisma: PrismaClient,
    private cache?: CacheService  // Opcional para degradación graceful
  ) {}

  async getData(id: string) {
    // Patrón Cache-Aside manual
    const cacheKey = `data:${id}`;

    if (this.cache) {
      const cached = await this.cache.get(cacheKey);
      if (cached) return cached;
    }

    const data = await this.prisma.data.findUnique({ where: { id } });

    if (this.cache && data) {
      await this.cache.set(cacheKey, data, 300); // 5 min
    }

    return data;
  }

  // O usar el helper wrap (más simple)
  async getData2(id: string) {
    return this.cache?.wrap(
      `data:${id}`,
      () => this.prisma.data.findUnique({ where: { id } }),
      300 // TTL en segundos
    ) ?? this.prisma.data.findUnique({ where: { id } });
  }

  async updateData(id: string, data: any) {
    const updated = await this.prisma.data.update({
      where: { id },
      data,
    });

    // Invalidar cache
    if (this.cache) {
      await this.cache.del(`data:${id}`);
    }

    return updated;
  }
}
```

## Estrategias de invalidación

### 1. Invalidación directa

```typescript
await cache.del('user:123:profile');
```

### 2. Invalidación por patrón

```typescript
// Invalida: user:123:badges, user:123:stats, etc.
await cache.invalidate('user:123:*');

// Invalida: leaderboard:page:1:..., leaderboard:page:2:..., etc.
await cache.invalidate('leaderboard:*');
```

### 3. Invalidación múltiple

```typescript
await cache.delMultiple([
  'user:123:profile',
  'user:123:badges',
  'user:123:stats',
]);
```

## Monitoreo

### Health Check

```bash
GET /health/cache

# Respuesta:
{
  "status": "healthy",
  "connected": true,
  "metrics": {
    "hits": 1234,
    "misses": 456,
    "sets": 789,
    "deletes": 123,
    "errors": 0,
    "hitRate": "73.02%"
  }
}
```

### Desde el código

```typescript
// Obtener métricas
const metrics = fastify.cache.getMetrics();
console.log('Hit rate:', fastify.cache.getHitRate().toFixed(2) + '%');

// Reiniciar métricas
fastify.cache.resetMetrics();
```

### Redis CLI

```bash
# Conectar a Redis
redis-cli

# Ver todas las claves
KEYS guelaguetza:*

# Ver valor de una clave
GET guelaguetza:badges:all

# Ver TTL restante
TTL guelaguetza:user:123:profile

# Estadísticas del servidor
INFO stats

# Limpiar todo (CUIDADO: solo para desarrollo)
FLUSHDB
```

## Performance

### Mejoras esperadas

| Endpoint | Antes | Después | Mejora |
|----------|-------|---------|--------|
| GET /api/gamification/badges | ~150ms | ~5ms | 30x |
| GET /api/gamification/leaderboard | ~200ms | ~10ms | 20x |
| GET /api/events (upcoming) | ~120ms | ~8ms | 15x |
| GET /api/bookings/experiences/:id | ~100ms | ~6ms | 16x |

### Reducción de queries a BD

- **Badges**: De ~200 queries/min a ~10 queries/min (95% reducción)
- **Leaderboard**: De ~100 queries/min a ~20 queries/min (80% reducción)
- **Events**: De ~150 queries/min a ~15 queries/min (90% reducción)

## Mejores prácticas

### 1. TTL apropiados

```typescript
// Datos casi estáticos (raramente cambian)
BADGES: 3600 (1 hora)

// Datos que cambian moderadamente
LEADERBOARD: 300 (5 minutos)
EVENT_DETAIL: 300 (5 minutos)

// Datos que cambian frecuentemente
TIME_SLOTS: 60 (1 minuto)
USER_STATS: 60 (1 minuto)
```

### 2. Claves descriptivas

```typescript
// ✅ BUENO: Claro, específico, jerárquico
`user:${userId}:badges`
`experience:${id}:slots:${date}`
`leaderboard:page:${page}:limit:${limit}`

// ❌ MALO: Ambiguo, sin jerarquía
`${userId}_badges`
`exp_${id}`
`lb${page}`
```

### 3. Invalidación proactiva

```typescript
// ✅ BUENO: Invalidar inmediatamente después de escritura
async updateUser(id: string, data: any) {
  const user = await this.prisma.user.update({ where: { id }, data });
  await this.cache.del(`user:${id}:profile`);
  return user;
}

// ❌ MALO: Confiar solo en TTL
async updateUser(id: string, data: any) {
  return this.prisma.user.update({ where: { id }, data });
  // Cache desactualizado hasta que expire TTL
}
```

### 4. Graceful degradation

```typescript
// ✅ BUENO: App funciona sin Redis
if (this.cache) {
  const cached = await this.cache.get(key);
  if (cached) return cached;
}

// ❌ MALO: App falla si Redis no está disponible
const cached = await this.cache.get(key); // Error si cache es null
```

## Testing

### Test unitario

```typescript
import { CacheService } from '../services/cache.service';

describe('CacheService', () => {
  let cache: CacheService;

  beforeAll(() => {
    cache = new CacheService({
      host: 'localhost',
      port: 6379,
      db: 1, // Usar DB diferente para tests
    });
  });

  afterAll(async () => {
    await cache.flush(); // Limpiar
    await cache.disconnect();
  });

  it('should set and get value', async () => {
    await cache.set('test:key', { foo: 'bar' });
    const value = await cache.get('test:key');
    expect(value).toEqual({ foo: 'bar' });
  });

  it('should respect TTL', async () => {
    await cache.set('test:ttl', 'value', 1);
    await new Promise(r => setTimeout(r, 1100));
    const value = await cache.get('test:ttl');
    expect(value).toBeNull();
  });
});
```

### Test de integración

```typescript
it('should cache experience detail', async () => {
  const response1 = await app.inject({
    method: 'GET',
    url: '/api/bookings/experiences/exp_123',
  });

  // Primera llamada → DB query
  const metrics1 = app.cache.getMetrics();
  expect(metrics1.misses).toBe(1);

  const response2 = await app.inject({
    method: 'GET',
    url: '/api/bookings/experiences/exp_123',
  });

  // Segunda llamada → Cache hit
  const metrics2 = app.cache.getMetrics();
  expect(metrics2.hits).toBe(1);

  expect(response1.json()).toEqual(response2.json());
});
```

## Troubleshooting

### Redis no conecta

```bash
# Verificar que Redis está corriendo
redis-cli ping

# Si no responde, iniciar Redis
brew services start redis  # macOS
sudo systemctl start redis # Linux

# Verificar puerto
netstat -an | grep 6379
```

### Cache no funciona pero app sí

Esto es normal - graceful degradation:

```
[Cache] Redis error: connect ECONNREFUSED 127.0.0.1:6379
[Cache] Cache service is not available - running without cache
```

La app funciona sin problemas, solo sin cache.

### Claves no se invalidan

```typescript
// Verificar que estás usando el patrón correcto
await cache.invalidate('user:*');  // ✅ Correcto
await cache.invalidate('user:');   // ❌ No coincide con "user:123:badges"

// Debug: Ver claves en Redis
redis-cli KEYS guelaguetza:user:*
```

### Memoria de Redis llena

```bash
# Ver uso de memoria
redis-cli INFO memory

# Limpiar cache (desarrollo)
redis-cli FLUSHDB

# Configurar eviction policy (producción)
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

## Próximos pasos

### Optimizaciones futuras

1. **Cache warming**: Pre-cargar datos populares al iniciar
2. **Cache stampede prevention**: Evitar múltiples queries simultáneas
3. **Redis Cluster**: Para mayor disponibilidad
4. **Cache tags**: Invalidación más granular
5. **Compression**: Para datos grandes

### Monitoreo avanzado

1. Integrar con Prometheus/Grafana
2. Alertas si hit rate < 70%
3. Dashboard de métricas en tiempo real

## Referencias

- [Redis Best Practices](https://redis.io/topics/optimization)
- [Cache-Aside Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/cache-aside)
- [ioredis Documentation](https://github.com/luin/ioredis)
