import { Product } from '../entities/Product.js';
import { Order } from '../entities/Order.js';

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  sellerId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface OrderFilters {
  userId?: string;
  sellerId?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IProductRepository {
  // Product operations
  save(product: Product): Promise<Product>;
  findById(id: string): Promise<Product | null>;
  findBySeller(sellerId: string, filters?: ProductFilters): Promise<PaginatedResult<Product>>;
  findAll(filters?: ProductFilters): Promise<PaginatedResult<Product>>;

  // Order operations
  saveOrder(order: Order): Promise<Order>;
  findOrderById(id: string): Promise<Order | null>;
  findOrdersByUser(userId: string, filters?: OrderFilters): Promise<PaginatedResult<Order>>;
  findOrdersBySeller(sellerId: string, filters?: OrderFilters): Promise<PaginatedResult<Order>>;

  // Transaction support
  withTransaction<T>(callback: (repository: IProductRepository) => Promise<T>): Promise<T>;
}
