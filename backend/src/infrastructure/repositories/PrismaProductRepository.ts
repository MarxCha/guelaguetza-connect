import { PrismaClient, Prisma } from '@prisma/client';
import {
  IProductRepository,
  ProductFilters,
  OrderFilters,
  PaginatedResult,
} from '../../domain/marketplace/repositories/IProductRepository.js';
import { Product } from '../../domain/marketplace/entities/Product.js';
import { Order } from '../../domain/marketplace/entities/Order.js';
import { Money } from '../../domain/booking/value-objects/Money.js';
import { Stock } from '../../domain/marketplace/value-objects/Stock.js';

export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaClient | Prisma.TransactionClient) {}

  // ==================== PRODUCT OPERATIONS ====================

  async save(product: Product): Promise<Product> {
    const data = {
      sellerId: product.sellerId,
      name: product.name,
      description: product.description,
      price: product.price.toDecimal(),
      status: product.status,
      stock: product.stock.quantity,
      images: product.images,
      version: product.version,
      // Add other fields from toJSON()
      ...product.toJSON(),
    };

    let saved;
    if (product.id) {
      // Update using optimistic locking
      const result = await this.prisma.product.updateMany({
        where: {
          id: product.id,
          version: product.version - 1,
        },
        data: {
          ...data,
          version: product.version,
        },
      });

      if (result.count === 0) {
        throw new Error('Concurrency conflict: product was modified');
      }

      saved = await this.prisma.product.findUnique({
        where: { id: product.id },
      });

      if (!saved) {
        throw new Error('Product not found after update');
      }
    } else {
      saved = await this.prisma.product.create({ data });
    }

    return this.toDomainProduct(saved);
  }

  async findById(id: string): Promise<Product | null> {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    return product ? this.toDomainProduct(product) : null;
  }

  async findBySeller(
    sellerId: string,
    filters?: ProductFilters
  ): Promise<PaginatedResult<Product>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      sellerId,
      ...(filters?.status && { status: filters.status }),
      ...(filters?.category && { category: filters.category }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((p) => this.toDomainProduct(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findAll(filters?: ProductFilters): Promise<PaginatedResult<Product>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      ...(filters?.status && { status: filters.status }),
      ...(filters?.category && { category: filters.category }),
      ...(filters?.sellerId && { sellerId: filters.sellerId }),
      ...(filters?.minPrice && { price: { gte: filters.minPrice } }),
      ...(filters?.maxPrice && { price: { lte: filters.maxPrice } }),
      ...(filters?.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
    };

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products.map((p) => this.toDomainProduct(p)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== ORDER OPERATIONS ====================

  async saveOrder(order: Order): Promise<Order> {
    const data = {
      userId: order.userId,
      sellerId: order.sellerId,
      status: order.status.toString(),
      total: order.total.toDecimal(),
      shippingAddress: order.toJSON().shippingAddress,
      stripePaymentId: order.stripePaymentId,
    };

    let saved;
    if (order.id) {
      saved = await this.prisma.order.update({
        where: { id: order.id },
        data,
        include: { items: true },
      });
    } else {
      // Create order with items
      saved = await this.prisma.order.create({
        data: {
          ...data,
          items: {
            create: order.items.map((item) => ({
              productId: item.productId,
              quantity: item.quantity,
              price: item.price.toDecimal(),
            })),
          },
        },
        include: { items: true },
      });
    }

    return this.toDomainOrder(saved);
  }

  async findOrderById(id: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });

    return order ? this.toDomainOrder(order) : null;
  }

  async findOrdersByUser(
    userId: string,
    filters?: OrderFilters
  ): Promise<PaginatedResult<Order>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      userId,
      ...(filters?.status && { status: filters.status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => this.toDomainOrder(o)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOrdersBySeller(
    sellerId: string,
    filters?: OrderFilters
  ): Promise<PaginatedResult<Order>> {
    const page = filters?.page || 1;
    const limit = filters?.limit || 10;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {
      sellerId,
      ...(filters?.status && { status: filters.status }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        include: { items: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((o) => this.toDomainOrder(o)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ==================== TRANSACTION SUPPORT ====================

  async withTransaction<T>(
    callback: (repository: IProductRepository) => Promise<T>
  ): Promise<T> {
    if ('$transaction' in this.prisma) {
      return (this.prisma as PrismaClient).$transaction(async (tx) => {
        const txRepo = new PrismaProductRepository(tx);
        return callback(txRepo);
      });
    } else {
      // Already in transaction
      return callback(this);
    }
  }

  // ==================== MAPPERS ====================

  private toDomainProduct(data: any): Product {
    return Product.reconstitute({
      id: data.id,
      sellerId: data.sellerId,
      name: data.name,
      description: data.description,
      price: Number(data.price),
      category: data.category,
      status: data.status,
      stock: data.stock,
      images: data.images || [],
      version: data.version,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }

  private toDomainOrder(data: any): Order {
    return Order.reconstitute({
      id: data.id,
      userId: data.userId,
      sellerId: data.sellerId,
      status: data.status,
      total: Number(data.total),
      shippingAddress: data.shippingAddress,
      stripePaymentId: data.stripePaymentId,
      items: data.items.map((item: any) => ({
        productId: item.productId,
        quantity: item.quantity,
        price: Number(item.price),
      })),
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    });
  }
}
