# AuthService - Documentación

Servicio completo de autenticación JWT para Guelaguetza Connect usando la biblioteca `jose`.

## Características

- Generación de pares de tokens (Access + Refresh)
- Access Token: 15 minutos de validez
- Refresh Token: 7 días de validez
- Algoritmo: HS256
- Hash de passwords con bcrypt (factor 12)
- Tokens con JTI (JWT ID) único para tracking
- Manejo de errores específicos

## Configuración

### Variables de Entorno

```bash
# Access Token Secret (usar al menos 32 caracteres aleatorios)
JWT_ACCESS_SECRET="your-super-secret-access-key-change-this-in-production-min-32-chars"

# Refresh Token Secret (usar al menos 32 caracteres aleatorios)
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-this-in-production-min-32-chars"

# Fallback para compatibilidad (opcional)
JWT_SECRET="your-super-secret-jwt-key-change-this-in-production"
```

### Generar Secrets Seguros

```bash
# En Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# En terminal Unix
openssl rand -base64 32
```

## Interfaces

### TokenPair

```typescript
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // en segundos
}
```

### JWTPayload

```typescript
interface JWTPayload {
  sub: string;      // userId
  email: string;
  role: string;
  type: 'access' | 'refresh';
  jti: string;      // JWT ID único
  iat: number;      // issued at
  exp: number;      // expiration
}
```

## Métodos

### JWT

#### `generateTokenPair(userId: string, email: string, role: string): Promise<TokenPair>`

Genera un par de tokens (access + refresh) para un usuario.

```typescript
const authService = new AuthService(prisma);
const tokens = await authService.generateTokenPair(
  'user-id-123',
  'user@example.com',
  'USER'
);

console.log(tokens.accessToken);  // Token de acceso (15min)
console.log(tokens.refreshToken); // Token de refresco (7días)
console.log(tokens.expiresIn);    // 900 (segundos)
```

#### `verifyAccessToken(token: string): Promise<JWTPayload>`

Verifica un Access Token y devuelve el payload decodificado.

```typescript
try {
  const payload = await authService.verifyAccessToken(accessToken);
  console.log(payload.sub);   // user-id-123
  console.log(payload.email); // user@example.com
  console.log(payload.role);  // USER
} catch (error) {
  // Token inválido o expirado
  console.error(error.message);
}
```

**Errores posibles:**
- `Token expirado`
- `Token inválido: firma incorrecta`
- `Token inválido: tipo incorrecto`
- `Token inválido`

#### `verifyRefreshToken(token: string): Promise<JWTPayload>`

Verifica un Refresh Token y devuelve el payload decodificado.

```typescript
try {
  const payload = await authService.verifyRefreshToken(refreshToken);
  console.log(payload.sub);  // user-id-123
  console.log(payload.type); // refresh
} catch (error) {
  // Refresh token inválido o expirado
  console.error(error.message);
}
```

**Errores posibles:**
- `Refresh token expirado`
- `Refresh token inválido: firma incorrecta`
- `Token inválido: tipo incorrecto`
- `Refresh token inválido`

#### `refreshTokens(refreshToken: string): Promise<TokenPair>`

Refresca el par de tokens usando un refresh token válido.

```typescript
try {
  const newTokens = await authService.refreshTokens(oldRefreshToken);
  // Usar los nuevos tokens
  console.log(newTokens.accessToken);
  console.log(newTokens.refreshToken);
} catch (error) {
  // Refresh token inválido, usuario no existe, o cuenta suspendida
  console.error(error.message);
}
```

### Password Hashing

#### `hashPassword(password: string): Promise<string>`

Hashea una contraseña usando bcrypt con factor 12.

```typescript
const hashedPassword = await authService.hashPassword('mySecurePassword123');
// Retorna: $2b$12$...
```

**Validaciones:**
- Contraseña mínima de 6 caracteres

#### `verifyPassword(password: string, hash: string): Promise<boolean>`

Verifica una contraseña contra su hash.

```typescript
const isValid = await authService.verifyPassword(
  'mySecurePassword123',
  hashedPassword
);

if (isValid) {
  console.log('Contraseña correcta');
}
```

### Autenticación

#### `register(data: RegisterInput): Promise<{ user, tokens }>`

Registra un nuevo usuario y devuelve sus datos con tokens.

```typescript
const result = await authService.register({
  email: 'nuevo@example.com',
  password: 'password123',
  nombre: 'Nuevo',
  apellido: 'Usuario',
  region: 'Valles Centrales',
});

console.log(result.user);    // Datos del usuario (sin password)
console.log(result.tokens);  // { accessToken, refreshToken, expiresIn }
```

**Errores:**
- `El email ya está registrado` (400)
- `La contraseña debe tener al menos 6 caracteres` (400)

#### `login(email: string, password: string): Promise<{ user, tokens }>`

Login de usuario con email y contraseña.

```typescript
const result = await authService.login(
  'user@example.com',
  'password123'
);

console.log(result.user);    // Datos del usuario
console.log(result.tokens);  // Tokens JWT
```

**Errores:**
- `Credenciales inválidas` (401)
- `Tu cuenta ha sido suspendida: [razón]` (403)

#### `getProfile(userId: string): Promise<UserProfile>`

Obtiene el perfil completo de un usuario.

```typescript
const profile = await authService.getProfile('user-id-123');

console.log(profile.id);
console.log(profile.email);
console.log(profile._count.stories); // Contador de stories
console.log(profile._count.likes);   // Contador de likes
```

**Errores:**
- `Usuario no encontrado` (404)

#### `updateProfile(userId: string, data: UpdateProfileInput): Promise<User>`

Actualiza el perfil de un usuario.

```typescript
const updatedUser = await authService.updateProfile('user-id-123', {
  nombre: 'Nombre Actualizado',
  apellido: 'Apellido Actualizado',
  avatar: 'https://example.com/avatar.jpg',
  region: 'Istmo',
});
```

#### `changePassword(userId: string, currentPassword: string, newPassword: string): Promise<{ success, message }>`

Cambia la contraseña de un usuario.

```typescript
const result = await authService.changePassword(
  'user-id-123',
  'oldPassword123',
  'newSecurePassword456'
);

console.log(result.message); // "Contraseña actualizada correctamente"
```

**Errores:**
- `Usuario no encontrado` (404)
- `Contraseña actual incorrecta` (401)
- `La contraseña debe tener al menos 6 caracteres` (400)

#### `revokeAllTokens(userId: string): Promise<{ success, message }>`

Revoca todos los tokens de un usuario (cierra todas las sesiones).

> **Nota:** En producción, esto requiere implementar una blacklist de JTIs en Redis. Actualmente solo verifica que el usuario existe.

```typescript
const result = await authService.revokeAllTokens('user-id-123');
console.log(result.message); // "Todas las sesiones han sido cerradas"
```

## Endpoints HTTP

### POST `/auth/register`

```json
// Request
{
  "email": "nuevo@example.com",
  "password": "password123",
  "nombre": "Nuevo",
  "apellido": "Usuario",
  "region": "Valles Centrales"
}

// Response (201)
{
  "success": true,
  "user": {
    "id": "...",
    "email": "nuevo@example.com",
    "nombre": "Nuevo",
    "apellido": "Usuario",
    "avatar": null,
    "region": "Valles Centrales",
    "role": "USER",
    "createdAt": "2025-01-27T..."
  },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "token": "eyJhbGc..." // legacy
}
```

### POST `/auth/login`

```json
// Request
{
  "email": "user@example.com",
  "password": "password123"
}

// Response (200)
{
  "success": true,
  "user": { ... },
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900,
  "token": "eyJhbGc..." // legacy
}
```

### POST `/auth/refresh`

```json
// Request
{
  "refreshToken": "eyJhbGc..."
}

// Response (200)
{
  "success": true,
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "expiresIn": 900
}
```

### GET `/auth/me`

```bash
# Headers
Authorization: Bearer eyJhbGc...

# Response (200)
{
  "id": "...",
  "email": "user@example.com",
  "nombre": "Usuario",
  "apellido": "Apellido",
  "avatar": null,
  "region": "Valles Centrales",
  "role": "USER",
  "createdAt": "2025-01-27T...",
  "_count": {
    "stories": 5,
    "likes": 10
  }
}
```

### PUT `/auth/me`

```json
// Headers
Authorization: Bearer eyJhbGc...

// Request
{
  "nombre": "Nombre Actualizado",
  "apellido": "Apellido Actualizado"
}

// Response (200)
{
  "id": "...",
  "email": "user@example.com",
  "nombre": "Nombre Actualizado",
  "apellido": "Apellido Actualizado",
  "avatar": null,
  "region": "Valles Centrales",
  "role": "USER"
}
```

### POST `/auth/change-password`

```json
// Headers
Authorization: Bearer eyJhbGc...

// Request
{
  "currentPassword": "oldPassword123",
  "newPassword": "newSecurePassword456"
}

// Response (200)
{
  "success": true,
  "message": "Contraseña actualizada correctamente"
}
```

### POST `/auth/logout-all`

```bash
# Headers
Authorization: Bearer eyJhbGc...

# Response (200)
{
  "success": true,
  "message": "Todas las sesiones han sido cerradas"
}
```

## Flujo de Autenticación Recomendado

### 1. Login/Register

```typescript
// Frontend
const response = await fetch('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { accessToken, refreshToken, expiresIn } = await response.json();

// Guardar tokens
localStorage.setItem('accessToken', accessToken);
localStorage.setItem('refreshToken', refreshToken);
```

### 2. Requests Autenticados

```typescript
// Frontend
const accessToken = localStorage.getItem('accessToken');

const response = await fetch('/api/protected-resource', {
  headers: {
    'Authorization': `Bearer ${accessToken}`
  }
});
```

### 3. Refresh Automático

```typescript
// Frontend - Interceptor de errores
async function fetchWithRefresh(url, options) {
  let response = await fetch(url, options);

  // Si el access token expiró (401)
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refreshToken');

    // Refrescar tokens
    const refreshResponse = await fetch('/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken })
    });

    if (refreshResponse.ok) {
      const { accessToken, refreshToken: newRefreshToken } = await refreshResponse.json();

      // Actualizar tokens
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', newRefreshToken);

      // Reintentar request original
      options.headers.Authorization = `Bearer ${accessToken}`;
      response = await fetch(url, options);
    } else {
      // Refresh token expirado - logout
      localStorage.clear();
      window.location.href = '/login';
    }
  }

  return response;
}
```

## Seguridad

### Mejores Prácticas

1. **Secrets seguros**: Usar secretos aleatorios de al menos 32 caracteres
2. **HTTPS**: Siempre usar HTTPS en producción
3. **Storage seguro**:
   - Access Token: Puede estar en memoria o sessionStorage
   - Refresh Token: Preferiblemente en httpOnly cookie
4. **Rotación de tokens**: El refresh endpoint genera un nuevo refresh token
5. **Blacklist de tokens**: Implementar Redis para revocación de tokens

### TODO: Blacklist de Tokens en Redis

Para implementar revocación de tokens real:

```typescript
// En el método revokeAllTokens
async revokeAllTokens(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!user) {
    throw new NotFoundError('Usuario no encontrado');
  }

  // Agregar JTI a blacklist en Redis (TTL = refresh token expiration)
  const currentJTI = getCurrentJTI(userId); // extraer de contexto
  await redis.setex(`blacklist:${currentJTI}`, 7 * 24 * 60 * 60, '1');

  return {
    success: true,
    message: 'Todas las sesiones han sido cerradas',
  };
}

// En verifyAccessToken y verifyRefreshToken
async verifyAccessToken(token: string): Promise<JWTPayload> {
  const { payload } = await jwtVerify(token, getAccessTokenSecret());

  // Verificar blacklist
  const isBlacklisted = await redis.exists(`blacklist:${payload.jti}`);
  if (isBlacklisted) {
    throw new UnauthorizedError('Token revocado');
  }

  return payload as unknown as JWTPayload;
}
```

## Testing

Ver `/backend/src/services/auth.service.test.ts` para ejemplos de pruebas.

```bash
# Ejecutar tests
npm run test -- auth.service.test.ts

# Ejecutar tests de integración
npm run test:integration:auth
```

## Migración desde JWT Legacy

Si estás migrando de `@fastify/jwt`:

1. Los endpoints `/register` y `/login` ahora devuelven `accessToken` y `refreshToken` además de `token` (legacy)
2. El campo `token` sigue siendo el access token para compatibilidad
3. Actualizar el frontend gradualmente para usar `accessToken` y `refreshToken`
4. El plugin `@fastify/jwt` sigue funcionando para compatibilidad con código existente

## Referencias

- [jose - JWT library](https://github.com/panva/jose)
- [bcryptjs](https://github.com/dcodeIO/bcrypt.js)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
