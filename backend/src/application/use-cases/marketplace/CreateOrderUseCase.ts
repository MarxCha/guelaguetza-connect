import { IProductRepository } from '../../../domain/marketplace/repositories/IProductRepository.js';
import { Order } from '../../../domain/marketplace/entities/Order.js';
import { Money } from '../../../domain/booking/value-objects/Money.js';
import { DomainError } from '../../../domain/shared/errors/DomainError.js';

export interface OrderItem {
  productId: string;
  quantity: number;
}

export interface CreateOrderInput {
  userId: string;
  items: OrderItem[];
  shippingAddress: any;
}

export interface CreateOrderOutput {
  order: Order;
}

export class CreateOrderUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: CreateOrderInput): Promise<CreateOrderOutput> {
    if (input.items.length === 0) {
      throw new DomainError('Order must have at least one item');
    }

    return this.productRepository.withTransaction(async (repo) => {
      const orderItems = [];
      let sellerId: string | null = null;

      // 1. Validate and reserve stock for each product
      for (const item of input.items) {
        const product = await repo.findById(item.productId);
        if (!product) {
          throw new DomainError(`Product ${item.productId} not found`);
        }

        // All products must belong to same seller
        if (sellerId === null) {
          sellerId = product.sellerId;
        } else if (product.sellerId !== sellerId) {
          throw new DomainError('All products must belong to the same seller');
        }

        // Validate stock availability
        if (!product.hasAvailableStock(item.quantity)) {
          throw new DomainError(
            `Insufficient stock for ${product.name}. Available: ${product.stock.quantity}`
          );
        }

        // Reserve stock
        product.reserveStock(item.quantity);
        await repo.save(product);

        // Add to order items
        orderItems.push({
          productId: product.id,
          quantity: item.quantity,
          price: product.price,
        });
      }

      if (!sellerId) {
        throw new DomainError('Cannot determine seller for order');
      }

      // 2. Create order
      const order = Order.create({
        userId: input.userId,
        sellerId,
        items: orderItems,
        shippingAddress: input.shippingAddress,
      });

      // 3. Save order
      const savedOrder = await repo.saveOrder(order);

      return { order: savedOrder };
    });
  }
}
