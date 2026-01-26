import React from 'react';
import {
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle,
  CheckCircle2,
  Hourglass,
  CreditCard,
  Loader2,
} from 'lucide-react';

// ============================================
// Types
// ============================================

export type BookingStatus =
  | 'PENDING_PAYMENT'
  | 'PAYMENT_FAILED'
  | 'PENDING'
  | 'CONFIRMED'
  | 'CANCELLED'
  | 'COMPLETED';

export type OrderStatus =
  | 'PENDING_PAYMENT'
  | 'PENDING'
  | 'PAYMENT_FAILED'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

type StatusSize = 'sm' | 'md' | 'lg';

// ============================================
// BookingStatusBadge Component
// ============================================

interface BookingStatusBadgeProps {
  status: BookingStatus;
  size?: StatusSize;
  showLabel?: boolean;
  className?: string;
}

/**
 * BookingStatusBadge - Badge para estados de reservaciones
 *
 * Features:
 * - Estados de pago (PENDING_PAYMENT, PAYMENT_FAILED)
 * - Estados de booking (PENDING, CONFIRMED, CANCELLED, COMPLETED)
 * - Iconos descriptivos
 * - Colores según estado
 * - Accesible (aria-label)
 *
 * Usage:
 * <BookingStatusBadge status="PENDING_PAYMENT" />
 * <BookingStatusBadge status="CONFIRMED" size="lg" />
 */
export const BookingStatusBadge: React.FC<BookingStatusBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const statusConfig: Record<
    BookingStatus,
    {
      label: string;
      icon: React.ReactNode;
      colors: string;
      bgColors: string;
      ariaLabel: string;
    }
  > = {
    PENDING_PAYMENT: {
      label: 'Procesando pago',
      icon: <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />,
      colors: 'text-amber-700 dark:text-amber-400',
      bgColors: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
      ariaLabel: 'Pago en proceso',
    },
    PAYMENT_FAILED: {
      label: 'Error en pago',
      icon: <XCircle className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-red-700 dark:text-red-400',
      bgColors: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
      ariaLabel: 'El pago ha fallado',
    },
    PENDING: {
      label: 'Pendiente',
      icon: <Hourglass className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-blue-700 dark:text-blue-400',
      bgColors: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
      ariaLabel: 'Reservación pendiente',
    },
    CONFIRMED: {
      label: 'Confirmado',
      icon: <CheckCircle className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-green-700 dark:text-green-400',
      bgColors: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
      ariaLabel: 'Reservación confirmada',
    },
    CANCELLED: {
      label: 'Cancelado',
      icon: <XCircle className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-gray-600 dark:text-gray-400',
      bgColors: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
      ariaLabel: 'Reservación cancelada',
    },
    COMPLETED: {
      label: 'Completado',
      icon: <CheckCircle2 className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-emerald-700 dark:text-emerald-400',
      bgColors: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
      ariaLabel: 'Reservación completada',
    },
  };

  const config = statusConfig[status];

  const sizes: Record<StatusSize, string> = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.colors} ${config.bgColors} ${sizes[size]} ${className}`}
      role="status"
      aria-label={config.ariaLabel}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

// ============================================
// OrderStatusBadge Component
// ============================================

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: StatusSize;
  showLabel?: boolean;
  className?: string;
}

/**
 * OrderStatusBadge - Badge para estados de órdenes del marketplace
 *
 * Features:
 * - Estados de pago y procesamiento
 * - Iconos descriptivos
 * - Colores según estado
 * - Accesible (aria-label)
 *
 * Usage:
 * <OrderStatusBadge status="PENDING_PAYMENT" />
 * <OrderStatusBadge status="SHIPPED" size="lg" />
 */
export const OrderStatusBadge: React.FC<OrderStatusBadgeProps> = ({
  status,
  size = 'md',
  showLabel = true,
  className = '',
}) => {
  const statusConfig: Record<
    OrderStatus,
    {
      label: string;
      icon: React.ReactNode;
      colors: string;
      bgColors: string;
      ariaLabel: string;
    }
  > = {
    PENDING_PAYMENT: {
      label: 'Procesando pago',
      icon: <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />,
      colors: 'text-amber-700 dark:text-amber-400',
      bgColors: 'bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800',
      ariaLabel: 'Pago en proceso',
    },
    PAYMENT_FAILED: {
      label: 'Error en pago',
      icon: <XCircle className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-red-700 dark:text-red-400',
      bgColors: 'bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800',
      ariaLabel: 'El pago ha fallado',
    },
    PENDING: {
      label: 'Pendiente',
      icon: <Clock className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-blue-700 dark:text-blue-400',
      bgColors: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
      ariaLabel: 'Orden pendiente',
    },
    PAID: {
      label: 'Pagado',
      icon: <CheckCircle className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-green-700 dark:text-green-400',
      bgColors: 'bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800',
      ariaLabel: 'Orden pagada',
    },
    PROCESSING: {
      label: 'Procesando',
      icon: <Hourglass className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-purple-700 dark:text-purple-400',
      bgColors: 'bg-purple-100 dark:bg-purple-900/30 border-purple-200 dark:border-purple-800',
      ariaLabel: 'Orden en proceso',
    },
    SHIPPED: {
      label: 'Enviado',
      icon: <CheckCircle className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-blue-700 dark:text-blue-400',
      bgColors: 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
      ariaLabel: 'Orden enviada',
    },
    DELIVERED: {
      label: 'Entregado',
      icon: <CheckCircle2 className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-emerald-700 dark:text-emerald-400',
      bgColors: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800',
      ariaLabel: 'Orden entregada',
    },
    CANCELLED: {
      label: 'Cancelado',
      icon: <XCircle className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-gray-600 dark:text-gray-400',
      bgColors: 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700',
      ariaLabel: 'Orden cancelada',
    },
    REFUNDED: {
      label: 'Reembolsado',
      icon: <AlertCircle className="w-4 h-4" aria-hidden="true" />,
      colors: 'text-orange-700 dark:text-orange-400',
      bgColors: 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800',
      ariaLabel: 'Orden reembolsada',
    },
  };

  const config = statusConfig[status];

  const sizes: Record<StatusSize, string> = {
    sm: 'text-xs px-2 py-1 gap-1',
    md: 'text-sm px-3 py-1.5 gap-1.5',
    lg: 'text-base px-4 py-2 gap-2',
  };

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full border ${config.colors} ${config.bgColors} ${sizes[size]} ${className}`}
      role="status"
      aria-label={config.ariaLabel}
    >
      {config.icon}
      {showLabel && <span>{config.label}</span>}
    </span>
  );
};

// ============================================
// Helper Functions & Constants
// ============================================

export const BOOKING_STATUS_LABELS: Record<BookingStatus, string> = {
  PENDING_PAYMENT: 'Procesando pago',
  PAYMENT_FAILED: 'Error en pago',
  PENDING: 'Pendiente',
  CONFIRMED: 'Confirmado',
  CANCELLED: 'Cancelado',
  COMPLETED: 'Completado',
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING_PAYMENT: 'Procesando pago',
  PAYMENT_FAILED: 'Error en pago',
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  PROCESSING: 'Procesando',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
  REFUNDED: 'Reembolsado',
};

/**
 * Determina si un booking puede ser cancelado
 */
export function canCancelBooking(status: BookingStatus): boolean {
  return status === 'PENDING' || status === 'CONFIRMED';
}

/**
 * Determina si un booking puede ser reintentado (pago fallido)
 */
export function canRetryBookingPayment(status: BookingStatus): boolean {
  return status === 'PAYMENT_FAILED';
}

/**
 * Determina si un booking puede ser reseñado
 */
export function canReviewBooking(status: BookingStatus): boolean {
  return status === 'COMPLETED';
}

/**
 * Determina si una orden puede ser cancelada
 */
export function canCancelOrder(status: OrderStatus): boolean {
  return status === 'PENDING_PAYMENT' || status === 'PENDING' || status === 'PAID';
}

/**
 * Determina si una orden puede reintentarse (pago fallido)
 */
export function canRetryOrderPayment(status: OrderStatus): boolean {
  return status === 'PAYMENT_FAILED';
}
