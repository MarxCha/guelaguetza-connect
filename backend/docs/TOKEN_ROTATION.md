# Rotación Segura de Refresh Tokens

## Resumen

Implementación de rotación automática de refresh tokens con detección de ataques de reuso (Token Reuse Attack Detection) en el servicio de autenticación.

## Características Implementadas

### 1. Token Rotation

Cada vez que un refresh token se usa para obtener nuevos tokens:
- Se genera un **nuevo par de tokens** (access + refresh)
- El refresh token anterior se **invalida automáticamente**
- El JTI (JWT ID) del token usado se almacena en una lista de tokens usados

### 2. Token Family Tracking

Todos los tokens de una sesión comparten el mismo `familyId`:
- Se crea una nueva familia cuando el usuario hace login o registro
- Al rotar tokens, el nuevo refresh token mantiene el mismo `familyId`
- Permite rastrear todas las rotaciones de una sesión

### 3. Detección de Token Reuse Attacks

Sistema de seguridad que detecta intentos de reuso de tokens:

1. **Primera rotación válida**: Token A → Token B
2. **Intento de reuso**: Si alguien intenta usar Token A nuevamente (ya usado):
   - Se detecta como **ataque de reuso**
   - Se **invalida toda la familia** de tokens
   - Se generan **logs de seguridad**
   - Se fuerza **re-login del usuario**

### 4. Almacenamiento en Memoria

Almacenamiento temporal en memoria con limpieza automática:
- Map de tokens usados (por JTI)
- Map de familias de tokens (por familyId)
- Limpieza periódica cada 1 hora de tokens expirados

## Estructura de Datos

### JWTPayload Actualizado

```typescript
interface JWTPayload {
  sub: string;        // userId
  email: string;
  role: string;
  type: 'access' | 'refresh';
  jti: string;        // JWT ID único
  familyId?: string;  // Token family ID (solo refresh tokens)
  iat: number;
  exp: number;
}
```

### Token Family

```typescript
interface TokenFamily {
  familyId: string;
  userId: string;
  createdAt: number;
  currentJti: string;
  invalidatedAt?: number; // Si fue comprometida
}
```

### Used Token

```typescript
interface UsedToken {
  jti: string;
  familyId: string;
  userId: string;
  usedAt: number;
  expiresAt: number;
}
```

## Flujo de Rotación

### Login/Registro Normal

```
1. Usuario hace login
2. Se genera nuevo par de tokens
3. Se crea nueva familia (familyId único)
4. Refresh token incluye familyId en payload
```

### Rotación Exitosa

```
1. Cliente envía refresh token (Token A)
2. Se verifica que no está en lista de usados ✓
3. Se verifica que familia no está comprometida ✓
4. Se genera nuevo par de tokens (Token B)
5. Token A se marca como "usado"
6. Token B mantiene el mismo familyId
7. Se actualiza currentJti de la familia
```

### Detección de Ataque

```
1. Cliente envía refresh token ya usado (Token A)
2. Se detecta en lista de usados ✗
3. [ALERT] Se registra ataque de reuso
4. Se invalida toda la familia de tokens
5. Se rechaza la petición
6. Cualquier token de esa familia falla
7. Usuario debe hacer login nuevamente
```

## API del Servicio

### Métodos Públicos

#### `generateTokenPair(userId, email, role)`
Genera nuevo par de tokens y crea nueva familia.

#### `refreshTokens(refreshToken)`
Rota tokens si el refresh token es válido. Detecta ataques de reuso.

#### `revokeAllTokens(userId)`
Invalida todas las familias de tokens del usuario (logout global).

### Métodos de Utilidad

#### `getTokenStats()`
Obtiene estadísticas de tokens en memoria (debugging).

```typescript
{
  usedTokens: {
    total: 5,
    expired: 2
  },
  tokenFamilies: {
    total: 10,
    active: 8,
    compromised: 2
  }
}
```

#### `clearAllTokens()`
Limpia todos los tokens en memoria (solo para testing).

## Logs de Seguridad

### Token Reuse Attack Detectado

```
[SECURITY ALERT] Token reuse attack detected!
JTI: 36ce2032-3fe0-4066-9a2e-6dd444e3f12f
FamilyID: 052cf2c0-37a6-4937-ae6f-7609f88244f1
UserID: user-123
Time: 2026-01-27T06:18:05.919Z
```

### Familia Invalidada

```
[SECURITY] Token family compromised: 052cf2c0-37a6-4937-ae6f-7609f88244f1
User: user-123
Reason: Token reuse attack detected
Time: 2026-01-27T06:18:05.922Z
```

## Ejemplo de Uso

### Cliente Web

```typescript
// 1. Login
const { tokens } = await login(email, password);
localStorage.setItem('accessToken', tokens.accessToken);
localStorage.setItem('refreshToken', tokens.refreshToken);

// 2. Request con access token expirado
try {
  await api.get('/profile', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
} catch (error) {
  if (error.status === 401) {
    // 3. Rotar tokens
    const newTokens = await api.post('/auth/refresh', {
      refreshToken: localStorage.getItem('refreshToken')
    });

    // 4. Guardar nuevos tokens
    localStorage.setItem('accessToken', newTokens.accessToken);
    localStorage.setItem('refreshToken', newTokens.refreshToken);

    // 5. Reintentar request
    return api.get('/profile');
  }
}
```

### Manejo de Token Reuse Attack

```typescript
try {
  await api.post('/auth/refresh', { refreshToken });
} catch (error) {
  if (error.message.includes('Actividad sospechosa')) {
    // Sesión comprometida - forzar re-login
    localStorage.clear();
    router.push('/login?reason=security');
    showAlert('Por seguridad, necesitas iniciar sesión nuevamente');
  }
}
```

## Configuración

### Variables de Entorno

```env
JWT_ACCESS_SECRET=your-access-secret
JWT_REFRESH_SECRET=your-refresh-secret
```

### Duraciones de Tokens

```typescript
ACCESS_TOKEN_EXPIRES_IN = '15m'   // 15 minutos
REFRESH_TOKEN_EXPIRES_IN = '7d'   // 7 días
```

## Testing

### Tests Implementados

- ✓ Generación de tokens con familyId
- ✓ Rotación exitosa de tokens
- ✓ Mantenimiento de familyId en rotaciones
- ✓ Detección de token reuse attack
- ✓ Invalidación de familia completa
- ✓ Rechazo de tokens de familia comprometida
- ✓ Revocación de todas las sesiones de un usuario
- ✓ Aislamiento entre usuarios diferentes

### Ejecutar Tests

```bash
cd backend
npm test -- auth.service.test.ts
```

## Próximos Pasos

### Migración a Redis (Siguiente Fase)

La implementación actual usa memoria local. Para producción:

1. **Redis Store**: Migrar `usedTokens` y `tokenFamilies` a Redis
2. **TTL automático**: Usar `SETEX` para expiración automática
3. **Clustering**: Sincronización entre múltiples instancias
4. **Persistencia**: Mantener estado entre reinicios

Ejemplo de estructura Redis:

```
used_tokens:{jti} → { familyId, userId, expiresAt }
token_families:{familyId} → { userId, currentJti, invalidatedAt }
```

### Monitoreo y Alertas

- Alertas a administradores en ataques de reuso
- Métricas de seguridad en dashboard
- Notificaciones al usuario afectado

### Rate Limiting

- Límite de intentos de refresh por usuario
- Bloqueo temporal tras múltiples fallos

## Referencias

- [RFC 6749 - OAuth 2.0](https://tools.ietf.org/html/rfc6749)
- [RFC 6750 - Bearer Token Usage](https://tools.ietf.org/html/rfc6750)
- [OWASP - Token Rotation](https://owasp.org/www-community/attacks/Token_Reuse)
- [Auth0 - Token Rotation](https://auth0.com/docs/secure/tokens/refresh-tokens/refresh-token-rotation)

## Notas de Seguridad

1. **Nunca almacenar refresh tokens en localStorage** en aplicaciones críticas - usar httpOnly cookies
2. **HTTPS obligatorio** en producción
3. **Logs de seguridad** deben ir a sistema de monitoreo centralizado
4. **Rate limiting** en endpoint de refresh
5. **Notificar al usuario** cuando se detecta actividad sospechosa
