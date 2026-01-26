# Prueba Rápida del Sistema de Caching

## 1. Iniciar Redis

```bash
# Opción 1: Docker (recomendado)
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Opción 2: Local (si tienes Redis instalado)
redis-server

# Verificar que está corriendo
redis-cli ping
# Debe responder: PONG
```

## 2. Iniciar el Backend

```bash
cd backend
npm run dev
```

## 3. Verificar Conexión del Cache

```bash
# Health check del cache
curl http://localhost:3001/health/cache

# Debe responder:
{
  "status": "healthy",
  "connected": true,
  "metrics": {
    "hits": 0,
    "misses": 0,
    "sets": 0,
    "deletes": 0,
    "errors": 0,
    "hitRate": "0.00%"
  }
}
```

## 4. Probar Cache-Aside Pattern

### Test 1: Experiences (TTL: 2 minutos)

```bash
# Primera llamada (MISS - va a la BD)
time curl http://localhost:3001/api/bookings/experiences

# Segunda llamada (HIT - viene del cache)
time curl http://localhost:3001/api/bookings/experiences

# La segunda debe ser MUY rápida (~5-10ms vs 100-200ms)
```

### Test 2: Leaderboard (TTL: 5 minutos)

```bash
# Autenticarse primero
TOKEN="tu-jwt-token"

# Primera llamada
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/gamification/leaderboard

# Segunda llamada (más rápida)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/gamification/leaderboard
```

### Test 3: Products (TTL: 10 minutos)

```bash
# Primera llamada
time curl http://localhost:3001/api/marketplace/products

# Segunda llamada (más rápida)
time curl http://localhost:3001/api/marketplace/products
```

## 5. Verificar Métricas

```bash
# Ver estadísticas de cache
curl http://localhost:3001/metrics/cache

# Ejemplo de respuesta después de pruebas:
{
  "status": "connected",
  "metrics": {
    "hits": 15,       # Requests que usaron cache
    "misses": 5,      # Requests que fueron a BD
    "sets": 5,        # Valores guardados en cache
    "deletes": 2,     # Invalidaciones
    "errors": 0,      # Sin errores
    "hitRate": "75.00%",  # 75% de las requests usaron cache
    "totalRequests": 20
  }
}
```

## 6. Probar Invalidación

### Test: Crear un producto invalida el cache

```bash
TOKEN="tu-jwt-token"

# 1. Obtener listado de productos (crea cache)
curl http://localhost:3001/api/marketplace/products

# 2. Crear un nuevo producto (invalida cache)
curl -X POST http://localhost:3001/api/marketplace/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Producto Test",
    "description": "Test de invalidación",
    "price": 100,
    "category": "ARTESANIAS",
    "stock": 10,
    "images": []
  }'

# 3. Obtener listado nuevamente (debe ir a BD, no cache)
curl http://localhost:3001/api/marketplace/products

# El nuevo producto debe aparecer inmediatamente
```

## 7. Monitorear Redis Directamente

```bash
# Conectarse al CLI de Redis
redis-cli

# Ver todas las claves
KEYS guelaguetza:*

# Ver valor de una clave específica
GET guelaguetza:experience:clx123:detail

# Ver TTL restante
TTL guelaguetza:experience:clx123:detail

# Ver estadísticas de Redis
INFO stats
```

## 8. Limpiar Cache (Opcional)

```bash
# Flush completo del cache (cuidado en producción)
redis-cli FLUSHDB

# O desde el código, llamar a:
# cache.flush()
```

## Resultados Esperados

### Performance

| Operación | Sin Cache | Con Cache | Mejora |
|-----------|-----------|-----------|--------|
| Get Experience | 150ms | 10ms | 93% |
| Get Products | 200ms | 8ms | 96% |
| Get Leaderboard | 300ms | 12ms | 96% |
| Get User Stats | 100ms | 5ms | 95% |

### Hit Rate

- **Objetivo**: 80-90%
- **Inicial**: 50-60% (cache frío)
- **Estable**: 80-95% (después de warm-up)

### Carga en Base de Datos

- **Reducción**: 70-90%
- **Queries/seg**: De 1000 a 100-300

## Troubleshooting

### Error: "Redis connection refused"

```bash
# Verificar que Redis está corriendo
docker ps | grep redis

# O si es local:
ps aux | grep redis

# Reiniciar Redis
docker restart redis
```

### Error: "Cache miss rate muy alto"

```bash
# Verificar TTLs
# TTLs muy cortos = muchos misses

# Ver configuración actual
cat src/services/booking.service.ts | grep CACHE_TTL
```

### Cache no invalida correctamente

```bash
# Ver logs del backend
# Debe mostrar:
# [Cache] Invalidated 5 keys matching pattern: experience:*

# Si no invalida, verificar que el servicio tenga:
# constructor(private prisma, private cache?)
```

## Scripts de Automatización

### Script de Benchmark

```bash
#!/bin/bash
# benchmark-cache.sh

echo "Testing cache performance..."

# Sin cache (primera llamada)
START=$(date +%s%N)
curl -s http://localhost:3001/api/bookings/experiences > /dev/null
END=$(date +%s%N)
TIME_NO_CACHE=$((($END - $START) / 1000000))

# Con cache (segunda llamada)
START=$(date +%s%N)
curl -s http://localhost:3001/api/bookings/experiences > /dev/null
END=$(date +%s%N)
TIME_WITH_CACHE=$((($END - $START) / 1000000))

echo "Without cache: ${TIME_NO_CACHE}ms"
echo "With cache: ${TIME_WITH_CACHE}ms"
echo "Improvement: $(((TIME_NO_CACHE - TIME_WITH_CACHE) * 100 / TIME_NO_CACHE))%"
```

### Script de Monitoreo

```bash
#!/bin/bash
# monitor-cache.sh

while true; do
  clear
  echo "=== Cache Stats ==="
  curl -s http://localhost:3001/metrics/cache | jq .
  sleep 5
done
```

## Conclusión

Si todos los tests pasan:

✅ Redis está conectado correctamente
✅ Cache está funcionando (hit rate > 0%)
✅ Invalidación funciona correctamente
✅ Performance mejoró significativamente

El sistema de caching está listo para producción.
