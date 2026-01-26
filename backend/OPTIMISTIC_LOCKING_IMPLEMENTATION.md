# Implementación de Optimistic Locking - Resumen

## Cambios Realizados

### 1. Schema de Base de Datos

**Archivo:** `prisma/schema.prisma`

- Agregado campo `version Int @default(1)` al modelo `ExperienceTimeSlot`
- Este campo permite detectar actualizaciones concurrentes mediante versioning

### 2. Migración de Base de Datos

**Archivo:** `prisma/migrations/20260125074152_add_optimistic_locking_to_time_slots/migration.sql`

```sql
ALTER TABLE "ExperienceTimeSlot" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
```

**Para aplicar la migración:**
```bash
npx prisma migrate deploy
```

### 3. Nuevos Errores de Dominio

**Archivo:** `src/utils/errors.ts`

- Agregada clase `ConcurrencyError` para errores de conflicto (HTTP 409)

### 4. Utilidades de Locking Optimista

**Archivo:** `src/utils/optimistic-locking.ts`

Funciones implementadas:

- `withRetry()`: Ejecuta operaciones con retry automático y backoff exponencial
- `updateTimeSlotWithLocking()`: Actualiza time slots con verificación de versión
- `getTimeSlotWithVersion()`: Obtiene y valida versión de time slots

### 5. Actualización del Booking Service

**Archivo:** `src/services/booking.service.ts`

**Métodos modificados:**

- `createBooking()`: Ahora usa locking optimista con retry automático
- `cancelBooking()`: Ahora usa locking optimista con retry automático

**Mejoras:**
- Previene race conditions en reservas concurrentes
- Previene overbooking mediante verificación atómica de versión
- Retry automático en caso de conflictos (hasta 3 intentos)
- Backoff exponencial para reducir contención

### 6. Tests

**Tests de Integración:** `test/integration/booking-concurrency.test.ts`

Casos de prueba:
- ✓ Creación exitosa con optimistic locking
- ✓ Detección de actualizaciones concurrentes
- ✓ Manejo de reservas concurrentes con retry
- ✓ Prevención de overbooking
- ✓ Cancelación con locking optimista
- ✓ Versioning a través de múltiples operaciones

**Tests Unitarios:** `test/unit/optimistic-locking.test.ts`

Casos de prueba para `withRetry()`:
- ✓ Ejecución exitosa en primer intento
- ✓ Retry y éxito tras conflictos
- ✓ Fallo después de max retries
- ✓ No retry en errores no-concurrencia
- ✓ Backoff exponencial
- ✓ Opciones por defecto
- ✓ Propagación de resultados
- ✓ Manejo de errores async

### 7. Documentación

**Archivo:** `docs/OPTIMISTIC_LOCKING.md`

Documentación completa que incluye:
- Descripción del problema y solución
- Implementación técnica
- API de utilidades
- Flujos de negocio
- Mejores prácticas
- Ejemplos de código
- Guía de testing
- Monitoreo

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    HTTP Request                              │
│                  (POST /api/bookings)                        │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                 Router/Controller                            │
│              (Validación de entrada)                         │
└───────────────────────┬─────────────────────────────────────┘
                        │
                        ▼
┌─────────────────────────────────────────────────────────────┐
│              BookingService.createBooking()                  │
│                  ┌──────────────────┐                        │
│                  │   withRetry()    │  ← Retry automático    │
│                  └────────┬─────────┘                        │
│                           │                                  │
│                  1. Leer TimeSlot                            │
│                  2. Validar disponibilidad                   │
│                  3. Guardar version actual                   │
│                           │                                  │
│                           ▼                                  │
│                  ┌─────────────────┐                         │
│                  │  $transaction   │                         │
│                  │                 │                         │
│                  │  updateTimeSlot │ ← Locking optimista     │
│                  │  WithLocking()  │   (WHERE version=X)     │
│                  │                 │                         │
│                  │  create Booking │                         │
│                  └─────────────────┘                         │
│                           │                                  │
│                           ▼                                  │
│                    ┌──────────┐                              │
│                    │ Success? │                              │
│                    └─┬────┬───┘                              │
│                      │    │                                  │
│                 Yes  │    │ No (version mismatch)            │
│                      │    │                                  │
│                      │    └──► ConcurrencyError              │
│                      │                  │                    │
│                      │                  ▼                    │
│                      │            Retry (backoff)            │
│                      │                  │                    │
│                      │                  └──► (loop up to 3x) │
│                      ▼                                       │
│                Return Result                                 │
└─────────────────────────────────────────────────────────────┘
```

## Flujo de Concurrencia

### Escenario: Dos usuarios reservando simultáneamente

```
Usuario A                   Usuario B                   Base de Datos
────────────────────────────────────────────────────────────────────
│                           │                           │
├─ Read slot (v=1)          │                           │ (v=1, booked=5)
│                           ├─ Read slot (v=1)          │
│                           │                           │
├─ BEGIN TRANSACTION        │                           │
│  UPDATE slot              │                           │
│   WHERE version=1         │                           │
│   SET booked=7, v=2       │                           │
├─ COMMIT ✓                 │                           │ (v=2, booked=7)
│                           │                           │
│                           ├─ BEGIN TRANSACTION        │
│                           │  UPDATE slot              │
│                           │   WHERE version=1         │ ← Version mismatch!
│                           │   (0 rows updated)        │
│                           ├─ ROLLBACK                 │
│                           │                           │
│                           ├─ ConcurrencyError         │
│                           ├─ Wait 100ms (retry 1)     │
│                           │                           │
│                           ├─ Read slot (v=2)          │ (v=2, booked=7)
│                           ├─ Validate capacity        │
│                           ├─ BEGIN TRANSACTION        │
│                           │  UPDATE slot              │
│                           │   WHERE version=2         │
│                           │   SET booked=9, v=3       │
│                           ├─ COMMIT ✓                 │ (v=3, booked=9)
│                           │                           │
                            ▼                           ▼
                        SUCCESS                   Consistent State
```

## Beneficios de la Implementación

1. **Prevención de Race Conditions**: Evita que múltiples reservas sobrescriban el contador
2. **Prevención de Overbooking**: Garantiza que la capacidad nunca se exceda
3. **Atomicidad**: Las operaciones son todo-o-nada
4. **Resiliencia**: Retry automático en caso de conflictos
5. **Performance**: Sin bloqueos pesados (locks) de base de datos
6. **Escalabilidad**: Mejor rendimiento bajo alta carga concurrente
7. **Auditable**: Cada cambio incrementa la versión

## Performance

### Comparación: Pessimistic vs Optimistic Locking

| Métrica                    | Pessimistic Lock | Optimistic Lock (Implementado) |
|----------------------------|------------------|--------------------------------|
| Bloqueo de tabla           | Sí (SELECT FOR UPDATE) | No                        |
| Contención bajo carga alta | Alta             | Baja                          |
| Throughput                 | Limitado         | Alto                          |
| Latencia (sin conflictos)  | +10-50ms         | ~0ms overhead                 |
| Latencia (con conflictos)  | +50-200ms        | +100-400ms (con retries)      |
| Escalabilidad              | Baja             | Alta                          |
| Deadlocks                  | Posible          | No                            |

### Métricas Esperadas

Con optimistic locking implementado:

- **Tasa de conflictos esperada:** 1-5% bajo carga normal
- **Tasa de éxito tras retry:** >99%
- **Overhead promedio:** <5ms por operación
- **Throughput:** 100-500 reservas/segundo (depende de hardware)

## Comandos para Testing

```bash
# Ejecutar todos los tests
npm test

# Solo tests de optimistic locking
npm test optimistic-locking

# Solo tests de concurrencia
npm test booking-concurrency

# Con coverage
npm test -- --coverage
```

## Migración en Producción

### Checklist

- [ ] 1. Aplicar migración en staging
  ```bash
  npx prisma migrate deploy
  ```

- [ ] 2. Verificar que el campo `version` existe en todas las filas

- [ ] 3. Ejecutar tests de integración
  ```bash
  npm test test/integration/booking-concurrency
  ```

- [ ] 4. Monitorear logs durante 24h en staging

- [ ] 5. Si todo ok, aplicar en producción en ventana de mantenimiento

- [ ] 6. Configurar alertas para ConcurrencyError (tasa > 10%)

- [ ] 7. Monitorear métricas de performance

### Rollback Plan

Si necesitas hacer rollback:

```bash
# 1. Revertir código
git revert <commit-hash>

# 2. NO eliminar el campo version de la DB
# (Es seguro dejarlo, no afecta nada)

# 3. Si es absolutamente necesario eliminarlo:
# Crear migración manual:
# ALTER TABLE "ExperienceTimeSlot" DROP COLUMN "version";
```

## Monitoreo Post-Deployment

### Métricas a Observar

1. **Tasa de ConcurrencyError**
   ```sql
   SELECT COUNT(*)
   FROM logs
   WHERE error_type = 'ConcurrencyError'
   AND timestamp > NOW() - INTERVAL '1 hour';
   ```

2. **Distribución de versiones**
   ```sql
   SELECT version, COUNT(*)
   FROM "ExperienceTimeSlot"
   GROUP BY version
   ORDER BY version DESC
   LIMIT 10;
   ```

3. **Time slots con alta contención**
   ```sql
   SELECT id, version
   FROM "ExperienceTimeSlot"
   WHERE version > 10
   ORDER BY version DESC;
   ```

### Alertas Recomendadas

- ConcurrencyError rate > 10% en 5 minutos
- Número de retries promedio > 2
- Latencia de booking > 1000ms (p99)

## Contacto

Para preguntas sobre esta implementación:
- Ver documentación completa: `/docs/OPTIMISTIC_LOCKING.md`
- Tests de ejemplo: `/test/integration/booking-concurrency.test.ts`
- Código fuente: `/src/utils/optimistic-locking.ts`
