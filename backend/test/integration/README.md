# Tests de Integración - Guelaguetza Connect Backend

## Descripción

Este directorio contiene tests de integración completos para los servicios críticos del backend:

- **BookingService**: Tests para reservaciones de experiencias
- **MarketplaceService**: Tests para órdenes y productos
- **AuthService**: Tests para autenticación y usuarios

## Configuración

### 1. Base de Datos de Test

Los tests requieren una base de datos PostgreSQL de test. Hay dos opciones:

#### Opción A: Docker (Recomendado)

```bash
# Iniciar contenedor de test
npm run test:db:up

# Detener contenedor
npm run test:db:down

# Resetear base de datos
npm run test:db:reset
```

#### Opción B: PostgreSQL Local

Si prefieres usar PostgreSQL local, configura `.env.test`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/guelaguetza_test?schema=public"
```

### 2. Migraciones

Asegúrate de que las migraciones estén aplicadas en la BD de test:

```bash
# Aplicar migraciones
npx dotenv-cli -e .env.test -- npx prisma migrate deploy
```

## Ejecutar Tests

### Todos los tests de integración

```bash
npm run test:integration
```

### Test específico

```bash
npx dotenv-cli -e .env.test -- vitest run --config vitest.config.integration.ts test/integration/booking.service.test.ts
```

### Con watch mode

```bash
npx dotenv-cli -e .env.test -- vitest --config vitest.config.integration.ts
```

## Estructura de Tests

### BookingService (booking.service.test.ts)

- ✅ createBooking con payment intent exitoso
- ✅ createBooking con validación de disponibilidad
- ✅ Concurrencia: 5 bookings simultáneos al mismo slot
- ✅ Prevención de overbooking con concurrencia
- ✅ cancelBooking con restauración de capacidad
- ✅ confirmBooking
- ✅ cleanupFailedBookings (bookings > 30 min en PENDING_PAYMENT)
- ✅ getExperiences con filtros (categoría, precio, búsqueda)
- ✅ getTimeSlots con fecha

### MarketplaceService (marketplace.service.test.ts)

- ✅ createOrder exitoso
- ✅ createOrder multi-seller (2 órdenes separadas)
- ✅ Stock validation (error si stock insuficiente)
- ✅ Concurrencia: 2 órdenes simultáneas para producto con stock limitado
- ✅ addToCart / removeFromCart
- ✅ updateCartItem
- ✅ cleanupFailedOrders con restauración de stock
- ✅ getProducts con filtros (categoría, precio, seller, búsqueda)
- ✅ createSellerProfile

### AuthService (auth.service.test.ts)

- ✅ register exitoso
- ✅ register con email duplicado (error)
- ✅ register con diferentes roles (USER, HOST, SELLER)
- ✅ login exitoso
- ✅ login con credenciales incorrectas
- ✅ getProfile
- ✅ updateProfile (nombre, apellido, bio, avatar, region)

## Cobertura de Tests

Los tests cubren:

### Casos de Éxito
- Flujos normales de cada operación
- Creación, lectura, actualización de recursos
- Validaciones básicas

### Casos de Error
- Recursos no encontrados (NotFoundError)
- Validaciones de negocio (AppError)
- Permisos insuficientes (403)
- Datos inválidos (400)

### Casos de Concurrencia
- Optimistic locking en bookings
- Prevención de overbooking
- Stock validation en órdenes concurrentes
- Retry mechanism automático

### Limpieza y Mantenimiento
- cleanupFailedBookings
- cleanupFailedOrders
- Restauración de inventario

## Configuración del Entorno de Test

### Variables de Entorno (.env.test)

```env
# Test Database
DATABASE_URL="postgresql://test_user:test_pass@localhost:5436/guelaguetza_test?schema=public"

# JWT
JWT_SECRET="test-jwt-secret-key"

# Server
PORT=3006
HOST="0.0.0.0"

# Test Environment Flag
NODE_ENV="test"

# Stripe (mock mode - no requiere API key real)
# STRIPE_SECRET_KEY se omite para usar mock automático
```

### Mocks Automáticos

El servicio de Stripe detecta automáticamente cuando no hay API key configurada y usa mocks:

```typescript
// Stripe Service retorna mocks automáticamente
{
  clientSecret: 'mock_client_secret',
  paymentIntentId: 'mock_pi_' + Date.now()
}
```

## Limpieza de Datos

Cada test limpia automáticamente todos los datos antes de ejecutarse (ver `setup-integration.ts`).

El orden de limpieza es importante para respetar las foreign keys:

1. Logs y reviews
2. Items de órdenes y carritos
3. Órdenes y carritos
4. Productos y perfiles de seller
5. Bookings y experiencias
6. Usuarios

## Notas Importantes

1. **Ejecución Secuencial**: Los tests se ejecutan secuencialmente (`singleFork: true`) para evitar race conditions en la BD.

2. **Timeouts**: Los tests de integración tienen timeouts más largos (30s) debido a operaciones de BD.

3. **Optimistic Locking**: Los tests de concurrencia validan que el mecanismo de optimistic locking funcione correctamente.

4. **Payment Mocking**: No se requiere Stripe real para los tests. El servicio usa mocks automáticamente.

5. **Limpieza Automática**: No es necesario limpiar datos manualmente. El setup se encarga de esto.

## Troubleshooting

### Error: "Cannot connect to database"

- Verifica que Docker esté corriendo: `docker ps`
- Inicia la BD de test: `npm run test:db:up`
- Verifica la conexión: `psql -h localhost -p 5436 -U test_user -d guelaguetza_test`

### Error: "Table does not exist"

- Aplica las migraciones: `npm run test:db:reset`

### Tests fallan aleatoriamente

- Los tests de concurrencia pueden ser sensibles al timing
- Ejecuta individualmente para aislar el problema
- Verifica que el pool esté en `forks` mode

### Timeout errors

- Aumenta el timeout en vitest.config.integration.ts
- Verifica que la BD no esté sobrecargada

## Mejoras Futuras

- [ ] Tests E2E con Fastify app completa
- [ ] Tests de webhooks de Stripe
- [ ] Tests de notificaciones en tiempo real
- [ ] Tests de carga (stress testing)
- [ ] Cobertura de más edge cases
