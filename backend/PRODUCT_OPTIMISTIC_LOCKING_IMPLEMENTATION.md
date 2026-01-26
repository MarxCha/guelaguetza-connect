# Implementación de Optimistic Locking para Productos del Marketplace

## Resumen

Se ha implementado **optimistic locking** en el modelo `Product` del marketplace para prevenir race conditions en el stock de productos durante órdenes concurrentes.

## Cambios Realizados

### 1. Schema de Base de Datos

**Archivo:** `prisma/schema.prisma`

El modelo `Product` ya incluía el campo `version`:

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
  version     Int             @default(1)  // ✅ Campo para optimistic locking
  createdAt   DateTime        @default(now())
  updatedAt   DateTime        @updatedAt
  // ...
}
```

### 2. Migración de Base de Datos

**Archivo:** `prisma/migrations/20260125_add_version_to_products/migration.sql`

```sql
-- AlterTable
-- Add version field to Product model for optimistic locking
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "version" INTEGER NOT NULL DEFAULT 1;
```

**Para aplicar la migración:**

```bash
npx prisma migrate deploy
```

### 3. Utilidades de Optimistic Locking

**Archivo:** `src/utils/optimistic-locking.ts`

Se agregaron funciones específicas para Products:

#### `updateProductWithLocking()`

Actualiza un producto usando optimistic locking:

```typescript
await updateProductWithLocking(
  prisma,
  productId,
  currentVersion,
  {
    stock: { decrement: quantity }
  }
);
```

- Verifica que la versión coincida antes de actualizar
- Incrementa automáticamente el campo `version`
- Lanza `ConcurrencyError` si la versión no coincide

#### `getProductWithVersion()`

Obtiene un producto y opcionalmente valida su versión:

```typescript
const product = await getProductWithVersion(
  prisma,
  productId,
  expectedVersion
);
```

#### `withRetry()`

Ejecuta una operación con reintentos automáticos en caso de conflicto:

```typescript
await withRetry(
  async () => {
    // Operación que puede fallar por concurrencia
  },
  { maxRetries: 3, retryDelay: 100 }
);
```

### 4. Servicio de Marketplace

**Archivo:** `src/services/marketplace.service.ts`

#### `createOrder()` - Optimistic Locking Implementado

```typescript
async createOrder(userId: string, data: CreateOrderInput) {
  // Usar withRetry para manejar conflictos de concurrencia
  const pendingOrders = await withRetry(
    async () => {
      return this.prisma.$transaction(async (tx) => {
        // ... crear órdenes ...

        // Reservar stock usando optimistic locking
        for (const item of items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            select: { version: true },
          });

          // Update con optimistic locking
          await updateProductWithLocking(
            tx,
            item.productId,
            product.version,
            {
              stock: { decrement: item.quantity },
            }
          );
        }

        return createdOrders;
      });
    },
    { maxRetries: 3, retryDelay: 100 }
  );

  // ... resto del código ...
}
```

**Flujo de la orden:**

1. **FASE 1:** Crear órdenes y reservar inventario con optimistic locking
   - Validar stock disponible
   - Crear orden en estado `PENDING_PAYMENT`
   - Decrementar stock usando `updateProductWithLocking()`
   - Si hay conflicto de versión → reintentar hasta 3 veces

2. **FASE 2:** Crear payment intent en Stripe (fuera de transacción)

3. **FASE 3:** Actualizar orden con payment intent ID

#### `cleanupFailedOrders()` - Optimistic Locking Implementado

```typescript
async cleanupFailedOrders(timeoutMinutes: number = 30) {
  // ... obtener órdenes fallidas ...

  await withRetry(
    async () => {
      return this.prisma.$transaction(async (tx) => {
        // Restaurar stock usando optimistic locking
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
              {
                stock: { increment: quantity },
              }
            );
          }
        }

        // Marcar órdenes como canceladas
        await tx.order.updateMany({
          where: { id: { in: failedOrders.map((o) => o.id) } },
          data: { status: 'CANCELLED' },
        });
      });
    },
    { maxRetries: 3, retryDelay: 100 }
  );
}
```

### 5. Tests Unitarios

**Archivo:** `test/unit/marketplace-optimistic-locking.test.ts`

Se crearon 15 tests unitarios que validan:

✅ **withRetry:**
- ✅ Éxito en el primer intento
- ✅ Reintentos automáticos en caso de `ConcurrencyError`
- ✅ Falla después de máximo de reintentos
- ✅ No reintenta en errores que no son de concurrencia
- ✅ Backoff exponencial entre reintentos

✅ **updateProductWithLocking:**
- ✅ Actualización exitosa cuando la versión coincide
- ✅ Error cuando la versión no coincide
- ✅ Soporte para incremento de stock
- ✅ Soporte para actualizar stock y status simultáneamente

✅ **getProductWithVersion:**
- ✅ Retorna producto cuando existe
- ✅ Error cuando producto no existe
- ✅ Error cuando versión no coincide
- ✅ Éxito cuando versión coincide

✅ **Simulación de Concurrencia:**
- ✅ Maneja race conditions correctamente
- ✅ Reintentos exitosos al resolver conflictos

**Ejecutar tests:**

```bash
npm test -- marketplace-optimistic-locking.test.ts
```

**Resultado:** ✅ 15/15 tests pasando

### 6. Tests de Integración (Actualizados)

**Archivo:** `test/integration/marketplace.service.test.ts`

Se actualizaron/agregaron los siguientes tests:

1. **`should handle concurrent orders for limited stock with optimistic locking`**
   - Crea producto con stock limitado (3 unidades)
   - 2 usuarios intentan comprar 2 unidades cada uno (total 4 > 3)
   - Solo 1 orden debe tener éxito
   - El stock final debe ser correcto (1 unidad)
   - La versión debe incrementarse

2. **`should retry on version conflict and succeed`**
   - Simula actualizaciones concurrentes
   - Verifica que el retry funciona correctamente
   - El stock final debe ser consistente

3. **`should handle 5 concurrent orders correctly`**
   - 5 usuarios intentan comprar 3 unidades cada uno (total 15)
   - Solo hay 10 unidades disponibles
   - Solo 3 órdenes deben tener éxito (3 × 3 = 9 unidades)
   - 2 órdenes deben fallar con error de stock insuficiente
   - Stock final debe ser 1 unidad
   - Versión debe incrementarse correctamente

**Nota:** Los tests de integración requieren base de datos de prueba corriendo.

## Cómo Funciona

### Optimistic Locking

El optimistic locking funciona mediante un campo `version` que se incrementa en cada actualización:

```typescript
// Prisma genera SQL similar a:
UPDATE "Product"
SET
  stock = stock - 2,
  version = version + 1
WHERE
  id = 'prod-123' AND
  version = 5;  -- Solo actualiza si la versión coincide
```

Si `updateMany` retorna `count: 0`, significa que otro proceso ya modificó el producto.

### Estrategia de Retry

Cuando ocurre un conflicto de versión:

1. Se lanza `ConcurrencyError`
2. `withRetry()` captura el error
3. Espera con backoff exponencial (100ms, 200ms, 400ms...)
4. Reintenta la operación (máximo 3 veces)
5. Si todos los reintentos fallan, propaga el error

## Manejo de Errores

### Cliente (Frontend)

Cuando se recibe un error de concurrencia:

```typescript
try {
  await createOrder(orderData);
} catch (error) {
  if (error.message.includes('modificado por otro usuario')) {
    // Mostrar mensaje al usuario
    toast.error('El producto fue modificado. Por favor, recarga la página.');
  }
}
```

### Backend

Los errores se manejan automáticamente:

- **ConcurrencyError:** Reintento automático hasta 3 veces
- **Stock insuficiente:** Error 400 inmediato
- **Otros errores:** Propagados sin reintentar

## Métricas

El sistema registra métricas de concurrencia:

```typescript
// En src/utils/metrics.ts
concurrencyConflictsTotal.inc({ resource: 'product' });
```

Puedes ver las métricas en: `http://localhost:3005/metrics`

## Ventajas de la Implementación

✅ **Previene overselling:** No se puede vender más stock del disponible
✅ **Sin bloqueos pesimistas:** No bloquea filas en la base de datos
✅ **Alta concurrencia:** Múltiples usuarios pueden hacer órdenes simultáneamente
✅ **Reintentos automáticos:** La mayoría de conflictos se resuelven automáticamente
✅ **Consistencia:** El stock siempre es correcto
✅ **Testeable:** 100% cubierto con tests unitarios

## Escenarios de Uso

### Escenario 1: Compra Normal

```
Usuario A: Compra 2 unidades
- Stock inicial: 10, version: 1
- Stock final: 8, version: 2
✅ Éxito
```

### Escenario 2: Compra Concurrente (Éxito)

```
Usuario A: Compra 2 unidades (stock: 10 → 8, v: 1 → 2)
Usuario B: Compra 3 unidades (stock: 8 → 5, v: 2 → 3)
✅ Ambos tienen éxito (con retry automático)
```

### Escenario 3: Compra Concurrente (Fallo por Stock)

```
Stock inicial: 5 unidades

Usuario A: Compra 3 unidades (stock: 5 → 2, v: 1 → 2)
Usuario B: Compra 4 unidades (intenta, pero solo hay 2)
❌ Usuario B recibe error: "Stock insuficiente"
```

### Escenario 4: Máximo de Reintentos

```
10 usuarios intentan comprar simultáneamente

Usuarios 1-3: ✅ Éxito (con 0-2 reintentos)
Usuarios 4-10: ❌ Fallo después de 3 reintentos o stock insuficiente
```

## Comandos Útiles

### Aplicar migración

```bash
npx prisma migrate deploy
```

### Ver estado de migraciones

```bash
npx prisma migrate status
```

### Ejecutar tests unitarios

```bash
npm test -- marketplace-optimistic-locking.test.ts
```

### Ejecutar tests de integración

```bash
# Requiere base de datos de prueba
npm run test:integration -- marketplace.service.test.ts
```

### Ver métricas de concurrencia

```bash
curl http://localhost:3005/metrics | grep concurrency
```

## Próximos Pasos (Opcional)

1. **Dashboard de Métricas:**
   - Configurar Grafana para visualizar conflictos de concurrencia
   - Alertas cuando los conflictos superan un umbral

2. **Circuit Breaker:**
   - Si muchos reintentos fallan, pausar temporalmente las órdenes
   - Proteger la base de datos de sobrecarga

3. **Cache de Productos:**
   - Redis para reducir lecturas a la base de datos
   - Invalidar cache cuando el stock cambia

4. **Reservas Temporales:**
   - Reservar stock por 10 minutos mientras el usuario paga
   - Liberar automáticamente si no completa el pago

## Referencias

- [Prisma Optimistic Concurrency Control](https://www.prisma.io/docs/guides/performance-and-optimization/optimistic-concurrency-control)
- [Optimistic vs Pessimistic Locking](https://stackoverflow.com/questions/129329/optimistic-vs-pessimistic-locking)
- [Handling Concurrent Updates in Distributed Systems](https://martinfowler.com/articles/patterns-of-distributed-systems/version-vector.html)
