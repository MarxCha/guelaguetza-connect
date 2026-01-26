import Stripe from 'stripe';
import {
  stripeApiDuration,
  paymentsProcessedTotal,
  startTimerWithLabels,
} from '../utils/metrics.js';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not set - payment features will be disabled');
}

const stripe = stripeSecretKey
  ? new Stripe(stripeSecretKey, { apiVersion: '2025-04-30.basil' })
  : null;

export class StripeService {
  private static instance: StripeService;

  private constructor() {}

  static getInstance(): StripeService {
    if (!StripeService.instance) {
      StripeService.instance = new StripeService();
    }
    return StripeService.instance;
  }

  isEnabled(): boolean {
    return stripe !== null;
  }

  // Create a payment intent for orders/bookings
  async createPaymentIntent(params: {
    amount: number; // in cents
    currency?: string;
    metadata?: Record<string, string>;
    description?: string;
  }): Promise<{ clientSecret: string; paymentIntentId: string } | null> {
    const endTimer = startTimerWithLabels(stripeApiDuration);
    const paymentType = params.metadata?.bookingId ? 'booking' : 'order';

    if (!stripe) {
      console.warn('Stripe not configured - returning mock payment');
      paymentsProcessedTotal.inc({ status: 'mock', type: paymentType });
      endTimer({ operation: 'create_payment_intent' });
      return {
        clientSecret: 'mock_client_secret',
        paymentIntentId: 'mock_pi_' + Date.now(),
      };
    }

    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: params.amount,
        currency: params.currency || 'mxn',
        metadata: params.metadata,
        description: params.description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      paymentsProcessedTotal.inc({ status: 'pending', type: paymentType });
      endTimer({ operation: 'create_payment_intent' });

      return {
        clientSecret: paymentIntent.client_secret!,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      paymentsProcessedTotal.inc({ status: 'failed', type: paymentType });
      endTimer({ operation: 'create_payment_intent' });
      throw error;
    }
  }

  // Confirm payment status
  async getPaymentStatus(paymentIntentId: string): Promise<string> {
    const endTimer = startTimerWithLabels(stripeApiDuration);

    if (!stripe) {
      endTimer({ operation: 'get_status' });
      return 'succeeded'; // Mock for development
    }

    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      endTimer({ operation: 'get_status' });
      return paymentIntent.status;
    } catch (error) {
      endTimer({ operation: 'get_status' });
      throw error;
    }
  }

  // Cancel a payment intent
  async cancelPaymentIntent(paymentIntentId: string): Promise<boolean> {
    const endTimer = startTimerWithLabels(stripeApiDuration);

    if (!stripe) {
      endTimer({ operation: 'cancel' });
      return true;
    }

    try {
      await stripe.paymentIntents.cancel(paymentIntentId);
      endTimer({ operation: 'cancel' });
      return true;
    } catch {
      endTimer({ operation: 'cancel' });
      return false;
    }
  }

  // Refund a payment
  async createRefund(paymentIntentId: string, amount?: number): Promise<boolean> {
    const endTimer = startTimerWithLabels(stripeApiDuration);

    if (!stripe) {
      paymentsProcessedTotal.inc({ status: 'refunded', type: 'refund' });
      endTimer({ operation: 'refund' });
      return true;
    }

    try {
      await stripe.refunds.create({
        payment_intent: paymentIntentId,
        amount: amount, // If undefined, refunds full amount
      });
      paymentsProcessedTotal.inc({ status: 'refunded', type: 'refund' });
      endTimer({ operation: 'refund' });
      return true;
    } catch {
      paymentsProcessedTotal.inc({ status: 'failed', type: 'refund' });
      endTimer({ operation: 'refund' });
      return false;
    }
  }

  // Create connected account for sellers (Marketplace)
  async createConnectedAccount(email: string): Promise<string | null> {
    if (!stripe) {
      return 'mock_acct_' + Date.now();
    }

    const account = await stripe.accounts.create({
      type: 'express',
      country: 'MX',
      email,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
    });

    return account.id;
  }

  // Create account link for seller onboarding
  async createAccountLink(accountId: string, refreshUrl: string, returnUrl: string): Promise<string | null> {
    if (!stripe) {
      return returnUrl;
    }

    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: refreshUrl,
      return_url: returnUrl,
      type: 'account_onboarding',
    });

    return accountLink.url;
  }

  // Construct webhook event
  constructWebhookEvent(payload: string | Buffer, signature: string): Stripe.Event | null {
    if (!stripe) {
      return null;
    }

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error('STRIPE_WEBHOOK_SECRET not configured');
    }

    return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}

export const stripeService = StripeService.getInstance();
