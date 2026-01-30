const baseStyle = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  max-width: 600px;
  margin: 0 auto;
  padding: 24px;
  color: #333;
`;

const headerStyle = `
  background: linear-gradient(135deg, #6B21A8, #9333EA);
  color: white;
  padding: 32px 24px;
  text-align: center;
  border-radius: 8px 8px 0 0;
`;

const bodyStyle = `
  background: #ffffff;
  padding: 32px 24px;
  border: 1px solid #e5e7eb;
  border-top: none;
  border-radius: 0 0 8px 8px;
`;

const buttonStyle = `
  display: inline-block;
  background: #9333EA;
  color: white;
  padding: 12px 32px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 600;
  margin: 16px 0;
`;

function wrap(title: string, content: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="${baseStyle}">
  <div style="${headerStyle}">
    <h1 style="margin:0;font-size:24px;">Guelaguetza Connect</h1>
    <p style="margin:8px 0 0;opacity:0.9;">${title}</p>
  </div>
  <div style="${bodyStyle}">
    ${content}
  </div>
  <p style="text-align:center;color:#9ca3af;font-size:12px;margin-top:16px;">
    Guelaguetza Connect - La app de la fiesta mas grande de Oaxaca
  </p>
</body>
</html>`;
}

export function welcomeTemplate(nombre: string): string {
  return wrap('Bienvenido', `
    <h2>Hola ${nombre},</h2>
    <p>Te damos la bienvenida a <strong>Guelaguetza Connect</strong>, tu plataforma para vivir la Guelaguetza al maximo.</p>
    <p>Con tu cuenta puedes:</p>
    <ul>
      <li>Reservar experiencias culturales</li>
      <li>Comprar artesanias del marketplace</li>
      <li>Seguir rutas de transporte en tiempo real</li>
      <li>Conectar con la comunidad oaxaquena</li>
    </ul>
    <p>Que disfrutes la maxima fiesta de Oaxaca.</p>
  `);
}

export function resetPasswordTemplate(nombre: string, resetUrl: string): string {
  return wrap('Restablecer Contrasena', `
    <h2>Hola ${nombre},</h2>
    <p>Recibimos una solicitud para restablecer tu contrasena.</p>
    <p style="text-align:center;">
      <a href="${resetUrl}" style="${buttonStyle}">Restablecer Contrasena</a>
    </p>
    <p>Este enlace expira en <strong>1 hora</strong>.</p>
    <p style="color:#6b7280;font-size:14px;">Si no solicitaste este cambio, puedes ignorar este correo.</p>
  `);
}

export function bookingConfirmedTemplate(data: {
  userName: string;
  experienceTitle: string;
  date: string;
  startTime: string;
  guestCount: number;
  totalPrice: number;
}): string {
  return wrap('Reserva Confirmada', `
    <h2>Hola ${data.userName},</h2>
    <p>Tu reserva ha sido confirmada:</p>
    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">Experiencia</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.experienceTitle}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">Fecha</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.date}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">Hora</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.startTime}</td></tr>
      <tr><td style="padding:8px;border-bottom:1px solid #e5e7eb;font-weight:600;">Personas</td><td style="padding:8px;border-bottom:1px solid #e5e7eb;">${data.guestCount}</td></tr>
      <tr><td style="padding:8px;font-weight:600;">Total</td><td style="padding:8px;font-weight:600;">$${data.totalPrice.toFixed(2)} MXN</td></tr>
    </table>
    <p>Te esperamos.</p>
  `);
}

export function orderPaidTemplate(data: {
  userName: string;
  orderId: string;
  items: Array<{ productName: string; quantity: number }>;
  amount: number;
}): string {
  const itemsList = data.items.map(i => `<li>${i.productName} x${i.quantity}</li>`).join('');
  return wrap('Pago Confirmado', `
    <h2>Hola ${data.userName},</h2>
    <p>Tu pago ha sido procesado correctamente.</p>
    <p><strong>Orden:</strong> ${data.orderId.slice(0, 8)}</p>
    <p><strong>Productos:</strong></p>
    <ul>${itemsList}</ul>
    <p><strong>Total:</strong> $${data.amount.toFixed(2)} MXN</p>
    <p>Te notificaremos cuando tu pedido sea enviado.</p>
  `);
}
