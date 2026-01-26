import React from 'react';
import { XCircle, RefreshCw, CreditCard, AlertTriangle } from 'lucide-react';
import Modal from './Modal';

interface PaymentErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onRetry: () => void;
  errorMessage?: string;
  bookingId?: string;
  orderId?: string;
  amount?: string;
  retrying?: boolean;
}

/**
 * Modal para mostrar errores de pago (PAYMENT_FAILED)
 *
 * Features:
 * - Mensaje claro y amigable del error de pago
 * - Botón de reintentar pago prominente
 * - Información del monto a pagar
 * - Accesible (ARIA labels)
 *
 * Usage:
 * <PaymentErrorModal
 *   isOpen={showError}
 *   onClose={() => setShowError(false)}
 *   onRetry={handleRetryPayment}
 *   amount="$1,500.00 MXN"
 *   errorMessage="Tu tarjeta fue rechazada"
 * />
 */
export const PaymentErrorModal: React.FC<PaymentErrorModalProps> = ({
  isOpen,
  onClose,
  onRetry,
  errorMessage,
  bookingId,
  orderId,
  amount,
  retrying = false,
}) => {
  const displayMessage = errorMessage || 'No se pudo procesar tu pago. Por favor, verifica tu método de pago e intenta nuevamente.';
  const itemId = bookingId || orderId;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="sm"
      closeOnOverlay={!retrying}
      closeOnEscape={!retrying}
      showClose={!retrying}
    >
      <div className="p-6">
        {/* Icon */}
        <div className="mx-auto w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mb-4">
          <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" aria-hidden="true" />
        </div>

        {/* Title */}
        <h3
          className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2"
          id="payment-error-title"
        >
          Error en el pago
        </h3>

        {/* Message */}
        <p className="text-center text-gray-600 dark:text-gray-400 mb-4">
          {displayMessage}
        </p>

        {/* Amount (if provided) */}
        {amount && (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-1">
              Monto a pagar
            </p>
            <p className="text-xl font-bold text-center text-gray-900 dark:text-white">
              {amount}
            </p>
          </div>
        )}

        {/* Reference ID */}
        {itemId && (
          <p className="text-xs text-gray-400 text-center mb-4">
            Ref: {itemId.slice(-8).toUpperCase()}
          </p>
        )}

        {/* Tips */}
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 mb-6">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" aria-hidden="true" />
            <div className="flex-1">
              <p className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
                Posibles causas:
              </p>
              <ul className="text-xs text-blue-600 dark:text-blue-400 list-disc list-inside space-y-0.5">
                <li>Fondos insuficientes</li>
                <li>Tarjeta vencida o bloqueada</li>
                <li>Error en los datos ingresados</li>
                <li>Problema temporal del banco</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          {/* Primary: Retry Payment */}
          <button
            onClick={onRetry}
            disabled={retrying}
            className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            aria-label="Reintentar pago"
          >
            {retrying ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" aria-hidden="true" />
                Procesando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5" aria-hidden="true" />
                Reintentar pago
              </>
            )}
          </button>

          {/* Secondary: Cancel */}
          <button
            onClick={onClose}
            disabled={retrying}
            className="w-full px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            aria-label="Cerrar"
          >
            Cancelar
          </button>
        </div>

        {/* Help text */}
        <p className="text-xs text-gray-400 text-center mt-4">
          Si el problema persiste, contacta a soporte o intenta con otro método de pago
        </p>
      </div>
    </Modal>
  );
};

export default PaymentErrorModal;
