# Comandos para Optimistic Locking de Productos

## 1. Aplicar Migración

Ejecuta la migración para agregar el campo `version` a la tabla `Product`:

```bash
cd backend
npx prisma migrate dev --name add_version_to_product
```

Esto creará y aplicará el siguiente SQL:

```sql
ALTER TABLE "Product" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
```

## 2. Regenerar Cliente Prisma

Después de aplicar la migración, regenera el cliente:

```bash
npx prisma generate
```

## 3. Ejecutar Tests

Ejecuta los tests unitarios de optimistic locking:

```bash
npm test -- optimistic-locking.test.ts
```

O ejecuta todos los tests:

```bash
npm test
```

## 4. Verificar la Migración

Verifica que el campo `version` se agregó correctamente:

```bash
npx prisma studio
```

Navega a la tabla `Product` y confirma que el campo `version` existe con valor por defecto `1`.

## 5. Rollback (si es necesario)

Si necesitas revertir la migración:

```bash
npx prisma migrate reset
```

**⚠️ ADVERTENCIA:** Esto eliminará todos los datos de la base de datos de desarrollo.

## 6. Ver Estado de Migraciones

```bash
npx prisma migrate status
```

## 7. Iniciar Servidor con Nueva Implementación

```bash
npm run dev
```

## 8. Probar el Endpoint de Checkout

### Caso exitoso:
```bash
curl -X POST http://localhost:3000/api/marketplace/checkout \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
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

### Respuesta exitosa (201):
```json
[
  {
    "order": {
      "id": "order-123",
      "status": "PENDING",
      "total": "150.00"
    },
    "clientSecret": "pi_xxx_secret_yyy"
  }
]
```

### Respuesta con conflicto de concurrencia (409):
```json
{
  "error": "ConcurrencyError",
  "message": "El producto ha sido modificado por otro usuario. Por favor, recarga e intenta nuevamente."
}
```

### Respuesta con stock insuficiente (400):
```json
{
  "statusCode": 400,
  "message": "Stock insuficiente para Mezcal Artesanal. Disponible: 0"
}
```

## 9. Monitorear Logs de Retry

Durante el desarrollo, puedes agregar logs temporales para ver los reintentos:

```typescript
// En withRetry()
console.log(`Intento ${attempt + 1} de ${maxRetries}...`);
```

## 10. Cleanup de Órdenes Fallidas (Manualmente)

Ejecuta el cleanup manualmente para probar:

```bash
curl -X POST http://localhost:3000/api/marketplace/cleanup-failed-orders \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

O agrega un endpoint temporal en development:

```typescript
// En marketplace.ts (solo para testing)
if (process.env.NODE_ENV === 'development') {
  app.post('/cleanup-failed-orders', async () => {
    return marketplaceService.cleanupFailedOrders(30);
  });
}
```

## 11. Test de Concurrencia con Artillery

Crea un archivo `artillery-config.yml`:

```yaml
config:
  target: 'http://localhost:3000'
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Concurrent checkouts"
scenarios:
  - name: "Checkout same product"
    flow:
      - post:
          url: "/api/marketplace/checkout"
          json:
            shippingAddress:
              street: "Test Street"
              city: "Oaxaca"
              state: "Oaxaca"
              zipCode: "68000"
              country: "México"
          headers:
            Authorization: "Bearer {{ token }}"
```

Ejecuta:

```bash
npx artillery run artillery-config.yml
```

## 12. Verificar Integridad de Datos

Después de pruebas de concurrencia, verifica que no hay inconsistencias:

```sql
-- Stock no puede ser negativo
SELECT id, name, stock, version
FROM "Product"
WHERE stock < 0;

-- Órdenes sin payment intent después de 30 min
SELECT id, status, "createdAt", "stripePaymentId"
FROM "Order"
WHERE status IN ('PENDING_PAYMENT', 'PAYMENT_FAILED')
  AND "createdAt" < NOW() - INTERVAL '30 minutes'
  AND "stripePaymentId" IS NULL;
```

## Troubleshooting

### Error: "P1000: Authentication failed"

Asegúrate de que PostgreSQL está corriendo:

```bash
docker-compose up -d postgres
# o
brew services start postgresql
```

### Error: "Prisma Client not generated"

Regenera el cliente:

```bash
npx prisma generate
```

### Error: "Migration already applied"

Si la migración ya existe, puedes aplicarla manualmente:

```bash
npx prisma migrate resolve --applied add_version_to_product
```

### Error en producción: "relation does not exist"

Aplica migraciones pendientes:

```bash
npx prisma migrate deploy
```

## Notas Finales

- **Desarrollo:** Usa `npx prisma migrate dev`
- **Producción:** Usa `npx prisma migrate deploy`
- **Tests:** Usa una base de datos separada (ver `TEST_DATABASE.md`)

## Checklist de Deployment

- [ ] Migración aplicada en staging
- [ ] Tests de integración pasando
- [ ] Tests de concurrencia pasando
- [ ] Verificado que no hay stock negativo
- [ ] Logs monitoreando frecuencia de `ConcurrencyError`
- [ ] UI actualizada para manejar respuesta 409
- [ ] Documentación actualizada
- [ ] Migración aplicada en producción
- [ ] Rollback plan preparado

---

**Última actualización:** 2025-01-25
