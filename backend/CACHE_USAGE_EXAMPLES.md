# Ejemplos Prácticos de Uso del Cache

## Índice

1. [Uso Básico](#uso-básico)
2. [Patrones Comunes](#patrones-comunes)
3. [Invalidación](#invalidación)
4. [Casos de Uso Reales](#casos-de-uso-reales)
5. [Debugging](#debugging)

---

## Uso Básico

### 1. Get/Set Simple

```typescript
import { getCacheService } from '../services/cache.service.js';

const cache = getCacheService();

// Guardar un valor
await cache.set('user:123', { name: 'Juan', email: 'juan@example.com' }, 300); // 5 minutos

// Obtener un valor
const user = await cache.get<{ name: string; email: string }>('user:123');

if (user) {
  console.log(user.name); // "Juan"
} else {
  console.log('Cache miss');
}
```

### 2. Con TTL Personalizado

```typescript
// Cache corto para datos que cambian rápido
await cache.set('cart:user123', cartData, 60); // 1 minuto

// Cache largo para datos estables
await cache.set('badges:all', badges, 3600); // 1 hora

// Sin TTL (permanente hasta que se elimine)
await cache.set('config:app', config);
```

### 3. Verificar Existencia

```typescript
const exists = await cache.exists('user:123');

if (!exists) {
  // Cargar desde BD
  const user = await prisma.user.findUnique({ where: { id: '123' } });
  await cache.set('user:123', user, 300);
}
```

### 4. Eliminar Cache

```typescript
// Eliminar una clave
await cache.del('user:123');

// Eliminar múltiples claves
await cache.delMultiple(['user:123', 'user:456', 'user:789']);

// Invalidar por patrón (todas las experiencias)
await cache.invalidate('experience:*');

// Invalidar slots de una experiencia específica
await cache.invalidate('experience:clx123:slots:*');
```

---

## Patrones Comunes

### 1. Cache-Aside (Lazy Loading)

**Patrón más común**: Intenta obtener del cache, si no existe, carga de BD y guarda en cache.

```typescript
async getExperienceById(id: string) {
  const cacheKey = `experience:${id}:detail`;

  // 1. Intentar obtener del cache
  const cached = await this.cache.get(cacheKey);
  if (cached) {
    console.log('Cache HIT');
    return cached;
  }

  console.log('Cache MISS - loading from database');

  // 2. No está en cache, cargar de BD
  const experience = await this.prisma.experience.findUnique({
    where: { id },
    include: {
      reviews: true,
      host: true,
    },
  });

  if (!experience) {
    throw new NotFoundError('Experience not found');
  }

  // 3. Guardar en cache para próximas requests
  await this.cache.set(cacheKey, experience, this.CACHE_TTL.EXPERIENCE_DETAIL);

  return experience;
}
```

### 2. Cache-Aside con Wrap (Simplificado)

**Mismo patrón pero más elegante**:

```typescript
async getExperienceById(id: string) {
  const cacheKey = `experience:${id}:detail`;

  // wrap() hace todo automáticamente:
  // 1. Busca en cache
  // 2. Si no existe, ejecuta la función
  // 3. Guarda el resultado en cache
  return this.cache.wrap(
    cacheKey,
    async () => {
      // Esta función solo se ejecuta en cache miss
      const experience = await this.prisma.experience.findUnique({
        where: { id },
        include: { reviews: true, host: true },
      });

      if (!experience) {
        throw new NotFoundError('Experience not found');
      }

      return experience;
    },
    this.CACHE_TTL.EXPERIENCE_DETAIL
  );
}
```

### 3. Write-Through (Actualizar cache al escribir)

```typescript
async updateExperience(id: string, data: UpdateExperienceInput) {
  // 1. Actualizar en BD
  const updated = await this.prisma.experience.update({
    where: { id },
    data,
  });

  // 2. Actualizar cache inmediatamente (write-through)
  const cacheKey = `experience:${id}:detail`;
  await this.cache.set(cacheKey, updated, this.CACHE_TTL.EXPERIENCE_DETAIL);

  return updated;
}
```

### 4. Write-Behind (Invalidar cache al escribir)

**Patrón recomendado cuando hay relaciones complejas**:

```typescript
async createBooking(userId: string, data: CreateBookingInput) {
  // 1. Crear booking en BD
  const booking = await this.prisma.booking.create({ data });

  // 2. Invalidar caches relacionados (no actualizar directamente)
  await Promise.all([
    // Invalidar experiencia (contador de bookings cambió)
    this.cache.del(`experience:${data.experienceId}:detail`),

    // Invalidar slots (disponibilidad cambió)
    this.cache.invalidate(`experience:${data.experienceId}:slots:*`),

    // Invalidar listados
    this.cache.invalidate('experiences:*'),
  ]);

  return booking;
}
```

### 5. Refresh-Ahead (Refrescar antes de expirar)

```typescript
async getPopularExperiences() {
  const cacheKey = 'experiences:popular';

  const cached = await this.cache.get(cacheKey);
  const ttl = await this.cache.ttl(cacheKey);

  // Si el cache expira en menos de 30 segundos, refrescarlo
  if (ttl > 0 && ttl < 30) {
    // Refrescar en background (fire and forget)
    this.refreshPopularExperiences().catch(console.error);
  }

  if (cached) {
    return cached;
  }

  // Cache miss, cargar y guardar
  const experiences = await this.loadPopularExperiences();
  await this.cache.set(cacheKey, experiences, 300); // 5 min

  return experiences;
}

private async refreshPopularExperiences() {
  const experiences = await this.loadPopularExperiences();
  await this.cache.set('experiences:popular', experiences, 300);
}
```

---

## Invalidación

### 1. Invalidación Selectiva

```typescript
// Invalidar UN recurso específico
await this.cache.del(`product:${productId}:detail`);

// Invalidar MÚLTIPLES recursos relacionados
await this.cache.delMultiple([
  `product:${productId}:detail`,
  `product:${productId}:reviews`,
  `seller:${sellerId}:products`,
]);
```

### 2. Invalidación por Patrón (Wildcards)

```typescript
// Todas las experiencias
await this.cache.invalidate('experience:*');

// Solo slots de una experiencia
await this.cache.invalidate('experience:clx123:slots:*');

// Todos los listados de productos
await this.cache.invalidate('products:list:*');

// Todo el cache de un usuario
await this.cache.invalidate(`user:${userId}:*`);
```

### 3. Invalidación en Cascada

```typescript
async invalidateUserCache(userId: string) {
  // Invalidar todo relacionado con el usuario
  await Promise.all([
    this.cache.del(`user:${userId}:profile`),
    this.cache.del(`user:${userId}:stats`),
    this.cache.del(`user:${userId}:badges`),
    this.cache.del(`user:${userId}:rank`),
    this.cache.invalidate(`user:${userId}:bookings:*`),
    this.cache.invalidate('leaderboard:*'), // Si cambió ranking
  ]);
}
```

### 4. Invalidación Condicional

```typescript
async updateProduct(id: string, data: UpdateProductInput) {
  const product = await this.prisma.product.update({
    where: { id },
    data,
  });

  // Solo invalidar listados si cambió el stock o estado
  if (data.stock !== undefined || data.status !== undefined) {
    await this.cache.invalidate('products:list:*');
  }

  // Siempre invalidar el detalle
  await this.cache.del(`product:${id}:detail`);

  return product;
}
```

---

## Casos de Uso Reales

### Caso 1: Sistema de Badges (Gamificación)

```typescript
// Obtener badges del usuario
async getUserBadges(userId: string): Promise<BadgeResponse[]> {
  const cacheKey = `user:${userId}:badges`;

  // Intentar cache
  const cached = await this.cache.get<BadgeResponse[]>(cacheKey);
  if (cached) return cached;

  // Obtener de BD (incluye badges desbloqueados y bloqueados)
  const allBadges = await this.getAllBadges(); // Cached separadamente
  const userBadges = await this.prisma.userBadge.findMany({
    where: { userId },
  });

  const userBadgeIds = new Set(userBadges.map(ub => ub.badgeId));

  const result = allBadges.map(badge => ({
    ...badge,
    isUnlocked: userBadgeIds.has(badge.id),
    unlockedAt: userBadges.find(ub => ub.badgeId === badge.id)?.unlockedAt,
  }));

  // Cache por 5 minutos
  await this.cache.set(cacheKey, result, 300);

  return result;
}

// Al desbloquear un badge, invalidar cache
async unlockBadge(userId: string, badgeId: string) {
  await this.prisma.userBadge.create({
    data: { userId, badgeId },
  });

  // Invalidar cache del usuario
  await this.cache.del(`user:${userId}:badges`);
}
```

### Caso 2: Leaderboard con Paginación

```typescript
async getLeaderboard(page: number = 1, limit: number = 20) {
  const cacheKey = `leaderboard:page:${page}:limit:${limit}`;

  return this.cache.wrap(
    cacheKey,
    async () => {
      const skip = (page - 1) * limit;

      const [entries, total] = await Promise.all([
        this.prisma.userStats.findMany({
          orderBy: { xp: 'desc' },
          skip,
          take: limit,
          include: {
            user: {
              select: { id: true, nombre: true, avatar: true },
            },
          },
        }),
        this.prisma.userStats.count(),
      ]);

      return {
        entries: entries.map((e, index) => ({
          rank: skip + index + 1,
          userId: e.user.id,
          nombre: e.user.nombre,
          avatar: e.user.avatar,
          xp: e.xp,
          level: calculateLevel(e.xp),
        })),
        total,
        page,
        totalPages: Math.ceil(total / limit),
      };
    },
    300 // 5 minutos
  );
}

// Cuando alguien gana XP, invalidar todo el leaderboard
async addXP(userId: string, amount: number) {
  await this.prisma.userStats.update({
    where: { userId },
    data: { xp: { increment: amount } },
  });

  // Invalidar TODAS las páginas del leaderboard
  await this.cache.invalidate('leaderboard:*');
}
```

### Caso 3: Time Slots con Alta Concurrencia

```typescript
async getTimeSlots(experienceId: string, startDate: string, endDate: string) {
  // TTL corto (1 minuto) porque la disponibilidad cambia rápido
  const cacheKey = `experience:${experienceId}:slots:${startDate}:${endDate}`;

  const cached = await this.cache.get(cacheKey);
  if (cached) return cached;

  const slots = await this.prisma.experienceTimeSlot.findMany({
    where: {
      experienceId,
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
      isAvailable: true,
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  const result = slots.map(slot => ({
    ...slot,
    availableSpots: slot.capacity - slot.bookedCount,
  }));

  // TTL de solo 1 minuto
  await this.cache.set(cacheKey, result, 60);

  return result;
}

// Al crear booking, invalidar slots
async createBooking(data: CreateBookingInput) {
  const booking = await this.prisma.booking.create({ data });

  // Invalidar TODOS los rangos de fechas para esta experiencia
  await this.cache.invalidate(`experience:${data.experienceId}:slots:*`);

  return booking;
}
```

### Caso 4: Listado de Productos con Filtros

```typescript
async getProducts(query: ProductQuery) {
  const { category, minPrice, maxPrice, search, page, limit } = query;

  // Cache key incluye TODOS los filtros
  const cacheKey = [
    'products:list',
    `cat:${category || 'all'}`,
    `price:${minPrice || 0}-${maxPrice || 'inf'}`,
    `search:${search || 'none'}`,
    `page:${page}`,
    `limit:${limit}`,
  ].join(':');

  const cached = await this.cache.get(cacheKey);
  if (cached) return cached;

  // Query a BD con filtros
  const where = {
    status: 'ACTIVE',
    ...(category && { category }),
    ...(minPrice && { price: { gte: minPrice } }),
    ...(maxPrice && { price: { lte: maxPrice } }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ],
    }),
  };

  const [products, total] = await Promise.all([
    this.prisma.product.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      include: { seller: true },
      orderBy: { createdAt: 'desc' },
    }),
    this.prisma.product.count({ where }),
  ]);

  const result = {
    products,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };

  // TTL largo (10 minutos) porque el catálogo es estable
  await this.cache.set(cacheKey, result, 600);

  return result;
}

// Al crear/editar producto, invalidar TODOS los filtros
async createProduct(data: CreateProductInput) {
  const product = await this.prisma.product.create({ data });

  // Invalidar todas las combinaciones de filtros
  await this.cache.invalidate('products:list:*');

  return product;
}
```

---

## Debugging

### 1. Ver qué está en Cache

```typescript
// En desarrollo, agregar un endpoint de debug
app.get('/debug/cache/keys', async (request, reply) => {
  // Nota: Usar con precaución en producción, puede ser lento
  const keys = await cache.client.keys('guelaguetza:*');
  return { keys, count: keys.length };
});
```

### 2. Ver Métricas

```typescript
const metrics = cache.getMetrics();
console.log('Cache Metrics:', {
  hits: metrics.hits,
  misses: metrics.misses,
  hitRate: cache.getHitRate().toFixed(2) + '%',
  errors: metrics.errors,
});
```

### 3. Logging Manual

```typescript
async getExperienceById(id: string) {
  const cacheKey = `experience:${id}:detail`;
  const cached = await this.cache.get(cacheKey);

  if (cached) {
    console.log(`[Cache HIT] ${cacheKey}`);
    return cached;
  }

  console.log(`[Cache MISS] ${cacheKey}`);

  const experience = await this.prisma.experience.findUnique({
    where: { id },
  });

  await this.cache.set(cacheKey, experience, 120);
  console.log(`[Cache SET] ${cacheKey} (TTL: 120s)`);

  return experience;
}
```

### 4. Ver TTL Restante

```typescript
const ttl = await cache.ttl('experience:clx123:detail');

if (ttl === -2) {
  console.log('Key does not exist');
} else if (ttl === -1) {
  console.log('Key exists but has no TTL');
} else {
  console.log(`Key expires in ${ttl} seconds`);
}
```

### 5. Flush Cache (Solo Desarrollo)

```typescript
// CUIDADO: Esto borra TODO el cache
await cache.flush();
console.log('Cache flushed');
```

### 6. Inspeccionar Valor en Redis

```bash
# Conectarse a Redis CLI
redis-cli

# Ver valor
GET guelaguetza:experience:clx123:detail

# Ver TTL
TTL guelaguetza:experience:clx123:detail

# Ver todas las claves que coincidan
KEYS guelaguetza:experience:*

# Ver tipo de dato
TYPE guelaguetza:leaderboard:page:1

# Eliminar una clave
DEL guelaguetza:experience:clx123:detail
```

---

## Tips y Best Practices

### 1. Siempre Usa Tipos

```typescript
// ✅ BIEN - Type-safe
const user = await cache.get<User>('user:123');
if (user) {
  console.log(user.name); // TypeScript sabe que user tiene name
}

// ❌ MAL - Sin tipos
const user = await cache.get('user:123');
console.log(user.name); // Error en runtime si user es null
```

### 2. Agrupa Invalidaciones Relacionadas

```typescript
// ✅ BIEN - Invalidar todo junto
await Promise.all([
  cache.del(`experience:${id}:detail`),
  cache.invalidate(`experience:${id}:slots:*`),
  cache.invalidate('experiences:*'),
]);

// ❌ MAL - Secuencial (más lento)
await cache.del(`experience:${id}:detail`);
await cache.invalidate(`experience:${id}:slots:*`);
await cache.invalidate('experiences:*');
```

### 3. Usa TTLs Apropiados

```typescript
// Datos que casi nunca cambian → TTL largo
await cache.set('badges:all', badges, 3600); // 1 hora

// Datos que cambian frecuentemente → TTL corto
await cache.set('cart:user123', cart, 60); // 1 minuto
```

### 4. Maneja Cache Miss Gracefully

```typescript
const cached = await cache.get('key');

if (!cached) {
  // Siempre maneja el caso donde cache está vacío
  const data = await loadFromDatabase();
  await cache.set('key', data, ttl);
  return data;
}

return cached;
```

### 5. No Cachees Datos Privados Globalmente

```typescript
// ❌ MAL - Cachea datos del usuario sin incluir userId en la key
const cacheKey = 'user:profile'; // ¡Todos los usuarios verían lo mismo!

// ✅ BIEN - Incluye userId en la key
const cacheKey = `user:${userId}:profile`;
```

---

**Estas prácticas te ayudarán a implementar caching de forma efectiva y evitar problemas comunes.**
