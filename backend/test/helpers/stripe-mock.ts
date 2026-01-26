import { vi } from 'vitest';

/**
 * Mock del servicio de Stripe para tests
 */
export const createStripeMock = () => {
  return {
    createPaymentIntent: vi.fn().mockResolvedValue({
      paymentIntentId: 'pi_test_123456789',
      clientSecret: 'pi_test_123456789_secret_abc',
    }),

    confirmPayment: vi.fn().mockResolvedValue({
      status: 'succeeded',
      paymentIntentId: 'pi_test_123456789',
    }),

    getPaymentStatus: vi.fn().mockResolvedValue('succeeded'),

    createRefund: vi.fn().mockResolvedValue({
      refundId: 'ref_test_123456789',
      status: 'succeeded',
      amount: 100000,
    }),

    isEnabled: vi.fn().mockReturnValue(true),

    // Helper para simular error de Stripe
    mockPaymentError: () => {
      this.createPaymentIntent.mockRejectedValueOnce(
        new Error('Stripe API Error: card_declined')
      );
    },

    // Helper para simular error de reembolso
    mockRefundError: () => {
      this.createRefund.mockRejectedValueOnce(
        new Error('Stripe API Error: refund_failed')
      );
    },
  };
};

/**
 * Mock simplificado para tests unitarios
 */
export const stripeServiceMock = {
  createPaymentIntent: vi.fn().mockResolvedValue({
    paymentIntentId: 'pi_test_123',
    clientSecret: 'pi_test_123_secret',
  }),
  confirmPayment: vi.fn().mockResolvedValue({ status: 'succeeded' }),
  getPaymentStatus: vi.fn().mockResolvedValue('succeeded'),
  createRefund: vi.fn().mockResolvedValue({ refundId: 'ref_test_123' }),
  isEnabled: vi.fn().mockReturnValue(true),
};
