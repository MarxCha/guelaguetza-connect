import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import {
  BookingStatusBadge,
  OrderStatusBadge,
  canCancelBooking,
  canRetryBookingPayment,
  canReviewBooking,
  canCancelOrder,
  canRetryOrderPayment,
  BOOKING_STATUS_LABELS,
  ORDER_STATUS_LABELS,
} from './StatusBadge';

describe('BookingStatusBadge', () => {
  it('muestra el badge de PENDING_PAYMENT correctamente', () => {
    render(<BookingStatusBadge status="PENDING_PAYMENT" />);
    expect(screen.getByRole('status')).toHaveTextContent('Procesando pago');
    expect(screen.getByLabelText('Pago en proceso')).toBeInTheDocument();
  });

  it('muestra el badge de PAYMENT_FAILED correctamente', () => {
    render(<BookingStatusBadge status="PAYMENT_FAILED" />);
    expect(screen.getByRole('status')).toHaveTextContent('Error en pago');
    expect(screen.getByLabelText('El pago ha fallado')).toBeInTheDocument();
  });

  it('muestra el badge de PENDING correctamente', () => {
    render(<BookingStatusBadge status="PENDING" />);
    expect(screen.getByRole('status')).toHaveTextContent('Pendiente');
    expect(screen.getByLabelText('Reservación pendiente')).toBeInTheDocument();
  });

  it('muestra el badge de CONFIRMED correctamente', () => {
    render(<BookingStatusBadge status="CONFIRMED" />);
    expect(screen.getByRole('status')).toHaveTextContent('Confirmado');
    expect(screen.getByLabelText('Reservación confirmada')).toBeInTheDocument();
  });

  it('muestra el badge de CANCELLED correctamente', () => {
    render(<BookingStatusBadge status="CANCELLED" />);
    expect(screen.getByRole('status')).toHaveTextContent('Cancelado');
    expect(screen.getByLabelText('Reservación cancelada')).toBeInTheDocument();
  });

  it('muestra el badge de COMPLETED correctamente', () => {
    render(<BookingStatusBadge status="COMPLETED" />);
    expect(screen.getByRole('status')).toHaveTextContent('Completado');
    expect(screen.getByLabelText('Reservación completada')).toBeInTheDocument();
  });

  it('oculta el label cuando showLabel es false', () => {
    render(<BookingStatusBadge status="CONFIRMED" showLabel={false} />);
    expect(screen.queryByText('Confirmado')).not.toBeInTheDocument();
    // Pero el aria-label debe estar presente
    expect(screen.getByLabelText('Reservación confirmada')).toBeInTheDocument();
  });

  it('aplica clases personalizadas', () => {
    const { container } = render(
      <BookingStatusBadge status="CONFIRMED" className="custom-class" />
    );
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('aplica el tamaño small correctamente', () => {
    const { container } = render(<BookingStatusBadge status="CONFIRMED" size="sm" />);
    expect(container.firstChild).toHaveClass('text-xs', 'px-2', 'py-1');
  });

  it('aplica el tamaño large correctamente', () => {
    const { container } = render(<BookingStatusBadge status="CONFIRMED" size="lg" />);
    expect(container.firstChild).toHaveClass('text-base', 'px-4', 'py-2');
  });
});

describe('OrderStatusBadge', () => {
  it('muestra el badge de PENDING_PAYMENT correctamente', () => {
    render(<OrderStatusBadge status="PENDING_PAYMENT" />);
    expect(screen.getByRole('status')).toHaveTextContent('Procesando pago');
    expect(screen.getByLabelText('Pago en proceso')).toBeInTheDocument();
  });

  it('muestra el badge de PAYMENT_FAILED correctamente', () => {
    render(<OrderStatusBadge status="PAYMENT_FAILED" />);
    expect(screen.getByRole('status')).toHaveTextContent('Error en pago');
    expect(screen.getByLabelText('El pago ha fallado')).toBeInTheDocument();
  });

  it('muestra el badge de PAID correctamente', () => {
    render(<OrderStatusBadge status="PAID" />);
    expect(screen.getByRole('status')).toHaveTextContent('Pagado');
    expect(screen.getByLabelText('Orden pagada')).toBeInTheDocument();
  });

  it('muestra el badge de SHIPPED correctamente', () => {
    render(<OrderStatusBadge status="SHIPPED" />);
    expect(screen.getByRole('status')).toHaveTextContent('Enviado');
    expect(screen.getByLabelText('Orden enviada')).toBeInTheDocument();
  });

  it('muestra el badge de DELIVERED correctamente', () => {
    render(<OrderStatusBadge status="DELIVERED" />);
    expect(screen.getByRole('status')).toHaveTextContent('Entregado');
    expect(screen.getByLabelText('Orden entregada')).toBeInTheDocument();
  });

  it('muestra el badge de REFUNDED correctamente', () => {
    render(<OrderStatusBadge status="REFUNDED" />);
    expect(screen.getByRole('status')).toHaveTextContent('Reembolsado');
    expect(screen.getByLabelText('Orden reembolsada')).toBeInTheDocument();
  });
});

describe('Booking Helper Functions', () => {
  describe('canCancelBooking', () => {
    it('retorna true para PENDING', () => {
      expect(canCancelBooking('PENDING')).toBe(true);
    });

    it('retorna true para CONFIRMED', () => {
      expect(canCancelBooking('CONFIRMED')).toBe(true);
    });

    it('retorna false para PENDING_PAYMENT', () => {
      expect(canCancelBooking('PENDING_PAYMENT')).toBe(false);
    });

    it('retorna false para PAYMENT_FAILED', () => {
      expect(canCancelBooking('PAYMENT_FAILED')).toBe(false);
    });

    it('retorna false para CANCELLED', () => {
      expect(canCancelBooking('CANCELLED')).toBe(false);
    });

    it('retorna false para COMPLETED', () => {
      expect(canCancelBooking('COMPLETED')).toBe(false);
    });
  });

  describe('canRetryBookingPayment', () => {
    it('retorna true solo para PAYMENT_FAILED', () => {
      expect(canRetryBookingPayment('PAYMENT_FAILED')).toBe(true);
    });

    it('retorna false para otros estados', () => {
      expect(canRetryBookingPayment('PENDING_PAYMENT')).toBe(false);
      expect(canRetryBookingPayment('PENDING')).toBe(false);
      expect(canRetryBookingPayment('CONFIRMED')).toBe(false);
      expect(canRetryBookingPayment('CANCELLED')).toBe(false);
      expect(canRetryBookingPayment('COMPLETED')).toBe(false);
    });
  });

  describe('canReviewBooking', () => {
    it('retorna true solo para COMPLETED', () => {
      expect(canReviewBooking('COMPLETED')).toBe(true);
    });

    it('retorna false para otros estados', () => {
      expect(canReviewBooking('PENDING_PAYMENT')).toBe(false);
      expect(canReviewBooking('PAYMENT_FAILED')).toBe(false);
      expect(canReviewBooking('PENDING')).toBe(false);
      expect(canReviewBooking('CONFIRMED')).toBe(false);
      expect(canReviewBooking('CANCELLED')).toBe(false);
    });
  });
});

describe('Order Helper Functions', () => {
  describe('canCancelOrder', () => {
    it('retorna true para PENDING_PAYMENT', () => {
      expect(canCancelOrder('PENDING_PAYMENT')).toBe(true);
    });

    it('retorna true para PENDING', () => {
      expect(canCancelOrder('PENDING')).toBe(true);
    });

    it('retorna true para PAID', () => {
      expect(canCancelOrder('PAID')).toBe(true);
    });

    it('retorna false para PROCESSING', () => {
      expect(canCancelOrder('PROCESSING')).toBe(false);
    });

    it('retorna false para SHIPPED', () => {
      expect(canCancelOrder('SHIPPED')).toBe(false);
    });

    it('retorna false para DELIVERED', () => {
      expect(canCancelOrder('DELIVERED')).toBe(false);
    });
  });

  describe('canRetryOrderPayment', () => {
    it('retorna true solo para PAYMENT_FAILED', () => {
      expect(canRetryOrderPayment('PAYMENT_FAILED')).toBe(true);
    });

    it('retorna false para otros estados', () => {
      expect(canRetryOrderPayment('PENDING_PAYMENT')).toBe(false);
      expect(canRetryOrderPayment('PENDING')).toBe(false);
      expect(canRetryOrderPayment('PAID')).toBe(false);
      expect(canRetryOrderPayment('SHIPPED')).toBe(false);
    });
  });
});

describe('Status Labels', () => {
  it('tiene todos los labels de booking definidos', () => {
    expect(BOOKING_STATUS_LABELS.PENDING_PAYMENT).toBe('Procesando pago');
    expect(BOOKING_STATUS_LABELS.PAYMENT_FAILED).toBe('Error en pago');
    expect(BOOKING_STATUS_LABELS.PENDING).toBe('Pendiente');
    expect(BOOKING_STATUS_LABELS.CONFIRMED).toBe('Confirmado');
    expect(BOOKING_STATUS_LABELS.CANCELLED).toBe('Cancelado');
    expect(BOOKING_STATUS_LABELS.COMPLETED).toBe('Completado');
  });

  it('tiene todos los labels de order definidos', () => {
    expect(ORDER_STATUS_LABELS.PENDING_PAYMENT).toBe('Procesando pago');
    expect(ORDER_STATUS_LABELS.PAYMENT_FAILED).toBe('Error en pago');
    expect(ORDER_STATUS_LABELS.PENDING).toBe('Pendiente');
    expect(ORDER_STATUS_LABELS.PAID).toBe('Pagado');
    expect(ORDER_STATUS_LABELS.PROCESSING).toBe('Procesando');
    expect(ORDER_STATUS_LABELS.SHIPPED).toBe('Enviado');
    expect(ORDER_STATUS_LABELS.DELIVERED).toBe('Entregado');
    expect(ORDER_STATUS_LABELS.CANCELLED).toBe('Cancelado');
    expect(ORDER_STATUS_LABELS.REFUNDED).toBe('Reembolsado');
  });
});

describe('Accesibilidad', () => {
  it('todos los badges tienen role="status"', () => {
    const { rerender } = render(<BookingStatusBadge status="PENDING" />);
    expect(screen.getByRole('status')).toBeInTheDocument();

    rerender(<OrderStatusBadge status="PAID" />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('todos los badges tienen aria-label descriptivo', () => {
    render(<BookingStatusBadge status="CONFIRMED" />);
    expect(screen.getByLabelText('Reservación confirmada')).toBeInTheDocument();
  });

  it('los iconos tienen aria-hidden="true"', () => {
    const { container } = render(<BookingStatusBadge status="CONFIRMED" />);
    const icon = container.querySelector('svg');
    expect(icon).toHaveAttribute('aria-hidden', 'true');
  });
});
