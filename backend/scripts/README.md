# Scripts de Mantenimiento y Optimización

Este directorio contiene scripts para mantenimiento, análisis y optimización del sistema.

## 📋 Índice

- [Análisis de Queries](#análisis-de-queries)
- [Optimización de Índices](#optimización-de-índices)
- [Limpieza de Datos](#limpieza-de-datos)

---

## 🔍 Análisis de Queries

### analyze-queries.ts

Analiza el performance de las queries principales usando EXPLAIN ANALYZE.

**Uso:**
```bash
npx tsx scripts/analyze-queries.ts
```

**Qué hace:**
- Ejecuta EXPLAIN ANALYZE en queries críticas
- Muestra plan de ejecución y tiempos
- Analiza uso de índices
- Detecta Sequential Scans
- Identifica queries lentas
- Genera reporte JSON

**Salida:**
```
🔍 ANÁLISIS DE PERFORMANCE DE QUERIES

Analizando: Stories - Listado con ubicación
Plan de Ejecución: {...}
Tiempo de Ejecución: 12.45ms
⚠️  WARNING: Seq Scan detectado - considera agregar índice

📊 ANÁLISIS DE ÍNDICES
┌─────────┬────────────┬──────────────┬─────────────┐
│ (index) │ tablename  │ indexname    │ index_scans │
├─────────┼────────────┼──────────────┼─────────────┤
│    0    │ 'Booking'  │ 'Booking_...'│ 12453       │
└─────────┴────────────┴──────────────┴─────────────┘

💡 RECOMENDACIONES
[...]
```

**Requisitos:**
- Base de datos activa
- Datos de prueba cargados

**Salida:**
- `query-analysis-report.json` - Reporte completo

---

## ⚡ Optimización de Índices

### apply-optimization-indexes.sh

Aplica los índices de optimización a la base de datos.

**Uso:**
```bash
# Primera vez
chmod +x scripts/apply-optimization-indexes.sh

# Ejecutar
./scripts/apply-optimization-indexes.sh
```

**Qué hace:**
1. Verifica archivo de migración
2. Conecta a la base de datos
3. Aplica índices compuestos
4. Ejecuta análisis post-aplicación

**Índices aplicados:**

- **Story**: `[userId, createdAt]`
- **Booking**: `[userId, status, createdAt]`, `[experienceId, status]`, `[stripePaymentId]`
- **Order**: `[userId, status, createdAt]`, `[sellerId, status, createdAt]`, `[stripePaymentId]`
- **Product**: `[sellerId, status]`, `[category, status, createdAt]`
- **ExperienceTimeSlot**: `[experienceId, date, isAvailable]`
- **ActivityLog**: `[userId, action, createdAt]`
- **Notification**: `[userId, read, createdAt]`

**Rollback:**
Si necesitas revertir:
```sql
-- Ejecutar manualmente
DROP INDEX IF EXISTS "Story_userId_createdAt_idx";
DROP INDEX IF EXISTS "Booking_userId_status_createdAt_idx";
-- etc...
```

---

## 🧹 Limpieza de Datos

### Limpiar Bookings Fallidos

Limpia reservaciones en estado `PENDING_PAYMENT` o `PAYMENT_FAILED` que superaron el timeout.

**Desde código:**
```typescript
import { bookingService } from './services/booking.service';

// Limpiar bookings con timeout de 30 minutos
const result = await bookingService.cleanupFailedBookings(30);

console.log(`Limpiados: ${result.cleaned} bookings`);
console.log(`Slots actualizados: ${result.slotsUpdated}`);
```

**Programar con cron:**
```typescript
// src/jobs/cleanup.job.ts
import cron from 'node-cron';

// Ejecutar cada hora
cron.schedule('0 * * * *', async () => {
  console.log('🧹 Ejecutando limpieza de bookings...');
  const result = await bookingService.cleanupFailedBookings(30);
  console.log(`✅ Limpiados: ${result.cleaned} bookings`);
});
```

---

### Limpiar Órdenes Fallidas

Limpia órdenes en estado `PENDING_PAYMENT` o `PAYMENT_FAILED`.

**Desde código:**
```typescript
import { marketplaceService } from './services/marketplace.service';

const result = await marketplaceService.cleanupFailedOrders(30);
console.log(`Limpiadas: ${result.cleaned} órdenes`);
```

---

## 🔧 Configuración

### Variables de Entorno

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/db?connection_limit=10&pool_timeout=20"

# Logging
LOG_QUERIES=true  # Mostrar queries en desarrollo
```

### Connection Pooling

**Desarrollo:**
```
connection_limit=10
pool_timeout=20
```

**Producción:**
```
connection_limit=20-50
pool_timeout=30
```

---

## 📊 Monitoreo

### Queries a Monitorear

1. **Listado de Stories** - Alto tráfico
2. **Búsqueda de Productos** - Marketplace
3. **Dashboard Vendedor** - Órdenes + stats
4. **Slots Disponibles** - Calendario
5. **Notificaciones** - Alta frecuencia

### Métricas Objetivo

| Métrica | Objetivo | Alerta |
|---------|----------|--------|
| Tiempo promedio | < 100ms | > 200ms |
| P95 | < 300ms | > 500ms |
| P99 | < 500ms | > 1s |

### Habilitar pg_stat_statements

Para análisis avanzado de queries lentas:

```sql
-- postgresql.conf
shared_preload_libraries = 'pg_stat_statements'

-- Reiniciar PostgreSQL
-- Luego en psql:
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;
```

---

## 🚀 Best Practices

### 1. Ejecutar Análisis Regularmente

```bash
# Semanalmente
npx tsx scripts/analyze-queries.ts > analysis-$(date +%Y%m%d).log
```

### 2. Revisar Índices No Usados

```sql
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan
FROM pg_stat_user_indexes
WHERE idx_scan = 0
  AND schemaname = 'public'
ORDER BY tablename, indexname;
```

### 3. Monitorear Tamaño de Tablas

```sql
SELECT
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

---

## 📚 Referencias

- [DATABASE_OPTIMIZATION.md](../docs/DATABASE_OPTIMIZATION.md) - Guía completa
- [Prisma Performance](https://www.prisma.io/docs/guides/performance-and-optimization)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)

---

## ✅ Checklist

Antes de producción:

- [ ] Ejecutar `analyze-queries.ts` en staging
- [ ] Aplicar índices con `apply-optimization-indexes.sh`
- [ ] Configurar connection pooling
- [ ] Habilitar pg_stat_statements
- [ ] Configurar jobs de limpieza
- [ ] Configurar alertas de performance
- [ ] Documentar queries críticas

---

**Última actualización**: 2026-01-25
