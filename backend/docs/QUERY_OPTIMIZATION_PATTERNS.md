# Patrones de Optimización de Queries - Guelaguetza Connect

## 🎯 Objetivo

Este documento presenta patrones concretos de optimización aplicables a los servicios de Guelaguetza Connect.

---

## 1. Evitar SELECT *

### ❌ Antipatrón

```typescript
// Trae TODOS los campos (incluso campos grandes como JSON, arrays, etc)
const products = await prisma.product.findMany({
  where: { status: 'ACTIVE' }
});
```

### ✅ Patrón Correcto

```typescript
// Solo los campos necesarios
const products = await prisma.product.findMany({
  where: { status: 'ACTIVE' },
  select: {
    id: true,
    name: true,
    price: true,
    images: true,
    category: true,
    seller: {
      select: {
        id: true,
        businessName: true,
      },
    },
  },
});
```

**Beneficio**: Reduce payload en 40-60%

---

## 2. Limitar Relaciones Anidadas

### ❌ Antipatrón

```typescript
// Puede traer miles de registros
const experience = await prisma.experience.findUnique({
  where: { id },
  include: {
    bookings: true, // TODOS los bookings
    reviews: true,  // TODAS las reviews
    timeSlots: true, // TODOS los slots
  },
});
```

### ✅ Patrón Correcto

```typescript
const experience = await prisma.experience.findUnique({
  where: { id },
  include: {
    // Solo las N más recientes
    bookings: {
      take: 10,
      where: { status: 'CONFIRMED' },
      orderBy: { createdAt: 'desc' },
    },
    reviews: {
      take: 5,
      orderBy: { createdAt: 'desc' },
    },
    // Usar _count cuando solo necesitas el total
    _count: {
      select: {
        timeSlots: true,
      },
    },
  },
});
```

**Beneficio**: Reduce payload en 70-90%

---

## 3. Usar _count en lugar de .length

### ❌ Antipatrón

```typescript
// Trae TODOS los likes para contar
const story = await prisma.story.findUnique({
  where: { id },
  include: {
    likes: true, // Puede ser 10,000+ registros
  },
});

const likeCount = story.likes.length;
```

### ✅ Patrón Correcto

```typescript
// Solo cuenta en la DB
const story = await prisma.story.findUnique({
  where: { id },
  include: {
    _count: {
      select: {
        likes: true,
        comments: true,
      },
    },
  },
});

const likeCount = story._count.likes;
```

**Beneficio**: Reduce memoria en 99%

---

## 4. Queries en Paralelo

### ❌ Antipatrón

```typescript
// Queries secuenciales (lento)
const user = await prisma.user.findUnique({ where: { id } });
const stats = await prisma.userStats.findUnique({ where: { userId: id } });
const badges = await prisma.userBadge.findMany({ where: { userId: id } });

// Total: T1 + T2 + T3 (ej: 50ms + 30ms + 40ms = 120ms)
```

### ✅ Patrón Correcto

```typescript
// Queries en paralelo (rápido)
const [user, stats, badges] = await Promise.all([
  prisma.user.findUnique({ where: { id } }),
  prisma.userStats.findUnique({ where: { userId: id } }),
  prisma.userBadge.findMany({ where: { userId: id } }),
]);

// Total: max(T1, T2, T3) (ej: max(50, 30, 40) = 50ms)
```

**Beneficio**: Reducción de 60-70% en tiempo total

---

## 5. Transacciones para Operaciones Atómicas

### ❌ Antipatrón

```typescript
// Sin transacción - puede quedar inconsistente
await prisma.booking.create({ data: bookingData });
await prisma.experienceTimeSlot.update({
  where: { id: slotId },
  data: { bookedCount: { increment: 1 } },
});
// Si falla aquí, el booking existe pero el slot no se actualizó
```

### ✅ Patrón Correcto

```typescript
// Con transacción - todo o nada
const booking = await prisma.$transaction(async (tx) => {
  const newBooking = await tx.booking.create({
    data: bookingData,
  });

  await tx.experienceTimeSlot.update({
    where: { id: slotId },
    data: { bookedCount: { increment: 1 } },
  });

  return newBooking;
});
```

**Beneficio**: Garantiza consistencia de datos

---

## 6. Paginación Eficiente

### ❌ Antipatrón

```typescript
// Trae TODO y filtra en memoria
const allProducts = await prisma.product.findMany({
  where: { status: 'ACTIVE' },
});

// Cliente recibe solo 20, pero DB envió 10,000
const page1 = allProducts.slice(0, 20);
```

### ✅ Patrón Correcto

```typescript
const limit = 20;
const page = 1;
const skip = (page - 1) * limit;

const [products, total] = await Promise.all([
  prisma.product.findMany({
    where: { status: 'ACTIVE' },
    take: limit,
    skip,
  }),
  prisma.product.count({
    where: { status: 'ACTIVE' },
  }),
]);

return {
  products,
  pagination: {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
    hasMore: skip + limit < total,
  },
};
```

**Beneficio**: Reduce transferencia de datos en 99%

---

## 7. Cursor-Based Pagination (Infinite Scroll)

### Para feeds infinitos

```typescript
async function getStories(cursor?: string, limit = 20) {
  const stories = await prisma.story.findMany({
    take: limit + 1, // +1 para saber si hay más
    ...(cursor && {
      cursor: { id: cursor },
      skip: 1, // Saltar el cursor
    }),
    orderBy: { createdAt: 'desc' },
    include: {
      user: {
        select: { id: true, nombre: true, avatar: true },
      },
    },
  });

  const hasMore = stories.length > limit;
  const items = hasMore ? stories.slice(0, -1) : stories;
  const nextCursor = hasMore ? items[items.length - 1].id : null;

  return {
    items,
    nextCursor,
    hasMore,
  };
}
```

**Uso en frontend**:
```typescript
const { items, nextCursor, hasMore } = await getStories(lastCursor);
```

---

## 8. Batch Operations

### ❌ Antipatrón

```typescript
// N queries individuales
for (const item of cartItems) {
  await prisma.product.update({
    where: { id: item.productId },
    data: { stock: { decrement: item.quantity } },
  });
}
// Si son 10 items = 10 queries
```

### ✅ Patrón Correcto

```typescript
// Una transacción con múltiples updates
await prisma.$transaction(
  cartItems.map((item) =>
    prisma.product.update({
      where: { id: item.productId },
      data: { stock: { decrement: item.quantity } },
    })
  )
);
// 1 transacción con 10 operaciones
```

**Beneficio**: Reduce overhead de red en 90%

---

## 9. Eager Loading vs Lazy Loading

### ❌ N+1 Query Problem

```typescript
// Query principal
const bookings = await prisma.booking.findMany();

// N queries adicionales (uno por booking)
for (const booking of bookings) {
  booking.experience = await prisma.experience.findUnique({
    where: { id: booking.experienceId },
  });
}
// Si son 100 bookings = 101 queries total
```

### ✅ Eager Loading

```typescript
// 1 query con JOIN
const bookings = await prisma.booking.findMany({
  include: {
    experience: {
      select: {
        id: true,
        title: true,
        price: true,
      },
    },
  },
});
// 1 query total
```

---

## 10. Operaciones Asíncronas No Bloqueantes

### Para operaciones que no afectan la respuesta

```typescript
async function viewStory(storyId: string, userId: string) {
  // Query principal - bloqueante
  const story = await prisma.story.findUnique({
    where: { id: storyId },
    include: { user: true, comments: true },
  });

  // Incrementar views - NO bloqueante (fire and forget)
  prisma.story
    .update({
      where: { id: storyId },
      data: { views: { increment: 1 } },
    })
    .catch(() => {
      // Ignorar errores - no es crítico
    });

  // Registrar analytics - NO bloqueante
  prisma.activityLog
    .create({
      data: {
        userId,
        action: 'VIEW_STORY',
        targetType: 'STORY',
        targetId: storyId,
      },
    })
    .catch(() => {});

  // Responder inmediatamente
  return story;
}
```

**Beneficio**: Reduce latencia percibida en 30-50%

---

## 11. Índices Compuestos Correctos

### Orden de columnas importa

```typescript
// ❌ MALO: Orden incorrecto
@@index([createdAt, userId, status])

// ✅ BUENO: Orden según selectividad
@@index([userId, status, createdAt])
```

**Regla**: Columnas de filtrado exacto primero, rangos al final

### Queries que se benefician

```typescript
// ✅ Usa el índice [userId, status, createdAt]
const bookings = await prisma.booking.findMany({
  where: {
    userId: 'user_123',        // Exacto
    status: 'CONFIRMED',       // Exacto
    createdAt: { gte: date },  // Rango
  },
  orderBy: { createdAt: 'desc' }, // Usa el índice
});
```

---

## 12. Soft Deletes vs Hard Deletes

### Implementación de Soft Delete

```typescript
// ❌ Hard delete - datos perdidos
await prisma.product.delete({ where: { id } });

// ✅ Soft delete - mantiene historial
await prisma.product.update({
  where: { id },
  data: {
    status: 'ARCHIVED',
    deletedAt: new Date(),
  },
});
```

### Queries con soft delete

```typescript
// Excluir archivados en queries
const products = await prisma.product.findMany({
  where: {
    status: { not: 'ARCHIVED' },
    // o
    deletedAt: null,
  },
});
```

---

## 13. Full-Text Search

### ❌ Búsqueda con LIKE (lento)

```typescript
const products = await prisma.product.findMany({
  where: {
    OR: [
      { name: { contains: 'mezcal', mode: 'insensitive' } },
      { description: { contains: 'mezcal', mode: 'insensitive' } },
    ],
  },
});
// No usa índice, escanea toda la tabla
```

### ✅ Full-Text Search (PostgreSQL)

```prisma
// schema.prisma
model Product {
  // ... otros campos
  @@index([name, description], type: Gin)
}
```

```typescript
// Raw query con full-text search
const products = await prisma.$queryRaw`
  SELECT * FROM "Product"
  WHERE to_tsvector('spanish', name || ' ' || description)
        @@ to_tsquery('spanish', ${searchTerm})
  LIMIT 20
`;
```

---

## 14. Aggregate Queries

### Obtener estadísticas

```typescript
// Ventas totales de un vendedor
const stats = await prisma.order.aggregate({
  where: {
    sellerId,
    status: 'DELIVERED',
  },
  _sum: {
    total: true,
  },
  _avg: {
    total: true,
  },
  _count: {
    id: true,
  },
});

console.log({
  totalSales: stats._sum.total,
  averageOrder: stats._avg.total,
  orderCount: stats._count.id,
});
```

---

## 15. Optimistic Updates

### Para mejor UX

```typescript
// Frontend optimista
function likeStory(storyId: string) {
  // 1. Actualizar UI inmediatamente
  setLiked(true);
  setLikeCount(prev => prev + 1);

  // 2. Sincronizar con backend en segundo plano
  api.likeStory(storyId).catch(() => {
    // Si falla, revertir
    setLiked(false);
    setLikeCount(prev => prev - 1);
  });
}
```

---

## 📊 Métricas de Éxito

Después de aplicar estos patrones:

| Métrica | Objetivo |
|---------|----------|
| Tiempo promedio de query | < 50ms |
| P95 | < 200ms |
| P99 | < 500ms |
| Queries por request | < 3 |
| Payload size | < 100KB |
| Database connections | < 20 |

---

## 🔧 Herramientas de Análisis

### 1. Prisma Query Log

```typescript
const prisma = new PrismaClient({
  log: ['query', 'error', 'warn'],
});

prisma.$on('query', (e) => {
  console.log('Query: ' + e.query);
  console.log('Duration: ' + e.duration + 'ms');
});
```

### 2. EXPLAIN en desarrollo

```typescript
// Agregar a cualquier query
const result = await prisma.$queryRaw`
  EXPLAIN (ANALYZE, BUFFERS)
  SELECT * FROM "Product"
  WHERE category = 'ARTESANIA'
  AND status = 'ACTIVE'
`;
```

---

## ✅ Checklist de Code Review

Al revisar código, verificar:

- [ ] ¿Usa `select` específico en lugar de traer todo?
- [ ] ¿Limita relaciones con `take`?
- [ ] ¿Usa `_count` en lugar de `.length`?
- [ ] ¿Queries independientes están en `Promise.all()`?
- [ ] ¿Operaciones atómicas usan `$transaction`?
- [ ] ¿Tiene paginación implementada?
- [ ] ¿Evita N+1 con `include`?
- [ ] ¿Operaciones no críticas son async (no bloqueantes)?
- [ ] ¿Índices compuestos en orden correcto?
- [ ] ¿Soft delete cuando es apropiado?

---

**Última actualización**: 2026-01-25
