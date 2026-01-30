# Migración de Tokens a Redis - TokenBlacklistService

## Resumen

Se ha migrado el almacenamiento de tokens del `AuthService` de memoria (Maps) a Redis para soportar ambientes de producción distribuidos y múltiples instancias del servidor.

## Cambios Realizados

### 1. Nuevo Servicio: TokenBlacklistService

**Ubicación:** `backend/src/services/token-blacklist.service.ts`

Servicio especializado que gestiona:
- Blacklist de tokens revocados
- Registro de tokens usados (para detección de token reuse attacks)
- Familias de tokens (token rotation)
- Invalidación de sesiones por usuario

### 2. Estructura de Claves en Redis

```
auth:blacklist:{jti}              → "1" (TTL automático hasta expiración del token)
auth:used:{jti}                   → JSON{familyId, userId, usedAt} (TTL automático)
auth:family:{familyId}            → JSON{userId, compromised, createdAt, currentJti} (TTL: 7 días)
auth:user:{userId}:families       → Array de familyIds activos (TTL: 7 días)
```

### 3. Integración con AuthService

El `AuthService` ahora utiliza `TokenBlacklistService` en lugar de Maps en memoria:

**Antes:**
```typescript
private usedTokens: Map<string, UsedToken> = new Map();
private tokenFamilies: Map<string, TokenFamily> = new Map();
```

**Después:**
```typescript
private tokenBlacklistService: TokenBlacklistService;

constructor(private prisma: PrismaClient) {
  this.tokenBlacklistService = getTokenBlacklistService();
}
```

## API del TokenBlacklistService

### Operaciones de Blacklist

```typescript
// Agregar token a blacklist
await tokenBlacklistService.addToBlacklist(jti: string, exp: number): Promise<void>

// Verificar si está en blacklist
await tokenBlacklistService.isBlacklisted(jti: string): Promise<boolean>
```

### Operaciones de Familias de Tokens

```typescript
// Crear nueva familia
await tokenBlacklistService.createFamily(familyId: string, userId: string, jti: string): Promise<void>

// Verificar si familia está comprometida
await tokenBlacklistService.isFamilyCompromised(familyId: string): Promise<boolean>

// Invalidar familia completa (token reuse attack)
await tokenBlacklistService.invalidateFamily(familyId: string, userId: string): Promise<void>

// Actualizar JTI actual de la familia
await tokenBlacklistService.updateFamilyJti(familyId: string, newJti: string): Promise<void>
```

### Operaciones de Tokens Usados

```typescript
// Registrar token como usado (rotación)
await tokenBlacklistService.registerUsedToken(
  jti: string,
  familyId: string,
  userId: string,
  exp: number
): Promise<void>

// Verificar si token fue usado
await tokenBlacklistService.isTokenUsed(jti: string): Promise<boolean>

// Obtener información del token usado
await tokenBlacklistService.getUsedTokenInfo(jti: string): Promise<UsedTokenData | null>
```

### Gestión de Sesiones

```typescript
// Revocar todas las sesiones de un usuario
await tokenBlacklistService.revokeAllUserTokens(userId: string): Promise<number>

// Limpiar todos los datos de auth (solo para testing)
await tokenBlacklistService.clearAll(): Promise<void>

// Verificar disponibilidad
tokenBlacklistService.isReady(): boolean
```

## Configuración

### Variables de Entorno

El servicio usa la configuración de Redis del `CacheService`:

```env
# Docker (recomendado)
REDIS_URL=redis://redis:6379

# O configuración manual
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
REDIS_PASSWORD=your-password  # opcional
REDIS_DB=0                     # opcional
```

### Docker Compose

Redis ya está configurado en `docker-compose.yml`:

```yaml
redis:
  image: redis:7-alpine
  container_name: guelaguetza-redis
  ports:
    - "6379:6379"
  command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
```

## Uso

### Iniciar Redis

```bash
# Usando Docker Compose
docker-compose up -d redis

# Verificar que Redis está corriendo
docker-compose exec redis redis-cli ping
# Respuesta esperada: PONG

# Acceder a Redis CLI
docker-compose exec redis redis-cli
```

### Comandos Redis Útiles

```bash
# Ver todas las claves de auth
KEYS auth:*

# Ver familias de un usuario
GET auth:user:USER_ID:families

# Ver información de familia
GET auth:family:FAMILY_ID

# Ver tokens usados
KEYS auth:used:*

# Ver blacklist
KEYS auth:blacklist:*

# Ver TTL de una clave
TTL auth:family:FAMILY_ID

# Limpiar todas las claves de auth (CUIDADO)
redis-cli --scan --pattern "auth:*" | xargs redis-cli DEL
```

## Testing

### Tests Unitarios

```bash
# Ejecutar tests del TokenBlacklistService
npm test -- token-blacklist.service.test.ts

# Con UI
npm run test:ui

# Con coverage
npm run test:coverage
```

### Tests Integración

El `AuthService` existente incluye tests de integración que ahora usan Redis:

```bash
# Levantar Redis para tests
npm run test:db:up

# Ejecutar tests de auth
npm run test:integration:auth

# Bajar servicios
npm run test:db:down
```

## Migración desde Memoria a Redis

### Sin Downtime

Si ya tienes tokens en memoria:

1. **Deploy con Redis disponible** - Los tokens nuevos usarán Redis automáticamente
2. **Tokens en memoria se perderán** - Los usuarios con sesiones antiguas deberán iniciar sesión nuevamente
3. **Periodo de transición** - Considera un mensaje informativo al detectar tokens antiguos

### Con Downtime (más limpio)

1. Detener el servidor
2. Desplegar nueva versión con Redis
3. Iniciar servidor
4. Todas las sesiones se invalidan (re-login necesario)

## TTL y Limpieza Automática

- **Blacklist:** TTL = tiempo hasta expiración del token (máximo 7 días para refresh tokens)
- **Tokens usados:** TTL = tiempo hasta expiración del token
- **Familias:** TTL = 7 días desde creación
- **Lista de familias por usuario:** TTL = 7 días

Redis eliminará automáticamente las claves expiradas, no se necesita tarea de limpieza.

## Monitoreo

### Métricas del CacheService

```typescript
// En cualquier endpoint
const metrics = fastify.cache.getMetrics();
const hitRate = fastify.cache.getHitRate();

console.log({
  hits: metrics.hits,
  misses: metrics.misses,
  sets: metrics.sets,
  deletes: metrics.deletes,
  errors: metrics.errors,
  hitRate: `${hitRate.toFixed(2)}%`
});
```

### Health Check

```bash
# Health check de Redis
curl http://localhost:3001/health/cache

# Respuesta esperada:
{
  "status": "healthy",
  "connected": true,
  "metrics": {
    "hits": 150,
    "misses": 50,
    "sets": 200,
    "deletes": 10,
    "errors": 0,
    "hitRate": "75.00%"
  }
}
```

## Troubleshooting

### Redis no está disponible

El servicio tiene **fallback graceful**:

- Si Redis no está disponible, los métodos retornan valores seguros
- `isBlacklisted()` retorna `false` (permite el token)
- `isFamilyCompromised()` retorna `false` (permite la familia)
- `isTokenUsed()` retorna `false` (permite la rotación)

**Implicaciones:**
- La aplicación sigue funcionando
- Se pierde protección contra token reuse attacks temporalmente
- Los logs mostrarán advertencias

### Verificar conectividad

```typescript
// En código
const isReady = authService.isTokenServiceReady();

if (!isReady) {
  console.warn('Token service is not ready - degraded security mode');
}
```

### Limpiar tokens en desarrollo

```typescript
// Solo para testing/desarrollo
await authService.clearAllTokens();
```

O desde Redis CLI:
```bash
docker-compose exec redis redis-cli FLUSHDB
```

## Seguridad

### Token Reuse Attack Detection

El sistema detecta cuando un token ya usado se intenta reutilizar:

1. Usuario normal rota su refresh token (jti1 → jti2)
2. jti1 se marca como "usado" en Redis
3. Si alguien intenta usar jti1 nuevamente:
   - Se detecta que está en `auth:used:{jti1}`
   - Se invalida toda la familia de tokens
   - Se registra log de seguridad
   - Usuario recibe error de "actividad sospechosa"

### Logs de Seguridad

El servicio registra eventos críticos:

```
[SECURITY] Token family compromised: family-abc123
User: user-xyz789
Reason: Token reuse attack detected
Time: 2026-01-27T12:34:56.789Z
```

Monitorea estos logs en producción para detectar intentos de ataque.

## Performance

### Operaciones Típicas

- `isTokenUsed()`: ~1ms (GET)
- `isFamilyCompromised()`: ~1ms (GET)
- `registerUsedToken()`: ~2ms (SET con serialización JSON)
- `createFamily()`: ~3ms (2x SET)
- `revokeAllUserTokens()`: ~N*2ms donde N = número de familias

### Optimizaciones

- Serialización JSON nativa (rápida)
- TTL automático (no requiere limpieza manual)
- Lazy connection a Redis
- Operaciones en paralelo donde es posible

## Próximos Pasos

### Mejoras Futuras

1. **Métricas con contadores incrementales**
   - Actualmente `getStats()` retorna valores por defecto
   - Implementar contadores Redis (INCR) para métricas precisas

2. **Soporte para Redis Cluster**
   - Modificar patrones de KEYS para ser cluster-safe
   - Usar SCAN en lugar de KEYS para producción

3. **Pub/Sub para invalidación distribuida**
   - Notificar a todas las instancias cuando se invalida una familia
   - Útil para cache en memoria + Redis

4. **Rate limiting por familia de tokens**
   - Detectar intentos de rotación muy frecuentes
   - Protección adicional contra bots

## Referencias

- [Redis Documentation](https://redis.io/docs/)
- [ioredis Client](https://github.com/luin/ioredis)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [Token Rotation Strategy](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)
