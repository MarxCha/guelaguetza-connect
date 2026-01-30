# AuthService - Mejores Prácticas de Seguridad

## Checklist de Seguridad para Producción

### ✅ Implementado

- [x] Access tokens de corta duración (15 min)
- [x] Refresh tokens de larga duración (7 días)
- [x] Tokens separados con diferentes secrets
- [x] JTI único en cada token
- [x] Bcrypt con factor de costo 12
- [x] Validación de tipo de token (access vs refresh)
- [x] Normalización de emails (lowercase)
- [x] Verificación de cuenta baneada
- [x] Errores genéricos para credenciales (no revelar si email existe)

### 🔄 Por Implementar

- [ ] Blacklist de tokens en Redis
- [ ] Rate limiting en endpoints de auth
- [ ] Refresh tokens en httpOnly cookies
- [ ] HTTPS obligatorio en producción
- [ ] Rotación de secrets
- [ ] Logging de eventos de seguridad
- [ ] 2FA (Two-Factor Authentication)
- [ ] Password reset con tokens temporales
- [ ] Detección de login desde nueva ubicación/dispositivo
- [ ] Account lockout después de N intentos fallidos

## Implementación de Blacklist en Redis

### Por qué es necesario

JWT es stateless por diseño, lo que significa que una vez emitido, el token es válido hasta que expira. Para poder **revocar tokens antes de su expiración** (logout, cambio de contraseña, cuenta comprometida), necesitamos una blacklist.

### Implementación

```typescript
import Redis from 'ioredis';

export class AuthService {
  constructor(
    private prisma: PrismaClient,
    private redis: Redis // Agregar Redis
  ) {}

  /**
   * Agrega un JTI a la blacklist
   */
  private async blacklistToken(jti: string, expiresIn: number): Promise<void> {
    // Almacenar en Redis con TTL = tiempo restante del token
    await this.redis.setex(`blacklist:${jti}`, expiresIn, '1');
  }

  /**
   * Verifica si un JTI está en la blacklist
   */
  private async isTokenBlacklisted(jti: string): Promise<boolean> {
    const exists = await this.redis.exists(`blacklist:${jti}`);
    return exists === 1;
  }

  /**
   * Verifica un Access Token (con blacklist)
   */
  async verifyAccessToken(token: string): Promise<JWTPayload> {
    const { payload } = await jwtVerify(token, getAccessTokenSecret(), {
      algorithms: ['HS256'],
    });

    // Verificar blacklist
    if (await this.isTokenBlacklisted(payload.jti as string)) {
      throw new UnauthorizedError('Token revocado');
    }

    if (payload.type !== 'access') {
      throw new UnauthorizedError('Token inválido: tipo incorrecto');
    }

    return payload as unknown as JWTPayload;
  }

  /**
   * Revoca todos los tokens de un usuario
   */
  async revokeAllTokens(userId: string): Promise<void> {
    // Obtener todos los JTIs activos del usuario
    // Opción 1: Guardar JTIs en base de datos al generarlos
    // Opción 2: Incrementar versión de tokens del usuario

    // Opción 2 (recomendada):
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        tokenVersion: { increment: 1 }, // Agregar campo a schema
      },
    });

    // Al verificar tokens, comparar versión:
    // if (payload.tokenVersion !== user.tokenVersion) {
    //   throw new UnauthorizedError('Token revocado');
    // }
  }

  /**
   * Revoca un token específico
   */
  async revokeToken(token: string): Promise<void> {
    const payload = await this.verifyAccessToken(token);
    const now = Math.floor(Date.now() / 1000);
    const ttl = payload.exp - now;

    if (ttl > 0) {
      await this.blacklistToken(payload.jti, ttl);
    }
  }
}
```

### Schema Update (Prisma)

```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  password     String
  tokenVersion Int      @default(0) // Agregar este campo
  // ... otros campos
}
```

## Rate Limiting

### Implementación con @fastify/rate-limit

```typescript
// src/routes/auth.ts
import rateLimit from '@fastify/rate-limit';

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Rate limit para login (prevenir brute force)
  const loginLimiter = {
    max: 5,                    // 5 intentos
    timeWindow: '15 minutes',  // en 15 minutos
    errorResponseBuilder: () => ({
      error: 'Demasiados intentos de login. Intenta nuevamente en 15 minutos.',
      statusCode: 429,
    }),
  };

  // Rate limit para registro (prevenir spam)
  const registerLimiter = {
    max: 3,                    // 3 registros
    timeWindow: '1 hour',      // por hora
    errorResponseBuilder: () => ({
      error: 'Demasiados registros. Intenta nuevamente más tarde.',
      statusCode: 429,
    }),
  };

  // Aplicar rate limiting
  fastify.post('/login', {
    config: {
      rateLimit: loginLimiter,
    },
  }, async (request, reply) => {
    // ... handler de login
  });

  fastify.post('/register', {
    config: {
      rateLimit: registerLimiter,
    },
  }, async (request, reply) => {
    // ... handler de registro
  });
};
```

## Refresh Tokens en httpOnly Cookies

### Por qué

- **localStorage/sessionStorage**: Vulnerable a XSS
- **httpOnly cookies**: No accesible desde JavaScript, más seguro

### Implementación

```typescript
// src/routes/auth.ts

// Login - Enviar refresh token en cookie
fastify.post('/login', async (request, reply) => {
  const result = await authService.login(email, password);

  // Access token en response body
  // Refresh token en httpOnly cookie
  reply
    .setCookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,        // No accesible desde JS
      secure: true,          // Solo HTTPS
      sameSite: 'strict',    // CSRF protection
      maxAge: 7 * 24 * 60 * 60, // 7 días
      path: '/auth/refresh', // Solo disponible en endpoint de refresh
    })
    .send({
      success: true,
      user: result.user,
      accessToken: result.tokens.accessToken,
      expiresIn: result.tokens.expiresIn,
    });
});

// Refresh - Leer refresh token de cookie
fastify.post('/refresh', async (request, reply) => {
  const refreshToken = request.cookies.refreshToken;

  if (!refreshToken) {
    return reply.status(401).send({ error: 'Refresh token no encontrado' });
  }

  const tokens = await authService.refreshTokens(refreshToken);

  reply
    .setCookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60,
      path: '/auth/refresh',
    })
    .send({
      success: true,
      accessToken: tokens.accessToken,
      expiresIn: tokens.expiresIn,
    });
});

// Logout - Limpiar cookie
fastify.post('/logout', async (request, reply) => {
  reply
    .clearCookie('refreshToken', { path: '/auth/refresh' })
    .send({ success: true });
});
```

### Configurar @fastify/cookie

```typescript
// src/app.ts
import cookie from '@fastify/cookie';

await fastify.register(cookie, {
  secret: process.env.COOKIE_SECRET, // Agregar a .env
});
```

## HTTPS Obligatorio

### En Producción

```typescript
// src/app.ts
if (process.env.NODE_ENV === 'production') {
  // Forzar HTTPS
  fastify.addHook('onRequest', async (request, reply) => {
    if (!request.headers['x-forwarded-proto']?.includes('https')) {
      return reply.status(403).send({
        error: 'HTTPS es requerido',
      });
    }
  });
}
```

### En Reverse Proxy (Nginx)

```nginx
server {
  listen 80;
  server_name api.guelaguetzaconnect.com;
  return 301 https://$server_name$request_uri;
}

server {
  listen 443 ssl http2;
  server_name api.guelaguetzaconnect.com;

  ssl_certificate /path/to/cert.pem;
  ssl_certificate_key /path/to/key.pem;

  # Security headers
  add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
  add_header X-Frame-Options "SAMEORIGIN" always;
  add_header X-Content-Type-Options "nosniff" always;
  add_header X-XSS-Protection "1; mode=block" always;

  location / {
    proxy_pass http://localhost:3001;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;
  }
}
```

## Logging de Eventos de Seguridad

### Implementación

```typescript
// src/services/auth.service.ts

export class AuthService {
  private async logSecurityEvent(
    event: string,
    userId?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    await this.prisma.securityLog.create({
      data: {
        event,
        userId,
        metadata,
        timestamp: new Date(),
        ipAddress: metadata?.ip,
        userAgent: metadata?.userAgent,
      },
    });
  }

  async login(email: string, password: string, metadata?: { ip: string; userAgent: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      await this.logSecurityEvent('LOGIN_FAILED', undefined, {
        email,
        reason: 'user_not_found',
        ...metadata,
      });
      throw new AppError('Credenciales inválidas', 401);
    }

    const isValidPassword = await this.verifyPassword(password, user.password);

    if (!isValidPassword) {
      await this.logSecurityEvent('LOGIN_FAILED', user.id, {
        reason: 'invalid_password',
        ...metadata,
      });
      throw new AppError('Credenciales inválidas', 401);
    }

    // Login exitoso
    await this.logSecurityEvent('LOGIN_SUCCESS', user.id, metadata);

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);

    return { user, tokens };
  }
}
```

### Schema (Prisma)

```prisma
model SecurityLog {
  id        String   @id @default(cuid())
  event     String   // LOGIN_SUCCESS, LOGIN_FAILED, PASSWORD_CHANGED, etc.
  userId    String?
  ipAddress String?
  userAgent String?
  metadata  Json?
  timestamp DateTime @default(now())

  user      User?    @relation(fields: [userId], references: [id])

  @@index([userId])
  @@index([event])
  @@index([timestamp])
}
```

## Account Lockout

### Implementación

```typescript
export class AuthService {
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      throw new AppError('Credenciales inválidas', 401);
    }

    // Verificar si la cuenta está bloqueada
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesRemaining = Math.ceil(
        (user.lockedUntil.getTime() - Date.now()) / 60000
      );
      throw new AppError(
        `Cuenta bloqueada. Intenta nuevamente en ${minutesRemaining} minutos.`,
        403
      );
    }

    const isValidPassword = await this.verifyPassword(password, user.password);

    if (!isValidPassword) {
      // Incrementar contador de intentos fallidos
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const maxAttempts = 5;

      if (failedAttempts >= maxAttempts) {
        // Bloquear cuenta por 30 minutos
        await this.prisma.user.update({
          where: { id: user.id },
          data: {
            failedLoginAttempts: failedAttempts,
            lockedUntil: new Date(Date.now() + 30 * 60 * 1000), // 30 min
          },
        });

        throw new AppError(
          'Cuenta bloqueada por múltiples intentos fallidos. Intenta nuevamente en 30 minutos.',
          403
        );
      }

      // Incrementar contador
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: failedAttempts },
      });

      throw new AppError('Credenciales inválidas', 401);
    }

    // Login exitoso - resetear contador
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    const tokens = await this.generateTokenPair(user.id, user.email, user.role);
    return { user, tokens };
  }
}
```

### Schema Update

```prisma
model User {
  id                   String    @id @default(cuid())
  email                String    @unique
  password             String
  failedLoginAttempts  Int       @default(0)
  lockedUntil          DateTime?
  // ... otros campos
}
```

## Password Reset

### Implementación

```typescript
export class AuthService {
  /**
   * Genera un token de reseteo de contraseña
   */
  async requestPasswordReset(email: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      // No revelar si el email existe
      return 'Si el email existe, recibirás un link de recuperación';
    }

    // Generar token de reseteo (válido por 1 hora)
    const resetToken = uuidv4();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordResetToken: resetToken,
        passwordResetExpires: resetExpires,
      },
    });

    // TODO: Enviar email con link
    // const resetLink = `https://app.com/reset-password?token=${resetToken}`;
    // await emailService.send(user.email, 'Password Reset', resetLink);

    return 'Si el email existe, recibirás un link de recuperación';
  }

  /**
   * Resetea la contraseña con un token válido
   */
  async resetPassword(token: string, newPassword: string): Promise<void> {
    const user = await this.prisma.user.findFirst({
      where: {
        passwordResetToken: token,
        passwordResetExpires: {
          gt: new Date(), // Token no expirado
        },
      },
    });

    if (!user) {
      throw new AppError('Token de reseteo inválido o expirado', 400);
    }

    // Hashear nueva contraseña
    const hashedPassword = await this.hashPassword(newPassword);

    // Actualizar contraseña y limpiar token
    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
        tokenVersion: { increment: 1 }, // Revocar tokens existentes
      },
    });

    await this.logSecurityEvent('PASSWORD_RESET', user.id);
  }
}
```

## Variables de Entorno de Producción

```bash
# .env.production

# JWT Secrets (GENERAR NUEVOS VALORES ALEATORIOS)
JWT_ACCESS_SECRET="<openssl rand -base64 32>"
JWT_REFRESH_SECRET="<openssl rand -base64 32>"

# Cookie Secret
COOKIE_SECRET="<openssl rand -base64 32>"

# HTTPS
FORCE_HTTPS=true

# Rate Limiting
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_LOGIN_WINDOW=900000  # 15 min
RATE_LIMIT_REGISTER_MAX=3
RATE_LIMIT_REGISTER_WINDOW=3600000  # 1 hour

# Account Lockout
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION=1800000  # 30 min

# Redis (para blacklist)
REDIS_URL="redis://localhost:6379"
```

## Checklist de Deployment

### Antes de Producción

- [ ] Generar nuevos secrets aleatorios (nunca usar valores de ejemplo)
- [ ] Habilitar HTTPS en todas las conexiones
- [ ] Configurar @fastify/cookie para refresh tokens
- [ ] Implementar Redis para blacklist de tokens
- [ ] Configurar rate limiting en endpoints de auth
- [ ] Habilitar logging de eventos de seguridad
- [ ] Implementar account lockout
- [ ] Agregar password reset
- [ ] Configurar monitoreo de eventos sospechosos
- [ ] Revisar headers de seguridad (HSTS, CSP, etc.)
- [ ] Configurar CORS correctamente
- [ ] Implementar WAF (Web Application Firewall)
- [ ] Configurar backups automáticos de base de datos
- [ ] Documentar procedimiento de respuesta a incidentes

### Monitoreo Continuo

- [ ] Alertas de múltiples intentos fallidos
- [ ] Alertas de login desde ubicaciones inusuales
- [ ] Alertas de cambios masivos de contraseñas
- [ ] Métricas de tasa de error en autenticación
- [ ] Logs centralizados (ELK, DataDog, etc.)

## Recursos

- [OWASP Authentication Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html)
- [JWT Best Practices](https://datatracker.ietf.org/doc/html/rfc8725)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
