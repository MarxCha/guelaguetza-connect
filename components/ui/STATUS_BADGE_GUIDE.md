# Guía de Uso: StatusBadge Components

## Resumen

Los componentes `StatusBadge` proporcionan badges accesibles y consistentes para mostrar estados de reservaciones (bookings) y pedidos (orders) con los nuevos estados de pago implementados.

## Componentes

### 1. BookingStatusBadge

Badge para estados de reservaciones de experiencias.

#### Estados Disponibles

| Estado | Label | Color | Icono | Descripción |
|--------|-------|-------|-------|-------------|
| `PENDING_PAYMENT` | Procesando pago | Amarillo | CreditCard | Pago en proceso, esperando confirmación |
| `PAYMENT_FAILED` | Error en pago | Rojo | XCircle | El pago ha fallado, requiere reintento |
| `PENDING` | Pendiente | Azul | Hourglass | Reservación creada, esperando confirmación |
| `CONFIRMED` | Confirmado | Verde | CheckCircle | Reservación confirmada |
| `CANCELLED` | Cancelado | Gris | XCircle | Reservación cancelada |
| `COMPLETED` | Completado | Esmeralda | CheckCircle2 | Reservación completada |

#### Uso Básico

```tsx
import { BookingStatusBadge } from './ui/StatusBadge';

<BookingStatusBadge status="PENDING_PAYMENT" />
<BookingStatusBadge status="CONFIRMED" size="lg" />
<BookingStatusBadge status="PAYMENT_FAILED" showLabel={false} />
```

#### Props

```tsx
interface BookingStatusBadgeProps {
  status: BookingStatus;       // Estado del booking (requerido)
  size?: 'sm' | 'md' | 'lg';  // Tamaño del badge (default: 'md')
  showLabel?: boolean;         // Mostrar texto (default: true)
  className?: string;          // Clases adicionales
}
```

---

### 2. OrderStatusBadge

Badge para estados de pedidos del marketplace.

#### Estados Disponibles

| Estado | Label | Color | Icono | Descripción |
|--------|-------|-------|-------|-------------|
| `PENDING_PAYMENT` | Procesando pago | Amarillo | CreditCard | Pago en proceso |
| `PAYMENT_FAILED` | Error en pago | Rojo | XCircle | El pago ha fallado |
| `PENDING` | Pendiente | Azul | Clock | Pedido pendiente |
| `PAID` | Pagado | Verde | CheckCircle | Pedido pagado |
| `PROCESSING` | Procesando | Morado | Hourglass | Pedido en proceso |
| `SHIPPED` | Enviado | Azul | CheckCircle | Pedido enviado |
| `DELIVERED` | Entregado | Esmeralda | CheckCircle2 | Pedido entregado |
| `CANCELLED` | Cancelado | Gris | XCircle | Pedido cancelado |
| `REFUNDED` | Reembolsado | Naranja | AlertCircle | Pedido reembolsado |

#### Uso Básico

```tsx
import { OrderStatusBadge } from './ui/StatusBadge';

<OrderStatusBadge status="PENDING_PAYMENT" />
<OrderStatusBadge status="SHIPPED" size="lg" />
<OrderStatusBadge status="DELIVERED" showLabel={false} />
```

---

## Funciones Helper

### Booking Helpers

```tsx
import {
  canCancelBooking,
  canRetryBookingPayment,
  canReviewBooking,
} from './ui/StatusBadge';

// ¿Se puede cancelar esta reservación?
if (canCancelBooking(booking.status)) {
  // Mostrar botón de cancelar
}

// ¿Se puede reintentar el pago?
if (canRetryBookingPayment(booking.status)) {
  // Mostrar botón "Reintentar pago"
}

// ¿Se puede dejar reseña?
if (canReviewBooking(booking.status)) {
  // Mostrar botón "Dejar reseña"
}
```

### Order Helpers

```tsx
import {
  canCancelOrder,
  canRetryOrderPayment,
} from './ui/StatusBadge';

// ¿Se puede cancelar este pedido?
if (canCancelOrder(order.status)) {
  // Mostrar botón de cancelar
}

// ¿Se puede reintentar el pago?
if (canRetryOrderPayment(order.status)) {
  // Mostrar botón "Reintentar pago"
}
```

---

## Ejemplo Completo: BookingCard

```tsx
import React, { useState } from 'react';
import { RefreshCw, Star, Clock } from 'lucide-react';
import LoadingButton from './ui/LoadingButton';
import {
  BookingStatusBadge,
  canCancelBooking,
  canRetryBookingPayment,
  canReviewBooking,
} from './ui/StatusBadge';

function BookingCard({ booking, onCancel, onReview, onRetryPayment }) {
  const [isRetrying, setIsRetrying] = useState(false);

  const handleRetryPayment = async (e) => {
    e.stopPropagation();
    setIsRetrying(true);
    try {
      await onRetryPayment();
    } finally {
      setIsRetrying(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header con Badge */}
      <div className="relative">
        <img src={booking.experience.imageUrl} alt={booking.experience.title} />
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm rounded-full p-1">
          <BookingStatusBadge status={booking.status} size="sm" />
        </div>
      </div>

      {/* Contenido */}
      <div className="p-4">
        <h3>{booking.experience.title}</h3>
        {/* ... más info ... */}

        {/* Acciones basadas en estado */}
        <div className="flex gap-2 mt-4">
          {/* PAYMENT_FAILED: Reintentar pago */}
          {canRetryBookingPayment(booking.status) && (
            <LoadingButton
              onClick={handleRetryPayment}
              isLoading={isRetrying}
              className="flex-1 bg-purple-600 text-white rounded-lg py-2.5"
              aria-label="Reintentar pago"
            >
              <RefreshCw className="w-4 h-4" />
              {isRetrying ? 'Procesando...' : 'Reintentar pago'}
            </LoadingButton>
          )}

          {/* PENDING_PAYMENT: Procesando */}
          {booking.status === 'PENDING_PAYMENT' && (
            <div className="flex-1 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg py-2.5 flex items-center justify-center gap-2">
              <Clock className="w-4 h-4 animate-pulse" />
              Procesando pago...
            </div>
          )}

          {/* PENDING o CONFIRMED: Cancelar */}
          {canCancelBooking(booking.status) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCancel();
              }}
              className="flex-1 border border-red-500 text-red-500 rounded-lg py-2.5"
              aria-label="Cancelar reservación"
            >
              Cancelar
            </button>
          )}

          {/* COMPLETED: Dejar reseña */}
          {canReviewBooking(booking.status) && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onReview();
              }}
              className="flex-1 bg-purple-600 text-white rounded-lg py-2.5 flex items-center justify-center gap-2"
              aria-label="Dejar reseña"
            >
              <Star className="w-4 h-4" />
              Dejar reseña
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
```

---

## Accesibilidad

### ARIA Labels

Todos los badges incluyen `role="status"` y `aria-label` descriptivos:

```tsx
<BookingStatusBadge status="PENDING_PAYMENT" />
// Genera: role="status" aria-label="Pago en proceso"

<OrderStatusBadge status="SHIPPED" />
// Genera: role="status" aria-label="Orden enviada"
```

### Iconos

Los iconos usan `aria-hidden="true"` para evitar redundancia:

```tsx
<Clock className="w-4 h-4" aria-hidden="true" />
```

### Contraste de Colores

Todos los estados cumplen con WCAG 2.1 AA:

- **Texto normal**: Ratio mínimo 4.5:1
- **Texto grande**: Ratio mínimo 3:1
- **Dark mode**: Colores ajustados automáticamente

---

## Tamaños

### Small (sm)
```tsx
<BookingStatusBadge status="CONFIRMED" size="sm" />
// text-xs px-2 py-1
```

### Medium (md) - Default
```tsx
<BookingStatusBadge status="CONFIRMED" size="md" />
// text-sm px-3 py-1.5
```

### Large (lg)
```tsx
<BookingStatusBadge status="CONFIRMED" size="lg" />
// text-base px-4 py-2
```

---

## Dark Mode

Los badges se adaptan automáticamente al modo oscuro:

```tsx
// Light mode
bg-green-100 text-green-800 border-green-200

// Dark mode
dark:bg-green-900/30 dark:text-green-400 dark:border-green-800
```

---

## Constantes Disponibles

```tsx
import {
  BOOKING_STATUS_LABELS,
  ORDER_STATUS_LABELS,
} from './ui/StatusBadge';

// Labels en español
BOOKING_STATUS_LABELS['PENDING_PAYMENT'] // "Procesando pago"
ORDER_STATUS_LABELS['SHIPPED']           // "Enviado"
```

---

## Integración con Backend

### Tipos TypeScript

Los tipos están sincronizados con el schema de Prisma:

```typescript
// Backend: prisma/schema.prisma
enum BookingStatus {
  PENDING_PAYMENT
  PAYMENT_FAILED
  PENDING
  CONFIRMED
  CANCELLED
  COMPLETED
}

// Frontend: services/bookings.ts
export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';
```

---

## Flujo de Estados de Pago

### Bookings

```
1. Usuario crea booking
   └─> PENDING_PAYMENT (procesando pago)
       ├─> Pago exitoso → CONFIRMED
       └─> Pago fallido → PAYMENT_FAILED
           └─> Usuario reintenta → PENDING_PAYMENT
               └─> (repite ciclo)

2. CONFIRMED
   ├─> Usuario cancela → CANCELLED
   └─> Experiencia completada → COMPLETED
```

### Orders

```
1. Usuario crea orden
   └─> PENDING_PAYMENT (procesando pago)
       ├─> Pago exitoso → PAID
       └─> Pago fallido → PAYMENT_FAILED
           └─> Usuario reintenta → PENDING_PAYMENT

2. PAID → PROCESSING → SHIPPED → DELIVERED

3. PAID/PROCESSING
   └─> Usuario cancela → CANCELLED
       └─> (opcional) → REFUNDED
```

---

## Mejores Prácticas

### 1. Siempre muestra feedback al usuario

```tsx
{/* MAL: Sin feedback durante PENDING_PAYMENT */}
<BookingStatusBadge status={booking.status} />

{/* BIEN: Mensaje claro de procesamiento */}
{booking.status === 'PENDING_PAYMENT' && (
  <div className="bg-amber-50 p-3 rounded-lg">
    <BookingStatusBadge status={booking.status} />
    <p className="text-sm text-amber-700 mt-2">
      Tu pago está siendo procesado. Recibirás una confirmación en breve.
    </p>
  </div>
)}
```

### 2. Usa helpers para lógica de botones

```tsx
{/* MAL: Lógica duplicada y propensa a errores */}
{(booking.status === 'PENDING' || booking.status === 'CONFIRMED') && (
  <button onClick={onCancel}>Cancelar</button>
)}

{/* BIEN: Helper centralizado */}
{canCancelBooking(booking.status) && (
  <button onClick={onCancel}>Cancelar</button>
)}
```

### 3. Loading states en acciones

```tsx
{/* MAL: Sin loading state */}
<button onClick={onRetryPayment}>Reintentar pago</button>

{/* BIEN: Con loading state */}
<LoadingButton
  onClick={handleRetryPayment}
  isLoading={isRetrying}
>
  {isRetrying ? 'Procesando...' : 'Reintentar pago'}
</LoadingButton>
```

### 4. Acciones stop propagation

```tsx
{/* Si el card es clickeable, detén la propagación en botones */}
<div onClick={onCardClick}>
  <button
    onClick={(e) => {
      e.stopPropagation();
      onCancel();
    }}
  >
    Cancelar
  </button>
</div>
```

---

## Testing

```tsx
import { render, screen } from '@testing-library/react';
import { BookingStatusBadge } from './StatusBadge';

describe('BookingStatusBadge', () => {
  it('muestra el badge de pago pendiente', () => {
    render(<BookingStatusBadge status="PENDING_PAYMENT" />);
    expect(screen.getByRole('status')).toHaveTextContent('Procesando pago');
    expect(screen.getByLabelText('Pago en proceso')).toBeInTheDocument();
  });

  it('muestra el badge de error en pago', () => {
    render(<BookingStatusBadge status="PAYMENT_FAILED" />);
    expect(screen.getByRole('status')).toHaveTextContent('Error en pago');
  });

  it('oculta el label cuando showLabel es false', () => {
    render(<BookingStatusBadge status="CONFIRMED" showLabel={false} />);
    expect(screen.queryByText('Confirmado')).not.toBeInTheDocument();
  });
});
```

---

## Troubleshooting

### Los colores no se ven en dark mode

Asegúrate de tener configurado Tailwind CSS con dark mode:

```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // o 'media'
  // ...
}
```

### TypeScript error en tipos

Verifica que los tipos estén sincronizados:

```bash
# Regenerar tipos de Prisma
cd backend
npx prisma generate

# Actualizar tipos del frontend
cd ..
npm run type-check
```

### Badge no se muestra

Verifica que el componente esté importado correctamente:

```tsx
// ✓ Correcto
import { BookingStatusBadge } from './ui/StatusBadge';

// ✗ Incorrecto
import StatusBadge from './ui/StatusBadge';
```

---

## Próximos Pasos

1. Implementar endpoints de reintento de pago en backend
2. Agregar tracking de eventos de pago en analytics
3. Crear notificaciones push para cambios de estado
4. Agregar tooltips con información detallada de cada estado

---

**Última actualización**: 25 de enero de 2026
**Versión**: 1.0.0
**Autor**: Sistema UX/UI Guelaguetza Connect
