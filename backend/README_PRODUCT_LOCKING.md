# 🔐 Optimistic Locking para Productos - Guía Completa

## 📖 Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Archivos Creados/Modificados](#archivos-creadosmodificados)
3. [Cómo Empezar](#cómo-empezar)
4. [Documentación Completa](#documentación-completa)
5. [Testing](#testing)
6. [Troubleshooting](#troubleshooting)
7. [Próximos Pasos](#próximos-pasos)

---

## Resumen Ejecutivo

Se implementó **optimistic locking** en el modelo `Product` para prevenir **race conditions** durante el checkout cuando múltiples usuarios intentan comprar el mismo producto simultáneamente.

### Problema Resuelto

**ANTES (Sin locking):**
```
Usuario A lee: stock = 1
Usuario B lee: stock = 1
Usuario A compra: stock = 0
Usuario B compra: stock = -1 ❌ OVERSELLING
```

**DESPUÉS (Con locking):**
```
Usuario A lee: version = 5, stock = 1
Usuario B lee: version = 5, stock = 1
Usuario A actualiza WHERE version = 5: stock = 0, version = 6 ✓
Usuario B intenta WHERE version = 5: FALLA (version no existe)
Usuario B reintenta: lee version = 6, stock = 0
Usuario B recibe: "Stock insuficiente" ✓
```

### Características

- ✅ **Previene overselling** de productos
- ✅ **Reintentos automáticos** con backoff exponencial
- ✅ **Transacciones atómicas** para garantizar consistencia
- ✅ **Manejo de errores claro** (HTTP 409 para conflictos)
- ✅ **Tests completos** (unitarios + integración)
- ✅ **Script de migración** automatizado

---

## Archivos Creados/Modificados

### 📝 Archivos Modificados

```
backend/
├── prisma/
│   └── schema.prisma                        # ✏️ Agregado campo "version" a Product
├── src/
│   ├── utils/
│   │   └── optimistic-locking.ts           # ✏️ Funciones para Product
│   ├── services/
│   │   └── marketplace.service.ts          # ✏️ createOrder() con locking
│   └── routes/
│       └── marketplace.ts                  # ✏️ Manejo de error 409
```

### 📄 Archivos Creados

```
backend/
├── docs/
│   ├── product-locking-flow.md             # 📊 Diagramas Mermaid
│   └── frontend-integration.md             # 🎨 Guía para frontend
├── scripts/
│   └── migrate-product-version.sh          # 🚀 Script de migración
├── test/
│   └── integration/
│       └── product-concurrency.test.ts     # 🧪 Tests de integración
├── src/
│   └── utils/
│       └── optimistic-locking.test.ts      # 🧪 Tests unitarios
├── PRODUCT_OPTIMISTIC_LOCKING.md           # 📚 Documentación técnica
├── PRODUCT_LOCKING_COMMANDS.md             # 💻 Comandos CLI
├── IMPLEMENTATION_SUMMARY.md               # 📋 Resumen de implementación
└── README_PRODUCT_LOCKING.md               # 📖 Esta guía
```

---

## Cómo Empezar

### Paso 1: Aplicar Migración

Elige una de las opciones:

**Opción A - Script Automatizado (Recomendado):**

```bash
cd backend
./scripts/migrate-product-version.sh dev
```

**Opción B - Comandos Manuales:**

```bash
cd backend
npx prisma migrate dev --name add_version_to_product
npx prisma generate
```

### Paso 2: Verificar Migración

```bash
# Ver estado de migraciones
npx prisma migrate status

# Abrir Prisma Studio para verificar campo "version"
npx prisma studio
```

### Paso 3: Ejecutar Tests

```bash
# Tests unitarios
npm test -- optimistic-locking.test.ts

# Tests de integración
npm test -- product-concurrency.test.ts

# Todos los tests
npm test
```

### Paso 4: Iniciar Servidor

```bash
npm run dev
```

### Paso 5: Probar Endpoint

```bash
curl -X POST http://localhost:3000/api/marketplace/checkout \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "shippingAddress": {
      "street": "Calle Principal 123",
      "city": "Oaxaca",
      "state": "Oaxaca",
      "zipCode": "68000",
      "country": "México"
    }
  }'
```

**Respuestas esperadas:**
- `201 Created` - Checkout exitoso
- `400 Bad Request` - Stock insuficiente
- `409 Conflict` - Conflicto de concurrencia
- `500 Internal Server Error` - Error del servidor

---

## Documentación Completa

### 📚 Documentos Disponibles

| Documento | Descripción | Audiencia |
|-----------|-------------|-----------|
| [PRODUCT_OPTIMISTIC_LOCKING.md](./PRODUCT_OPTIMISTIC_LOCKING.md) | Documentación técnica completa | Desarrolladores Backend |
| [PRODUCT_LOCKING_COMMANDS.md](./PRODUCT_LOCKING_COMMANDS.md) | Comandos y troubleshooting | DevOps / SRE |
| [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md) | Resumen de cambios | Tech Leads / Arquitectos |
| [docs/product-locking-flow.md](./docs/product-locking-flow.md) | Diagramas visuales (Mermaid) | Todos |
| [docs/frontend-integration.md](./docs/frontend-integration.md) | Guía de integración frontend | Desarrolladores Frontend |

### 🔍 Lectura Rápida por Rol

#### **Backend Developer:**
1. Lee: `PRODUCT_OPTIMISTIC_LOCKING.md` (sección "Arquitectura")
2. Estudia: `src/utils/optimistic-locking.ts`
3. Ejecuta: Tests unitarios

#### **Frontend Developer:**
1. Lee: `docs/frontend-integration.md`
2. Revisa: Ejemplos de manejo de errores 409
3. Implementa: Botón "Reintentar"

#### **DevOps / SRE:**
1. Lee: `PRODUCT_LOCKING_COMMANDS.md`
2. Ejecuta: `./scripts/migrate-product-version.sh prod`
3. Configura: Monitoreo de `ConcurrencyError`

#### **Tech Lead:**
1. Lee: `IMPLEMENTATION_SUMMARY.md`
2. Revisa: Diagramas en `docs/product-locking-flow.md`
3. Valida: Checklist de deployment

---

## Testing

### 🧪 Tests Disponibles

#### 1. Tests Unitarios

Ubicación: `src/utils/optimistic-locking.test.ts`

```bash
npm test -- optimistic-locking.test.ts
```

**Cobertura:**
- ✅ `updateProductWithLocking()` - Actualización exitosa
- ✅ `updateProductWithLocking()` - ConcurrencyError
- ✅ `getProductWithVersion()` - Validación de versión
- ✅ `withRetry()` - Reintentos automáticos
- ✅ `withRetry()` - Backoff exponencial

#### 2. Tests de Integración

Ubicación: `test/integration/product-concurrency.test.ts`

```bash
npm test -- product-concurrency.test.ts
```

**Escenarios:**
- ✅ Escenario 1: Prevenir overselling (2 usuarios, 1 producto)
- ✅ Escenario 2: Cantidades concurrentes (stock limitado)
- ✅ Escenario 3: Reintentos exitosos (3 usuarios)
- ✅ Escenario 4: Cleanup de órdenes fallidas
- ✅ Escenario 5: Validación de versión obsoleta

#### 3. Test Manual con cURL

```bash
# 1. Agregar producto al carrito de 2 usuarios
curl -X POST http://localhost:3000/api/marketplace/cart/items \
  -H "Authorization: Bearer TOKEN_USER_1" \
  -d '{"productId": "PRODUCT_ID", "quantity": 1}'

curl -X POST http://localhost:3000/api/marketplace/cart/items \
  -H "Authorization: Bearer TOKEN_USER_2" \
  -d '{"productId": "PRODUCT_ID", "quantity": 1}'

# 2. Hacer checkout simultáneo (usar & para paralelizar)
curl -X POST http://localhost:3000/api/marketplace/checkout \
  -H "Authorization: Bearer TOKEN_USER_1" \
  -d '{"shippingAddress": {...}}' &

curl -X POST http://localhost:3000/api/marketplace/checkout \
  -H "Authorization: Bearer TOKEN_USER_2" \
  -d '{"shippingAddress": {...}}' &

# Esperar resultados
wait
```

#### 4. Test de Carga con Artillery

Crear archivo `artillery-load-test.yml`:

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
scenarios:
  - name: "Concurrent checkouts"
    flow:
      - post:
          url: "/api/marketplace/checkout"
          json:
            shippingAddress:
              street: "Test"
              city: "Oaxaca"
              state: "Oaxaca"
              zipCode: "68000"
              country: "México"
```

Ejecutar:

```bash
npx artillery run artillery-load-test.yml
```

---

## Troubleshooting

### ❌ Error: "P1000: Authentication failed"

**Causa:** Base de datos no está corriendo o credenciales incorrectas.

**Solución:**

```bash
# Iniciar PostgreSQL
docker-compose up -d postgres

# O con Homebrew
brew services start postgresql

# Verificar credenciales en .env
cat .env | grep DATABASE_URL
```

### ❌ Error: "Prisma Client not generated"

**Causa:** Cliente de Prisma no está sincronizado con el schema.

**Solución:**

```bash
npx prisma generate
```

### ❌ Error: "relation 'Product' does not exist"

**Causa:** Migraciones no aplicadas.

**Solución:**

```bash
# Desarrollo
npx prisma migrate dev

# Producción
npx prisma migrate deploy
```

### ⚠️ Muchos ConcurrencyError en producción

**Causa:** Alta contención en productos populares.

**Soluciones:**

1. **Aumentar reintentos:**

```typescript
// En marketplace.service.ts
await withRetry(operation, {
  maxRetries: 5,  // Aumentar de 3 a 5
  retryDelay: 100
});
```

2. **Implementar reservas temporales:**

```typescript
// Reservar stock por 10 minutos durante checkout
await prisma.product.update({
  where: { id: productId },
  data: {
    stock: { decrement: quantity },
    reservedUntil: new Date(Date.now() + 10 * 60 * 1000)
  }
});
```

3. **Cachear stock con TTL corto:**

```typescript
// Redis con TTL 30 segundos
await redis.set(`product:${id}:stock`, stock, 'EX', 30);
```

### ⚠️ Stock negativo en base de datos

**NO DEBERÍA OCURRIR** con optimistic locking correctamente implementado.

**Si ocurre:**

1. Verificar logs de transacciones:

```bash
tail -f logs/app.log | grep "ConcurrencyError"
```

2. Verificar que todos los updates usan `updateProductWithLocking()`:

```bash
cd backend/src
grep -r "product.update" --include="*.ts" | grep -v "updateProductWithLocking"
```

3. Ejecutar query de diagnóstico:

```sql
SELECT id, name, stock, version, "updatedAt"
FROM "Product"
WHERE stock < 0
ORDER BY "updatedAt" DESC;
```

---

## Próximos Pasos

### Backend

- [ ] Agregar logging detallado de reintentos
- [ ] Implementar métricas con Prometheus
- [ ] Crear job cron para `cleanupFailedOrders()`
- [ ] Agregar índices optimizados para versión

### Frontend

- [ ] Implementar manejo de error 409
- [ ] Agregar botón "Reintentar"
- [ ] Mostrar indicador "Procesando..." durante checkout
- [ ] Actualizar carrito automáticamente después de 409

### Infraestructura

- [ ] Configurar alertas para ConcurrencyError frecuentes
- [ ] Monitorear latencia de checkout
- [ ] Dashboard de métricas (stock, órdenes, conflictos)
- [ ] Tests de carga regulares

### Documentación

- [ ] Video tutorial de implementación
- [ ] Runbook para incidentes
- [ ] Actualizar API docs con código 409

---

## 📊 Métricas a Monitorear

### KPIs Críticos

| Métrica | Valor Óptimo | Alerta si... |
|---------|--------------|--------------|
| Stock negativo | 0 | > 0 |
| Tasa de ConcurrencyError | < 1% | > 5% |
| Reintentos promedio | < 1.5 | > 2.5 |
| Latencia de checkout | < 2s | > 5s |
| Órdenes fallidas | < 2% | > 10% |

### Queries de Monitoreo

```sql
-- 1. Productos con stock negativo (CRÍTICO)
SELECT id, name, stock, version
FROM "Product"
WHERE stock < 0;

-- 2. Órdenes pendientes de pago > 30 min
SELECT COUNT(*) as stale_orders
FROM "Order"
WHERE status IN ('PENDING_PAYMENT', 'PAYMENT_FAILED')
  AND "createdAt" < NOW() - INTERVAL '30 minutes';

-- 3. Productos más vendidos (para optimizar stock)
SELECT p.id, p.name, COUNT(*) as order_count
FROM "Product" p
JOIN "OrderItem" oi ON oi."productId" = p.id
WHERE oi."createdAt" > NOW() - INTERVAL '7 days'
GROUP BY p.id, p.name
ORDER BY order_count DESC
LIMIT 10;

-- 4. Productos con alta contención (version alto)
SELECT id, name, version, stock
FROM "Product"
WHERE version > 100
ORDER BY version DESC
LIMIT 10;
```

---

## 🤝 Contribuir

### Reportar Bugs

1. Verificar que no sea un problema conocido (ver Troubleshooting)
2. Incluir logs completos
3. Proveer pasos para reproducir
4. Indicar versión de Node, Prisma, PostgreSQL

### Sugerir Mejoras

1. Abrir issue describiendo el problema actual
2. Proponer solución con pros/cons
3. Incluir ejemplo de código si aplica

---

## 📜 Licencia

Este código es parte del proyecto Guelaguetza Connect.

---

## 👥 Autores

**Implementación:** Claude Code Agent
**Fecha:** 2025-01-25
**Patrón:** Optimistic Locking + Retry Strategy
**Inspirado en:** ExperienceTimeSlot locking implementation

---

## 🔗 Enlaces Rápidos

- [Documentación Técnica](./PRODUCT_OPTIMISTIC_LOCKING.md)
- [Comandos CLI](./PRODUCT_LOCKING_COMMANDS.md)
- [Integración Frontend](./docs/frontend-integration.md)
- [Diagramas Visuales](./docs/product-locking-flow.md)
- [Tests Unitarios](./src/utils/optimistic-locking.test.ts)
- [Tests de Integración](./test/integration/product-concurrency.test.ts)

---

**¿Preguntas?** Consulta la documentación completa o contacta al equipo de desarrollo.

**Estado:** ✅ **READY FOR TESTING**
