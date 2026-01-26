// Entities
export { Product } from './entities/Product.js';
export { Order } from './entities/Order.js';

// Value Objects
export { Stock } from './value-objects/Stock.js';
export { OrderStatus, OrderStatusEnum } from './value-objects/OrderStatus.js';

// Repositories
export type {
  IProductRepository,
  ProductFilters,
  OrderFilters,
  PaginatedResult,
} from './repositories/IProductRepository.js';
