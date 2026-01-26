# Optimistic Locking para Productos

## Resumen

Se implementó **optimistic locking** en el modelo `Product` para prevenir race conditions en las actualizaciones de stock, especialmente durante el proceso de checkout cuando múltiples usuarios intentan comprar el mismo producto simultáneamente.

## Arquitectura Implementada

### 1. Campo de Versión

Se agregó el campo `version` al modelo `Product` en el schema de Prisma:

```prisma
model Product {
  id          String          @id @default(cuid())
  sellerId    String
  name        String
  description String
  price       Decimal         @db.Decimal(10, 2)
  category    ProductCategory
  status      ProductStatus   @default(DRAFT)
  stock       Int             @default(0)
  images      String[]
  version     Int             @default(1)  // <-- NUEVO CAMPO
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt

  // ... relaciones
}
```

### 2. Funciones de Utilidad

En `/backend/src/utils/optimistic-locking.ts`:

#### `updateProductWithLocking()`
Actualiza un producto verificando la versión antes de aplicar cambios:

```typescript
export async function updateProductWithLocking(
  prisma: PrismaClient | any,
  productId: string,
  currentVersion: number,
  data: {
    stock?: { increment?: number; decrement?: number };
    status?: string;
    [key: string]: any;
  }
)
```

**Funcionamiento:**
1. Usa `updateMany` con condición `WHERE version = currentVersion`
2. Si `count === 0`, lanza `ConcurrencyError`
3. Incrementa automáticamente la versión
4. Retorna el producto actualizado

#### `getProductWithVersion()`
Obtiene un producto y opcionalmente valida su versión:

```typescript
export async function getProductWithVersion(
  prisma: PrismaClient | any,
  productId: string,
  expectedVersion?: number
)
```

### 3. Integración en MarketplaceService

#### `createOrder()` - El caso crítico

**Antes:**
```typescript
await tx.product.update({
  where: { id: item.productId },
  data: { stock: { decrement: item.quantity } }
});
```

**Después (con optimistic locking + retry):**
```typescript
const product = await tx.product.findUnique({
  where: { id: item.productId },
  select: { version: true },
});

await updateProductWithLocking(
  tx,
  item.productId,
  product.version,
  { stock: { decrement: item.quantity } }
);
```

**Todo el flujo está envuelto en `withRetry()`:**
```typescript
const pendingOrders = await withRetry(
  async () => {
    return this.prisma.$transaction(async (tx) => {
      // ... lógica con optimistic locking
    });
  },
  { maxRetries: 3, retryDelay: 100 }
);
```

#### `cleanupFailedOrders()` - Restauración de stock

También se actualizó para usar optimistic locking al **restaurar** stock de órdenes canceladas:

```typescript
await withRetry(
  async () => {
    return this.prisma.$transaction(async (tx) => {
      for (const [productId, quantity] of productRestores) {
        const product = await tx.product.findUnique({
          where: { id: productId },
          select: { version: true },
        });

        if (product) {
          await updateProductWithLocking(
            tx,
            productId,
            product.version,
            { stock: { increment: quantity } }
          );
        }
      }
      // ... resto de la lógica
    });
  },
  { maxRetries: 3, retryDelay: 100 }
);
```

### 4. Manejo de Errores en la API

En `/backend/src/routes/marketplace.ts`, el endpoint de checkout captura `ConcurrencyError` y retorna **HTTP 409**:

```typescript
app.post('/checkout', {
  onRequest: [fastify.authenticate],
  schema: { body: CreateOrderSchema },
}, async (request, reply) => {
  try {
    const orders = await marketplaceService.createOrder(
      request.user.userId,
      request.body
    );
    return reply.status(201).send(orders);
  } catch (error) {
    if (error instanceof ConcurrencyError) {
      return reply.status(409).send({
        error: 'ConcurrencyError',
        message: error.message,
      });
    }
    throw error;
  }
});
```

## Flujo de Ejecución

### Escenario: 2 usuarios comprando el último producto

1. **Usuario A** y **Usuario B** agregan el producto (stock: 1) al carrito
2. Ambos hacen checkout simultáneamente

**Thread A:**
```
1. Lee product (id: "prod123", version: 5, stock: 1)
2. Valida stock >= quantity ✓
3. Crea orden en estado PENDING_PAYMENT
4. Ejecuta: updateMany WHERE id = "prod123" AND version = 5
   SET stock = 0, version = 6
5. ✓ count = 1 → Éxito
```

**Thread B (100ms después):**
```
1. Lee product (id: "prod123", version: 6, stock: 0)  ⚠️ Ya fue actualizado
2. Valida stock >= quantity ✗
3. Lanza AppError("Stock insuficiente...")
4. Transacción hace rollback
5. Usuario B recibe error 400 con mensaje claro
```

### Caso Edge: Race condition en la actualización

Si Thread A y Thread B leen el producto **al mismo tiempo** antes de que cualquiera actualice:

**Thread A:**
```
1. Lee product (version: 5, stock: 1)
2. updateMany WHERE version = 5
3. ✓ count = 1 → Éxito (version → 6)
```

**Thread B:**
```
1. Lee product (version: 5, stock: 1)  ← Misma versión
2. updateMany WHERE version = 5       ← Versión ya no existe
3. count = 0 → Lanza ConcurrencyError
4. withRetry() reintenta (máximo 3 veces)
5. Segundo intento:
   - Lee product (version: 6, stock: 0)
   - Valida stock ✗
   - Lanza AppError("Stock insuficiente")
```

## Beneficios

### 1. Prevención de Overselling
- Imposible vender más stock del disponible
- Las actualizaciones son atómicas

### 2. Reintentos Automáticos
- `withRetry()` maneja conflictos transitorios
- Backoff exponencial (100ms, 200ms, 400ms)

### 3. Mensajes Claros
- 409 Conflict → "El producto fue modificado"
- 400 Bad Request → "Stock insuficiente: disponible X"

### 4. Transacciones Seguras
- Todo el flujo de checkout está en una transacción
- Si falla una actualización, todo hace rollback

## Testing

### Test de Concurrencia

```typescript
import { describe, it, expect } from 'vitest';
import { PrismaClient } from '@prisma/client';

describe('Product Optimistic Locking', () => {
  it('should prevent overselling with concurrent checkouts', async () => {
    const prisma = new PrismaClient();

    // Setup: Producto con stock 1
    const product = await prisma.product.create({
      data: {
        name: 'Test Product',
        price: 100,
        stock: 1,
        version: 1,
        // ... otros campos
      }
    });

    // Simular 2 checkouts concurrentes
    const checkout1 = marketplaceService.createOrder(user1Id, {
      shippingAddress: { /* ... */ }
    });

    const checkout2 = marketplaceService.createOrder(user2Id, {
      shippingAddress: { /* ... */ }
    });

    // Ejecutar en paralelo
    const results = await Promise.allSettled([checkout1, checkout2]);

    // Verificar: exactamente 1 éxito y 1 fallo
    const successful = results.filter(r => r.status === 'fulfilled');
    const failed = results.filter(r => r.status === 'rejected');

    expect(successful.length).toBe(1);
    expect(failed.length).toBe(1);

    // Verificar stock final
    const updatedProduct = await prisma.product.findUnique({
      where: { id: product.id }
    });
    expect(updatedProduct?.stock).toBe(0);
  });
});
```

## Consideraciones

### 1. Performance
- El retry agrega latencia solo en caso de conflicto
- En operaciones normales, overhead mínimo
- `updateMany` es más eficiente que `findUnique` + `update`

### 2. Compatibilidad con Jobs
- `cleanupFailedOrders()` también usa optimistic locking
- Evita conflictos con checkouts simultáneos durante limpieza

### 3. Escalabilidad
- Funciona con réplicas de base de datos (serializable isolation)
- Sin necesidad de locks distribuidos (Redis, etc.)

## Próximos Pasos

1. **Agregar métricas:**
   - Número de reintentos por checkout
   - Frecuencia de `ConcurrencyError`

2. **UI/UX:**
   - Mostrar "Procesando..." durante retry
   - "Stock actualizado, recarga la página" en 409

3. **Tests de carga:**
   - Simular 100 usuarios comprando el mismo producto
   - Verificar que no hay overselling

## Migración

Para aplicar la migración:

```bash
cd backend
npx prisma migrate dev --name add_version_to_product
```

Esto creará la migración SQL:

```sql
ALTER TABLE "Product" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
```

## Archivos Modificados

- ✅ `/backend/prisma/schema.prisma` - Agregado campo `version`
- ✅ `/backend/src/utils/optimistic-locking.ts` - Funciones para Product
- ✅ `/backend/src/services/marketplace.service.ts` - `createOrder()` y `cleanupFailedOrders()`
- ✅ `/backend/src/routes/marketplace.ts` - Manejo de error 409
- ✅ `/backend/src/utils/errors.ts` - `ConcurrencyError` (ya existía)

---

**Implementado:** 2025-01-25
**Patrón:** Optimistic Locking con Retry + Transacciones
**Inspirado en:** `ExperienceTimeSlot` locking implementation
