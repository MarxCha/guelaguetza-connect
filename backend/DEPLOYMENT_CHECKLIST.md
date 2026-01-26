# ✅ Checklist de Deployment - Optimistic Locking para Productos

## 📋 Pre-Deployment

### Verificación de Código

- [ ] **Todos los archivos modificados están committeados**
  ```bash
  git status
  # Debe mostrar: nothing to commit, working tree clean
  ```

- [ ] **Tests unitarios pasando (100% success)**
  ```bash
  npm test -- optimistic-locking.test.ts
  # Expected: All tests passed
  ```

- [ ] **Tests de integración pasando**
  ```bash
  npm test -- product-concurrency.test.ts
  # Expected: All scenarios passing
  ```

- [ ] **No hay errores de TypeScript**
  ```bash
  npm run build
  # Expected: Build successful
  ```

- [ ] **Linter pasando**
  ```bash
  npm run lint
  # Expected: No errors
  ```

---

## 🗄️ Base de Datos (Staging)

### Backup

- [ ] **Crear backup de base de datos**
  ```bash
  pg_dump -h staging-db.example.com -U postgres -d guelaguetza_db > backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Verificar que el backup se creó correctamente**
  ```bash
  ls -lh backup_*.sql
  # Verificar tamaño del archivo (> 0 bytes)
  ```

### Migración

- [ ] **Revisar SQL de la migración**
  ```bash
  cat backend/prisma/migrations/*/migration.sql | grep "Product"
  # Verificar: ALTER TABLE "Product" ADD COLUMN "version" INTEGER
  ```

- [ ] **Aplicar migración en staging**
  ```bash
  cd backend
  npx prisma migrate deploy
  ```

- [ ] **Verificar que la columna `version` existe**
  ```bash
  npx prisma studio
  # Navegar a Product table, verificar campo "version"
  ```

- [ ] **Verificar productos existentes tienen version=1**
  ```sql
  SELECT COUNT(*) as total,
         COUNT(CASE WHEN version = 1 THEN 1 END) as with_version_1
  FROM "Product";
  -- Expected: total = with_version_1
  ```

---

## 🧪 Testing en Staging

### Tests Funcionales

- [ ] **Test 1: Checkout normal (sin conflicto)**
  ```bash
  # Agregar producto al carrito
  curl -X POST https://staging.example.com/api/marketplace/cart/items \
    -H "Authorization: Bearer STAGING_TOKEN" \
    -d '{"productId": "TEST_PRODUCT", "quantity": 1}'

  # Hacer checkout
  curl -X POST https://staging.example.com/api/marketplace/checkout \
    -H "Authorization: Bearer STAGING_TOKEN" \
    -d '{"shippingAddress": {...}}'

  # Expected: 201 Created
  ```

- [ ] **Test 2: Stock insuficiente**
  ```bash
  # Agregar más unidades de las disponibles
  curl -X POST https://staging.example.com/api/marketplace/cart/items \
    -d '{"productId": "LOW_STOCK_PRODUCT", "quantity": 999}'

  # Intentar checkout
  curl -X POST https://staging.example.com/api/marketplace/checkout

  # Expected: 400 Bad Request, mensaje "Stock insuficiente"
  ```

- [ ] **Test 3: Conflicto de concurrencia simulado**
  ```bash
  # Usar script de test de concurrencia
  node test/scripts/simulate-race-condition.js

  # Expected: Exactamente 1 éxito, resto falla con 400 o 409
  ```

### Verificación de Integridad

- [ ] **Verificar que no hay stock negativo**
  ```sql
  SELECT id, name, stock FROM "Product" WHERE stock < 0;
  -- Expected: 0 rows
  ```

- [ ] **Verificar versiones incrementándose correctamente**
  ```sql
  SELECT id, name, version, stock
  FROM "Product"
  WHERE "updatedAt" > NOW() - INTERVAL '1 hour'
  ORDER BY version DESC
  LIMIT 10;
  -- Verificar que version > 1 para productos con ventas
  ```

- [ ] **Verificar órdenes creadas correctamente**
  ```sql
  SELECT status, COUNT(*)
  FROM "Order"
  WHERE "createdAt" > NOW() - INTERVAL '1 hour'
  GROUP BY status;
  -- Verificar distribución razonable de estados
  ```

---

## 📊 Monitoreo y Logs

### Configurar Alertas

- [ ] **Alerta para stock negativo (CRÍTICO)**
  ```sql
  -- Query para monitoreo cada 5 min
  SELECT COUNT(*) FROM "Product" WHERE stock < 0;
  -- Si > 0: ALERTA CRÍTICA
  ```

- [ ] **Alerta para ConcurrencyError frecuentes**
  ```bash
  # Revisar logs cada hora
  grep "ConcurrencyError" logs/app.log | wc -l
  # Si > 100/hora: ALERTA WARNING
  ```

- [ ] **Alerta para órdenes fallidas**
  ```sql
  SELECT COUNT(*)
  FROM "Order"
  WHERE status IN ('PAYMENT_FAILED', 'CANCELLED')
    AND "createdAt" > NOW() - INTERVAL '1 hour';
  -- Si > 50: ALERTA WARNING
  ```

### Dashboard de Métricas

- [ ] **Crear dashboard con métricas clave**
  - Tasa de ConcurrencyError (%)
  - Reintentos promedio por checkout
  - Latencia de checkout (P50, P95, P99)
  - Stock negativo (debe ser siempre 0)
  - Órdenes por estado

---

## 🚀 Deployment a Producción

### Pre-Deploy

- [ ] **Notificar al equipo sobre deployment**
  ```
  Mensaje Slack:
  "🚀 Deploying optimistic locking para productos a producción
   Fecha: [FECHA]
   Duración estimada: 15-20 minutos
   Downtime esperado: 0 minutos
   Rollback plan: Listo"
  ```

- [ ] **Verificar que staging está estable**
  - [ ] Tests pasando
  - [ ] No hay errores en logs
  - [ ] Métricas normales

### Deploy

- [ ] **Crear backup de producción**
  ```bash
  pg_dump -h prod-db.example.com -U postgres -d guelaguetza_db > prod_backup_$(date +%Y%m%d_%H%M%S).sql
  ```

- [ ] **Poner aplicación en modo mantenimiento (opcional)**
  ```bash
  # Si se espera downtime
  curl -X POST https://api.example.com/admin/maintenance/enable
  ```

- [ ] **Aplicar migración en producción**
  ```bash
  cd backend
  DATABASE_URL="$PROD_DATABASE_URL" npx prisma migrate deploy
  ```

- [ ] **Verificar migración exitosa**
  ```bash
  DATABASE_URL="$PROD_DATABASE_URL" npx prisma migrate status
  # Expected: Database schema is up to date
  ```

- [ ] **Regenerar cliente Prisma en producción**
  ```bash
  npx prisma generate
  ```

- [ ] **Compilar código**
  ```bash
  npm run build
  ```

- [ ] **Desplegar nueva versión**
  ```bash
  # Ejemplo con PM2
  pm2 restart guelaguetza-backend --update-env

  # O con Docker
  docker-compose up -d --build
  ```

- [ ] **Quitar modo mantenimiento**
  ```bash
  curl -X POST https://api.example.com/admin/maintenance/disable
  ```

### Verificación Post-Deploy

- [ ] **Health check del API**
  ```bash
  curl https://api.example.com/health
  # Expected: 200 OK
  ```

- [ ] **Verificar logs no muestran errores críticos**
  ```bash
  tail -f logs/app.log | grep -i "error"
  # Buscar errores relacionados con Product, version, ConcurrencyError
  ```

- [ ] **Test de checkout en producción (con cuenta de prueba)**
  ```bash
  curl -X POST https://api.example.com/api/marketplace/checkout \
    -H "Authorization: Bearer TEST_TOKEN" \
    -d '{"shippingAddress": {...}}'
  # Expected: 201 Created
  ```

- [ ] **Verificar productos existentes tienen version=1**
  ```sql
  SELECT MIN(version), MAX(version), AVG(version)
  FROM "Product";
  -- Expected: MIN=1, MAX cercano a 1
  ```

---

## 📈 Monitoreo Post-Deploy (primeras 24 horas)

### Hora 1

- [ ] **Verificar no hay errores críticos en logs**
  ```bash
  tail -100 logs/app.log | grep -i "error\|exception"
  ```

- [ ] **Verificar métricas de checkout**
  - [ ] Latencia: < 2 segundos (P95)
  - [ ] Tasa de éxito: > 95%
  - [ ] ConcurrencyError: < 1%

- [ ] **Verificar stock no negativo**
  ```sql
  SELECT COUNT(*) FROM "Product" WHERE stock < 0;
  -- Expected: 0
  ```

### Hora 4

- [ ] **Revisar alertas**
  - [ ] No hay alertas críticas activas
  - [ ] Tasa de errores estable

- [ ] **Verificar dashboard de métricas**
  - [ ] Órdenes creándose normalmente
  - [ ] No hay picos anormales de reintentos

### Hora 12

- [ ] **Análisis de órdenes del día**
  ```sql
  SELECT status, COUNT(*)
  FROM "Order"
  WHERE "createdAt" > NOW() - INTERVAL '12 hours'
  GROUP BY status;
  ```

- [ ] **Verificar cleanup de órdenes fallidas**
  ```sql
  SELECT COUNT(*)
  FROM "Order"
  WHERE status IN ('PENDING_PAYMENT', 'PAYMENT_FAILED')
    AND "createdAt" < NOW() - INTERVAL '30 minutes';
  -- Expected: Cerca de 0 (si cleanup job está corriendo)
  ```

### Hora 24

- [ ] **Reporte de métricas**
  - Total de checkouts: ____
  - Tasa de éxito: ____%
  - ConcurrencyErrors: ____
  - Reintentos promedio: ____
  - Stock negativo: 0 ✓

- [ ] **Notificar éxito del deployment**
  ```
  Mensaje Slack:
  "✅ Deployment de optimistic locking completado exitosamente
   • Sin incidentes reportados
   • Métricas dentro de lo esperado
   • Stock sin inconsistencias
   • Monitoreo continúa activo"
  ```

---

## 🔄 Plan de Rollback (si es necesario)

### Criterios para Rollback

Ejecutar rollback SI:
- Stock negativo detectado (> 0 productos)
- Tasa de ConcurrencyError > 10%
- Tasa de checkouts fallidos > 20%
- Latencia > 10 segundos (P95)
- Errores críticos en logs

### Pasos de Rollback

1. **[ ] Notificar al equipo**
   ```
   "⚠️ Iniciando rollback de optimistic locking deployment
    Razón: [DESCRIPCIÓN]"
   ```

2. **[ ] Poner en modo mantenimiento**
   ```bash
   curl -X POST https://api.example.com/admin/maintenance/enable
   ```

3. **[ ] Revertir código a versión anterior**
   ```bash
   git revert HEAD
   npm run build
   pm2 restart guelaguetza-backend
   ```

4. **[ ] Revertir migración de base de datos**
   ```bash
   # Ejecutar migración de rollback (si existe)
   npx prisma migrate resolve --rolled-back add_version_to_product

   # O manualmente
   psql -h prod-db -U postgres -d guelaguetza_db -c "
     ALTER TABLE \"Product\" DROP COLUMN version;
   "
   ```

5. **[ ] Restaurar backup si es necesario**
   ```bash
   # SOLO si hay inconsistencias críticas
   psql -h prod-db -U postgres -d guelaguetza_db < prod_backup_[TIMESTAMP].sql
   ```

6. **[ ] Quitar modo mantenimiento**
   ```bash
   curl -X POST https://api.example.com/admin/maintenance/disable
   ```

7. **[ ] Verificar funcionamiento normal**
   ```bash
   curl https://api.example.com/health
   # Test de checkout
   ```

8. **[ ] Realizar post-mortem**
   - ¿Qué salió mal?
   - ¿Cómo prevenirlo en el futuro?
   - ¿Tests adicionales necesarios?

---

## 📝 Documentación Post-Deploy

- [ ] **Actualizar CHANGELOG.md**
  ```markdown
  ## [1.1.0] - 2025-01-25
  ### Added
  - Optimistic locking para modelo Product
  - Prevención de race conditions en checkout
  - Reintentos automáticos con backoff exponencial
  ### Changed
  - Campo `version` agregado a tabla Product
  - Endpoint /checkout ahora retorna 409 en conflictos
  ```

- [ ] **Actualizar API documentation**
  - Documentar respuesta 409
  - Agregar ejemplos de manejo en frontend

- [ ] **Crear runbook de incidentes**
  - Qué hacer si stock negativo detectado
  - Cómo interpretar ConcurrencyError en logs
  - Comandos de diagnóstico

- [ ] **Compartir learnings con el equipo**
  - Demo de la implementación
  - Explicar cambios en el frontend
  - Q&A session

---

## ✅ Sign-Off

### Backend Lead
- [ ] Código revisado y aprobado
- [ ] Tests pasando
- [ ] Documentación completa

**Nombre:** ________________
**Fecha:** ________________
**Firma:** ________________

### DevOps
- [ ] Infraestructura preparada
- [ ] Backups verificados
- [ ] Monitoreo configurado

**Nombre:** ________________
**Fecha:** ________________
**Firma:** ________________

### Product Owner
- [ ] Feature probada en staging
- [ ] UX/UI validada
- [ ] Métricas de éxito definidas

**Nombre:** ________________
**Fecha:** ________________
**Firma:** ________________

---

## 🎉 Deployment Completado

**Fecha de deployment:** ________________
**Hora de inicio:** ________________
**Hora de fin:** ________________
**Duración total:** ________________
**Downtime:** ________________
**Incidentes:** ________________

**Estado final:** ✅ EXITOSO / ⚠️ CON WARNINGS / ❌ ROLLBACK

**Notas adicionales:**
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________

---

**Preparado por:** Claude Code Agent
**Fecha:** 2025-01-25
**Versión:** 1.0
