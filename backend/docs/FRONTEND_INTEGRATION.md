# Frontend Integration - Optimistic Locking

Guía para integrar el manejo de concurrencia en el cliente frontend.

## Manejo de Errores de Concurrencia

### Error Response Format

Cuando ocurre un conflicto de concurrencia, el backend devuelve:

```json
{
  "error": "ConcurrencyError",
  "message": "El horario ha sido modificado por otro usuario. Por favor, recarga e intenta nuevamente.",
  "hint": "El horario ha sido actualizado. Por favor, recarga los datos e intenta nuevamente."
}
```

**HTTP Status Code:** `409 Conflict`

## React/Next.js Integration

### 1. Hook personalizado para crear reservas

```typescript
// hooks/useCreateBooking.ts
import { useState } from 'react';
import { toast } from 'react-hot-toast';

interface CreateBookingData {
  experienceId: string;
  timeSlotId: string;
  guestCount: number;
  specialRequests?: string;
}

export function useCreateBooking() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const createBooking = async (data: CreateBookingData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/bookings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify(data),
      });

      if (response.status === 409) {
        // Conflicto de concurrencia
        const error = await response.json();

        toast.error(
          error.hint || 'El horario ha sido actualizado. Por favor, recarga e intenta nuevamente.',
          {
            duration: 5000,
            icon: '⚠️',
          }
        );

        // Opción 1: Relanzar el error para que el componente maneje la recarga
        throw new ConcurrencyError(error.message);
      }

      if (!response.ok) {
        throw new Error('Error al crear la reservación');
      }

      const result = await response.json();

      toast.success('¡Reservación creada exitosamente!');

      return result;
    } catch (err) {
      if (err instanceof ConcurrencyError) {
        setError('concurrency');
        throw err; // Propagar para manejo específico
      }

      const message = err instanceof Error ? err.message : 'Error desconocido';
      setError(message);
      toast.error(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { createBooking, loading, error };
}

class ConcurrencyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConcurrencyError';
  }
}
```

### 2. Componente de Reserva con Manejo de Concurrencia

```typescript
// components/BookingForm.tsx
'use client';

import { useState } from 'react';
import { useCreateBooking } from '@/hooks/useCreateBooking';
import { useRouter } from 'next/navigation';

interface BookingFormProps {
  experienceId: string;
  timeSlot: {
    id: string;
    date: string;
    startTime: string;
    availableSpots: number;
  };
}

export function BookingForm({ experienceId, timeSlot }: BookingFormProps) {
  const router = useRouter();
  const { createBooking, loading } = useCreateBooking();
  const [guestCount, setGuestCount] = useState(1);
  const [shouldReload, setShouldReload] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const result = await createBooking({
        experienceId,
        timeSlotId: timeSlot.id,
        guestCount,
      });

      // Redirigir a página de pago
      router.push(`/bookings/${result.booking.id}/payment?clientSecret=${result.clientSecret}`);
    } catch (error) {
      if (error instanceof Error && error.name === 'ConcurrencyError') {
        // Mostrar mensaje de recarga
        setShouldReload(true);
      }
    }
  };

  if (shouldReload) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-yellow-800 mb-2">
          Información Actualizada
        </h3>
        <p className="text-yellow-700 mb-4">
          La disponibilidad de este horario ha cambiado.
          Por favor, verifica la información actualizada.
        </p>
        <button
          onClick={() => {
            setShouldReload(false);
            router.refresh(); // Recargar datos del servidor
          }}
          className="bg-yellow-600 text-white px-6 py-2 rounded-lg hover:bg-yellow-700"
        >
          Recargar Disponibilidad
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Número de personas
        </label>
        <input
          type="number"
          min={1}
          max={timeSlot.availableSpots}
          value={guestCount}
          onChange={(e) => setGuestCount(Number(e.target.value))}
          className="w-full border rounded-lg px-4 py-2"
        />
        <p className="text-sm text-gray-500 mt-1">
          {timeSlot.availableSpots} lugares disponibles
        </p>
      </div>

      <button
        type="submit"
        disabled={loading || guestCount > timeSlot.availableSpots}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
      >
        {loading ? 'Procesando...' : 'Reservar Ahora'}
      </button>
    </form>
  );
}
```

### 3. Polling Automático de Disponibilidad

Para experiencias populares, considera implementar polling:

```typescript
// hooks/useTimeSlotAvailability.ts
import { useEffect, useState } from 'react';

interface TimeSlot {
  id: string;
  availableSpots: number;
  version: number;
}

export function useTimeSlotAvailability(
  timeSlotId: string,
  options = { pollingInterval: 10000 } // 10 segundos
) {
  const [timeSlot, setTimeSlot] = useState<TimeSlot | null>(null);
  const [lastVersion, setLastVersion] = useState<number>(0);
  const [hasChanged, setHasChanged] = useState(false);

  useEffect(() => {
    const fetchAvailability = async () => {
      try {
        const response = await fetch(`/api/slots/${timeSlotId}`);
        const data = await response.json();

        if (lastVersion > 0 && data.version !== lastVersion) {
          // La disponibilidad cambió
          setHasChanged(true);
        }

        setTimeSlot(data);
        setLastVersion(data.version);
      } catch (error) {
        console.error('Error fetching availability:', error);
      }
    };

    // Fetch inicial
    fetchAvailability();

    // Poll periódico
    const interval = setInterval(fetchAvailability, options.pollingInterval);

    return () => clearInterval(interval);
  }, [timeSlotId, options.pollingInterval, lastVersion]);

  const acknowledgeChange = () => setHasChanged(false);

  return { timeSlot, hasChanged, acknowledgeChange };
}
```

### 4. Notificación de Cambios en Tiempo Real

```typescript
// components/AvailabilityNotification.tsx
'use client';

import { useTimeSlotAvailability } from '@/hooks/useTimeSlotAvailability';
import { useEffect } from 'react';
import { toast } from 'react-hot-toast';

interface Props {
  timeSlotId: string;
  onUpdate?: (timeSlot: any) => void;
}

export function AvailabilityNotification({ timeSlotId, onUpdate }: Props) {
  const { timeSlot, hasChanged, acknowledgeChange } = useTimeSlotAvailability(timeSlotId);

  useEffect(() => {
    if (hasChanged && timeSlot) {
      toast(
        (t) => (
          <div>
            <p className="font-semibold">Disponibilidad actualizada</p>
            <p className="text-sm">
              Ahora hay {timeSlot.availableSpots} lugares disponibles
            </p>
            <button
              onClick={() => {
                acknowledgeChange();
                onUpdate?.(timeSlot);
                toast.dismiss(t.id);
              }}
              className="mt-2 text-blue-600 text-sm font-medium"
            >
              Actualizar
            </button>
          </div>
        ),
        {
          duration: 5000,
          icon: '🔄',
        }
      );
    }
  }, [hasChanged, timeSlot, acknowledgeChange, onUpdate]);

  return null; // Este componente solo muestra notificaciones
}
```

## Estrategias de UX

### 1. Mostrar Indicador de Popularidad

```typescript
function TimeSlotCard({ slot }: { slot: TimeSlot }) {
  const remainingSpots = slot.availableSpots;
  const totalCapacity = slot.capacity;
  const popularity = ((totalCapacity - remainingSpots) / totalCapacity) * 100;

  return (
    <div className="border rounded-lg p-4">
      <div className="flex justify-between items-center mb-2">
        <span>{slot.startTime} - {slot.endTime}</span>
        <span className="text-sm text-gray-600">
          {remainingSpots} disponibles
        </span>
      </div>

      {/* Barra de popularidad */}
      <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
        <div
          className={`h-2 rounded-full ${
            popularity > 80 ? 'bg-red-500' :
            popularity > 50 ? 'bg-yellow-500' :
            'bg-green-500'
          }`}
          style={{ width: `${popularity}%` }}
        />
      </div>

      {popularity > 80 && (
        <p className="text-sm text-red-600 flex items-center gap-1">
          <span>🔥</span> ¡Muy solicitado! Reserva pronto
        </p>
      )}
    </div>
  );
}
```

### 2. Confirmación Antes de Reservar

```typescript
function BookingConfirmationModal({ onConfirm, timeSlot }: Props) {
  return (
    <Dialog>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-4">Confirmar Reservación</h2>

        <div className="bg-blue-50 border border-blue-200 rounded p-4 mb-4">
          <p className="text-sm text-blue-800">
            ℹ️ Esta reservación se procesará inmediatamente.
            Si hay alta demanda, es posible que necesites intentar nuevamente.
          </p>
        </div>

        <div className="space-y-2 mb-6">
          <p><strong>Fecha:</strong> {timeSlot.date}</p>
          <p><strong>Horario:</strong> {timeSlot.startTime} - {timeSlot.endTime}</p>
          <p><strong>Disponibles:</strong> {timeSlot.availableSpots} lugares</p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onConfirm}
            className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
          >
            Confirmar y Pagar
          </button>
          <button
            onClick={onClose}
            className="flex-1 border border-gray-300 py-2 rounded hover:bg-gray-50"
          >
            Cancelar
          </button>
        </div>
      </div>
    </Dialog>
  );
}
```

### 3. Retry Automático en el Cliente (Opcional)

```typescript
async function createBookingWithRetry(
  data: CreateBookingData,
  maxRetries = 2
): Promise<BookingResult> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await createBooking(data);
    } catch (error) {
      if (
        error instanceof Error &&
        error.name === 'ConcurrencyError' &&
        attempt < maxRetries
      ) {
        // Esperar un momento antes de reintentar
        await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1)));

        // Recargar disponibilidad antes de reintentar
        const updatedSlot = await fetchTimeSlot(data.timeSlotId);

        if (updatedSlot.availableSpots < data.guestCount) {
          throw new Error('Ya no hay suficientes lugares disponibles');
        }

        // Continuar al siguiente intento
        continue;
      }

      // Si no es un error de concurrencia o se acabaron los intentos, lanzar
      throw error;
    }
  }

  throw new Error('No se pudo completar la reservación después de varios intentos');
}
```

## Best Practices

### ✓ DO

1. **Mostrar mensajes claros** cuando hay conflictos de concurrencia
2. **Ofrecer botón de recarga** para actualizar la disponibilidad
3. **Implementar polling** en páginas de alta demanda
4. **Mostrar indicadores de popularidad** para crear urgencia apropiada
5. **Validar disponibilidad** antes de proceder al pago

### ✗ DON'T

1. **No hacer retry infinito** en el cliente
2. **No ocultar errores de concurrencia** al usuario
3. **No hacer polling demasiado frecuente** (< 5 segundos)
4. **No proceder con reservas** si la disponibilidad cambió
5. **No mostrar información desactualizada** sin advertencia

## Testing

### Simular Conflictos de Concurrencia

```typescript
// Para testing, puedes simular un error 409
import { rest } from 'msw';

export const handlers = [
  rest.post('/api/bookings', async (req, res, ctx) => {
    // Simular conflicto de concurrencia
    return res(
      ctx.status(409),
      ctx.json({
        error: 'ConcurrencyError',
        message: 'El horario ha sido modificado',
        hint: 'Por favor, recarga e intenta nuevamente.',
      })
    );
  }),
];
```

### Test de Componente

```typescript
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BookingForm } from '@/components/BookingForm';

test('shows reload message on concurrency error', async () => {
  // Mock API con error 409
  fetchMock.mockResponseOnce(JSON.stringify({
    error: 'ConcurrencyError',
    message: 'Conflicto detectado',
  }), { status: 409 });

  render(<BookingForm experienceId="123" timeSlot={mockTimeSlot} />);

  fireEvent.click(screen.getByText('Reservar Ahora'));

  await waitFor(() => {
    expect(screen.getByText(/Información Actualizada/i)).toBeInTheDocument();
    expect(screen.getByText(/Recargar Disponibilidad/i)).toBeInTheDocument();
  });
});
```

## Monitoreo

### Métricas del Cliente

```typescript
// analytics.ts
export function trackConcurrencyError(context: {
  experienceId: string;
  timeSlotId: string;
  attemptNumber: number;
}) {
  // Google Analytics
  gtag('event', 'booking_concurrency_error', {
    experience_id: context.experienceId,
    time_slot_id: context.timeSlotId,
    attempt_number: context.attemptNumber,
  });

  // Custom logging
  logger.warn('Concurrency error in booking', context);
}
```

Llamar cuando ocurra un error:

```typescript
catch (error) {
  if (error instanceof ConcurrencyError) {
    trackConcurrencyError({
      experienceId,
      timeSlotId,
      attemptNumber: currentAttempt,
    });
  }
}
```

## Recursos Adicionales

- [React Error Boundaries](https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary)
- [SWR for Data Fetching](https://swr.vercel.app/)
- [React Query](https://tanstack.com/query/latest)
