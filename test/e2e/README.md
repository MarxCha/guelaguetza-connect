# Tests E2E - Guelaguetza Connect

Tests end-to-end (E2E) que simulan flujos completos de usuario en la aplicación.

## Estructura

```
test/e2e/
├── setup.ts                    # Configuración global de tests
├── fixtures/                   # Datos de prueba
│   ├── users.ts               # Usuarios de prueba
│   ├── experiences.ts         # Experiencias y horarios
│   └── products.ts            # Productos y vendedores
├── booking-flow.test.ts       # Flujo de reservaciones
├── marketplace-flow.test.ts   # Flujo de compras
└── admin-flow.test.ts         # Flujo de administración
```

## Flujos Cubiertos

### 1. Booking Flow (Reservar experiencia)
**Usuario:** Regular user
**Pasos:**
- Login como usuario
- Navegar a experiencias
- Buscar por categoría (ej: CLASE)
- Ver detalle de experiencia
- Seleccionar horario disponible
- Crear booking
- Verificar que booking aparece en "Mis Reservaciones"
- Cancelar reservación

**Tests adicionales:**
- No permite reservar horario sin disponibilidad
- No permite reservar más personas que la capacidad
- Requiere autenticación
- Filtra por ubicación

### 2. Marketplace Flow (Comprar productos)
**Usuario:** Regular user
**Pasos:**
- Login como usuario
- Navegar a tienda
- Buscar productos por categoría
- Ver detalles de productos
- Agregar múltiples productos al carrito
- Actualizar cantidades
- Ver carrito con totales
- Proceder al checkout
- Verificar orden creada
- Ver "Mis Órdenes"

**Tests adicionales:**
- No permite agregar producto sin stock
- No permite cantidad mayor al stock
- Eliminar producto del carrito
- Limpiar todo el carrito
- Requiere autenticación
- Filtros múltiples

### 3. Admin Flow (Gestión de usuarios)
**Usuario:** Admin
**Pasos:**
- Login como admin
- Acceder a dashboard de administración
- Ver estadísticas generales
- Listar usuarios con paginación
- Buscar usuario por email/nombre
- Ver detalles de usuario
- Banear usuario con razón
- Verificar que usuario baneado no puede acceder
- Ver reportes de actividad

**Tests adicionales:**
- Desbanear usuario
- Cambiar rol de usuario
- No puede cambiar su propio rol
- No puede banearse a sí mismo
- Filtrar por rol
- Moderar contenido
- Usuario regular no puede acceder
- Paginación correcta

## Ejecutar Tests

### Todos los tests E2E
```bash
pnpm test:e2e
```

### Test específico
```bash
pnpm test:e2e booking-flow
```

### Con coverage
```bash
pnpm test:e2e:coverage
```

### En modo watch
```bash
pnpm test:e2e:watch
```

## Requisitos

### Base de Datos de Prueba
Los tests E2E requieren una base de datos PostgreSQL de prueba. Configurar en `.env.test`:

```env
DATABASE_URL="postgresql://user:password@localhost:5432/guelaguetza_test"
JWT_SECRET="test-secret-key-change-in-production"
PORT=3002
```

### Docker (Recomendado)
```bash
# Levantar base de datos de prueba
cd backend
pnpm test:db:up

# Aplicar migraciones
DATABASE_URL="..." npx prisma migrate deploy

# Bajar base de datos
pnpm test:db:down
```

## Fixtures (Datos de Prueba)

### Usuarios
- `regularUser`: Usuario regular (comprador)
- `hostUser`: Anfitrión de experiencias
- `sellerUser`: Vendedor de productos
- `adminUser`: Administrador del sistema
- `bannedUser`: Usuario baneado

Todos usan la misma contraseña: `password123`

### Experiencias
- `cookingClass`: Clase de cocina oaxaqueña (3h, $500)
- `mezcalTour`: Tour de mezcal (4h, $350)
- `textileWorkshop`: Taller de tejido (2.5h, $400)

### Productos
- `alebrije`: Alebrije de madera ($850, stock: 5)
- `mezcal`: Mezcal artesanal ($450, stock: 20)
- `textil`: Tapete zapoteco ($1200, stock: 3)
- `ceramica`: Olla de barro negro ($320, stock: 10)
- `soldOut`: Producto agotado ($500, stock: 0)

## Helpers

### `getTestApp()`
Retorna instancia de Fastify para hacer requests.

### `getTestPrisma()`
Retorna instancia de Prisma para seeding y verificación.

### `generateAuthToken(userId)`
Genera token JWT para autenticación.

### `authenticatedRequest(method, url, userId, body?)`
Helper para hacer requests autenticados.

## Mejores Prácticas

1. **Cleanup**: Los datos se limpian automáticamente entre tests (beforeEach)
2. **Aislamiento**: Cada test debe ser independiente
3. **Realismo**: Simular comportamiento real de usuario
4. **Assertions**: Verificar tanto respuestas API como estado de BD
5. **Errores**: Testear casos de error, no solo casos felices

## Debugging

### Ver logs del servidor
Los logs de Fastify se muestran en la consola durante los tests.

### Inspeccionar BD
```bash
# Conectar a BD de prueba
psql postgresql://user:password@localhost:5432/guelaguetza_test

# Ver datos
SELECT * FROM "User";
SELECT * FROM "Booking";
SELECT * FROM "Order";
```

### Screenshots en caso de fallo
Los tests E2E pueden configurarse para tomar screenshots en caso de fallo:

```typescript
afterEach(async (context) => {
  if (context.state.currentTest?.result?.state === 'fail') {
    // Guardar snapshot de BD o logs
  }
});
```

## Próximos Tests

Tests E2E pendientes que se podrían agregar:

- **Events Flow**: RSVP a eventos, recordatorios
- **Social Flow**: Seguir usuarios, likes, comentarios
- **Streaming Flow**: Crear live stream, chat
- **POI Flow**: Agregar puntos de interés, reviews
- **Payment Flow**: Integración con Stripe

## Notas

- Los tests E2E son **más lentos** que tests unitarios
- Se ejecutan en **serie** para evitar conflictos de BD
- Usan **base de datos real** (aunque de prueba)
- Son ideales para **smoke tests** y **regression tests**
- Complementan (no reemplazan) tests unitarios
