# TokenBlacklistService - Ejemplos de Uso

## Casos de Uso Comunes

### 1. Login y Generación de Tokens

```typescript
import { AuthService } from './services/auth.service.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const authService = new AuthService(prisma);

// Usuario inicia sesión
const { user, tokens } = await authService.login('user@example.com', 'password123');

console.log('Access Token:', tokens.accessToken);
console.log('Refresh Token:', tokens.refreshToken);
console.log('Expires In:', tokens.expiresIn, 'seconds');

// Internamente, AuthService creó una familia de tokens en Redis:
// - auth:family:{familyId} → {userId, compromised: false, createdAt, currentJti}
// - auth:user:{userId}:families → [familyId]
```

### 2. Rotación de Tokens (Token Refresh)

```typescript
// Cliente solicita nuevos tokens usando el refresh token
try {
  const newTokens = await authService.refreshTokens(oldRefreshToken);

  console.log('New Access Token:', newTokens.accessToken);
  console.log('New Refresh Token:', newTokens.refreshToken);

  // Internamente:
  // 1. Verifica que el refresh token no esté en blacklist
  // 2. Verifica que no haya sido usado antes (auth:used:{jti})
  // 3. Verifica que la familia no esté comprometida
  // 4. Marca el token anterior como usado
  // 5. Genera nuevo par de tokens
  // 6. Actualiza el JTI actual de la familia

} catch (error) {
  console.error('Token refresh failed:', error.message);
  // Posibles errores:
  // - "Token expirado"
  // - "Actividad sospechosa detectada" (token reuse attack)
  // - "Sesión invalidada por seguridad" (familia comprometida)
}
```

### 3. Detección de Token Reuse Attack

```typescript
// Escenario: Usuario normal usa refresh token
const tokens1 = await authService.login('user@example.com', 'password');
// familyId = 'abc123', jti1 = 'token-001'

// Primera rotación (normal)
const tokens2 = await authService.refreshTokens(tokens1.refreshToken);
// jti1 marcado como usado, jti2 = 'token-002' es el nuevo

// Segunda rotación (normal)
const tokens3 = await authService.refreshTokens(tokens2.refreshToken);
// jti2 marcado como usado, jti3 = 'token-003' es el nuevo

// ATAQUE: Alguien intenta usar jti1 (ya usado)
try {
  await authService.refreshTokens(tokens1.refreshToken);
} catch (error) {
  console.error(error.message);
  // "Actividad sospechosa detectada. Por seguridad, todas tus sesiones han sido cerradas."

  // Consecuencias:
  // - La familia 'abc123' se marca como comprometida
  // - Todos los tokens de esa familia se invalidan
  // - jti3 (el token actual legítimo) también deja de funcionar
  // - El usuario debe iniciar sesión nuevamente
}

// El usuario legítimo intenta usar su token actual
try {
  await authService.refreshTokens(tokens3.refreshToken);
} catch (error) {
  console.error(error.message);
  // "Sesión invalidada por seguridad. Por favor, inicia sesión nuevamente."
}
```

### 4. Logout de Todas las Sesiones

```typescript
// Usuario solicita cerrar sesión en todos los dispositivos
const result = await authService.revokeAllTokens(userId);

console.log(`Sesiones cerradas: ${result.invalidatedSessions}`);

// Internamente:
// 1. Busca todas las familias del usuario: auth:user:{userId}:families
// 2. Marca cada familia como comprometida
// 3. Todos los refresh tokens existentes dejan de funcionar

// Los access tokens existentes seguirán funcionando hasta que expiren (15 min)
// porque no se validan contra Redis en cada request (por performance)
```

### 5. Verificación de Access Token en Middleware

```typescript
import { FastifyRequest, FastifyReply } from 'fastify';

async function authenticateMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return reply.code(401).send({ error: 'No autorizado' });
  }

  const token = authHeader.substring(7);

  try {
    // Verifica el access token (firma y expiración)
    const payload = await authService.verifyAccessToken(token);

    // Agregar información del usuario al request
    request.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };

    // NOTA: No verificamos contra Redis en cada request por performance
    // Los access tokens tienen vida corta (15 min) y se validan solo por JWT

  } catch (error) {
    return reply.code(401).send({ error: error.message });
  }
}
```

### 6. Uso Directo del TokenBlacklistService

```typescript
import { getTokenBlacklistService } from './services/token-blacklist.service.js';

const tokenService = getTokenBlacklistService();

// Verificar disponibilidad
if (!tokenService.isReady()) {
  console.warn('Redis no disponible - modo degradado');
}

// Blacklist manual de un token
const jti = 'compromised-token-123';
const exp = Math.floor(Date.now() / 1000) + 3600; // expira en 1 hora
await tokenService.addToBlacklist(jti, exp);

// Verificar blacklist
const isBlacklisted = await tokenService.isBlacklisted(jti);
console.log('Token en blacklist:', isBlacklisted); // true

// Crear familia manualmente
await tokenService.createFamily('custom-family-id', 'user-123', 'initial-jti');

// Invalidar familia específica
await tokenService.invalidateFamily('custom-family-id', 'user-123');

// Estadísticas
const stats = await tokenService.getStats();
console.log('Stats:', stats);
```

### 7. Testing - Cleanup entre Tests

```typescript
import { describe, it, beforeEach, afterEach } from 'vitest';
import { getTokenBlacklistService } from './services/token-blacklist.service.js';

describe('Auth Integration Tests', () => {
  const tokenService = getTokenBlacklistService();

  beforeEach(async () => {
    // Limpiar Redis antes de cada test
    await tokenService.clearAll();
  });

  afterEach(async () => {
    // Limpiar Redis después de cada test
    await tokenService.clearAll();
  });

  it('should handle token rotation', async () => {
    // Test de rotación de tokens
    // Redis está limpio, no hay interferencia de tests anteriores
  });
});
```

### 8. Monitoreo y Debugging

```typescript
import { FastifyInstance } from 'fastify';

// Endpoint de admin para ver stats
fastify.get('/admin/auth/stats', async (request, reply) => {
  // Verificar que el usuario es admin
  if (request.user?.role !== 'ADMIN') {
    return reply.code(403).send({ error: 'Forbidden' });
  }

  const authService = new AuthService(prisma);
  const stats = await authService.getTokenStats();

  return {
    stats,
    redis: {
      connected: authService.isTokenServiceReady(),
    },
  };
});

// Endpoint para invalidar sesión específica (admin)
fastify.post('/admin/auth/invalidate-session', async (request, reply) => {
  const { familyId, userId } = request.body;

  const tokenService = getTokenBlacklistService();
  await tokenService.invalidateFamily(familyId, userId);

  return { success: true, message: 'Sesión invalidada' };
});

// Endpoint para revocar todas las sesiones de un usuario (admin)
fastify.post('/admin/auth/revoke-user', async (request, reply) => {
  const { userId } = request.body;

  const authService = new AuthService(prisma);
  const result = await authService.revokeAllTokens(userId);

  return result;
});
```

### 9. Manejo de Errores y Fallback

```typescript
import { getTokenBlacklistService } from './services/token-blacklist.service.js';

const tokenService = getTokenBlacklistService();

async function safeTokenCheck(jti: string): Promise<boolean> {
  try {
    // Intentar verificar en Redis
    if (!tokenService.isReady()) {
      console.warn('Redis no disponible - permitiendo token por defecto');
      return false; // No está en blacklist (modo seguro)
    }

    return await tokenService.isTokenUsed(jti);

  } catch (error) {
    console.error('Error checking token:', error);
    // En caso de error, retornar valor seguro
    return false; // No rechazar el token
  }
}

// Uso
const jti = 'some-token-id';
const isUsed = await safeTokenCheck(jti);

if (isUsed) {
  throw new Error('Token ya fue usado');
}
```

### 10. Migración desde Sistema Antiguo

```typescript
// Script de migración de tokens en memoria a Redis
import { AuthService } from './services/auth.service.js';
import { getTokenBlacklistService } from './services/token-blacklist.service.js';

async function migrateTokensToRedis() {
  const tokenService = getTokenBlacklistService();

  // Si tienes tokens en memoria (Map) que quieres migrar
  const inMemoryTokens = [
    { jti: 'old-token-1', familyId: 'family-1', userId: 'user-1', exp: 1234567890 },
    { jti: 'old-token-2', familyId: 'family-2', userId: 'user-2', exp: 1234567900 },
  ];

  for (const token of inMemoryTokens) {
    // Migrar tokens usados
    await tokenService.registerUsedToken(
      token.jti,
      token.familyId,
      token.userId,
      token.exp
    );
  }

  console.log(`Migrados ${inMemoryTokens.length} tokens a Redis`);
}

// NOTA: En la práctica, es más simple invalidar todas las sesiones
// y que los usuarios inicien sesión nuevamente después del deploy
```

## Flujo Completo de Autenticación

```typescript
// 1. REGISTRO
const registerResult = await authService.register({
  email: 'user@example.com',
  password: 'password123',
  nombre: 'Juan',
  apellido: 'Pérez',
  region: 'Oaxaca',
});

// Redis state:
// auth:family:{familyId} → {userId, compromised: false, createdAt, currentJti: jti1}
// auth:user:{userId}:families → [familyId]

// 2. CLIENTE GUARDA TOKENS
localStorage.setItem('accessToken', registerResult.tokens.accessToken);
localStorage.setItem('refreshToken', registerResult.tokens.refreshToken);

// 3. CLIENTE USA ACCESS TOKEN (15 min)
// Headers: Authorization: Bearer {accessToken}

// 4. ACCESS TOKEN EXPIRA → REFRESCAR
const newTokens = await authService.refreshTokens(oldRefreshToken);

// Redis state:
// auth:used:{jti1} → {familyId, userId, usedAt} (TTL: hasta expiración)
// auth:family:{familyId} → {..., currentJti: jti2}

localStorage.setItem('accessToken', newTokens.accessToken);
localStorage.setItem('refreshToken', newTokens.refreshToken);

// 5. REPETIR PASO 3-4 por 7 días (vida del refresh token)

// 6. LOGOUT
await authService.revokeAllTokens(userId);

// Redis state:
// auth:family:{familyId} → {..., compromised: true}

localStorage.removeItem('accessToken');
localStorage.removeItem('refreshToken');
```

## Best Practices

### 1. Almacenamiento de Tokens en Cliente

```typescript
// ❌ MAL: Nunca en localStorage (XSS vulnerable)
localStorage.setItem('accessToken', token);

// ✅ BIEN: httpOnly cookie (manejado por servidor)
reply.setCookie('refreshToken', token, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60, // 7 días
});

// Access token puede ir en memoria del cliente (corta vida)
```

### 2. Renovación Automática de Tokens

```typescript
// En el cliente (React/Vue/Angular)
let refreshTokenTimeout: NodeJS.Timeout;

function scheduleTokenRefresh(expiresIn: number) {
  // Refrescar 1 minuto antes de que expire
  const refreshTime = (expiresIn - 60) * 1000;

  refreshTokenTimeout = setTimeout(async () => {
    try {
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include', // Enviar cookies
      });

      const { accessToken, expiresIn } = await response.json();

      // Guardar nuevo access token
      setAccessToken(accessToken);

      // Programar próxima renovación
      scheduleTokenRefresh(expiresIn);

    } catch (error) {
      // Si falla, redirigir a login
      window.location.href = '/login';
    }
  }, refreshTime);
}

// Iniciar después del login
scheduleTokenRefresh(tokens.expiresIn);

// Limpiar al logout
clearTimeout(refreshTokenTimeout);
```

### 3. Manejo de Múltiples Dispositivos

```typescript
// El sistema soporta múltiples familias de tokens por usuario
// Cada login crea una nueva familia

// Login en dispositivo 1
const device1Tokens = await authService.login('user@example.com', 'password');
// familia: family-1

// Login en dispositivo 2 (misma cuenta)
const device2Tokens = await authService.login('user@example.com', 'password');
// familia: family-2

// Redis state:
// auth:user:{userId}:families → [family-1, family-2]

// Logout de todos los dispositivos
await authService.revokeAllTokens(userId);
// Ambas familias se marcan como comprometidas
```

### 4. Rate Limiting en Refresh Token

```typescript
import rateLimit from '@fastify/rate-limit';

// Limitar intentos de refresh por IP
fastify.register(rateLimit, {
  max: 10, // 10 requests
  timeWindow: '1 minute',
});

fastify.post('/api/auth/refresh', async (request, reply) => {
  const refreshToken = request.cookies.refreshToken;

  try {
    const tokens = await authService.refreshTokens(refreshToken);

    reply.setCookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
    });

    return {
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    };

  } catch (error) {
    reply.clearCookie('refreshToken');
    return reply.code(401).send({ error: error.message });
  }
});
```

## Troubleshooting

### Problema: "Redis no disponible"

```typescript
const tokenService = getTokenBlacklistService();

if (!tokenService.isReady()) {
  console.error('Redis connection failed');

  // Verificar:
  // 1. Redis está corriendo: docker-compose ps redis
  // 2. Variables de entorno: echo $REDIS_URL
  // 3. Network connectivity: docker-compose exec backend ping redis
  // 4. Redis logs: docker-compose logs redis
}
```

### Problema: "Token reuse attack falso positivo"

Puede ocurrir si el cliente reintenta la request de refresh debido a network issues:

```typescript
// Solución: Implementar idempotency en el cliente
let refreshInProgress = false;

async function refreshTokens() {
  if (refreshInProgress) {
    // Esperar a que termine el request en progreso
    await new Promise(resolve => setTimeout(resolve, 1000));
    return;
  }

  refreshInProgress = true;

  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      credentials: 'include',
    });

    // Procesar respuesta

  } finally {
    refreshInProgress = false;
  }
}
```
