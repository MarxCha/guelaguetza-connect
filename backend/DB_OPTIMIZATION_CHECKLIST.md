# ✅ Checklist de Optimización de Base de Datos

## Pre-Deployment (Staging/Dev)

### 1. Revisión de Schema
- [ ] Revisar `prisma/schema.prisma` - verificar 40+ índices agregados
- [ ] Verificar que no hay índices duplicados
- [ ] Validar que índices compuestos siguen orden correcto (selectividad)

### 2. Migración
- [ ] Ejecutar `npx prisma migrate deploy` en dev
- [ ] Verificar que migración se aplica sin errores
- [ ] Confirmar que índices fueron creados con `check-indexes.sql`
- [ ] Backup de base de datos antes de aplicar en staging

### 3. Connection Pooling
- [ ] Actualizar `.env` con connection pooling
- [ ] Configurar `connection_limit` apropiado (dev: 10, staging: 20, prod: 30)
- [ ] Agregar `pool_timeout=20-30`
- [ ] Agregar `connect_timeout=10`
- [ ] En prod: agregar `statement_timeout=30000`

### 4. Testing
- [ ] Ejecutar suite de tests (unit + integration)
- [ ] Verificar que queries optimizados funcionan correctamente
- [ ] Test de carga con Apache Bench o k6
- [ ] Medir latencia antes/después

### 5. Monitoreo
- [ ] Ejecutar `scripts/check-indexes.sql` para baseline
- [ ] Verificar cache hit ratio >95%
- [ ] Identificar queries lentas (>100ms)
- [ ] Documentar métricas baseline

---

## Deployment (Producción)

### Pre-Deploy
- [ ] ✅ Staging funcionando correctamente
- [ ] ✅ Backup completo de base de datos
- [ ] ✅ Plan de rollback documentado
- [ ] ✅ Ventana de mantenimiento comunicada (si necesaria)

### Durante Deploy
- [ ] Aplicar migración en producción
- [ ] Verificar logs - sin errores
- [ ] Verificar índices creados
- [ ] Restart de aplicación (si necesario)

### Post-Deploy Inmediato (0-1h)
- [ ] Ejecutar `check-indexes.sql` - verificar índices creados
- [ ] Verificar que idx_scan > 0 en índices críticos
- [ ] Monitorear latencia de API (debe bajar 40-60%)
- [ ] Monitorear uso de conexiones DB
- [ ] Verificar logs - sin errores de queries

### Post-Deploy Corto Plazo (1-24h)
- [ ] Revisar dashboard de Prometheus/Grafana
- [ ] Verificar métricas de performance (latencia P50, P95, P99)
- [ ] Identificar queries que aún son lentas
- [ ] Verificar cache hit ratio >95%
- [ ] Monitorear connection pool exhaustion

### Post-Deploy Medio Plazo (1-7 días)
- [ ] Ejecutar análisis de índices no utilizados
- [ ] Ajustar connection_limit según carga real
- [ ] Documentar mejoras observadas
- [ ] Identificar próximas optimizaciones

---

## Verificaciones Técnicas

### Índices Creados

Ejecutar en PostgreSQL:
```sql
SELECT tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%_idx'
ORDER BY tablename;
```

**Esperado:** 40+ índices con sufijo `_idx`

### Uso de Índices

```sql
SELECT
    tablename,
    indexname,
    idx_scan,
    idx_tup_read
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

**Esperado:** idx_scan > 0 en índices críticos después de 1h

### Cache Hit Ratio

```sql
SELECT
    sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) * 100 AS cache_hit_ratio
FROM pg_statio_user_tables;
```

**Esperado:** >95%

### Connection Pool

```sql
SELECT count(*) FROM pg_stat_activity;
```

**Esperado:** <connection_limit configurado

### Queries Lentas

```sql
SELECT query, calls, mean_time, max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Esperado:** mean_time <100ms para queries frecuentes

---

## Índices Críticos a Verificar

### User
- [ ] `User_email_idx` - autenticación
- [ ] `User_role_idx` - admin queries

### Product
- [ ] `Product_sellerId_idx` - dashboard vendedor
- [ ] `Product_category_status_idx` - catálogo

### Order
- [ ] `Order_userId_status_idx` - historial usuario
- [ ] `Order_sellerId_status_idx` - dashboard vendedor
- [ ] `Order_status_createdAt_idx` - cleanup jobs

### Booking
- [ ] `Booking_userId_status_idx` - mis reservaciones
- [ ] `Booking_experienceId_idx` - bookings por experiencia
- [ ] `Booking_status_createdAt_idx` - cleanup jobs

### ExperienceTimeSlot
- [ ] `ExperienceTimeSlot_experienceId_date_idx` - calendario
- [ ] `ExperienceTimeSlot_date_isAvailable_idx` - búsqueda disponibilidad

---

## Métricas de Performance

### Latencia de API (Target: -40 a -60%)

| Endpoint | Antes | Después | Status |
|----------|-------|---------|--------|
| GET /api/bookings | 280ms | ≤110ms | [ ] |
| GET /api/products | 320ms | ≤160ms | [ ] |
| GET /api/experiences/:id/slots | 400ms | ≤140ms | [ ] |
| GET /api/orders | 450ms | ≤135ms | [ ] |
| GET /api/stories | 180ms | ≤108ms | [ ] |

### Throughput (Target: +200%)

| Métrica | Antes | Después | Status |
|---------|-------|---------|--------|
| Requests/segundo | 100 | ≥300 | [ ] |
| Concurrent users | 200 | ≥600 | [ ] |
| Database CPU | 80% | ≤40% | [ ] |

### Data Transfer (Target: -60%)

| Query | Antes | Después | Status |
|-------|-------|---------|--------|
| Product list | 500KB | ≤200KB | [ ] |
| Booking details | 80KB | ≤30KB | [ ] |
| Cart | 120KB | ≤50KB | [ ] |

---

## Rollback Plan

### Si hay problemas críticos

1. **Revertir conexiones**
   ```bash
   # Remover connection pooling params
   DATABASE_URL="postgresql://user:pass@host:port/db"
   ```

2. **Eliminar índices problemáticos**
   ```sql
   DROP INDEX CONCURRENTLY index_name;
   ```

3. **Rollback de migración** (último recurso)
   ```bash
   # Crear migración inversa
   npx prisma migrate dev --name revert_indexes --create-only
   # Editar SQL para DROP INDEX
   npx prisma migrate deploy
   ```

4. **Restaurar backup**
   ```bash
   # Si todo falla
   pg_restore -d guelaguetza_db backup.dump
   ```

---

## Alertas Recomendadas

### Configurar en Grafana/Prometheus

- [ ] Query duration P95 >500ms
- [ ] Query duration P99 >1000ms
- [ ] Cache hit ratio <95%
- [ ] Connection pool exhaustion >80%
- [ ] Database CPU >70%
- [ ] Index bloat >50%
- [ ] Table bloat >30%

---

## Mantenimiento Continuo

### Semanal
- [ ] Revisar queries lentas (pg_stat_statements)
- [ ] Verificar uso de índices (pg_stat_user_indexes)
- [ ] Monitorear tamaño de índices

### Mensual
- [ ] Ejecutar `VACUUM ANALYZE` en tablas grandes
- [ ] Revisar índices no utilizados (idx_scan = 0)
- [ ] Verificar bloat en índices y tablas
- [ ] Actualizar estadísticas de planner

### Trimestral
- [ ] Revisar y eliminar índices no utilizados
- [ ] Evaluar necesidad de nuevos índices
- [ ] Revisar configuración de connection pooling
- [ ] Performance audit completo

---

## Troubleshooting

### Problema: Queries siguen lentas

**Verificar:**
```sql
EXPLAIN ANALYZE <query>;
```

**Buscar:** "Seq Scan" en tablas grandes

**Solución:**
- Verificar que índice existe
- Verificar que query usa el índice
- Ejecutar `ANALYZE table_name;`
- Revisar selectividad de columnas

### Problema: Connection pool exhaustion

**Verificar:**
```sql
SELECT count(*), state FROM pg_stat_activity GROUP BY state;
```

**Solución:**
- Incrementar `connection_limit`
- Verificar que no hay connection leaks
- Revisar tiempo de ejecución de queries largas

### Problema: Cache hit ratio bajo

**Verificar:**
```sql
SELECT * FROM pg_statio_user_tables;
```

**Solución:**
- Aumentar `shared_buffers` en postgresql.conf
- Revisar queries que hacen full table scans
- Implementar application-level caching (Redis)

---

## Documentación de Referencia

| Documento | Cuando usar |
|-----------|-------------|
| `DATABASE_OPTIMIZATION_GUIDE.md` | Guía completa con ejemplos |
| `DB_OPTIMIZATION_EXECUTIVE_SUMMARY.md` | Resumen rápido |
| `scripts/check-indexes.sql` | Verificación de índices |
| `DATABASE_OPTIMIZATION_SUMMARY.md` | Resumen detallado con métricas |

---

## Aprobaciones Requeridas

### Pre-Deployment
- [ ] Lead Backend aprueba cambios
- [ ] QA verifica en staging
- [ ] DevOps aprueba ventana de mantenimiento
- [ ] Product Manager notificado

### Post-Deployment
- [ ] Lead Backend confirma métricas
- [ ] On-call Engineer notificado
- [ ] Documentación actualizada
- [ ] Post-mortem (si hubo issues)

---

## Contactos

- **Lead Backend:** [nombre]
- **DBA/DevOps:** [nombre]
- **On-call Engineer:** [nombre]
- **Escalation:** [canal de Slack]

---

**Última actualización:** 2026-01-25
**Responsable:** Backend Team
**Versión:** 1.0

---

## Notas Finales

Este checklist es una guía viva. Actualizar basado en:
- Experiencias de deployment
- Problemas encontrados
- Mejoras identificadas
- Feedback del equipo

**Mantener actualizado en cada iteración de optimización.**
