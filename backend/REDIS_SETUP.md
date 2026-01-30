# Redis Setup y Verificación

## Pre-requisitos

- Docker y Docker Compose instalados
- Proyecto Guelaguetza Connect clonado

## Inicio Rápido

### 1. Iniciar Redis

```bash
# Desde la raíz del proyecto
docker-compose up -d redis

# Verificar que está corriendo
docker-compose ps redis
```

Salida esperada:
```
NAME                   STATUS          PORTS
guelaguetza-redis      Up 5 seconds    0.0.0.0:6379->6379/tcp
```

### 2. Verificar Conectividad

```bash
# Ping a Redis
docker-compose exec redis redis-cli ping
```

Salida esperada: `PONG`

### 3. Verificar TokenBlacklistService

```bash
cd backend

# Ejecutar tests
npm test -- token-blacklist.service.test.ts --run
```

Salida esperada:
```
✓ test/unit/token-blacklist.service.test.ts (24 tests) 1654ms
  Test Files  1 passed (1)
  Tests  24 passed (24)
```

### 4. Iniciar Backend

```bash
# Desde backend/
npm run dev
```

Logs esperados:
```
[Cache] Connected to Redis
[Redis] Cache service is ready
🎉 Guelaguetza Connect API
Server running at http://0.0.0.0:3001
```

## Verificación Manual

### Opción 1: Health Check Endpoint

```bash
curl http://localhost:3001/health/cache
```

Respuesta esperada:
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

### Opción 2: Redis CLI

```bash
# Acceder a Redis CLI
docker-compose exec redis redis-cli

# Verificar claves de auth (debería estar vacío inicialmente)
127.0.0.1:6379> KEYS auth:*
(empty array)

# Hacer un login para generar tokens
# Luego verificar nuevamente
127.0.0.1:6379> KEYS auth:*
1) "guelaguetza:auth:family:abc-123-xyz"
2) "guelaguetza:auth:user:user-id-456:families"

# Ver contenido de una familia
127.0.0.1:6379> GET "guelaguetza:auth:family:abc-123-xyz"
"{\"userId\":\"user-id-456\",\"compromised\":false,\"createdAt\":1706313600,\"currentJti\":\"jti-789\"}"

# Ver TTL de una clave (segundos restantes)
127.0.0.1:6379> TTL "guelaguetza:auth:family:abc-123-xyz"
(integer) 604723

# Salir
127.0.0.1:6379> exit
```

### Opción 3: Test de Integración Completo

```bash
cd backend

# Test de auth completo (incluye token rotation)
npm run test:integration:auth
```

## Escenarios de Prueba

### Test 1: Login y Generación de Tokens

```bash
# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

Respuesta:
```json
{
  "user": {
    "id": "user-123",
    "email": "test@example.com",
    ...
  },
  "tokens": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 900
  }
}
```

Verificar en Redis:
```bash
docker-compose exec redis redis-cli KEYS "guelaguetza:auth:family:*"
```

### Test 2: Token Rotation

```bash
# Refrescar tokens
curl -X POST http://localhost:3001/api/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "eyJhbGc..."
  }'
```

Verificar tokens usados:
```bash
docker-compose exec redis redis-cli KEYS "guelaguetza:auth:used:*"
```

### Test 3: Logout de Todas las Sesiones

```bash
# Revocar todos los tokens
curl -X POST http://localhost:3001/api/auth/revoke-all \
  -H "Authorization: Bearer <access-token>"
```

Verificar familias comprometidas:
```bash
docker-compose exec redis redis-cli
127.0.0.1:6379> GET "guelaguetza:auth:family:abc-123"
# Debería mostrar "compromised": true
```

## Troubleshooting

### Error: "Cannot connect to Redis"

**Síntoma:**
```
[Cache] Redis error: connect ECONNREFUSED 127.0.0.1:6379
[Cache] Failed to initialize Redis
[Redis] Cache service is not available - running without cache
```

**Solución:**
```bash
# Verificar que Redis está corriendo
docker-compose ps redis

# Si no está corriendo, iniciarlo
docker-compose up -d redis

# Verificar logs
docker-compose logs redis

# Reiniciar backend
npm run dev
```

### Error: "Redis connection timeout"

**Síntoma:**
```
[Cache] Redis error: connect ETIMEDOUT
```

**Solución:**
```bash
# Verificar network
docker-compose exec backend ping redis

# Verificar variable de entorno
docker-compose exec backend env | grep REDIS

# Debe mostrar: REDIS_URL=redis://redis:6379
```

### Error: Tests fallan con "Redis not available"

**Solución:**
```bash
# Iniciar servicios de test
npm run test:db:up

# Verificar Redis de test
docker-compose -f docker-compose.test.yml ps

# Ejecutar tests
npm test
```

### Limpiar Datos de Redis

**Durante desarrollo:**
```bash
# Opción 1: Limpiar solo datos de auth
docker-compose exec redis redis-cli
127.0.0.1:6379> KEYS guelaguetza:auth:*
127.0.0.1:6379> DEL guelaguetza:auth:*

# Opción 2: Limpiar toda la base de datos
docker-compose exec redis redis-cli FLUSHDB

# Opción 3: Reiniciar Redis (borra todo)
docker-compose restart redis
```

### Modo Degradado (Sin Redis)

Si Redis no está disponible, el sistema sigue funcionando con limitaciones:

```typescript
// En logs verás:
[Cache] Failed to initialize Redis
[Redis] Cache service is not available - running without cache

// Comportamiento:
- ✅ Login funciona (genera tokens JWT)
- ✅ Access tokens funcionan (validación JWT local)
- ⚠️  Token rotation funciona pero sin detección de reuse
- ⚠️  Logout de todas sesiones no funciona
- ⚠️  Sesiones no persisten entre reinicios
```

## Comandos Útiles

```bash
# Ver todas las claves con patrón
docker-compose exec redis redis-cli KEYS "guelaguetza:*"

# Contar claves por patrón
docker-compose exec redis redis-cli --scan --pattern "guelaguetza:auth:family:*" | wc -l

# Ver memoria usada
docker-compose exec redis redis-cli INFO memory

# Ver estadísticas
docker-compose exec redis redis-cli INFO stats

# Monitorear comandos en tiempo real
docker-compose exec redis redis-cli MONITOR

# Ver configuración
docker-compose exec redis redis-cli CONFIG GET maxmemory

# Exportar datos (backup)
docker-compose exec redis redis-cli --rdb /data/backup.rdb

# Ver logs de Redis
docker-compose logs -f redis

# Reiniciar Redis
docker-compose restart redis

# Detener Redis
docker-compose stop redis

# Eliminar contenedor y datos
docker-compose down redis
docker volume rm guelaguetza-connect_redis_data
```

## Performance

### Operaciones Típicas

| Operación | Tiempo Promedio | Comandos Redis |
|-----------|-----------------|----------------|
| `isTokenUsed()` | ~1ms | GET |
| `isFamilyCompromised()` | ~1ms | GET |
| `registerUsedToken()` | ~2ms | SET |
| `createFamily()` | ~3ms | 2x SET |
| `revokeAllUserTokens()` | ~N*2ms | N x GET + N x SET |

### Límites Configurados

```yaml
# En docker-compose.yml
redis:
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

- **Max Memory:** 256MB
- **Eviction Policy:** LRU (Least Recently Used)
- **Persistence:** Appendonly file (AOF)

## Monitoreo en Producción

### Métricas a Vigilar

1. **Conexiones:**
   ```bash
   redis-cli INFO clients | grep connected_clients
   ```

2. **Memoria:**
   ```bash
   redis-cli INFO memory | grep used_memory_human
   ```

3. **Hit Rate:**
   ```bash
   curl http://localhost:3001/health/cache | jq '.metrics.hitRate'
   ```

4. **Errores:**
   ```bash
   redis-cli INFO stats | grep rejected_connections
   ```

### Alertas Recomendadas

- Memory usage > 80% → Aumentar límite o limpiar datos
- Connected clients > 100 → Posible leak de conexiones
- Rejected connections > 0 → Redis sobrecargado
- Hit rate < 50% → Cache ineficiente

## Seguridad

### Producción

1. **Password:**
   ```yaml
   redis:
     command: redis-server --requirepass <strong-password>
   ```

   ```env
   REDIS_URL=redis://:password@redis:6379
   ```

2. **TLS (opcional):**
   ```yaml
   redis:
     command: redis-server --tls-port 6380 --tls-cert-file /path/to/cert
   ```

3. **Network Isolation:**
   - Redis solo accesible desde backend
   - No exponer puerto 6379 públicamente

4. **Comandos Peligrosos:**
   ```bash
   # Deshabilitar comandos como FLUSHDB, FLUSHALL
   redis-cli CONFIG SET rename-command FLUSHDB ""
   ```

## Referencias

- [Redis Documentation](https://redis.io/docs/)
- [ioredis Client](https://github.com/luin/ioredis)
- [Docker Compose Redis](https://hub.docker.com/_/redis)
- [Token Blacklist Pattern](https://auth0.com/docs/secure/tokens/json-web-tokens/validate-json-web-tokens)
