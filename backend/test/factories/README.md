# Factory Functions - Generadores de Datos de Prueba

Este directorio contiene factory functions para generar datos de prueba consistentes y realistas para todos los modelos principales de Guelaguetza Connect.

## Estructura

```
test/factories/
├── index.ts              # Exporta todas las factories
├── user.factory.ts       # Usuarios con diferentes roles
├── story.factory.ts      # Historias/posts con imágenes y videos
├── product.factory.ts    # Productos de marketplace
├── order.factory.ts      # Órdenes de compra
├── experience.factory.ts # Experiencias/tours
├── timeslot.factory.ts   # Horarios disponibles
├── booking.factory.ts    # Reservas de experiencias
└── README.md            # Esta documentación
```

## Uso Básico

### Importar factories

```typescript
import {
  createUser,
  createStory,
  createProduct,
  createOrder,
  createExperience,
  createTimeSlot,
  createBooking,
} from './factories';
```

### Crear datos simples

```typescript
// Usuario básico
const user = createUser();

// Usuario con datos específicos
const admin = createUser({
  email: 'admin@example.com',
  role: 'ADMIN',
  nombre: 'Administrador',
});

// Story de imagen
const story = createStory({
  userId: user.id,
  description: 'Mi primera historia!',
});

// Producto
const product = createProduct({
  name: 'Alebrije especial',
  price: 1200,
  category: 'ARTESANIA',
});
```

## Factories Disponibles

### 1. UserFactory

Genera usuarios con diferentes roles y perfiles.

```typescript
// Usuario básico
const user = createUser();

// Usuario administrador
const admin = createAdmin();

// Usuario moderador
const mod = createModerator();

// Usuario con perfil completo
const userWithProfile = createUserWithProfile();

// Usuario baneado
const bannedUser = createBannedUser();

// Múltiples usuarios
const users = createManyUsers(10);
```

**Campos generados:**
- Email único
- Password hasheado (bcrypt)
- Nombre y apellido aleatorios
- Región de Oaxaca

### 2. StoryFactory

Genera historias con imágenes o videos.

```typescript
// Historia básica
const story = createStory();

// Historia de imagen
const imageStory = createImageStory();

// Historia de video
const videoStory = createVideoStory();

// Historia popular (muchas vistas)
const popular = createPopularStory();

// Historias para un usuario
const stories = createStoriesForUser(userId, 5);
```

**Campos generados:**
- URLs de imágenes (Picsum)
- Descripciones realistas
- Ubicaciones de Oaxaca
- Vistas aleatorias

### 3. ProductFactory

Genera productos de marketplace con precios en MXN.

```typescript
// Producto básico
const product = createProduct();

// Producto borrador
const draft = createDraftProduct();

// Producto agotado
const soldOut = createSoldOutProduct();

// Productos por categoría
const artesanias = createProductsByCategory('ARTESANIA', 5);

// Productos de un vendedor
const sellerProducts = createProductsForSeller(sellerId, 10);
```

**Categorías disponibles:**
- ARTESANIA
- MEZCAL
- TEXTIL
- CERAMICA
- JOYERIA
- GASTRONOMIA

**Estados:**
- DRAFT
- ACTIVE
- SOLD_OUT
- ARCHIVED

### 4. OrderFactory

Genera órdenes de compra con diferentes estados.

```typescript
// Orden básica
const order = createOrder();

// Orden pendiente
const pending = createPendingOrder();

// Orden pagada
const paid = createPaidOrder();

// Orden enviada
const shipped = createShippedOrder();

// Orden entregada
const delivered = createDeliveredOrder();

// Orden cancelada
const cancelled = createCancelledOrder();

// Órdenes de un usuario
const userOrders = createOrdersForUser(userId, 5);
```

**Estados disponibles:**
- PENDING
- PAID
- PROCESSING
- SHIPPED
- DELIVERED
- CANCELLED
- REFUNDED

**Incluye:**
- Dirección de envío en Oaxaca
- Total en MXN (Decimal)
- Stripe payment ID (opcional)

### 5. ExperienceFactory

Genera experiencias y tours.

```typescript
// Experiencia básica
const experience = createExperience();

// Experiencia inactiva
const inactive = createInactiveExperience();

// Experiencia popular
const popular = createPopularExperience();

// Experiencias por categoría
const tours = createExperiencesByCategory('TOUR', 3);

// Experiencias de un host
const hostExperiences = createExperiencesForHost(hostId, 5);
```

**Categorías:**
- TOUR
- TALLER
- DEGUSTACION
- CLASE
- VISITA

**Incluye:**
- Títulos y descripciones realistas
- Precios en MXN
- Duración en minutos
- Capacidad máxima
- Lista de incluidos
- Idiomas disponibles
- Calificación y reseñas

### 6. TimeSlotFactory

Genera horarios disponibles para experiencias.

```typescript
// Time slot básico
const slot = createTimeSlot();

// Time slot disponible
const available = createAvailableTimeSlot();

// Time slot lleno
const full = createFullTimeSlot();

// Slots para una experiencia
const slots = createTimeSlotsForExperience(experienceId, 10);

// Slots para una fecha
const date = new Date('2026-07-20');
const dateSlots = createTimeSlotsForDate(date, 3);

// Slots para un rango de fechas
const rangeSlots = createTimeSlotsForDateRange(
  new Date('2026-07-20'),
  7, // días
  2  // slots por día
);
```

**Incluye:**
- Fechas futuras
- Horarios realistas (09:00-20:00)
- Capacidad y conteo de reservas
- Estado de disponibilidad

### 7. BookingFactory

Genera reservas de experiencias.

```typescript
// Reserva básica
const booking = createBooking();

// Reserva pendiente
const pending = createPendingBooking();

// Reserva confirmada
const confirmed = createConfirmedBooking();

// Reserva completada
const completed = createCompletedBooking();

// Reserva cancelada
const cancelled = createCancelledBooking();

// Reservas de un usuario
const userBookings = createBookingsForUser(userId, 5);

// Reservas de una experiencia
const expBookings = createBookingsForExperience(experienceId, 10);
```

**Estados:**
- PENDING
- CONFIRMED
- CANCELLED
- COMPLETED

**Incluye:**
- Número de invitados
- Precio total en MXN
- Requests especiales (opcional)
- Stripe payment ID
- Fechas de confirmación/cancelación

## Helpers Comunes

Todas las factories tienen helpers similares:

```typescript
// Crear múltiples
createManyUsers(10);
createManyStories(5);
createManyProducts(20);

// Resetear contadores (útil en beforeEach)
resetUserCounter();
resetStoryCounter();
resetProductCounter();
```

## Ejemplo de Test Completo

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { prisma } from '../helpers';
import {
  createUser,
  createExperience,
  createTimeSlot,
  createBooking,
  resetUserCounter,
  resetExperienceCounter,
} from './factories';

describe('Booking System', () => {
  beforeEach(() => {
    resetUserCounter();
    resetExperienceCounter();
  });

  it('should create a booking successfully', async () => {
    // Arrange: Crear datos de prueba
    const host = createUser({ nombre: 'Host' });
    const customer = createUser({ nombre: 'Customer' });

    await prisma.user.createMany({
      data: [host, customer],
    });

    const experience = createExperience({
      hostId: host.id,
      title: 'Tour de Prueba',
      price: 500,
    });

    await prisma.experience.create({ data: experience });

    const timeSlot = createTimeSlot({
      experienceId: experience.id,
      date: new Date('2026-07-20'),
    });

    await prisma.experienceTimeSlot.create({ data: timeSlot });

    // Act: Crear la reserva
    const bookingData = createBooking({
      userId: customer.id,
      experienceId: experience.id,
      timeSlotId: timeSlot.id,
      guestCount: 2,
    });

    const booking = await prisma.booking.create({
      data: bookingData,
    });

    // Assert: Verificar
    expect(booking.userId).toBe(customer.id);
    expect(booking.guestCount).toBe(2);
    expect(booking.status).toBe('PENDING');
  });
});
```

## Características Especiales

### IDs Únicos

Todas las factories generan IDs únicos usando un patrón:
```
{model}-{counter}-{timestamp}
```

Ejemplo: `user-0-1706140800000`

### Datos Realistas

- **Nombres**: Lista de nombres comunes en Oaxaca
- **Regiones**: 7 regiones reales de Oaxaca
- **Precios**: En pesos mexicanos (MXN)
- **Ubicaciones**: Lugares reales de Oaxaca
- **Productos**: Artesanías y productos típicos reales

### Override Flexible

Todos los campos son opcionales y se pueden sobreescribir:

```typescript
const user = createUser({
  email: 'specific@email.com',
  nombre: 'Nombre Específico',
  // otros campos usan valores por defecto
});
```

## Best Practices

1. **Resetear contadores**: Usa los helpers `reset*Counter()` en `beforeEach` para consistencia

2. **IDs relacionados**: Asegúrate de crear las relaciones correctamente
   ```typescript
   const user = createUser();
   const story = createStory({ userId: user.id });
   ```

3. **Limpieza de base de datos**: Limpia la DB antes de cada test
   ```typescript
   beforeEach(async () => {
     await prisma.$transaction([
       prisma.booking.deleteMany(),
       prisma.order.deleteMany(),
       prisma.story.deleteMany(),
       prisma.user.deleteMany(),
     ]);
   });
   ```

4. **Usar helpers específicos**: En lugar de `createUser({ role: 'ADMIN' })`, usa `createAdmin()`

## Notas

- No se usa faker.js - todos los datos están hardcodeados o generados con lógica simple
- Los passwords se hashean con bcrypt automáticamente
- Las URLs de imágenes usan Picsum (https://picsum.photos)
- Los precios usan el tipo Decimal de Prisma para precisión
- Las fechas son objetos Date nativos de JavaScript
