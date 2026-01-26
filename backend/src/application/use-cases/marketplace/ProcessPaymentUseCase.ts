import { IProductRepository } from '../../../domain/marketplace/repositories/IProductRepository.js';
import { Order } from '../../../domain/marketplace/entities/Order.js';
import { DomainError } from '../../../domain/shared/errors/DomainError.js';

export interface ProcessPaymentInput {
  orderId: string;
  paymentIntentId: string;
  paymentStatus: 'succeeded' | 'failed';
}

export interface ProcessPaymentOutput {
  order: Order;
  success: boolean;
}

export class ProcessPaymentUseCase {
  constructor(private readonly productRepository: IProductRepository) {}

  async execute(input: ProcessPaymentInput): Promise<ProcessPaymentOutput> {
    const order = await this.productRepository.findOrderById(input.orderId);
    if (!order) {
      throw new DomainError(`Order ${input.orderId} not found`);
    }

    // Attach payment intent
    order.attachPaymentIntent(input.paymentIntentId);

    if (input.paymentStatus === 'succeeded') {
      // Mark as pending (ready to be processed by seller)
      order.markPending();
    } else {
      // Mark as payment failed
      order.markPaymentFailed();
    }

    const savedOrder = await this.productRepository.saveOrder(order);

    return {
      order: savedOrder,
      success: input.paymentStatus === 'succeeded',
    };
  }
}
