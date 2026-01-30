import { Resend } from 'resend';
import { welcomeTemplate, resetPasswordTemplate, bookingConfirmedTemplate, orderPaidTemplate } from '../templates/index.js';

const FROM_EMAIL = process.env.EMAIL_FROM || 'Guelaguetza Connect <noreply@guelaguetzaconnect.com>';

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Email] RESEND_API_KEY not set, emails will be logged only');
    return null;
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

async function sendEmail(options: SendEmailOptions): Promise<boolean> {
  const client = getResendClient();

  if (!client) {
    console.log(`[Email] (dev) To: ${options.to} | Subject: ${options.subject}`);
    return true;
  }

  try {
    await client.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });
    return true;
  } catch (error) {
    console.error('[Email] Failed to send:', error);
    return false;
  }
}

export const EmailService = {
  async sendWelcome(to: string, nombre: string): Promise<boolean> {
    return sendEmail({
      to,
      subject: 'Bienvenido a Guelaguetza Connect',
      html: welcomeTemplate(nombre),
    });
  },

  async sendResetPassword(to: string, nombre: string, resetUrl: string): Promise<boolean> {
    return sendEmail({
      to,
      subject: 'Restablecer contraseña - Guelaguetza Connect',
      html: resetPasswordTemplate(nombre, resetUrl),
    });
  },

  async sendBookingConfirmed(to: string, data: {
    userName: string;
    experienceTitle: string;
    date: string;
    startTime: string;
    guestCount: number;
    totalPrice: number;
  }): Promise<boolean> {
    return sendEmail({
      to,
      subject: `Reserva confirmada: ${data.experienceTitle}`,
      html: bookingConfirmedTemplate(data),
    });
  },

  async sendOrderPaid(to: string, data: {
    userName: string;
    orderId: string;
    items: Array<{ productName: string; quantity: number }>;
    amount: number;
  }): Promise<boolean> {
    return sendEmail({
      to,
      subject: `Pago confirmado - Orden ${data.orderId.slice(0, 8)}`,
      html: orderPaidTemplate(data),
    });
  },
};
