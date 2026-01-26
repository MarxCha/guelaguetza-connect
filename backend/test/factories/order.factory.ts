/**
 * OrderFactory - Generador de órdenes de marketplace
 */

import type { Order, OrderStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

let orderCounter = 0;

const DIRECCIONES = [
  {
    calle: 'Av. Juárez',
    numero: '123',
    colonia: 'Centro',
    ciudad: 'Oaxaca de Juárez',
    estado: 'Oaxaca',
    cp: '68000',
  },
  {
    calle: 'Calle Macedonio Alcalá',
    numero: '456',
    colonia: 'Centro Histórico',
    ciudad: 'Oaxaca de Juárez',
    estado: 'Oaxaca',
    cp: '68000',
  },
  {
    calle: 'Av. Independencia',
    numero: '789',
    colonia: 'Reforma',
    ciudad: 'Oaxaca de Juárez',
    estado: 'Oaxaca',
    cp: '68050',
  },
  {
    calle: 'Calle 5 de Mayo',
    numero: '234',
    colonia: 'Jalatlaco',
    ciudad: 'Oaxaca de Juárez',
    estado: 'Oaxaca',
    cp: '68080',
  },
];

export interface OrderFactoryOptions {
  id?: string;
  userId?: string;
  sellerId?: string;
  status?: OrderStatus;
  total?: number | Decimal;
  shippingAddress?: any;
  stripePaymentId?: string;
}

/**
 * Genera una orden de prueba
 */
export function createOrder(options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'> {
  const index = orderCounter++;
  const address = DIRECCIONES[index % DIRECCIONES.length];

  return {
    id: options.id ?? `order-${index}-${Date.now()}`,
    userId: options.userId ?? `user-${index % 10}`,
    sellerId: options.sellerId ?? `seller-${index % 5}`,
    status: options.status ?? 'PENDING',
    total: new Decimal(options.total ?? (Math.random() * 2000 + 500).toFixed(2)),
    shippingAddress: options.shippingAddress ?? {
      nombre: 'Cliente de Prueba',
      telefono: '951-123-4567',
      ...address,
    },
    stripePaymentId: options.stripePaymentId ?? null,
  };
}

/**
 * Crea una orden pendiente
 */
export function createPendingOrder(options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'> {
  return createOrder({
    ...options,
    status: 'PENDING',
  });
}

/**
 * Crea una orden pagada
 */
export function createPaidOrder(options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'> {
  const index = orderCounter;
  return createOrder({
    ...options,
    status: 'PAID',
    stripePaymentId: options.stripePaymentId ?? `pi_${index}_${Date.now()}`,
  });
}

/**
 * Crea una orden en procesamiento
 */
export function createProcessingOrder(options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'> {
  const index = orderCounter;
  return createOrder({
    ...options,
    status: 'PROCESSING',
    stripePaymentId: options.stripePaymentId ?? `pi_${index}_${Date.now()}`,
  });
}

/**
 * Crea una orden enviada
 */
export function createShippedOrder(options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'> {
  const index = orderCounter;
  return createOrder({
    ...options,
    status: 'SHIPPED',
    stripePaymentId: options.stripePaymentId ?? `pi_${index}_${Date.now()}`,
  });
}

/**
 * Crea una orden entregada
 */
export function createDeliveredOrder(options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'> {
  const index = orderCounter;
  return createOrder({
    ...options,
    status: 'DELIVERED',
    stripePaymentId: options.stripePaymentId ?? `pi_${index}_${Date.now()}`,
  });
}

/**
 * Crea una orden cancelada
 */
export function createCancelledOrder(options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'> {
  return createOrder({
    ...options,
    status: 'CANCELLED',
  });
}

/**
 * Crea una orden reembolsada
 */
export function createRefundedOrder(options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'> {
  const index = orderCounter;
  return createOrder({
    ...options,
    status: 'REFUNDED',
    stripePaymentId: options.stripePaymentId ?? `pi_${index}_${Date.now()}`,
  });
}

/**
 * Crea órdenes para un usuario específico
 */
export function createOrdersForUser(userId: string, count: number, options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createOrder({ ...options, userId }));
}

/**
 * Crea órdenes para un vendedor específico
 */
export function createOrdersForSeller(sellerId: string, count: number, options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createOrder({ ...options, sellerId }));
}

/**
 * Crea múltiples órdenes
 */
export function createManyOrders(count: number, options: OrderFactoryOptions = {}): Omit<Order, 'createdAt' | 'updatedAt'>[] {
  return Array.from({ length: count }, () => createOrder(options));
}

/**
 * Resetea el contador de órdenes (útil entre tests)
 */
export function resetOrderCounter(): void {
  orderCounter = 0;
}
