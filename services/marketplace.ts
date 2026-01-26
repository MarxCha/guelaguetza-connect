import { api } from './api';
import { MOCK_PRODUCTS, MOCK_USERS } from './mockData';

// Types
export type ProductCategory = 'ARTESANIA' | 'MEZCAL' | 'TEXTIL' | 'CERAMICA' | 'JOYERIA' | 'GASTRONOMIA' | 'OTRO';
export type ProductStatus = 'DRAFT' | 'ACTIVE' | 'SOLD_OUT' | 'ARCHIVED';
export type OrderStatus = 'PENDING_PAYMENT' | 'PAYMENT_FAILED' | 'PENDING' | 'PAID' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED' | 'REFUNDED';

export interface SellerProfile {
  id: string;
  userId: string;
  businessName: string;
  description: string | null;
  bannerUrl: string | null;
  location: string | null;
  rating: number;
  reviewCount: number;
  verified: boolean;
  user: {
    id: string;
    nombre: string;
    apellido?: string;
    avatar: string | null;
  };
  _count?: {
    products: number;
    orders: number;
  };
}

export interface Product {
  id: string;
  sellerId: string;
  name: string;
  description: string;
  price: string;
  category: ProductCategory;
  status: ProductStatus;
  stock: number;
  images: string[];
  createdAt: string;
  seller: SellerProfile;
  _count?: {
    reviews: number;
  };
}

export interface ProductReview {
  id: string;
  userId: string;
  productId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  user: {
    id: string;
    nombre: string;
    avatar: string | null;
  };
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface ShippingAddress {
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  price: string;
  product: Product;
}

export interface Order {
  id: string;
  userId: string;
  sellerId: string;
  status: OrderStatus;
  total: string;
  shippingAddress: ShippingAddress;
  stripePaymentId: string | null;
  createdAt: string;
  items: OrderItem[];
  seller: SellerProfile;
  user?: {
    id: string;
    nombre: string;
    apellido: string;
    email: string;
  };
}

export interface ProductQuery {
  category?: ProductCategory;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrderQuery {
  status?: OrderStatus;
  page?: number;
  limit?: number;
}

// API Functions

// Products
export async function getProducts(query: ProductQuery = {}) {
  try {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined) params.append(key, String(value));
    });

    const response = await api.get<{
      products: Product[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
      };
    }>(`/marketplace/products?${params}`);
    return response;
  } catch {
    // Return mock data when backend is unavailable
    const { page = 1, limit = 20, category, search } = query;
    let filtered = MOCK_PRODUCTS.map(p => ({
      id: p.id,
      sellerId: p.seller.id,
      name: p.name,
      description: p.description,
      price: String(p.price),
      category: p.category as ProductCategory,
      status: 'ACTIVE' as ProductStatus,
      stock: p.stock,
      images: [p.imageUrl],
      createdAt: new Date().toISOString(),
      seller: {
        id: p.seller.id,
        userId: p.seller.id,
        businessName: p.seller.nombre + ' Artesanias',
        description: p.seller.bio || null,
        bannerUrl: null,
        location: p.seller.region || null,
        rating: 4.5,
        reviewCount: 12,
        verified: true,
        user: {
          id: p.seller.id,
          nombre: p.seller.nombre,
          apellido: p.seller.apellido,
          avatar: p.seller.avatar,
        },
      },
    }));

    if (category) {
      filtered = filtered.filter(p => p.category === category);
    }
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(s) ||
        p.description.toLowerCase().includes(s)
      );
    }

    const start = (page - 1) * limit;
    const paginated = filtered.slice(start, start + limit);

    return {
      products: paginated,
      pagination: {
        page,
        limit,
        total: filtered.length,
        totalPages: Math.ceil(filtered.length / limit),
      },
    };
  }
}

export async function getProduct(id: string) {
  try {
    const response = await api.get<Product & { reviews: ProductReview[] }>(`/marketplace/products/${id}`);
    return response;
  } catch {
    // Return mock data when backend is unavailable
    const mockProduct = MOCK_PRODUCTS.find(p => p.id === id);
    if (!mockProduct) {
      throw new Error('Product not found');
    }

    return {
      id: mockProduct.id,
      sellerId: mockProduct.seller.id,
      name: mockProduct.name,
      description: mockProduct.description,
      price: String(mockProduct.price),
      category: mockProduct.category as ProductCategory,
      status: 'ACTIVE' as ProductStatus,
      stock: mockProduct.stock,
      images: [mockProduct.imageUrl],
      createdAt: new Date().toISOString(),
      seller: {
        id: mockProduct.seller.id,
        userId: mockProduct.seller.id,
        businessName: mockProduct.seller.nombre + ' Artesanías',
        description: mockProduct.seller.bio || null,
        bannerUrl: null,
        location: mockProduct.seller.region || null,
        rating: 4.5,
        reviewCount: 12,
        verified: true,
        user: {
          id: mockProduct.seller.id,
          nombre: mockProduct.seller.nombre,
          apellido: mockProduct.seller.apellido,
          avatar: mockProduct.seller.avatar,
        },
      },
      reviews: [
        {
          id: 'review_1',
          userId: MOCK_USERS[0].id,
          productId: mockProduct.id,
          rating: 5,
          comment: '¡Excelente producto! La calidad es impresionante.',
          createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: MOCK_USERS[0].id,
            nombre: MOCK_USERS[0].nombre,
            avatar: MOCK_USERS[0].avatar,
          },
        },
        {
          id: 'review_2',
          userId: MOCK_USERS[1].id,
          productId: mockProduct.id,
          rating: 4,
          comment: 'Muy bonito, llegó bien empacado.',
          createdAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
          user: {
            id: MOCK_USERS[1].id,
            nombre: MOCK_USERS[1].nombre,
            avatar: MOCK_USERS[1].avatar,
          },
        },
      ],
    };
  }
}

// Cart (with localStorage fallback for demo mode)
const CART_STORAGE_KEY = 'guelaguetza_cart';

interface MockCartItem {
  productId: string;
  quantity: number;
}

function getMockCart(): MockCartItem[] {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveMockCart(items: MockCartItem[]) {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
}

function buildCartResponse(mockCartItems: MockCartItem[]): Cart {
  const items: CartItem[] = mockCartItems.map((item, index) => {
    const mockProduct = MOCK_PRODUCTS.find(p => p.id === item.productId);
    return {
      id: `cart_item_${index}`,
      cartId: 'mock_cart',
      productId: item.productId,
      quantity: item.quantity,
      product: mockProduct ? {
        id: mockProduct.id,
        sellerId: mockProduct.seller.id,
        name: mockProduct.name,
        description: mockProduct.description,
        price: String(mockProduct.price),
        category: mockProduct.category as ProductCategory,
        status: 'ACTIVE' as ProductStatus,
        stock: mockProduct.stock,
        images: [mockProduct.imageUrl],
        createdAt: new Date().toISOString(),
        seller: {
          id: mockProduct.seller.id,
          userId: mockProduct.seller.id,
          businessName: mockProduct.seller.nombre + ' Artesanías',
          description: mockProduct.seller.bio || null,
          bannerUrl: null,
          location: mockProduct.seller.region || null,
          rating: 4.5,
          reviewCount: 12,
          verified: true,
          user: {
            id: mockProduct.seller.id,
            nombre: mockProduct.seller.nombre,
            apellido: mockProduct.seller.apellido,
            avatar: mockProduct.seller.avatar,
          },
        },
      } : {} as Product,
    };
  }).filter(item => item.product.id);

  const subtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.product.price) * item.quantity);
  }, 0);

  return {
    id: 'mock_cart',
    userId: 'mock_user',
    items,
    subtotal,
    itemCount: items.reduce((sum, item) => sum + item.quantity, 0),
  };
}

export async function getCart() {
  try {
    const response = await api.get<Cart>('/marketplace/cart');
    return response;
  } catch {
    // Return mock cart from localStorage
    const mockCartItems = getMockCart();
    return buildCartResponse(mockCartItems);
  }
}

export async function addToCart(productId: string, quantity: number = 1) {
  try {
    const response = await api.post<Cart>('/marketplace/cart/items', { productId, quantity });
    return response;
  } catch {
    // Add to mock cart in localStorage
    const mockCartItems = getMockCart();
    const existingIndex = mockCartItems.findIndex(item => item.productId === productId);

    if (existingIndex >= 0) {
      mockCartItems[existingIndex].quantity += quantity;
    } else {
      mockCartItems.push({ productId, quantity });
    }

    saveMockCart(mockCartItems);
    return buildCartResponse(mockCartItems);
  }
}

export async function updateCartItem(itemId: string, quantity: number) {
  try {
    const response = await api.put<Cart>(`/marketplace/cart/items/${itemId}`, { quantity });
    return response;
  } catch {
    // Update mock cart in localStorage
    const mockCartItems = getMockCart();
    const index = parseInt(itemId.replace('cart_item_', ''));

    if (mockCartItems[index]) {
      mockCartItems[index].quantity = quantity;
    }

    saveMockCart(mockCartItems);
    return buildCartResponse(mockCartItems);
  }
}

export async function removeFromCart(itemId: string) {
  try {
    const response = await api.delete<Cart>(`/marketplace/cart/items/${itemId}`);
    return response;
  } catch {
    // Remove from mock cart in localStorage
    const mockCartItems = getMockCart();
    const index = parseInt(itemId.replace('cart_item_', ''));

    if (index >= 0 && index < mockCartItems.length) {
      mockCartItems.splice(index, 1);
    }

    saveMockCart(mockCartItems);
    return buildCartResponse(mockCartItems);
  }
}

export async function clearCart() {
  try {
    const response = await api.delete<{ message: string }>('/marketplace/cart');
    return response;
  } catch {
    // Clear mock cart in localStorage
    saveMockCart([]);
    return { message: 'Cart cleared' };
  }
}

// Orders
export async function checkout(shippingAddress: ShippingAddress) {
  const response = await api.post<Array<{ order: Order; clientSecret: string | null }>>('/marketplace/checkout', {
    shippingAddress,
  });
  return response;
}

export async function getMyOrders(query: OrderQuery = {}) {
  const params = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) params.append(key, String(value));
  });

  const response = await api.get<{
    orders: Order[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }>(`/marketplace/orders?${params}`);
  return response;
}

export async function getOrder(id: string) {
  const response = await api.get<Order>(`/marketplace/orders/${id}`);
  return response;
}

export async function retryOrderPayment(id: string) {
  try {
    // En el futuro, esto llamará al backend para reintentar el pago
    // Por ahora, creamos un nuevo intento de pago con Stripe
    const response = await api.post<{
      order: Order;
      clientSecret: string | null;
      paymentIntentId?: string;
    }>(`/marketplace/orders/${id}/retry-payment`, {});
    return response;
  } catch (error) {
    // Si el backend no tiene el endpoint aún, devolvemos un error descriptivo
    throw new Error('El sistema de reintentos de pago no está disponible. Por favor, crea una nueva orden.');
  }
}

export async function cancelOrder(id: string) {
  const response = await api.post<Order>(`/marketplace/orders/${id}/cancel`, {});
  return response;
}

// Seller
export async function getSellerProfile() {
  const response = await api.get<SellerProfile | null>('/marketplace/seller/profile');
  return response;
}

export async function createSellerProfile(data: {
  businessName: string;
  description?: string;
  location?: string;
}) {
  const response = await api.post<SellerProfile>('/marketplace/seller/profile', data);
  return response;
}

// Reviews
export async function createProductReview(productId: string, data: { rating: number; comment?: string }) {
  const response = await api.post<ProductReview>(`/marketplace/products/${productId}/reviews`, data);
  return response;
}

// Helpers
export const CATEGORY_LABELS: Record<ProductCategory, string> = {
  ARTESANIA: 'Artesania',
  MEZCAL: 'Mezcal',
  TEXTIL: 'Textiles',
  CERAMICA: 'Ceramica',
  JOYERIA: 'Joyeria',
  GASTRONOMIA: 'Gastronomia',
  OTRO: 'Otro',
};

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PROCESSING: 'Procesando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

export const STATUS_COLORS: Record<OrderStatus, string> = {
  PENDING: '#FCD34D',
  PAID: '#34D399',
  PROCESSING: '#60A5FA',
  SHIPPED: '#A78BFA',
  DELIVERED: '#10B981',
  CANCELLED: '#EF4444',
  REFUNDED: '#F97316',
};

export function formatPrice(price: string | number): string {
  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(numPrice);
}

// Wishlist (Lista de Deseos)
const WISHLIST_STORAGE_KEY = 'guelaguetza_wishlist';

export interface WishlistItem {
  productId: string;
  addedAt: string;
}

function getStoredWishlist(): WishlistItem[] {
  try {
    const stored = localStorage.getItem(WISHLIST_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function saveWishlist(items: WishlistItem[]) {
  localStorage.setItem(WISHLIST_STORAGE_KEY, JSON.stringify(items));
}

export async function getWishlist(): Promise<Product[]> {
  const wishlistItems = getStoredWishlist();
  const products: Product[] = [];

  for (const item of wishlistItems) {
    const mockProduct = MOCK_PRODUCTS.find(p => p.id === item.productId);
    if (mockProduct) {
      products.push({
        id: mockProduct.id,
        sellerId: mockProduct.seller.id,
        name: mockProduct.name,
        description: mockProduct.description,
        price: String(mockProduct.price),
        category: mockProduct.category as ProductCategory,
        status: 'ACTIVE' as ProductStatus,
        stock: mockProduct.stock,
        images: [mockProduct.imageUrl],
        createdAt: item.addedAt,
        seller: {
          id: mockProduct.seller.id,
          userId: mockProduct.seller.id,
          businessName: mockProduct.seller.nombre + ' Artesanías',
          description: mockProduct.seller.bio || null,
          bannerUrl: null,
          location: mockProduct.seller.region || null,
          rating: 4.5,
          reviewCount: 12,
          verified: true,
          user: {
            id: mockProduct.seller.id,
            nombre: mockProduct.seller.nombre,
            apellido: mockProduct.seller.apellido,
            avatar: mockProduct.seller.avatar,
          },
        },
      });
    }
  }

  return products;
}

export async function addToWishlist(productId: string): Promise<boolean> {
  const wishlist = getStoredWishlist();
  const exists = wishlist.some(item => item.productId === productId);

  if (!exists) {
    wishlist.push({ productId, addedAt: new Date().toISOString() });
    saveWishlist(wishlist);
    return true;
  }

  return false;
}

export async function removeFromWishlist(productId: string): Promise<boolean> {
  const wishlist = getStoredWishlist();
  const index = wishlist.findIndex(item => item.productId === productId);

  if (index >= 0) {
    wishlist.splice(index, 1);
    saveWishlist(wishlist);
    return true;
  }

  return false;
}

export async function isInWishlist(productId: string): Promise<boolean> {
  const wishlist = getStoredWishlist();
  return wishlist.some(item => item.productId === productId);
}

export async function getWishlistCount(): Promise<number> {
  return getStoredWishlist().length;
}
