import { useState, useCallback, useRef } from 'react';
import { checkout, ShippingAddress, Order } from '../services/marketplace';
import { ApiError } from '../services/api';

export interface StockError {
  type: 'INSUFFICIENT_STOCK' | 'PRODUCT_UNAVAILABLE' | 'VERSION_CONFLICT' | 'UNKNOWN';
  message: string;
  productId?: string;
  productName?: string;
  availableStock?: number;
  requestedQuantity?: number;
  affectedItems?: Array<{
    productId: string;
    productName: string;
    availableStock: number;
    requestedQuantity: number;
  }>;
}

export interface UseCreateOrderResult {
  loading: boolean;
  error: StockError | null;
  shouldReload: boolean;
  orders: Order[] | null;
  createOrderWithRetry: (shippingAddress: ShippingAddress) => Promise<Order[] | null>;
  reloadCart: () => void;
  clearError: () => void;
  retryCount: number;
  isConflictError: boolean;
}

interface ApiErrorResponse {
  message?: string;
  code?: string;
  error?: string;
  productId?: string;
  productName?: string;
  availableStock?: number;
  requestedQuantity?: number;
  items?: Array<{
    productId: string;
    productName: string;
    availableStock: number;
    requestedQuantity: number;
  }>;
}

const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 500;
const CONFLICT_STATUS_CODE = 409;

/**
 * Hook para crear ordenes con manejo de errores de concurrencia (409)
 *
 * Features:
 * - Detecta errores 409 por stock insuficiente
 * - Retry automatico (maximo 2 intentos)
 * - Estado shouldReload para indicar que se debe recargar el carrito
 * - Mensajes de error claros con informacion del producto
 */
export function useCreateOrder(
  onReloadCart?: () => Promise<void>
): UseCreateOrderResult {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<StockError | null>(null);
  const [shouldReload, setShouldReload] = useState(false);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const abortControllerRef = useRef<AbortController | null>(null);

  const parseStockError = (
    errorResponse: ApiErrorResponse,
    statusCode: number
  ): StockError | null => {
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
        message: 'El inventario fue modificado mientras procesabas tu pedido. Por favor, revisa tu carrito.',
        productId: errorResponse.productId,
        productName: errorResponse.productName,
      };
    }

    // Si hay multiples items con problemas de stock
    if (errorResponse.items && errorResponse.items.length > 0) {
      const items = errorResponse.items;

      if (items.length === 1) {
        const item = items[0];
        return {
          type: 'INSUFFICIENT_STOCK',
          message: `El producto "${item.productName}" solo tiene ${item.availableStock} unidades disponibles, pero solicitaste ${item.requestedQuantity}.`,
          productId: item.productId,
          productName: item.productName,
          availableStock: item.availableStock,
          requestedQuantity: item.requestedQuantity,
          affectedItems: items,
        };
      }

      // Multiples productos afectados
      const productNames = items.map(i => i.productName).join(', ');
      return {
        type: 'INSUFFICIENT_STOCK',
        message: `Stock insuficiente para los siguientes productos: ${productNames}. Por favor ajusta las cantidades.`,
        affectedItems: items,
      };
    }

    // Producto individual con stock insuficiente
    if (errorResponse.productId || errorResponse.productName) {
      const availableStock = errorResponse.availableStock;
      const requestedQuantity = errorResponse.requestedQuantity;

      let detailMessage = `Stock insuficiente para "${errorResponse.productName || 'el producto'}".`;
      if (availableStock !== undefined && requestedQuantity !== undefined) {
        detailMessage = `"${errorResponse.productName}" solo tiene ${availableStock} unidades, pero solicitaste ${requestedQuantity}.`;
      } else if (availableStock !== undefined) {
        detailMessage += ` Solo quedan ${availableStock} unidades.`;
      }

      return {
        type: 'INSUFFICIENT_STOCK',
        message: detailMessage,
        productId: errorResponse.productId,
        productName: errorResponse.productName,
        availableStock,
        requestedQuantity,
      };
    }

    // Detectar por mensaje de stock
    if (
      lowerMessage.includes('stock') ||
      lowerMessage.includes('inventory') ||
      lowerMessage.includes('inventario') ||
      lowerMessage.includes('insufficient')
    ) {
      return {
        type: 'INSUFFICIENT_STOCK',
        message: 'Uno o mas productos no tienen suficiente stock. Por favor revisa tu carrito.',
      };
    }

    // Producto no disponible
    if (
      lowerMessage.includes('unavailable') ||
      lowerMessage.includes('no disponible') ||
      lowerMessage.includes('agotado') ||
      lowerMessage.includes('sold out')
    ) {
      return {
        type: 'PRODUCT_UNAVAILABLE',
        message: 'Uno o mas productos ya no estan disponibles para la venta.',
      };
    }

    // Error generico de concurrencia
    return {
      type: 'UNKNOWN',
      message: 'La disponibilidad de los productos ha cambiado. Por favor revisa tu carrito.',
    };
  };

  const attemptCheckout = async (
    shippingAddress: ShippingAddress,
    attempt: number
  ): Promise<Order[] | null> => {
    try {
      const result = await checkout(shippingAddress);
      return result.map(r => r.order);
    } catch (err) {
      // Verificar si es un ApiError con status 409
      if (err instanceof ApiError && err.isConcurrencyError()) {
        const errorResponse: ApiErrorResponse = {
          message: err.message,
          code: err.code,
          ...err.details,
        };

        const stockError = parseStockError(errorResponse, 409);

        if (stockError && attempt < MAX_RETRIES) {
          // Esperar antes de reintentar
          await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY_MS * (attempt + 1)));

          // Recargar carrito antes del retry
          if (onReloadCart) {
            try {
              await onReloadCart();
            } catch {
              // Continuar aunque falle la recarga
            }
          }

          setRetryCount(attempt + 1);
          return attemptCheckout(shippingAddress, attempt + 1);
        }

        // Ya no mas retries, mostrar error
        if (stockError) {
          setError(stockError);
          setShouldReload(true);
        }

        return null;
      }

      // Verificar si es un error generico que podria ser 409
      if (err instanceof Error) {
        const errorMessage = err.message.toLowerCase();
        if (
          errorMessage.includes('stock') ||
          errorMessage.includes('inventory') ||
          errorMessage.includes('disponible') ||
          errorMessage.includes('conflict')
        ) {
          const stockError = parseStockError(
            { message: err.message },
            409
          );

          if (stockError) {
            setError(stockError);
            setShouldReload(true);
            return null;
          }
        }
      }

      // Otro tipo de error, no es concurrencia
      throw err;
    }
  };

  const createOrderWithRetry = useCallback(
    async (shippingAddress: ShippingAddress): Promise<Order[] | null> => {
      // Cancelar request anterior si existe
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setLoading(true);
      setError(null);
      setShouldReload(false);
      setOrders(null);
      setRetryCount(0);

      try {
        const result = await attemptCheckout(shippingAddress, 0);

        if (result) {
          setOrders(result);
          return result;
        }

        return null;
      } catch (err) {
        // Error no relacionado con concurrencia
        const message = err instanceof Error ? err.message : 'Error al procesar el pedido';
        setError({
          type: 'UNKNOWN',
          message,
        });
        return null;
      } finally {
        setLoading(false);
      }
    },
    [onReloadCart]
  );

  const reloadCart = useCallback(() => {
    setShouldReload(false);
    setError(null);
    if (onReloadCart) {
      onReloadCart();
    }
  }, [onReloadCart]);

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
    orders,
    createOrderWithRetry,
    reloadCart,
    clearError,
    retryCount,
    isConflictError,
  };
}

/**
 * Verifica si un error es de tipo 409 Conflict para stock
 */
export function isStockConflictError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.isConcurrencyError();
  }
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    return (
      message.includes('stock') ||
      message.includes('inventory') ||
      message.includes('conflict') ||
      message.includes('version') ||
      message.includes('unavailable')
    );
  }
  return false;
}

export default useCreateOrder;
