import React, { useState, useEffect } from 'react';
import {
  ArrowLeft,
  Star,
  Heart,
  Share2,
  ShoppingCart,
  Minus,
  Plus,
  MessageSquare,
  MapPin,
  Package,
  Check,
} from 'lucide-react';
import {
  getProduct,
  addToCart,
  addToWishlist,
  removeFromWishlist,
  isInWishlist,
  Product,
  ProductReview,
  CATEGORY_LABELS,
  formatPrice,
} from '../services/marketplace';
import { ViewState } from '../types';
import LoadingSpinner from './ui/LoadingSpinner';
import GradientPlaceholder from './ui/GradientPlaceholder';
import { useToast } from './ui/Toast';

interface ProductDetailViewProps {
  productId: string;
  onNavigate: (view: ViewState, data?: unknown) => void;
  onBack: () => void;
}

export default function ProductDetailView({
  productId,
  onNavigate,
  onBack,
}: ProductDetailViewProps) {
  const toast = useToast();
  const [product, setProduct] = useState<(Product & { reviews: ProductReview[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [addingToCart, setAddingToCart] = useState(false);
  const [addedToCart, setAddedToCart] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'description' | 'reviews'>('description');
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);

  useEffect(() => {
    loadProduct();
    checkWishlist();
  }, [productId]);

  const checkWishlist = async () => {
    const result = await isInWishlist(productId);
    setInWishlist(result);
  };

  const handleToggleWishlist = async () => {
    try {
      setWishlistLoading(true);
      if (inWishlist) {
        await removeFromWishlist(productId);
        setInWishlist(false);
        toast.info('Eliminado', 'Producto eliminado de tu lista de deseos');
      } else {
        await addToWishlist(productId);
        setInWishlist(true);
        toast.success('Guardado', 'Producto agregado a tu lista de deseos');
      }
    } catch (error) {
      console.error('Error toggling wishlist:', error);
      toast.error('Error', 'No se pudo actualizar la lista de deseos');
    } finally {
      setWishlistLoading(false);
    }
  };

  const loadProduct = async () => {
    try {
      setLoading(true);
      const data = await getProduct(productId);
      setProduct(data);
    } catch (error) {
      console.error('Error loading product:', error);
      toast.error('Error', 'No se pudo cargar el producto');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = async () => {
    if (!product) return;

    try {
      setAddingToCart(true);
      await addToCart(productId, quantity);
      setAddedToCart(true);
      toast.success('Agregado al carrito', `${quantity}x ${product.name}`);
      setTimeout(() => setAddedToCart(false), 2000);
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error('Error', 'No se pudo agregar al carrito');
    } finally {
      setAddingToCart(false);
    }
  };

  const handleShare = async () => {
    try {
      await navigator.share({
        title: product?.name,
        text: product?.description,
        url: window.location.href,
      });
    } catch {
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading || !product) {
    return <LoadingSpinner fullScreen text="Cargando producto..." />;
  }

  const images = product.images.length > 0
    ? product.images
    : [];

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Image Gallery */}
      <div className="relative">
        <div className="aspect-square bg-gray-100">
          {images.length > 0 ? (
            <img
              src={images[activeImageIndex]}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <GradientPlaceholder variant="shop" className="w-full h-full" alt={product.name} />
          )}
        </div>

        {/* Navigation */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-12 flex justify-between">
          <button onClick={onBack} className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow text-gray-800">
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleToggleWishlist}
              disabled={wishlistLoading}
              className={`p-2 backdrop-blur-sm rounded-full shadow transition ${
                inWishlist
                  ? 'bg-pink-500 text-white'
                  : 'bg-white/90 text-gray-800 hover:bg-pink-50'
              } ${wishlistLoading ? 'opacity-50' : ''}`}
            >
              <Heart className={`w-6 h-6 ${inWishlist ? 'fill-current' : ''}`} />
            </button>
            <button onClick={handleShare} className="p-2 bg-white/90 backdrop-blur-sm rounded-full shadow text-gray-800">
              <Share2 className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Thumbnails */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveImageIndex(index)}
                className={`w-2 h-2 rounded-full ${
                  index === activeImageIndex ? 'bg-amber-500' : 'bg-white/50'
                }`}
              />
            ))}
          </div>
        )}

        {/* Out of stock overlay */}
        {product.stock === 0 && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xl font-bold">Agotado</span>
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4">
          {/* Category & Price */}
          <div className="flex justify-between items-start mb-2">
            <span className="px-3 py-1 bg-amber-100 text-amber-700 text-sm font-medium rounded-full">
              {CATEGORY_LABELS[product.category]}
            </span>
            <div className="text-right">
              <p className="text-2xl font-bold text-amber-600">{formatPrice(product.price)}</p>
              <p className="text-sm text-gray-500">{product.stock} disponibles</p>
            </div>
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.name}</h1>

          {/* Rating */}
          {product.seller.rating > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex items-center gap-1">
                <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                <span className="font-medium">{product.seller.rating.toFixed(1)}</span>
              </div>
              <span className="text-gray-500">({product._count?.reviews || 0} resenas)</span>
            </div>
          )}

          {/* Seller */}
          <div className="flex items-center gap-3 py-4 border-y">
            <img
              src={product.seller.user.avatar || '/default-avatar.png'}
              alt={product.seller.user.nombre}
              className="w-12 h-12 rounded-full"
            />
            <div className="flex-1">
              <p className="font-medium text-gray-900">{product.seller.businessName}</p>
              {product.seller.location && (
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {product.seller.location}
                </p>
              )}
            </div>
            {product.seller.verified && (
              <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full flex items-center gap-1">
                <Check className="w-3 h-3" />
                Verificado
              </span>
            )}
          </div>

          {/* Tabs */}
          <div className="flex border-b mt-4">
            <button
              onClick={() => setActiveTab('description')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === 'description'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Descripcion
            </button>
            <button
              onClick={() => setActiveTab('reviews')}
              className={`flex-1 py-3 text-center font-medium border-b-2 transition-colors ${
                activeTab === 'reviews'
                  ? 'border-amber-500 text-amber-600'
                  : 'border-transparent text-gray-500'
              }`}
            >
              Resenas ({product.reviews.length})
            </button>
          </div>

          {activeTab === 'description' ? (
            <div className="py-4">
              <p className="text-gray-600 whitespace-pre-line">{product.description}</p>

              {/* Shipping info */}
              <div className="mt-6 p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-3">
                  <Package className="w-6 h-6 text-amber-500" />
                  <div>
                    <p className="font-medium text-gray-900">Envio a toda la republica</p>
                    <p className="text-sm text-gray-500">Entrega estimada: 5-10 dias habiles</p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-4">
              {product.reviews.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">Aun no hay resenas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {product.reviews.map((review) => (
                    <div key={review.id} className="border-b pb-4">
                      <div className="flex items-center gap-3 mb-2">
                        <img
                          src={review.user.avatar || '/default-avatar.png'}
                          alt={review.user.nombre}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="font-medium">{review.user.nombre}</p>
                          <div className="flex gap-0.5">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <Star
                                key={star}
                                className={`w-4 h-4 ${
                                  star <= review.rating
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                      {review.comment && <p className="text-gray-600">{review.comment}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Add to Cart Bar */}
      <div className="border-t bg-white p-4">
        <div className="flex items-center gap-4">
          {/* Quantity */}
          <div className="flex items-center gap-2 border rounded-lg">
            <button
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
              className="p-3 disabled:opacity-50"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-medium">{quantity}</span>
            <button
              onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
              disabled={quantity >= product.stock}
              className="p-3 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Add to cart button */}
          <button
            onClick={handleAddToCart}
            disabled={product.stock === 0 || addingToCart}
            className={`flex-1 py-4 rounded-lg font-medium flex items-center justify-center gap-2 ${
              addedToCart
                ? 'bg-green-500 text-white'
                : 'bg-amber-500 text-white disabled:bg-gray-300'
            }`}
          >
            {addedToCart ? (
              <>
                <Check className="w-5 h-5" />
                Agregado!
              </>
            ) : addingToCart ? (
              'Agregando...'
            ) : (
              <>
                <ShoppingCart className="w-5 h-5" />
                Agregar al carrito
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
