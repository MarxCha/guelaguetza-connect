import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Heart,
  ShoppingCart,
  Trash2,
  Star,
} from 'lucide-react';
import {
  getWishlist,
  removeFromWishlist,
  addToCart,
  Product,
  CATEGORY_LABELS,
  formatPrice,
} from '../services/marketplace';
import { ViewState } from '../types';
import EmptyState from './ui/EmptyState';
import LoadingSpinner from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import { useToast } from './ui/Toast';

interface WishlistViewProps {
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

export default function WishlistView({ onNavigate, onBack }: WishlistViewProps) {
  const toast = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCartId, setAddingToCartId] = useState<string | null>(null);

  useEffect(() => {
    loadWishlist();
  }, []);

  const loadWishlist = async () => {
    try {
      setLoading(true);
      const data = await getWishlist();
      setProducts(data);
    } catch (error) {
      console.error('Error loading wishlist:', error);
      toast.error('Error', 'No se pudo cargar la lista de deseos');
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async (productId: string) => {
    try {
      setRemovingId(productId);
      await removeFromWishlist(productId);
      setProducts(prev => prev.filter(p => p.id !== productId));
      toast.success('Eliminado', 'Producto eliminado de tu lista');
    } catch (error) {
      console.error('Error removing from wishlist:', error);
      toast.error('Error', 'No se pudo eliminar el producto');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (product: Product) => {
    try {
      setAddingToCartId(product.id);
      await addToCart(product.id, 1);
      toast.success('Agregado al carrito', product.name);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Error', 'No se pudo agregar al carrito');
    } finally {
      setAddingToCartId(null);
    }
  };

  const handleProductClick = (product: Product) => {
    onNavigate(ViewState.PRODUCT_DETAIL, { productId: product.id });
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Cargando lista de deseos..." />;
  }

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 to-rose-500 text-white p-4 pt-12 md:pt-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="p-2 hover:bg-white/20 rounded-full transition">
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              <Heart className="w-6 h-6" fill="currentColor" />
              <div>
                <h1 className="text-xl md:text-2xl font-bold">Mi Lista de Deseos</h1>
                <p className="text-sm text-white/80">{products.length} productos guardados</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          {products.length === 0 ? (
            <EmptyState
              type="products"
              title="Tu lista esta vacia"
              description="Guarda productos que te gusten para comprarlos despues"
              action={{
                label: 'Explorar Tienda',
                onClick: () => onNavigate(ViewState.TIENDA),
              }}
            />
          ) : (
            <div className="space-y-4">
              {products.map((product) => {
                const mainImage = product.images[0] || '';
                const isRemoving = removingId === product.id;
                const isAddingToCart = addingToCartId === product.id;

                return (
                  <div
                    key={product.id}
                    className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden ${
                      isRemoving ? 'opacity-50' : ''
                    }`}
                  >
                    <div className="flex">
                      {/* Image */}
                      <div
                        onClick={() => handleProductClick(product)}
                        className="w-32 h-32 md:w-40 md:h-40 flex-shrink-0 cursor-pointer"
                      >
                        {mainImage ? (
                          <img
                            src={mainImage}
                            alt={product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <GradientPlaceholder variant="shop" className="w-full h-full" alt={product.name} />
                        )}
                      </div>

                      {/* Details */}
                      <div className="flex-1 p-4 flex flex-col">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full mb-1">
                              {CATEGORY_LABELS[product.category]}
                            </span>
                            <h3
                              onClick={() => handleProductClick(product)}
                              className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 cursor-pointer hover:text-pink-600 transition"
                            >
                              {product.name}
                            </h3>
                            <div className="flex items-center gap-2 mt-1">
                              {product.seller.rating > 0 && (
                                <div className="flex items-center gap-1 text-sm text-gray-500">
                                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                                  <span>{product.seller.rating.toFixed(1)}</span>
                                </div>
                              )}
                              <span className="text-sm text-gray-500">
                                {product.seller.businessName}
                              </span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleRemove(product.id)}
                            disabled={isRemoving}
                            className="p-2 text-gray-400 hover:text-red-500 transition"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>

                        <div className="mt-auto pt-3 flex items-center justify-between">
                          <p className="text-lg font-bold text-pink-600">
                            {formatPrice(product.price)}
                          </p>
                          <button
                            onClick={() => handleAddToCart(product)}
                            disabled={product.stock === 0 || isAddingToCart}
                            className="flex items-center gap-2 px-4 py-2 bg-amber-500 text-white rounded-lg font-medium text-sm hover:bg-amber-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                          >
                            <ShoppingCart className="w-4 h-4" />
                            {isAddingToCart ? 'Agregando...' : product.stock === 0 ? 'Agotado' : 'Agregar'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action - Mobile */}
      {products.length > 0 && (
        <div className="md:hidden p-4 bg-white dark:bg-gray-800 border-t dark:border-gray-700">
          <button
            onClick={() => onNavigate(ViewState.TIENDA)}
            className="w-full py-3 border-2 border-pink-500 text-pink-600 rounded-lg font-medium hover:bg-pink-50 transition"
          >
            Seguir Comprando
          </button>
        </div>
      )}
    </div>
  );
}
