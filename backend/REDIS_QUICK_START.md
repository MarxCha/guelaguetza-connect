# Redis Cache - Quick Start

## 🚀 Inicio rápido (5 minutos)

### 1. Instalar Redis

**macOS:**
```bash
brew install redis
brew services start redis
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install redis-server
sudo systemctl start redis
sudo systemctl enable redis  # Arrancar al iniciar el sistema
```

**Docker:**
```bash
docker run -d -p 6379:6379 --name redis redis:7-alpine
```

**Windows (WSL2):**
```bash
# Dentro de WSL2
sudo apt update
sudo apt install redis-server
sudo service redis-server start
```

### 2. Verificar instalación

```bash
redis-cli ping
# Debe responder: PONG
```

### 3. Configurar variables de entorno

Agregar a tu archivo `.env`:

```bash
# Desarrollo local
REDIS_URL=redis://localhost:6379

# O configuración manual
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
```

### 4. Probar el cache

```bash
# Desde el directorio backend/
npm run dev

# En otra terminal, probar el endpoint de health
curl http://localhost:3001/health/cache
```

Deberías ver:
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

### 5. Ejecutar script de prueba

```bash
tsx scripts/test-cache.ts
```

Deberías ver todos los tests en verde ✅

## ✅ Verificación

Para verificar que el cache está funcionando:

1. **Llamar a un endpoint (ejemplo: badges):**
   ```bash
   # Primera llamada (cache miss)
   time curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/gamification/me/badges
   # Tiempo: ~150ms

   # Segunda llamada (cache hit)
   time curl -H "Authorization: Bearer YOUR_TOKEN" \
     http://localhost:3001/api/gamification/me/badges
   # Tiempo: ~5ms 🚀
   ```

2. **Verificar métricas:**
   ```bash
   curl http://localhost:3001/health/cache
   # hits: 1, misses: 1, hitRate: "50.00%"
   ```

3. **Ver claves en Redis:**
   ```bash
   redis-cli
   127.0.0.1:6379> KEYS guelaguetza:*
   127.0.0.1:6379> GET guelaguetza:badges:all
   127.0.0.1:6379> TTL guelaguetza:badges:all
   ```

## 🔧 Comandos útiles

### Redis CLI

```bash
# Conectar
redis-cli

# Ver todas las claves
KEYS guelaguetza:*

# Ver una clave específica
GET guelaguetza:badges:all

# Ver TTL restante
TTL guelaguetza:user:123:badges

# Eliminar una clave
DEL guelaguetza:badges:all

# Eliminar todas las claves (CUIDADO)
FLUSHDB

# Ver estadísticas
INFO stats

# Monitorear en tiempo real
MONITOR

# Salir
exit
```

### Gestión de Redis

```bash
# macOS
brew services start redis
brew services stop redis
brew services restart redis

# Linux
sudo systemctl start redis
sudo systemctl stop redis
sudo systemctl restart redis
sudo systemctl status redis

# Docker
docker start redis
docker stop redis
docker restart redis
docker logs redis
```

## 🐛 Troubleshooting

### Redis no conecta

**Error:** `connect ECONNREFUSED 127.0.0.1:6379`

**Solución:**
```bash
# Verificar que Redis está corriendo
redis-cli ping

# Si no responde, iniciar
brew services start redis  # macOS
sudo systemctl start redis # Linux
docker start redis         # Docker
```

### Puerto ocupado

**Error:** `Address already in use`

**Solución:**
```bash
# Ver qué proceso usa el puerto 6379
lsof -i :6379

# Detener el proceso o usar otro puerto
REDIS_PORT=6380
```

### Cache no funciona pero app sí

Esto es **normal** - la app tiene graceful degradation:

```
[Cache] Redis error: connect ECONNREFUSED
[Cache] Cache service is not available - running without cache
```

La aplicación funciona perfectamente sin cache, solo que más lento.

### Claves no se ven en Redis CLI

Verifica el prefijo:
```bash
# Buscar con el prefijo
redis-cli KEYS guelaguetza:*

# Ver configuración
redis-cli CONFIG GET *key*
```

## 🌐 Producción

### Railway

```bash
# Railway agrega Redis automáticamente
railway add redis

# Variable de entorno se configura automáticamente
# REDIS_URL=redis://:password@...
```

### Render

```bash
# Crear Redis en Render Dashboard
# Copiar la URL interna
REDIS_URL=redis://red-xxx:6379
```

### Redis Cloud (gratuito)

1. Ir a https://redis.com/try-free/
2. Crear cuenta y database
3. Copiar la URL de conexión
4. Agregar a variables de entorno:
   ```bash
   REDIS_URL=redis://default:password@redis-12345.c1.us-east-1-2.ec2.cloud.redislabs.com:12345
   ```

### Docker Compose

```yaml
# docker-compose.yml
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes

  api:
    build: .
    environment:
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis

volumes:
  redis-data:
```

## 📊 Monitoreo

### Health check

```bash
curl http://localhost:3001/health/cache
```

### Prometheus metrics

```bash
curl http://localhost:3001/metrics | grep cache
```

Métricas disponibles:
- `cache_hits_total`
- `cache_misses_total`
- `cache_errors_total`
- `cache_keys_total`

### Logs

```bash
# Ver logs del servidor
tail -f /usr/local/var/log/redis.log  # macOS
tail -f /var/log/redis/redis-server.log  # Linux
docker logs -f redis  # Docker
```

## 🎯 Testing

### Test unitario de cache

```bash
npm test -- cache.service.test.ts
```

### Test de integración

```bash
npm run test:integration
```

### Benchmark

```bash
# Medir performance
ab -n 1000 -c 10 \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:3001/api/gamification/leaderboard
```

## 📚 Recursos

- [Documentación completa](./CACHE_IMPLEMENTATION.md)
- [Redis Documentation](https://redis.io/docs/)
- [ioredis GitHub](https://github.com/luin/ioredis)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)

## 🆘 Soporte

Si tienes problemas:

1. Verificar logs: `redis-cli INFO stats`
2. Ver el [troubleshooting completo](./CACHE_IMPLEMENTATION.md#troubleshooting)
3. Ejecutar el script de prueba: `tsx scripts/test-cache.ts`
