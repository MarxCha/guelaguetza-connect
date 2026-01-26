import { useState, useCallback, useRef } from 'react';
import { createBooking, confirmBooking, Booking, CreateBookingInput } from '../services/bookings';
import { ApiError } from '../services/api';

export interface ConcurrencyError {
  type: 'SLOT_UNAVAILABLE' | 'CAPACITY_EXCEEDED' | 'VERSION_CONFLICT' | 'UNKNOWN';
  message: string;
  slotId?: string;
  availableSpots?: number;
  requestedSpots?: number;
}

export interface UseCreateBookingResult {
  loading: boolean;
  error: ConcurrencyError | null;
  shouldReload: boolean;
  booking: Booking | null;
  createBookingWithRetry: (input: CreateBookingInput) => Promise<Booking | null>;
  reloadAvailability: () => void;
  clearError: () => void;
  retryCount: number;
  isConflictError: boolean;
}

interface ApiErrorResponse {
  message?: string;
  code?: string;
  error?: string;
  availableSpots?: number;
  currentVersion?: number;
  requestedSpots?: number;
  slotId?: string;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const CONFLICT_STATUS_CODE = 409;

/**
 * Hook para crear reservaciones con manejo de errores de concurrencia (409)
 *
 * Features:
 * - Detecta errores 409 Conflict
 * - Retry automatico (maximo 2 intentos)
 * - Estado shouldReload para indicar que se deben recargar los slots
 * - Mensajes de error claros para el usuario
 */
export function useCreateBooking(
  onReloadSlots?: () => Promise<void>
): UseCreateBookingResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ConcurrencyError | null>(null);
  const [shouldReload, setShouldReload] = useState(false);
  const [booking, setBooking] = useState<Booking | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const parseConcurrencyError = (
    errorResponse: ApiErrorResponse,
    statusCode: number
  ): ConcurrencyError | null => {
    if (statusCode !== CONFLICT_STATUS_CODE) return null;

    const message = errorResponse.message || errorResponse.error || '';
    const lowerMessage = message.toLowerCase();

    // Detectar conflicto de version (optimistic locking)
    if (
      lowerMessage.includes('version') ||
      lowerMessage.includes('modified') ||
      lowerMessage.includes('concurrent') ||
      errorResponse.code === 'VERSION_CONFLICT'
    ) {
      return {
        type: 'VERSION_CONFLICT',
        message: 'El horario fue modificado mientras realizabas tu reservacion. Por favor, vuelve a seleccionar un horario.',
        slotId: errorResponse.slotId,
      };
    }

    // Detectar slot no disponible
    if (
      lowerMessage.includes('slot') ||
      lowerMessage.includes('disponible') ||
      lowerMessage.includes('available') ||
      lowerMessage.includes('taken') ||
      lowerMessage.includes('ocupado')
    ) {
      return {
        type: 'SLOT_UNAVAILABLE',
        message: 'Este horario ya no esta disponible. Otro usuario lo reservo antes.',
        slotId: errorResponse.slotId,
      };
    }

    // Detectar capacidad excedida
    if (
      lowerMessage.includes('capacity') ||
      lowerMessage.includes('capacidad') ||
      lowerMessage.includes('spots') ||
      lowerMessage.includes('lugares') ||
      lowerMessage.includes('insufficient')
    ) {
      const availableSpots = errorResponse.availableSpots;
      const requestedSpots = errorResponse.requestedSpots;

      let detailMessage = 'No hay suficientes lugares disponibles.';
      if (availableSpots !== undefined && requestedSpots !== undefined) {
        detailMessage = `Solicitaste ${requestedSpots} lugares, pero solo quedan ${availableSpots} disponibles.`;
      } else if (availableSpots !== undefined) {
        detailMessage = `Solo quedan ${availableSpots} lugares disponibles.`;
      }

      return {
        type: 'CAPACITY_EXCEEDED',
        message: detailMessage,
        slotId: errorResponse.slotId,
        availableSpots,
        requestedSpots,
      };
    }

    // Error generico de concurrencia
    return {
      type: 'UNKNOWN',
      message: 'La disponibilidad ha cambiado. Por favor recarga y vuelve a intentar.',
      slotId: errorResponse.slotId,
    };
  };

  const attemptBooking = async (
    input: CreateBookingInput,
    attempt: number
  ): Promise<Booking | null> => {
    try {
      const result = await createBooking(input);

      // Auto-confirmar para demo (en produccion se usaria Stripe)
      if (result.booking && result.booking.status === 'PENDING') {
        try {
          await confirmBooking(result.booking.id);
        } catch {
          // Si falla la confirmacion, igual retornamos el booking
          console.warn('Error confirming booking, returning pending booking');
        }
      }

      return result.booking;
    } catch (err) {
      // Verificar si es un ApiError con status 409
      if (err instanceof ApiError && err.isConcurrencyError()) {
        const errorResponse: ApiErrorResponse = {
          message: err.message,
          code: err.code,
          ...err.details,
        };

        const concurrencyError = parseConcurrencyError(errorResponse, 409);

        if (concurrencyError && attempt < MAX_RETRIES) {
          // Esperar antes de reintentar
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));

          // Recargar disponibilidad antes del retry
          if (onReloadSlots) {
            try {
              await onReloadSlots();
            } catch {
              // Continuar aunque falle la recarga
            }
          }

          setRetryCount(attempt + 1);
          return attemptBooking(input, attempt + 1);
        }

        // Ya no mas retries, mostrar error
        if (concurrencyError) {
          setError(concurrencyError);
          setShouldReload(true);
        }

        return null;
      }

      // Verificar si es un error generico que podria ser 409
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase();
        if (
          errorMessage.includes('conflict') ||
          errorMessage.includes('slot') ||
          errorMessage.includes('disponible') ||
          errorMessage.includes('capacity')
        ) {
          const concurrencyError = parseConcurrencyError(
            { message: err.message },
            409
          );

          if (concurrencyError) {
            setError(concurrencyError);
            setShouldReload(true);
            return null;
          }
        }
      }

      // Otro tipo de error, no es concurrencia
      throw err;
    }
  };

  const createBookingWithRetry = useCallback(
    async (input: CreateBookingInput): Promise<Booking | null> => {
      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setShouldReload(false);
      setBooking(null);
      setRetryCount(0);

      try {
        const result = await attemptBooking(input, 0);

        if (result) {
          setBooking(result);
          return result;
        }

        return null;
      } catch (err) {
        // Error no relacionado con concurrencia
        const message = err instanceof Error ? err.message : 'Error al crear la reservacion';
        setError({
          type: 'UNKNOWN',
          message,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [onReloadSlots]
  );

  const reloadAvailability = useCallback(() => {
    setShouldReload(false);
    setError(null);
    if (onReloadSlots) {
      onReloadSlots();
    }
  }, [onReloadSlots]);

  const clearError = useCallback(() => {
    setError(null);
    setShouldReload(false);
  }, []);

  // Computed property para verificar si es error de concurrencia
  const isConflictError = error !== null && shouldReload;

  return {
    loading,
    error,
    shouldReload,
    booking,
    createBookingWithRetry,
    reloadAvailability,
    clearError,
    retryCount,
    isConflictError,
  };
}

/**
 * Verifica si un error es de tipo 409 Conflict
 */
export function isConcurrencyError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isConcurrencyError();
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('conflict') ||
      message.includes('version') ||
      message.includes('concurrent') ||
      message.includes('slot') ||
      message.includes('capacity')
    );
  }
  return false;
}

export default useCreateBooking;
