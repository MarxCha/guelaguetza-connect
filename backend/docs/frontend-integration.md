# Integración Frontend: Manejo de Optimistic Locking

## Descripción

Este documento describe cómo integrar el sistema de optimistic locking desde el frontend, manejando correctamente los códigos de respuesta HTTP y proporcionando una buena UX.

---

## Códigos de Respuesta HTTP

| Código | Significado | Acción del Usuario |
|--------|-------------|-------------------|
| **201** | Checkout exitoso | Redirigir a página de pago |
| **400** | Stock insuficiente o datos inválidos | Mostrar error, actualizar carrito |
| **409** | Conflicto de concurrencia | Mostrar mensaje, botón "Reintentar" |
| **500** | Error del servidor | Contactar soporte |

---

## Ejemplo 1: React con Axios

### Hook Personalizado

```typescript
// hooks/useCheckout.ts
import { useState } from 'react';
import axios, { AxiosError } from 'axios';

interface CheckoutData {
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
}

interface CheckoutResponse {
  order: {
    id: string;
    status: string;
    total: string;
  };
  clientSecret?: string;
}

export function useCheckout() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retryable, setRetryable] = useState(false);

  const checkout = async (data: CheckoutData): Promise<CheckoutResponse[] | null> => {
    setLoading(true);
    setError(null);
    setRetryable(false);

    try {
      const response = await axios.post<CheckoutResponse[]>(
        '/api/marketplace/checkout',
        data,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        }
      );

      return response.data;
    } catch (err) {
      const error = err as AxiosError<{ error: string; message: string }>;

      if (error.response?.status === 409) {
        // Conflicto de concurrencia - puede reintentar
        setError('El producto fue actualizado por otro usuario. Por favor, reintenta.');
        setRetryable(true);
      } else if (error.response?.status === 400) {
        // Stock insuficiente o datos inválidos
        setError(error.response.data.message || 'Datos inválidos');
        setRetryable(false);
      } else {
        // Otro error
        setError('Error al procesar tu orden. Por favor, contacta soporte.');
        setRetryable(false);
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  return { checkout, loading, error, retryable };
}
```

### Componente de Checkout

```tsx
// components/Checkout.tsx
import { useState } from 'react';
import { useCheckout } from '@/hooks/useCheckout';
import { loadStripe } from '@stripe/stripe-js';

export function Checkout() {
  const { checkout, loading, error, retryable } = useCheckout();
  const [formData, setFormData] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: 'México',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const orders = await checkout({
      shippingAddress: formData,
    });

    if (orders && orders.length > 0) {
      // Éxito - redirigir a pago
      const { clientSecret } = orders[0];
      if (clientSecret) {
        const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_KEY!);
        // Redirigir a Stripe checkout...
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Checkout</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Formulario de dirección */}
        <input
          type="text"
          placeholder="Calle"
          value={formData.street}
          onChange={(e) => setFormData({ ...formData, street: e.target.value })}
          className="w-full p-2 border rounded"
        />
        {/* ... más campos ... */}

        {/* Mensajes de error */}
        {error && (
          <div className={`p-4 rounded ${retryable ? 'bg-yellow-100 border-yellow-400' : 'bg-red-100 border-red-400'} border`}>
            <p className="text-sm font-medium">{error}</p>
            {retryable && (
              <p className="text-xs mt-2 text-gray-600">
                El carrito se actualizará automáticamente al reintentar.
              </p>
            )}
          </div>
        )}

        {/* Botón de submit */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 rounded font-medium ${
            loading
              ? 'bg-gray-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                  fill="none"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Procesando...
            </span>
          ) : retryable ? (
            'Reintentar Checkout'
          ) : (
            'Continuar al Pago'
          )}
        </button>
      </form>
    </div>
  );
}
```

---

## Ejemplo 2: React Query con Auto-Retry

```typescript
// hooks/useCheckoutMutation.ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';

export function useCheckoutMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CheckoutData) => {
      const response = await axios.post('/api/marketplace/checkout', data);
      return response.data;
    },
    retry: (failureCount, error: any) => {
      // Solo reintentar en caso de 409 (conflicto de concurrencia)
      if (error.response?.status === 409 && failureCount < 2) {
        return true;
      }
      return false;
    },
    retryDelay: (attemptIndex) => {
      // Backoff exponencial: 500ms, 1000ms, 2000ms
      return Math.min(1000 * 2 ** attemptIndex, 2000);
    },
    onSuccess: () => {
      // Invalidar caché del carrito
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });
}
```

### Uso en Componente

```tsx
import { useCheckoutMutation } from '@/hooks/useCheckoutMutation';

export function CheckoutButton() {
  const checkoutMutation = useCheckoutMutation();

  const handleCheckout = () => {
    checkoutMutation.mutate({
      shippingAddress: { /* ... */ },
    });
  };

  return (
    <>
      <button
        onClick={handleCheckout}
        disabled={checkoutMutation.isPending}
      >
        {checkoutMutation.isPending ? 'Procesando...' : 'Checkout'}
      </button>

      {checkoutMutation.isError && (
        <div className="text-red-600 mt-2">
          {checkoutMutation.error.response?.data?.message || 'Error al procesar'}
        </div>
      )}
    </>
  );
}
```

---

## Ejemplo 3: Vue 3 con Composables

```typescript
// composables/useCheckout.ts
import { ref } from 'vue';
import axios from 'axios';

export function useCheckout() {
  const loading = ref(false);
  const error = ref<string | null>(null);
  const isConflict = ref(false);

  const checkout = async (data: CheckoutData) => {
    loading.value = true;
    error.value = null;
    isConflict.value = false;

    try {
      const response = await axios.post('/api/marketplace/checkout', data);
      return response.data;
    } catch (err: any) {
      if (err.response?.status === 409) {
        error.value = 'Conflicto de concurrencia. Por favor, reintenta.';
        isConflict.value = true;
      } else if (err.response?.status === 400) {
        error.value = err.response.data.message;
      } else {
        error.value = 'Error al procesar tu orden.';
      }
      throw err;
    } finally {
      loading.value = false;
    }
  };

  return {
    checkout,
    loading,
    error,
    isConflict,
  };
}
```

---

## Ejemplo 4: Actualización Optimista del UI

```tsx
// Actualizar el carrito inmediatamente, revertir si falla
import { useOptimistic } from 'react';

export function CartCheckout() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [optimisticCart, setOptimisticCart] = useOptimistic(cart);

  const handleCheckout = async () => {
    // Optimistic update: vaciar carrito inmediatamente
    setOptimisticCart([]);

    try {
      await checkout(shippingData);
      // Éxito - confirmar estado
      setCart([]);
    } catch (error) {
      // Error - revertir
      setOptimisticCart(cart);

      if (error.response?.status === 409) {
        // Recargar carrito actualizado desde servidor
        const updatedCart = await fetchCart();
        setCart(updatedCart);
      }
    }
  };

  return (
    <div>
      {optimisticCart.map(item => (
        <CartItem key={item.id} {...item} />
      ))}
    </div>
  );
}
```

---

## Ejemplo 5: Toast Notifications

```tsx
import { toast } from 'sonner'; // o react-hot-toast

const handleCheckout = async () => {
  const toastId = toast.loading('Procesando tu orden...');

  try {
    const orders = await checkout(data);

    toast.success('¡Orden creada exitosamente!', { id: toastId });

    // Redirigir a pago
    router.push(`/checkout/${orders[0].order.id}`);
  } catch (error: any) {
    if (error.response?.status === 409) {
      toast.error(
        'El producto fue actualizado. Por favor, reintenta.',
        {
          id: toastId,
          action: {
            label: 'Reintentar',
            onClick: () => handleCheckout(),
          },
        }
      );
    } else if (error.response?.status === 400) {
      toast.error(error.response.data.message, { id: toastId });
    } else {
      toast.error('Error al procesar tu orden', { id: toastId });
    }
  }
};
```

---

## Ejemplo 6: Manejo de Estado Global (Zustand)

```typescript
// store/checkoutStore.ts
import { create } from 'zustand';
import axios from 'axios';

interface CheckoutStore {
  loading: boolean;
  error: string | null;
  retryable: boolean;
  checkout: (data: CheckoutData) => Promise<void>;
  reset: () => void;
}

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  loading: false,
  error: null,
  retryable: false,

  checkout: async (data) => {
    set({ loading: true, error: null, retryable: false });

    try {
      const response = await axios.post('/api/marketplace/checkout', data);
      // Success - reset state
      set({ loading: false });
      return response.data;
    } catch (err: any) {
      const status = err.response?.status;

      set({
        loading: false,
        error: err.response?.data?.message || 'Error desconocido',
        retryable: status === 409,
      });

      throw err;
    }
  },

  reset: () => set({ loading: false, error: null, retryable: false }),
}));
```

---

## Mejores Prácticas

### 1. **Siempre mostrar feedback al usuario**

```tsx
✅ BIEN:
<button disabled={loading}>
  {loading ? 'Procesando...' : 'Checkout'}
</button>

❌ MAL:
<button>Checkout</button> // Sin indicador de loading
```

### 2. **Diferenciar entre errores recuperables y no recuperables**

```tsx
✅ BIEN:
if (error.status === 409) {
  // Mostrar botón "Reintentar"
} else if (error.status === 400) {
  // Mostrar mensaje de validación
}

❌ MAL:
// Mostrar siempre el mismo mensaje genérico
```

### 3. **Actualizar carrito después de 409**

```tsx
✅ BIEN:
catch (error) {
  if (error.status === 409) {
    await refetchCart(); // Recargar datos actualizados
  }
}

❌ MAL:
// No actualizar el carrito, el usuario ve datos stale
```

### 4. **No hacer retry infinito en el frontend**

```tsx
✅ BIEN:
retry: (failureCount, error) => {
  return error.status === 409 && failureCount < 2;
}

❌ MAL:
retry: true // Retry infinito
```

### 5. **Logging para debugging**

```tsx
✅ BIEN:
catch (error) {
  console.error('Checkout failed:', {
    status: error.response?.status,
    message: error.response?.data?.message,
    timestamp: new Date().toISOString(),
  });
}
```

---

## Testing del Frontend

### Test con Jest + React Testing Library

```typescript
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import { Checkout } from './Checkout';

const server = setupServer(
  rest.post('/api/marketplace/checkout', (req, res, ctx) => {
    return res(ctx.status(409), ctx.json({
      error: 'ConcurrencyError',
      message: 'El producto ha sido modificado',
    }));
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('should show retry button on 409 error', async () => {
  render(<Checkout />);

  const submitButton = screen.getByRole('button', { name: /checkout/i });
  await userEvent.click(submitButton);

  await waitFor(() => {
    expect(screen.getByText(/producto ha sido modificado/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /reintentar/i })).toBeInTheDocument();
  });
});

test('should successfully checkout on retry', async () => {
  let attemptCount = 0;

  server.use(
    rest.post('/api/marketplace/checkout', (req, res, ctx) => {
      attemptCount++;
      if (attemptCount === 1) {
        return res(ctx.status(409), ctx.json({ error: 'ConcurrencyError' }));
      }
      return res(ctx.status(201), ctx.json([{ order: { id: '123' } }]));
    })
  );

  render(<Checkout />);

  // Primer intento - falla
  await userEvent.click(screen.getByRole('button', { name: /checkout/i }));

  // Segundo intento - éxito
  await userEvent.click(screen.getByRole('button', { name: /reintentar/i }));

  await waitFor(() => {
    expect(screen.getByText(/orden creada exitosamente/i)).toBeInTheDocument();
  });
});
```

---

## Flujo UX Recomendado

```
1. Usuario hace click en "Checkout"
   └─> Mostrar spinner + deshabilitar botón

2. Request enviado al backend
   └─> Esperar respuesta...

3a. Respuesta 201 (Éxito)
    └─> Mostrar toast "¡Orden creada!"
    └─> Redirigir a página de pago

3b. Respuesta 409 (Conflicto)
    └─> Mostrar banner amarillo:
        "El producto fue actualizado por otro usuario"
    └─> Botón "Reintentar"
    └─> Auto-recargar carrito

3c. Respuesta 400 (Stock insuficiente)
    └─> Mostrar banner rojo:
        "Stock insuficiente. Disponible: X unidades"
    └─> Actualizar cantidad en carrito
    └─> Deshabilitar botón de checkout

3d. Respuesta 500 (Error servidor)
    └─> Mostrar banner rojo:
        "Error del servidor. Contacta soporte"
    └─> Botón "Contactar Soporte"
```

---

## Resumen

### Frontend DEBE:

- ✅ Manejar respuestas HTTP 201, 400, 409, 500 de forma diferente
- ✅ Mostrar feedback claro al usuario (loading, error, éxito)
- ✅ Proporcionar botón "Reintentar" en caso de 409
- ✅ Recargar carrito después de 409 para mostrar datos actualizados
- ✅ NO hacer retry infinito (máximo 2-3 intentos)
- ✅ Loggear errores para debugging

### Frontend NO DEBE:

- ❌ Asumir que todos los errores son iguales
- ❌ Permitir que el usuario haga checkout con datos stale después de 409
- ❌ Hacer retry automático de errores 400 o 500
- ❌ Mostrar mensajes técnicos al usuario final

---

**Autor:** Claude Code Agent
**Fecha:** 2025-01-25
**Versión del API:** v1.0
