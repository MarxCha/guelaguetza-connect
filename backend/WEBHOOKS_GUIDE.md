# Guía de Webhooks de Stripe - Guelaguetza Connect

## Descripción General

El sistema de webhooks permite a Stripe notificar a nuestra aplicación sobre eventos importantes de pago en tiempo real, garantizando que el estado de bookings y órdenes se actualice automáticamente cuando se completan o fallan pagos.

## Arquitectura

```
┌─────────────┐           ┌──────────────────┐           ┌──────────────────┐
│             │  Evento   │                  │  Procesa  │                  │
│   Stripe    │ ────────> │  POST /webhooks  │ ────────> │  BookingService  │
│             │           │      /stripe     │           │  MarketplaceServ │
└─────────────┘           └──────────────────┘           └──────────────────┘
                                   │
                                   │ Verifica firma
                                   │ con secret
                                   ▼
                          STRIPE_WEBHOOK_SECRET
```

## Endpoint

**URL**: `POST /api/webhooks/stripe`

**Características**:
- No requiere autenticación JWT
- Verifica la firma de Stripe con `STRIPE_WEBHOOK_SECRET`
- Procesa el `rawBody` para verificación de firma
- Implementa idempotencia para evitar procesamiento duplicado
- Logging detallado de todos los eventos

## Eventos Manejados

### 1. payment_intent.succeeded

Se dispara cuando un pago se completa exitosamente.

**Flujo para Bookings**:
1. Extraer `bookingId` del metadata
2. Verificar estado actual (idempotencia)
3. Marcar booking como `CONFIRMED`
4. Registrar `confirmedAt`

**Flujo para Órdenes**:
1. Extraer `orderId` del metadata
2. Verificar estado actual (idempotencia)
3. Marcar orden como `PAID`

**Lógica de Idempotencia**:
- Si ya está en `CONFIRMED` → No hacer nada
- Si ya está en estado final (`COMPLETED`, `CANCELLED`) → Advertencia y skip
- Verificar que el `paymentIntentId` coincida

### 2. payment_intent.payment_failed

Se dispara cuando un pago falla (tarjeta rechazada, fondos insuficientes, etc.)

**Flujo**:
1. Extraer `bookingId` u `orderId` del metadata
2. Marcar como `PAYMENT_FAILED`
3. Registrar el error en logs

**Lógica de Idempotencia**:
- Si ya está en `PAYMENT_FAILED` → Skip
- Si ya está confirmado/pagado → No sobrescribir

### 3. charge.refunded

Se dispara cuando se procesa un reembolso (manual o automático).

**Flujo para Bookings**:
1. Buscar booking por `stripePaymentId`
2. Marcar como `CANCELLED`
3. Restaurar capacidad del `timeSlot` (decrement `bookedCount`)
4. Registrar `cancelledAt`

**Flujo para Órdenes**:
1. Buscar orden por `stripePaymentId`
2. Marcar como `REFUNDED`

**Lógica de Idempotencia**:
- Si ya está en `CANCELLED`/`REFUNDED` → Skip
- Si está `COMPLETED` → Registrar advertencia (requiere revisión manual)

## Configuración

### Variables de Entorno

Agregar al archivo `.env`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Obtener el Webhook Secret

1. Ir al Dashboard de Stripe: https://dashboard.stripe.com/webhooks
2. Crear un nuevo endpoint webhook
3. URL: `https://tu-dominio.com/api/webhooks/stripe`
4. Eventos a escuchar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copiar el `Signing secret` y agregarlo a `.env` como `STRIPE_WEBHOOK_SECRET`

## Testing Local con Stripe CLI

### 1. Instalar Stripe CLI

```bash
# macOS
brew install stripe/stripe-cli/stripe

# Linux
wget https://github.com/stripe/stripe-cli/releases/download/v1.19.4/stripe_1.19.4_linux_x86_64.tar.gz
tar -xvf stripe_1.19.4_linux_x86_64.tar.gz

# Windows
scoop install stripe
```

### 2. Autenticarse

```bash
stripe login
```

### 3. Forwarding de Webhooks

```bash
# Forward webhooks a tu servidor local
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Output:
# > Ready! Your webhook signing secret is whsec_xxx (^C to quit)
```

Copiar el `webhook signing secret` y agregarlo a `.env`:

```bash
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

### 4. Trigger de Eventos de Prueba

```bash
# Simular pago exitoso
stripe trigger payment_intent.succeeded

# Simular pago fallido
stripe trigger payment_intent.payment_failed

# Simular reembolso
stripe trigger charge.refunded
```

### 5. Testing con cURL

```bash
# Crear un test webhook (sin firma, para debug)
curl -X POST http://localhost:3001/api/webhooks/stripe \
  -H "Content-Type: application/json" \
  -H "stripe-signature: test_signature" \
  -d '{
    "type": "payment_intent.succeeded",
    "data": {
      "object": {
        "id": "pi_test_123",
        "amount": 5000,
        "metadata": {
          "bookingId": "clxxx123"
        }
      }
    }
  }'
```

**Nota**: Este request fallará por firma inválida. Usar `stripe trigger` para testing real.

## Logs y Debugging

El sistema implementa logging detallado:

```json
{
  "level": "info",
  "msg": "Stripe webhook event received",
  "type": "payment_intent.succeeded",
  "id": "evt_xxx",
  "created": 1234567890,
  "livemode": false
}
```

```json
{
  "level": "info",
  "msg": "Booking confirmed successfully",
  "bookingId": "clxxx123",
  "experienceId": "clyyy456",
  "userId": "clzzz789",
  "amount": 50.00
}
```

Ver logs en tiempo real:

```bash
cd backend
npm run dev

# En otra terminal
stripe listen --forward-to localhost:3001/api/webhooks/stripe
stripe trigger payment_intent.succeeded
```

## Seguridad

### Verificación de Firma

Cada request de Stripe incluye un header `stripe-signature` con:
- Timestamp del evento
- Firma HMAC del payload con el webhook secret

El sistema verifica:
1. Que la firma sea válida
2. Que el timestamp no sea muy antiguo (previene replay attacks)

```typescript
const event = stripeService.constructWebhookEvent(rawBody, signature);
// Si la firma es inválida, lanza una excepción
```

### Manejo de Errores

- **400**: Firma inválida o missing
- **200**: Evento procesado correctamente (o error de lógica de negocio)
- **500**: Error inesperado del servidor (Stripe reintentará)

## Estados de Bookings

```
PENDING_PAYMENT ──┬──> payment_intent.succeeded ──> CONFIRMED
                  │
                  └──> payment_intent.payment_failed ──> PAYMENT_FAILED

CONFIRMED ──> charge.refunded ──> CANCELLED
```

## Estados de Órdenes

```
PENDING_PAYMENT ──┬──> payment_intent.succeeded ──> PAID
                  │
                  └──> payment_intent.payment_failed ──> PAYMENT_FAILED

PAID ──> charge.refunded ──> REFUNDED
```

## Monitoreo

### Dashboard de Stripe

Ver todos los webhooks en: https://dashboard.stripe.com/webhooks

- Eventos enviados
- Respuestas recibidas
- Reintentos
- Errores

### Logs de la Aplicación

```bash
# Filtrar solo webhooks
tail -f backend/logs/app.log | grep webhook

# Ver solo errores
tail -f backend/logs/app.log | grep -E "ERROR|WARN"
```

## Reintentos

Stripe reintenta automáticamente webhooks fallidos:
- Primer reintento: Inmediatamente
- Siguientes reintentos: Con backoff exponencial
- Hasta 3 días de reintentos

**Importante**: Implementar idempotencia para evitar procesamiento duplicado.

## Producción

### Checklist de Deployment

- [ ] Configurar `STRIPE_WEBHOOK_SECRET` en producción
- [ ] Crear webhook endpoint en Stripe Dashboard con URL de producción
- [ ] Habilitar solo eventos necesarios
- [ ] Configurar notificaciones de fallos en Stripe
- [ ] Monitorear logs de webhooks
- [ ] Configurar alertas para tasas de error >5%

### URL de Producción

```
https://api.guelaguetza-connect.com/api/webhooks/stripe
```

### Rollback Plan

Si los webhooks fallan:
1. Deshabilitar webhook en Stripe Dashboard
2. Procesar pagos manualmente desde Stripe Dashboard
3. Usar script de sincronización:

```bash
npm run sync:payments
```

## Troubleshooting

### Error: "Webhook signature verification failed"

**Causa**: Secret incorrecto o request modificado

**Solución**:
1. Verificar que `STRIPE_WEBHOOK_SECRET` esté configurado
2. Verificar que no haya middleware modificando el body
3. Usar `stripe listen` para obtener el secret correcto

### Error: "Booking not found"

**Causa**: Metadata incorrecto o booking eliminado

**Solución**:
1. Verificar que el `createBooking` esté guardando el `bookingId` en metadata
2. Revisar logs de creación de booking
3. Buscar el booking en la BD manualmente

### Evento no procesado

**Causa**: Tipo de evento no manejado

**Solución**:
1. Revisar logs: "Unhandled webhook event type"
2. Agregar handler si es necesario
3. Actualizar eventos en Stripe Dashboard

### Procesamiento duplicado

**Causa**: Falla en la idempotencia

**Solución**:
1. Verificar que se esté comprobando el estado actual
2. Agregar logs de "skipping" para detectar duplicados
3. Revisar la lógica de transiciones de estado

## Próximas Mejoras

- [ ] Agregar tabla de auditoría de webhooks
- [ ] Implementar sistema de notificaciones al usuario
- [ ] Agregar métricas de procesamiento de webhooks
- [ ] Implementar dead letter queue para eventos fallidos
- [ ] Agregar tests de integración con Stripe
- [ ] Implementar circuit breaker para fallos de BD

## Referencias

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)
