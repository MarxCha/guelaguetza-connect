import React, { useEffect, useRef } from 'react';
import { AlertTriangle, RefreshCw, X, Clock, ShoppingCart, XCircle, RotateCcw } from 'lucide-react';
import Modal, { ModalHeader, ModalBody, ModalFooter } from './Modal';

export type ConcurrencyErrorType =
  | 'booking'
  | 'stock'
  | 'version'
  | 'generic';

interface ConcurrencyErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  type?: ConcurrencyErrorType;
  title?: string;
  message?: string;
  details?: string;
  reloadButtonText?: string;
  cancelButtonText?: string;
  loading?: boolean;
  retryCount?: number;
  maxRetries?: number;
}

const defaultTitles: Record<ConcurrencyErrorType, string> = {
  booking: 'La disponibilidad ha cambiado',
  stock: 'Stock actualizado',
  version: 'Datos modificados',
  generic: 'Informacion actualizada',
};

const defaultMessages: Record<ConcurrencyErrorType, string> = {
  booking: 'El horario que seleccionaste ya no esta disponible. Otro usuario lo reservo mientras realizabas tu reservacion.',
  stock: 'Uno o mas productos de tu carrito ya no tienen suficiente stock disponible.',
  version: 'Los datos fueron modificados por otro usuario. Por favor, recarga para ver la informacion actualizada.',
  generic: 'La informacion ha cambiado desde que cargaste la pagina. Por favor recarga para ver los datos actualizados.',
};

const defaultReloadTexts: Record<ConcurrencyErrorType, string> = {
  booking: 'Ver horarios disponibles',
  stock: 'Actualizar carrito',
  version: 'Recargar datos',
  generic: 'Recargar',
};

const defaultTips: Record<ConcurrencyErrorType, string> = {
  booking: 'Esto puede ocurrir cuando varios usuarios reservan al mismo tiempo. No te preocupes, hay mas horarios disponibles.',
  stock: 'Los inventarios se actualizan en tiempo real. Puedes ajustar las cantidades o elegir otros productos.',
  version: 'Varios usuarios pueden estar trabajando con los mismos datos. Recarga para sincronizar.',
  generic: 'Los datos cambian constantemente. Recarga la pagina para ver la informacion mas reciente.',
};

/**
 * Modal para mostrar errores de concurrencia (409)
 *
 * Se usa cuando:
 * - Un usuario intenta reservar un slot que ya fue tomado
 * - Un usuario intenta comprar un producto sin stock suficiente
 * - Cualquier conflicto de concurrencia con la base de datos
 *
 * UX:
 * - Mensaje claro y no tecnico
 * - Opcion de recargar/reintentar
 * - No frustrante para el usuario
 */
export const ConcurrencyErrorModal: React.FC<ConcurrencyErrorModalProps> = ({
  isOpen,
  onClose,
  onReload,
  type = 'generic',
  title,
  message,
  details,
  reloadButtonText,
  cancelButtonText = 'Cancelar',
  loading = false,
  retryCount,
  maxRetries = 2,
}) => {
  const reloadButtonRef = useRef<HTMLButtonElement>(null);
  const displayTitle = title || defaultTitles[type];
  const displayMessage = message || defaultMessages[type];
  const displayReloadText = reloadButtonText || defaultReloadTexts[type];
  const displayTip = defaultTips[type];

  // Focus en el boton de recargar cuando se abre el modal
  useEffect(() => {
    if (isOpen && reloadButtonRef.current) {
      setTimeout(() => reloadButtonRef.current?.focus(), 100);
    }
  }, [isOpen]);

  const getIcon = () => {
    switch (type) {
      case 'booking':
        return <Clock className="w-6 h-6 text-amber-600" />;
      case 'stock':
        return <ShoppingCart className="w-6 h-6 text-amber-600" />;
      case 'version':
        return <RotateCcw className="w-6 h-6 text-amber-600" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
    }
  };

  const handleReload = () => {
    onReload();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleReload();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlay={!loading}
      closeOnEscape={!loading}
      showClose={!loading}
    >
      <div className="p-6" onKeyDown={handleKeyDown}>
        {/* Icon */}
        <div className="mx-auto w-14 h-14 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mb-4">
          {getIcon()}
        </div>

        {/* Title */}
        <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">
          {displayTitle}
        </h3>

        {/* Message */}
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          {displayMessage}
        </p>

        {/* Details (optional) */}
        {details && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
              {details}
            </p>
          </div>
        )}

        {/* Retry count indicator */}
        {retryCount !== undefined && retryCount > 0 && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex gap-1">
              {[...Array(maxRetries)].map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    i < retryCount
                      ? 'bg-amber-500'
                      : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              Intento {retryCount} de {maxRetries} fallido
            </span>
          </div>
        )}

        {/* Tip */}
        <div className="flex items-start gap-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-6">
          <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            {displayTip}
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            {cancelButtonText}
          </button>
          <button
            ref={reloadButtonRef}
            onClick={handleReload}
            disabled={loading}
            className="flex-1 px-4 py-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Cargando...
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                {displayReloadText}
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};

/**
 * Variante simplificada del modal para casos especificos
 */
export const BookingConflictModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  slotTime?: string;
  loading?: boolean;
  retryCount?: number;
  errorType?: 'SLOT_UNAVAILABLE' | 'CAPACITY_EXCEEDED' | 'VERSION_CONFLICT' | 'UNKNOWN';
  availableSpots?: number;
  requestedSpots?: number;
}> = ({ isOpen, onClose, onReload, slotTime, loading, retryCount, errorType, availableSpots, requestedSpots }) => {
  // Determinar el tipo de modal basado en el tipo de error
  const modalType: ConcurrencyErrorType = errorType === 'VERSION_CONFLICT' ? 'version' : 'booking';

  // Construir detalles basados en el error
  let details = slotTime ? `Horario solicitado: ${slotTime}` : undefined;
  if (errorType === 'CAPACITY_EXCEEDED' && availableSpots !== undefined) {
    details = `${details ? details + '\n' : ''}Lugares disponibles: ${availableSpots}${requestedSpots ? `, solicitados: ${requestedSpots}` : ''}`;
  }

  return (
    <ConcurrencyErrorModal
      isOpen={isOpen}
      onClose={onClose}
      onReload={onReload}
      type={modalType}
      details={details}
      loading={loading}
      retryCount={retryCount}
    />
  );
};

export const StockConflictModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  productName?: string;
  availableStock?: number;
  requestedQuantity?: number;
  loading?: boolean;
  retryCount?: number;
  errorType?: 'INSUFFICIENT_STOCK' | 'PRODUCT_UNAVAILABLE' | 'VERSION_CONFLICT' | 'UNKNOWN';
  affectedItems?: Array<{ productName: string; availableStock: number; requestedQuantity: number }>;
}> = ({
  isOpen,
  onClose,
  onReload,
  productName,
  availableStock,
  requestedQuantity,
  loading,
  retryCount,
  errorType,
  affectedItems
}) => {
  // Determinar el tipo de modal basado en el tipo de error
  const modalType: ConcurrencyErrorType = errorType === 'VERSION_CONFLICT' ? 'version' : 'stock';

  // Construir detalles basados en el error
  let details: string | undefined;

  if (affectedItems && affectedItems.length > 0) {
    // Multiples productos afectados
    details = affectedItems
      .map(item => `${item.productName}: ${item.availableStock} disponibles (solicitados: ${item.requestedQuantity})`)
      .join('\n');
  } else if (productName) {
    details = productName;
    if (availableStock !== undefined) {
      details += ` - ${availableStock} disponibles`;
    }
    if (requestedQuantity !== undefined) {
      details += ` (solicitados: ${requestedQuantity})`;
    }
  }

  return (
    <ConcurrencyErrorModal
      isOpen={isOpen}
      onClose={onClose}
      onReload={onReload}
      type={modalType}
      details={details}
      loading={loading}
      retryCount={retryCount}
    />
  );
};

/**
 * Modal generico para errores de version/optimistic locking
 */
export const VersionConflictModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onReload: () => void;
  entityName?: string;
  loading?: boolean;
  retryCount?: number;
}> = ({ isOpen, onClose, onReload, entityName, loading, retryCount }) => (
  <ConcurrencyErrorModal
    isOpen={isOpen}
    onClose={onClose}
    onReload={onReload}
    type="version"
    title={entityName ? `${entityName} fue modificado` : undefined}
    details={entityName ? `El ${entityName.toLowerCase()} fue actualizado por otro usuario mientras lo editabas.` : undefined}
    loading={loading}
    retryCount={retryCount}
  />
);

export default ConcurrencyErrorModal;
