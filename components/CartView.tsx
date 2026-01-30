import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Minus,
  Plus,
  Trash2,
  ArrowRight,
} from 'lucide-react';
import {
  getCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  Cart,
  formatPrice,
} from '../services/marketplace';
import { ViewState } from '../types';
import EmptyState from './ui/EmptyState';
import LoadingSpinner from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import { useToast } from './ui/Toast';

interface CartViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

export default function CartView({ onNavigate, onBack }: CartViewProps) {
  const toast = useToast();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const [updatingItem, setUpdatingItem] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    try {
      setLoading(true);
      const data = await getCart();
      setCart(data);
    } catch (error) {
      console.error('Error loading cart:', error);
      toast.error('Error', 'No se pudo cargar el carrito');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    try {
      setUpdatingItem(itemId);
      const updatedCart = await updateCartItem(itemId, newQuantity);
      setCart(updatedCart);
    } catch (error) {
      console.error('Error updating cart:', error);
      toast.error('Error', 'No se pudo actualizar la cantidad');
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleRemoveItem = async (itemId: string) => {
    try {
      setUpdatingItem(itemId);
      const updatedCart = await removeFromCart(itemId);
      setCart(updatedCart);
      toast.success('Eliminado', 'Producto eliminado del carrito');
    } catch (error) {
      console.error('Error removing item:', error);
      toast.error('Error', 'No se pudo eliminar el producto');
    } finally {
      setUpdatingItem(null);
    }
  };

  const handleClearCart = async () => {
    if (!confirm('Estas seguro de vaciar el carrito?')) return;

    try {
      await clearCart();
      setCart(null);
      loadCart();
      toast.success('Carrito vaciado', 'Se eliminaron todos los productos');
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Error', 'No se pudo vaciar el carrito');
    }
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Cargando carrito..." />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b p-4 pt-12">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-gray-100 rounded-full">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div>
              <h1 className="text-xl font-bold">Carrito</h1>
              <p className="text-sm text-gray-500">
                {cart?.itemCount || 0} {cart?.itemCount === 1 ? 'producto' : 'productos'}
              </p>
            </div>
          </div>
          {cart && cart.items.length > 0 && (
            <button
              onClick={handleClearCart}
              className="text-red-500 text-sm font-medium"
            >
              Vaciar
            </button>
          )}
        </div>
      </div>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        {!cart || cart.items.length === 0 ? (
          <EmptyState
            type="cart"
            description="Explora nuestra tienda y encuentra productos increibles"
            action={{
              label: 'Ir a la tienda',
              onClick: () => onNavigate(ViewState.TIENDA),
            }}
          />
        ) : (
          <div className="p-4 space-y-4">
            {cart.items.map((item) => {
              const mainImage = item.product.images[0] || '';
              const isUpdating = updatingItem === item.id;

              return (
                <div
                  key={item.id}
                  className={`bg-white rounded-xl p-4 shadow-sm ${isUpdating ? 'opacity-50' : ''}`}
                >
                  <div className="flex gap-4">
                    {mainImage ? (
                      <img
                        src={mainImage}
                        alt={item.product.name}
                        className="w-20 h-20 rounded-lg object-cover"
                      />
                    ) : (
                      <GradientPlaceholder variant="shop" className="w-20 h-20 rounded-lg" alt={item.product.name} />
                    )}
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 line-clamp-1">
                        {item.product.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {item.product.seller.businessName}
                      </p>
                      <p className="text-lg font-bold text-amber-600 mt-1">
                        {formatPrice(item.product.price)}
                      </p>
                    </div>
                    <button
                      onClick={() => handleRemoveItem(item.id)}
                      className="p-2 text-gray-400 hover:text-red-500"
                      disabled={isUpdating}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center justify-between mt-4 pt-4 border-t">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                        disabled={item.quantity <= 1 || isUpdating}
                        className="p-2 border rounded-lg disabled:opacity-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="w-8 text-center font-medium">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.product.stock || isUpdating}
                        className="p-2 border rounded-lg disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="font-bold text-gray-900">
                      {formatPrice(parseFloat(item.product.price) * item.quantity)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Checkout Bar */}
      {cart && cart.items.length > 0 && (
        <div className="bg-white border-t p-4 space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(cart.subtotal)}
            </span>
          </div>
          <button
            onClick={() => onNavigate(ViewState.CHECKOUT)}
            className="w-full py-4 bg-amber-500 text-white rounded-lg font-medium flex items-center justify-center gap-2"
          >
            Continuar al pago
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
