import React, { useState, useEffect } from 'react';
import {
  ChevronLeft,
  ShoppingBag,
  Package,
  Truck,
  RefreshCw,
  MapPin,
} from 'lucide-react';
import LoadingSpinner from './ui/LoadingSpinner';
import LoadingButton from './ui/LoadingButton';
import { useToast } from './ui/Toast';
import PaymentErrorModal from './ui/PaymentErrorModal';
import {
  OrderStatusBadge,
  OrderStatus,
  canCancelOrder,
  canRetryOrderPayment,
  ORDER_STATUS_LABELS,
} from './ui/StatusBadge';
import { ViewState } from '../types';
import {
  getMyOrders,
  retryOrderPayment,
  cancelOrder as cancelOrderApi,
  Order as MarketplaceOrder
} from '../services/marketplace';

interface MyOrdersViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

// Mock Order interface - Actualizar cuando se cree el servicio real
interface Order {
  id: string;
  status: OrderStatus;
  total: string;
  createdAt: string;
  items: Array<{
    id: string;
    productId: string;
    productName: string;
    productImage: string;
    quantity: number;
    price: string;
  }>;
  shippingAddress: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
  };
  seller: {
    id: string;
    businessName: string;
  };
}

type TabStatus = 'all' | OrderStatus;

// Helper function
const formatPrice = (price: string | number): string => {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(numPrice);
};

export default function MyOrdersView({ onNavigate, onBack }: MyOrdersViewProps) {
  const toast = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabStatus>('all');
  const [showPaymentErrorModal, setShowPaymentErrorModal] = useState(false);
  const [paymentErrorOrder, setPaymentErrorOrder] = useState<Order | null>(null);
  const [retryingPayment, setRetryingPayment] = useState(false);

  useEffect(() => {
    loadOrders();
  }, [activeTab]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const result = await getMyOrders({
        status: activeTab === 'all' ? undefined : activeTab,
        limit: 50,
      });
      setOrders(result.orders as unknown as Order[]);
    } catch (error) {
      console.error('Error loading orders:', error);
      toast.error('Error al cargar', 'No se pudieron cargar tus pedidos');
      // Fallback a array vacío si falla
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (order: Order) => {
    if (!confirm('¿Estás seguro de cancelar este pedido?')) return;

    try {
      await cancelOrderApi(order.id);
      toast.success('Pedido cancelado', 'Tu pedido ha sido cancelado');
      loadOrders();
    } catch (error) {
      console.error('Error cancelling order:', error);
      toast.error('Error al cancelar', 'No se pudo cancelar el pedido');
    }
  };

  const handleRetryPayment = async (order: Order) => {
    setPaymentErrorOrder(order);
    setShowPaymentErrorModal(true);
  };

  const handleRetryPaymentConfirm = async () => {
    if (!paymentErrorOrder) return;

    try {
      setRetryingPayment(true);
      const result = await retryOrderPayment(paymentErrorOrder.id);

      // Si tenemos un clientSecret, redirigir a Stripe Checkout
      if (result.clientSecret) {
        toast.info('Redirigiendo a pago', 'Serás redirigido a completar el pago');
        setShowPaymentErrorModal(false);
        // TODO: Integrar con Stripe Checkout
        // window.location.href = `/checkout?payment_intent=${result.clientSecret}`;
      } else {
        toast.success('Pago procesado', 'Tu pago ha sido procesado exitosamente');
        setShowPaymentErrorModal(false);
        loadOrders(); // Recargar la lista
      }
    } catch (error) {
      console.error('Error retrying payment:', error);
      toast.error('Error al procesar pago', error instanceof Error ? error.message : 'No se pudo procesar el pago');
    } finally {
      setRetryingPayment(false);
    }
  };

  const tabs: { key: TabStatus; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'PENDING_PAYMENT', label: 'Procesando' },
    { key: 'PAYMENT_FAILED', label: 'Error pago' },
    { key: 'PENDING', label: 'Pendientes' },
    { key: 'PAID', label: 'Pagados' },
    { key: 'SHIPPED', label: 'Enviados' },
    { key: 'DELIVERED', label: 'Entregados' },
    { key: 'CANCELLED', label: 'Cancelados' },
  ];

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 to-purple-600 text-white p-4 pt-12">
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={onBack}
            className="p-2 hover:bg-white/20 rounded-full transition-colors"
            aria-label="Volver"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div>
            <h1 className="text-xl font-bold">Mis Pedidos</h1>
            <p className="text-sm text-white/80">{orders.length} pedidos</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                activeTab === tab.key ? 'bg-white text-purple-600' : 'bg-white/20 hover:bg-white/30'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <LoadingSpinner text="Cargando pedidos..." />
        ) : orders.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingBag className="w-16 h-16 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Sin pedidos
            </h3>
            <p className="text-gray-500 dark:text-gray-400 mb-4">
              Aún no has realizado ninguna compra
            </p>
            <button
              onClick={() => onNavigate(ViewState.MARKETPLACE)}
              className="px-6 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 transition"
            >
              Explorar marketplace
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onCancel={() => handleCancelOrder(order)}
                onRetryPayment={() => handleRetryPayment(order)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Payment Error Modal */}
      {showPaymentErrorModal && paymentErrorOrder && (
        <PaymentErrorModal
          isOpen={showPaymentErrorModal}
          onClose={() => {
            setShowPaymentErrorModal(false);
            setPaymentErrorOrder(null);
          }}
          onRetry={handleRetryPaymentConfirm}
          orderId={paymentErrorOrder.id}
          amount={formatPrice(paymentErrorOrder.total)}
          retrying={retryingPayment}
        />
      )}
    </div>
  );
}

// ============================================
// OrderCard Component
// ============================================

interface OrderCardProps {
  order: Order;
  onCancel: () => void;
  onRetryPayment: () => void;
}

function OrderCard({ order, onCancel, onRetryPayment }: OrderCardProps) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleRetryPayment = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsRetrying(true);
    try {
      await onRetryPayment();
    } finally {
      setIsRetrying(false);
    }
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsCancelling(true);
    try {
      await onCancel();
    } finally {
      setIsCancelling(false);
    }
  };

  const formatPrice = (price: string | number): string => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'MXN',
    }).format(numPrice);
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start justify-between mb-2">
          <div>
            <p className="text-sm text-gray-500">Pedido #{order.id.slice(-8)}</p>
            <p className="text-xs text-gray-400">{formatDate(order.createdAt)}</p>
          </div>
          <OrderStatusBadge status={order.status} size="sm" />
        </div>
        <p className="text-sm text-gray-600">
          <span className="font-medium">{order.seller.businessName}</span>
        </p>
      </div>

      {/* Items */}
      <div className="p-4 space-y-3">
        {order.items.map((item) => (
          <div key={item.id} className="flex gap-3">
            <img
              src={item.productImage}
              alt={item.productName}
              className="w-16 h-16 object-cover rounded-lg"
            />
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900 truncate">{item.productName}</p>
              <p className="text-sm text-gray-500">Cantidad: {item.quantity}</p>
              <p className="text-sm font-semibold text-purple-600">{formatPrice(item.price)}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Shipping Address */}
      <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
        <div className="flex items-start gap-2 text-sm text-gray-600">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
          <p>
            {order.shippingAddress.street}, {order.shippingAddress.city},{' '}
            {order.shippingAddress.state} {order.shippingAddress.zipCode}
          </p>
        </div>
      </div>

      {/* Total */}
      <div className="flex justify-between items-center px-4 py-3 border-t border-gray-100">
        <span className="text-gray-600">Total</span>
        <span className="text-lg font-bold text-purple-600">{formatPrice(order.total)}</span>
      </div>

      {/* Actions */}
      <div className="p-4 pt-0 space-y-2">
        {/* Estado: PAYMENT_FAILED - Botón de reintentar pago */}
        {canRetryOrderPayment(order.status) && (
          <LoadingButton
            onClick={handleRetryPayment}
            isLoading={isRetrying}
            variant="primary"
            className="w-full py-2.5 bg-purple-600 text-white rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-purple-700 transition-colors disabled:opacity-50"
            aria-label="Reintentar pago"
          >
            <RefreshCw className="w-4 h-4" aria-hidden="true" />
            {isRetrying ? 'Procesando...' : 'Reintentar pago'}
          </LoadingButton>
        )}

        {/* Estado: PENDING_PAYMENT - Mensaje de procesamiento */}
        {order.status === 'PENDING_PAYMENT' && (
          <div
            className="w-full py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg font-medium flex items-center justify-center gap-2"
            role="status"
            aria-live="polite"
          >
            <RefreshCw className="w-4 h-4 animate-spin" aria-hidden="true" />
            <span>Procesando pago...</span>
          </div>
        )}

        {/* Estado: Cancelable - Botón de cancelar */}
        {canCancelOrder(order.status) && (
          <LoadingButton
            onClick={handleCancel}
            isLoading={isCancelling}
            variant="secondary"
            className="w-full py-2.5 border border-red-500 text-red-500 rounded-lg font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            aria-label="Cancelar pedido"
          >
            {isCancelling ? 'Cancelando...' : 'Cancelar pedido'}
          </LoadingButton>
        )}

        {/* Estado: SHIPPED - Mensaje de seguimiento */}
        {order.status === 'SHIPPED' && (
          <button className="w-full py-2.5 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-blue-100 transition-colors">
            <Truck className="w-4 h-4" aria-hidden="true" />
            Rastrear envío
          </button>
        )}

        {/* Estado: DELIVERED - Mensaje de completado */}
        {order.status === 'DELIVERED' && (
          <div className="w-full py-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg font-medium text-center">
            Pedido entregado correctamente
          </div>
        )}

        {/* Estado: CANCELLED - Mensaje informativo */}
        {order.status === 'CANCELLED' && (
          <div className="w-full py-2.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg font-medium text-center">
            Pedido cancelado
          </div>
        )}
      </div>
    </div>
  );
}
