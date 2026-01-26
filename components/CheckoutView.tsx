import React, { useState, useEffect, useCallback } from 'react';
import {
  ChevronLeft,
  MapPin,
  CreditCard,
  CheckCircle,
  Package,
  Truck,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import {
  getCart,
  clearCart,
  Cart,
  ShippingAddress,
  formatPrice,
} from '../services/marketplace';
import LoadingSpinner from './ui/LoadingSpinner';
import { useToast } from './ui/Toast';
import { StockConflictModal } from './ui/ConcurrencyErrorModal';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { ViewState } from '../types';

interface CheckoutViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

type CheckoutStep = 'shipping' | 'payment' | 'confirmation';

export default function CheckoutView({ onNavigate, onBack }: CheckoutViewProps) {
  const toast = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<CheckoutStep>('shipping');
  const [orderComplete, setOrderComplete] = useState(false);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [cartReloading, setCartReloading] = useState(false);

  const [shipping, setShipping] = useState<ShippingAddress>({
    name: '',
    street: '',
    city: '',
    state: 'Oaxaca',
    postalCode: '',
    phone: '',
    notes: '',
  });

  const [paymentMethod, setPaymentMethod] = useState<'card' | 'oxxo' | 'transfer'>('card');

  const loadCart = useCallback(async () => {
    try {
      setCartReloading(true);
      const data = await getCart();
      setCart(data);
    } catch (error) {
      console.error('Error loading cart:', error);
      toast.error('Error', 'No se pudo cargar el carrito');
    } finally {
      setCartReloading(false);
    }
  }, [toast]);

  // Hook para crear ordenes con manejo de errores 409
  const {
    loading: processing,
    error: orderError,
    shouldReload,
    createOrderWithRetry,
    reloadCart,
    clearError,
    retryCount,
  } = useCreateOrder(loadCart);

  useEffect(() => {
    const initCart = async () => {
      try {
        setLoading(true);
        const data = await getCart();
        setCart(data);

        // Pre-fill demo data
        setShipping(prev => ({
          ...prev,
          name: 'Usuario Demo',
          phone: '951 123 4567',
        }));
      } catch (error) {
        console.error('Error loading cart:', error);
      } finally {
        setLoading(false);
      }
    };
    initCart();
  }, []);

  // Mostrar modal de conflicto cuando hay error de stock
  useEffect(() => {
    if (orderError && shouldReload) {
      setShowConflictModal(true);
    }
  }, [orderError, shouldReload]);

  // Mostrar toast cuando hay retry automatico
  useEffect(() => {
    if (retryCount > 0 && retryCount <= 2) {
      toast.warning(
        'Verificando stock...',
        `Intento ${retryCount} de 2. Actualizando disponibilidad.`
      );
    }
  }, [retryCount, toast]);

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
  };

  const handlePaymentSubmit = async () => {
    const orders = await createOrderWithRetry(shipping);

    if (orders && orders.length > 0) {
      // Orden exitosa - limpiar carrito
      await clearCart();

      toast.success(
        'Pedido confirmado',
        `Tu pedido ha sido procesado correctamente.`
      );

      setStep('confirmation');
      setOrderComplete(true);
    }
    // Si hay error de stock, el hook se encarga de mostrar el modal
  };

  const handleConflictReload = () => {
    setShowConflictModal(false);
    clearError();
    reloadCart();
    // Regresar al paso de shipping para que el usuario revise su carrito
    setStep('shipping');
  };

  const handleConflictClose = () => {
    setShowConflictModal(false);
    clearError();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full bg-white dark:bg-gray-900">
        <LoadingSpinner size="lg" text="Preparando checkout..." />
      </div>
    );
  }

  if (!cart || cart.items.length === 0) {
    return (
      <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 items-center justify-center p-4 sm:p-6">
        <AlertCircle className="w-12 sm:w-16 h-12 sm:h-16 text-gray-300 dark:text-gray-600 mb-4" aria-hidden="true" />
        <p className="text-gray-500 dark:text-gray-400 text-base sm:text-lg mb-4 text-center">No hay productos en el carrito</p>
        <button
          onClick={() => onNavigate(ViewState.TIENDA)}
          className="px-6 py-3 bg-amber-500 text-white rounded-lg font-medium min-h-[44px] hover:bg-amber-600 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
        >
          Ir a la tienda
        </button>
      </div>
    );
  }

  if (orderComplete) {
    return (
      <div className="flex flex-col h-full bg-white dark:bg-gray-900 items-center justify-center p-4 sm:p-6 text-center">
        <div className="w-16 sm:w-20 h-16 sm:h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4 sm:mb-6">
          <CheckCircle className="w-10 sm:w-12 h-10 sm:h-12 text-green-500 dark:text-green-400" aria-hidden="true" />
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Pedido Confirmado
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mb-2 text-sm sm:text-base">
          Orden #GC-{Math.random().toString(36).substring(2, 8).toUpperCase()}
        </p>
        <p className="text-gray-600 dark:text-gray-300 mb-6 sm:mb-8 max-w-sm text-sm sm:text-base px-2">
          Recibiras un correo con los detalles de tu pedido. Los artesanos se pondran en contacto contigo pronto.
        </p>

        <div className="w-full max-w-sm space-y-3">
          <div className="flex items-center gap-3 p-3 sm:p-4 bg-amber-50 dark:bg-amber-900/20 rounded-xl">
            <Truck className="w-5 sm:w-6 h-5 sm:h-6 text-amber-600 dark:text-amber-400 flex-shrink-0" aria-hidden="true" />
            <div className="text-left">
              <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Tiempo estimado</p>
              <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">5-10 dias habiles</p>
            </div>
          </div>

          <button
            onClick={() => onNavigate(ViewState.TIENDA)}
            className="w-full py-3 sm:py-4 bg-amber-500 text-white rounded-lg font-medium min-h-[44px] hover:bg-amber-600 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2"
          >
            Seguir comprando
          </button>

          <button
            onClick={() => onNavigate(ViewState.HOME)}
            className="w-full py-3 sm:py-4 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium min-h-[44px] hover:bg-gray-50 dark:hover:bg-gray-800 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:ring-offset-2"
          >
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  const shippingCost = cart.subtotal >= 1500 ? 0 : 150;
  const total = cart.subtotal + shippingCost;

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3 sm:p-4 pt-10 sm:pt-12">
        <div className="flex items-center gap-2 sm:gap-3 max-w-2xl mx-auto">
          <button
            onClick={() => step === 'shipping' ? onBack() : setStep('shipping')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full min-w-[44px] min-h-[44px] flex items-center justify-center transition-colors focus-visible:ring-2 focus-visible:ring-amber-500"
            aria-label={step === 'shipping' ? 'Volver al carrito' : 'Volver a datos de envio'}
          >
            <ChevronLeft className="w-5 sm:w-6 h-5 sm:h-6 text-gray-600 dark:text-gray-300" />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Checkout</h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {step === 'shipping' && 'Datos de envio'}
              {step === 'payment' && 'Metodo de pago'}
            </p>
          </div>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-2 mt-3 sm:mt-4 max-w-2xl mx-auto" role="progressbar" aria-valuenow={step === 'shipping' ? 50 : 100} aria-valuemin={0} aria-valuemax={100}>
          <div className={`flex-1 h-1 rounded transition-colors ${step === 'shipping' || step === 'payment' ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
          <div className={`flex-1 h-1 rounded transition-colors ${step === 'payment' ? 'bg-amber-500' : 'bg-gray-200 dark:bg-gray-700'}`} />
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-4">
        <div className="max-w-2xl mx-auto">
        {step === 'shipping' && (
          <form onSubmit={handleShippingSubmit} className="space-y-3 sm:space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <MapPin className="w-4 sm:w-5 h-4 sm:h-5 text-amber-500" aria-hidden="true" />
                Direccion de envio
              </h2>

              <div className="space-y-3">
                <div>
                  <label htmlFor="name" className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Nombre completo</label>
                  <input
                    id="name"
                    type="text"
                    required
                    value={shipping.name}
                    onChange={(e) => setShipping({ ...shipping, name: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base min-h-[44px]"
                    placeholder="Tu nombre"
                  />
                </div>

                <div>
                  <label htmlFor="street" className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Direccion</label>
                  <input
                    id="street"
                    type="text"
                    required
                    value={shipping.street}
                    onChange={(e) => setShipping({ ...shipping, street: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base min-h-[44px]"
                    placeholder="Calle, numero, colonia"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <div>
                    <label htmlFor="city" className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Ciudad</label>
                    <input
                      id="city"
                      type="text"
                      required
                      value={shipping.city}
                      onChange={(e) => setShipping({ ...shipping, city: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base min-h-[44px]"
                      placeholder="Ciudad"
                    />
                  </div>
                  <div>
                    <label htmlFor="postalCode" className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">C.P.</label>
                    <input
                      id="postalCode"
                      type="text"
                      required
                      value={shipping.postalCode}
                      onChange={(e) => setShipping({ ...shipping, postalCode: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base min-h-[44px]"
                      placeholder="68000"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="phone" className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Telefono</label>
                  <input
                    id="phone"
                    type="tel"
                    required
                    value={shipping.phone}
                    onChange={(e) => setShipping({ ...shipping, phone: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base min-h-[44px]"
                    placeholder="951 123 4567"
                  />
                </div>

                <div>
                  <label htmlFor="notes" className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Notas (opcional)</label>
                  <textarea
                    id="notes"
                    value={shipping.notes}
                    onChange={(e) => setShipping({ ...shipping, notes: e.target.value })}
                    className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base resize-none"
                    placeholder="Instrucciones especiales de entrega"
                    rows={2}
                  />
                </div>
              </div>
            </div>

            {/* Order Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <Package className="w-4 sm:w-5 h-4 sm:h-5 text-amber-500" aria-hidden="true" />
                Resumen del pedido
              </h2>

              <div className="space-y-2 sm:space-y-3">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600 dark:text-gray-400 flex-1 pr-2 truncate">
                      {item.product.name} x{item.quantity}
                    </span>
                    <span className="font-medium text-gray-900 dark:text-white flex-shrink-0">
                      {formatPrice(parseFloat(item.product.price) * item.quantity)}
                    </span>
                  </div>
                ))}

                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 sm:pt-3 space-y-1.5 sm:space-y-2">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                    <span className="text-gray-900 dark:text-white">{formatPrice(cart.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-gray-600 dark:text-gray-400">Envio</span>
                    <span className={shippingCost === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'}>
                      {shippingCost === 0 ? 'Gratis' : formatPrice(shippingCost)}
                    </span>
                  </div>
                  {cart.subtotal < 1500 && (
                    <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      Envio gratis en compras mayores a $1,500
                    </p>
                  )}
                </div>

                <div className="border-t border-gray-200 dark:border-gray-700 pt-2 sm:pt-3 flex justify-between">
                  <span className="font-bold text-gray-900 dark:text-white text-sm sm:text-base">Total</span>
                  <span className="font-bold text-amber-600 dark:text-amber-400 text-sm sm:text-base">{formatPrice(total)}</span>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full py-3 sm:py-4 bg-amber-500 text-white rounded-lg font-medium min-h-[44px] hover:bg-amber-600 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 text-sm sm:text-base"
            >
              Continuar al pago
            </button>
          </form>
        )}

        {step === 'payment' && (
          <div className="space-y-3 sm:space-y-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4">
              <h2 className="font-bold text-gray-900 dark:text-white mb-3 sm:mb-4 flex items-center gap-2 text-sm sm:text-base">
                <CreditCard className="w-4 sm:w-5 h-4 sm:h-5 text-amber-500" aria-hidden="true" />
                Metodo de pago
              </h2>

              <fieldset className="space-y-2 sm:space-y-3">
                <legend className="sr-only">Selecciona un metodo de pago</legend>

                <label className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all min-h-[60px] ${
                  paymentMethod === 'card' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'card'}
                    onChange={() => setPaymentMethod('card')}
                    className="w-4 h-4 text-amber-500 min-w-[16px]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Tarjeta de credito/debito</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Visa, Mastercard, AMEX</p>
                  </div>
                  <CreditCard className="w-5 sm:w-6 h-5 sm:h-6 text-gray-400 flex-shrink-0" aria-hidden="true" />
                </label>

                <label className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all min-h-[60px] ${
                  paymentMethod === 'oxxo' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'oxxo'}
                    onChange={() => setPaymentMethod('oxxo')}
                    className="w-4 h-4 text-amber-500 min-w-[16px]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">OXXO Pay</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">Pago en efectivo en tiendas OXXO</p>
                  </div>
                  <span className="text-xs font-bold text-red-600 flex-shrink-0">OXXO</span>
                </label>

                <label className={`flex items-center gap-2 sm:gap-3 p-3 sm:p-4 border-2 rounded-xl cursor-pointer transition-all min-h-[60px] ${
                  paymentMethod === 'transfer' ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                }`}>
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === 'transfer'}
                    onChange={() => setPaymentMethod('transfer')}
                    className="w-4 h-4 text-amber-500 min-w-[16px]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm sm:text-base">Transferencia bancaria</p>
                    <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">SPEI - Recibe instrucciones por correo</p>
                  </div>
                </label>
              </fieldset>
            </div>

            {paymentMethod === 'card' && (
              <div className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4">
                <div className="space-y-3">
                  <div>
                    <label htmlFor="cardNumber" className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Numero de tarjeta</label>
                    <input
                      id="cardNumber"
                      type="text"
                      inputMode="numeric"
                      placeholder="1234 5678 9012 3456"
                      className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base min-h-[44px]"
                      maxLength={19}
                      autoComplete="cc-number"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <label htmlFor="expiry" className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">Vencimiento</label>
                      <input
                        id="expiry"
                        type="text"
                        placeholder="MM/AA"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base min-h-[44px]"
                        maxLength={5}
                        autoComplete="cc-exp"
                      />
                    </div>
                    <div>
                      <label htmlFor="cvv" className="block text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-1">CVV</label>
                      <input
                        id="cvv"
                        type="text"
                        inputMode="numeric"
                        placeholder="123"
                        className="w-full px-3 sm:px-4 py-2.5 sm:py-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm sm:text-base min-h-[44px]"
                        maxLength={4}
                        autoComplete="cc-csc"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Total */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 sm:p-4">
              <div className="flex justify-between items-center">
                <span className="text-gray-700 dark:text-gray-300 text-sm sm:text-base">Total a pagar</span>
                <span className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400">{formatPrice(total)}</span>
              </div>
            </div>

            <p className="text-[10px] sm:text-xs text-center text-gray-500 dark:text-gray-400 px-4">
              Este es un modo de demostracion. No se procesaran pagos reales.
            </p>

            <button
              onClick={handlePaymentSubmit}
              disabled={processing}
              className="w-full py-3 sm:py-4 bg-amber-500 text-white rounded-lg font-medium disabled:opacity-70 flex items-center justify-center gap-2 min-h-[44px] hover:bg-amber-600 active:scale-[0.98] transition-all focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 text-sm sm:text-base"
              aria-busy={processing}
            >
              {processing ? (
                <>
                  <div className="w-4 sm:w-5 h-4 sm:h-5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true" />
                  Procesando...
                </>
              ) : (
                `Pagar ${formatPrice(total)}`
              )}
            </button>
          </div>
        )}
        </div>
      </div>

      {/* Modal de error de stock */}
      <StockConflictModal
        isOpen={showConflictModal}
        onClose={handleConflictClose}
        onReload={handleConflictReload}
        productName={orderError?.productName}
        availableStock={orderError?.availableStock}
        requestedQuantity={orderError?.requestedQuantity}
        loading={cartReloading}
        retryCount={retryCount}
        errorType={orderError?.type}
        affectedItems={orderError?.affectedItems}
      />
    </div>
  );
}
