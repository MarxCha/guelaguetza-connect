# ✅ Checklist de Verificación del Sistema de Caching

## Pre-requisitos

```bash
# 1. Redis debe estar corriendo
docker ps | grep redis

# Si no está corriendo:
docker run -d -p 6379:6379 --name redis redis:7-alpine

# 2. Backend debe estar corriendo
cd backend
npm run dev
```

---

## 1. Verificar Conexión de Redis

### Test: Health Check

```bash
curl http://localhost:3001/health/cache
```

**Resultado esperado:**
```json
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

✅ **PASS**: Status es "healthy" y connected es true
❌ **FAIL**: Status es "degraded" → Redis no está disponible

---

## 2. Verificar Cache Funcionando

### Test: Cache Hit/Miss

```bash
# Primera llamada (MISS - va a BD)
time curl -s http://localhost:3001/api/bookings/experiences | jq 'length'

# Segunda llamada inmediata (HIT - viene de cache)
time curl -s http://localhost:3001/api/bookings/experiences | jq 'length'
```

**Resultado esperado:**
```
Primera llamada:  ~0.150s (150ms)
Segunda llamada:  ~0.010s (10ms)
```

✅ **PASS**: Segunda llamada es >80% más rápida
❌ **FAIL**: Ambas toman el mismo tiempo → Cache no funciona

### Verificar métricas

```bash
curl http://localhost:3001/metrics/cache | jq .
```

**Resultado esperado:**
```json
{
  "status": "connected",
  "metrics": {
    "hits": 1,
    "misses": 1,
    "sets": 1,
    "hitRate": "50.00%"
  }
}
```

✅ **PASS**: hits > 0 y hitRate > 0%
❌ **FAIL**: hits = 0 → No se usa el cache

---

## 3. Verificar TTLs

### Test: Verificar que el cache expira

```bash
# 1. Hacer request (crea cache)
curl -s http://localhost:3001/api/bookings/experiences > /dev/null

# 2. Ver TTL en Redis
redis-cli TTL guelaguetza:experience:*

# 3. Esperar TTL + 5 segundos

# 4. Hacer request de nuevo (debe ser MISS)
time curl -s http://localhost:3001/api/bookings/experiences > /dev/null
```

**Resultado esperado:**
- TTL inicial: ~120 segundos (2 minutos para experiences)
- Después de expirar: Request tarda más (MISS)

✅ **PASS**: Cache expira según TTL configurado
❌ **FAIL**: Cache nunca expira o expira inmediatamente

---

## 4. Verificar Invalidación

### Test: Invalidación al crear recurso

```bash
# Necesitas un token JWT válido
TOKEN="tu-jwt-token-aqui"

# 1. Obtener listado de productos (crea cache)
curl http://localhost:3001/api/marketplace/products | jq '.data.products | length'

# 2. Crear un nuevo producto (invalida cache)
curl -X POST http://localhost:3001/api/marketplace/products \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Producto",
    "description": "Test invalidación",
    "price": 100,
    "category": "ARTESANIAS",
    "stock": 10,
    "images": []
  }'

# 3. Obtener listado nuevamente (debe ir a BD, no cache)
curl http://localhost:3001/api/marketplace/products | jq '.data.products | length'
```

**Resultado esperado:**
- Nuevo producto aparece inmediatamente en el listado
- Request #3 toma más tiempo que si viniera del cache (porque se invalidó)

✅ **PASS**: Datos están frescos después de crear
❌ **FAIL**: Nuevo producto no aparece → Cache no se invalidó

---

## 5. Verificar Servicios Individuales

### BookingService

```bash
# Experience detail (TTL: 2 min)
time curl http://localhost:3001/api/bookings/experiences/EXPERIENCE_ID

# Time slots (TTL: 1 min)
time curl "http://localhost:3001/api/bookings/experiences/EXPERIENCE_ID/time-slots?startDate=2026-01-25"
```

✅ **PASS**: Segunda llamada es >80% más rápida

---

### GamificationService

```bash
TOKEN="tu-jwt-token"

# User stats (TTL: 1 min)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/gamification/me/stats

# User badges (TTL: 5 min)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/gamification/me/badges

# Leaderboard (TTL: 5 min)
time curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/gamification/leaderboard
```

✅ **PASS**: Segunda llamada es >80% más rápida

---

### EventService

```bash
# Events list (TTL: 10 min)
time curl "http://localhost:3001/api/events?page=1&limit=20"

# Event detail (TTL: 5 min)
time curl http://localhost:3001/api/events/EVENT_ID
```

✅ **PASS**: Segunda llamada es >80% más rápida

---

### MarketplaceService

```bash
# Products list (TTL: 10 min)
time curl "http://localhost:3001/api/marketplace/products?page=1&limit=20"

# Product detail (TTL: 2 min)
time curl http://localhost:3001/api/marketplace/products/PRODUCT_ID
```

✅ **PASS**: Segunda llamada es >80% más rápida

---

## 6. Verificar Estructura de Claves

### Test: Ver claves en Redis

```bash
# Conectarse a Redis CLI
redis-cli

# Ver todas las claves
KEYS guelaguetza:*

# Ver por tipo
KEYS guelaguetza:experience:*
KEYS guelaguetza:product:*
KEYS guelaguetza:user:*
KEYS guelaguetza:leaderboard:*
```

**Resultado esperado:**
```
guelaguetza:experience:clx123:detail
guelaguetza:experience:clx123:slots:2026-01-25:2026-01-30
guelaguetza:products:list:cat:all:status:ACTIVE:page:1:limit:20
guelaguetza:user:usr123:stats
guelaguetza:user:usr123:badges
guelaguetza:leaderboard:page:1:limit:20
guelaguetza:badges:all
```

✅ **PASS**: Claves siguen la convención `{prefix}:{resource}:{id}:{subresource}`
❌ **FAIL**: Claves desordenadas o sin prefijo

---

## 7. Verificar Métricas de Performance

### Test: Hit Rate después de warm-up

```bash
# Hacer 20 requests al mismo endpoint
for i in {1..20}; do
  curl -s http://localhost:3001/api/bookings/experiences > /dev/null
done

# Ver métricas
curl http://localhost:3001/metrics/cache | jq '.metrics.hitRate'
```

**Resultado esperado:**
```
"95.00%"  # 19 hits de 20 requests
```

✅ **PASS**: Hit rate > 80%
❌ **FAIL**: Hit rate < 50% → Algo está mal con el caching

---

## 8. Verificar Graceful Degradation

### Test: Aplicación funciona sin Redis

```bash
# 1. Detener Redis
docker stop redis

# 2. Hacer request (debe funcionar, pero más lento)
time curl http://localhost:3001/api/bookings/experiences

# 3. Ver health check (debe indicar degraded)
curl http://localhost:3001/health/cache
```

**Resultado esperado:**
```json
{
  "status": "degraded",
  "connected": false
}
```

- Request funciona (pero tarda más)
- Status indica que cache no está disponible
- No hay errores 500

✅ **PASS**: Aplicación sigue funcionando sin Redis
❌ **FAIL**: Aplicación lanza errores sin Redis

```bash
# Reiniciar Redis
docker start redis
```

---

## 9. Verificar Logs

### Test: Ver que el cache se está usando

```bash
# En la terminal del backend, deberías ver logs como:

[Cache] Connected to Redis
[Cache] Cache miss for key: "experience:clx123:detail"
[Cache] Cache hit for key: "experience:clx123:detail"
```

✅ **PASS**: Logs indican hits/misses
❌ **FAIL**: No hay logs de cache → No se está usando

---

## 10. Stress Test (Opcional)

### Test: Rendimiento bajo carga

```bash
# Instalar Apache Bench
# apt-get install apache2-utils  (Ubuntu)
# brew install ab  (macOS)

# Test sin cache (primera vez)
ab -n 1000 -c 10 http://localhost:3001/api/bookings/experiences

# Test con cache (segunda vez)
ab -n 1000 -c 10 http://localhost:3001/api/bookings/experiences
```

**Resultado esperado:**

Sin cache:
- Requests/sec: ~100
- Time per request: ~100ms

Con cache:
- Requests/sec: ~1000 (10x mejora)
- Time per request: ~10ms

✅ **PASS**: Con cache maneja 5-10x más requests/sec
❌ **FAIL**: No hay mejora → Cache no está ayudando

---

## Resumen Final

### Checklist Completo

- [ ] Redis está corriendo
- [ ] Backend conecta a Redis (`/health/cache` = healthy)
- [ ] Cache funciona (segunda request es >80% más rápida)
- [ ] TTLs están configurados correctamente
- [ ] Invalidación funciona (datos frescos después de updates)
- [ ] Todos los servicios usan cache (Booking, Gamification, Events, Marketplace)
- [ ] Estructura de claves es correcta
- [ ] Hit rate > 80% después de warm-up
- [ ] Graceful degradation funciona (app sigue sin Redis)
- [ ] Logs muestran cache hits/misses

### Métricas Objetivo

| Métrica | Objetivo | Como Verificar |
|---------|----------|----------------|
| **Hit Rate** | > 80% | `curl /metrics/cache` |
| **Latency Reduction** | > 80% | `time curl` comparando primera vs segunda llamada |
| **DB Load Reduction** | > 70% | Ver logs de Prisma, count queries |
| **Error Rate** | 0% | `curl /metrics/cache` → errors = 0 |
| **Availability** | 100% | App funciona incluso si Redis falla |

### Troubleshooting Rápido

**Problema**: Hit rate es 0%
```bash
# Verificar que los servicios reciben cache
grep "new.*Service.*cache" backend/src/routes/*.ts

# Debe mostrar:
# new BookingService(fastify.prisma, fastify.cache)
# new GamificationService(fastify.prisma, fastify.cache)
# etc.
```

**Problema**: Cache no expira
```bash
# Ver TTL de una clave específica
redis-cli TTL guelaguetza:experience:clx123:detail

# Debe retornar un número positivo (segundos restantes)
# -1 = sin TTL (permanente)
# -2 = clave no existe
```

**Problema**: Datos obsoletos
```bash
# Verificar que la invalidación funciona
# Ver código de createBooking, updateProduct, etc.
# Debe tener llamadas a cache.invalidate() o cache.del()
```

**Problema**: Redis connection refused
```bash
# Verificar que Redis está corriendo
redis-cli ping
# Debe responder: PONG

# Si no responde:
docker restart redis
```

---

## Scripts de Automatización

### Script de Verificación Completa

```bash
#!/bin/bash
# verify-cache.sh

echo "=== Cache System Verification ==="
echo ""

# 1. Check Redis
echo "1. Checking Redis..."
if redis-cli ping > /dev/null 2>&1; then
  echo "✅ Redis is running"
else
  echo "❌ Redis is NOT running"
  exit 1
fi

# 2. Check Backend
echo "2. Checking Backend..."
if curl -s http://localhost:3001/health > /dev/null; then
  echo "✅ Backend is running"
else
  echo "❌ Backend is NOT running"
  exit 1
fi

# 3. Check Cache Connection
echo "3. Checking Cache Connection..."
STATUS=$(curl -s http://localhost:3001/health/cache | jq -r .status)
if [ "$STATUS" = "healthy" ]; then
  echo "✅ Cache is connected"
else
  echo "❌ Cache is NOT connected (status: $STATUS)"
  exit 1
fi

# 4. Test Cache Performance
echo "4. Testing Cache Performance..."
echo "   First request (MISS)..."
TIME1=$(curl -s -w "%{time_total}" http://localhost:3001/api/bookings/experiences -o /dev/null)
echo "   Second request (HIT)..."
TIME2=$(curl -s -w "%{time_total}" http://localhost:3001/api/bookings/experiences -o /dev/null)

echo "   First:  ${TIME1}s"
echo "   Second: ${TIME2}s"

# 5. Check Metrics
echo "5. Checking Metrics..."
METRICS=$(curl -s http://localhost:3001/metrics/cache)
HITS=$(echo $METRICS | jq -r .metrics.hits)
HIT_RATE=$(echo $METRICS | jq -r .metrics.hitRate)

echo "   Hits: $HITS"
echo "   Hit Rate: $HIT_RATE"

echo ""
echo "=== Verification Complete ==="
```

### Ejecutar

```bash
chmod +x verify-cache.sh
./verify-cache.sh
```

---

**Si todos los tests pasan, el sistema de caching está funcionando correctamente y listo para producción.** 🚀
