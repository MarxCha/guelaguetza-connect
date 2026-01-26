# Ejemplos de Uso - Sistema de Webhooks

## Tabla de Contenidos

1. [Configuración Inicial](#configuración-inicial)
2. [Testing Local](#testing-local)
3. [Ejemplos de Eventos](#ejemplos-de-eventos)
4. [Sincronización Manual](#sincronización-manual)
5. [Monitoreo](#monitoreo)

---

## Configuración Inicial

### 1. Variables de Entorno

Crear o actualizar el archivo `.env`:

```bash
# Stripe Configuration
STRIPE_SECRET_KEY=sk_test_51ABC...
STRIPE_WEBHOOK_SECRET=whsec_123...

# Database
DATABASE_URL="postgresql://user:password@localhost:5432/guelaguetza"

# Server
PORT=3001
HOST=0.0.0.0
```

### 2. Obtener Webhook Secret (Desarrollo)

```bash
# Terminal 1: Iniciar el servidor
cd backend
npm run dev

# Terminal 2: Iniciar Stripe CLI
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Output:
# > Ready! Your webhook signing secret is whsec_abc123xyz... (^C to quit)

# Copiar el secret a .env
echo "STRIPE_WEBHOOK_SECRET=whsec_abc123xyz..." >> .env

# Reiniciar el servidor para que tome la nueva variable
```

### 3. Obtener Webhook Secret (Producción)

1. Ir a https://dashboard.stripe.com/webhooks
2. Click en "Add endpoint"
3. URL: `https://api.guelaguetza-connect.com/api/webhooks/stripe`
4. Eventos a escuchar:
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Click en "Add endpoint"
6. Copiar el "Signing secret"
7. Agregarlo a las variables de entorno de producción

---

## Testing Local

### Setup Completo

```bash
# Terminal 1: Base de datos
docker-compose up -d postgres

# Terminal 2: Servidor
cd backend
npm run dev

# Terminal 3: Stripe CLI
stripe listen --forward-to localhost:3001/api/webhooks/stripe
```

### Trigger de Eventos de Prueba

```bash
# Pago exitoso
stripe trigger payment_intent.succeeded

# Pago fallido
stripe trigger payment_intent.payment_failed

# Reembolso
stripe trigger charge.refunded
```

### Crear Payment Intent con Metadata

```bash
# Crear payment intent para booking
stripe payment_intents create \
  --amount=5000 \
  --currency=mxn \
  --metadata[bookingId]=clxxxxxx123 \
  --metadata[experienceId]=clyyyyyy456 \
  --metadata[userId]=clzzzzzz789 \
  --description="Reservación: Tour de Mezcal"

# Confirmar el payment intent (simula pago exitoso)
stripe payment_intents confirm pi_xxx --payment-method=pm_card_visa
```

### Ver Logs en Tiempo Real

```bash
# Terminal 4: Ver logs del servidor
cd backend
tail -f logs/app.log | grep webhook

# O usar el logger de consola
# Los logs se mostrarán en la Terminal 2 (servidor)
```

---

## Ejemplos de Eventos

### 1. Payment Intent Succeeded - Booking

**Webhook recibido de Stripe:**

```json
{
  "id": "evt_1ABC123",
  "object": "event",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1ABC123",
      "amount": 5000,
      "currency": "mxn",
      "status": "succeeded",
      "metadata": {
        "bookingId": "clxxxxxx123",
        "experienceId": "clyyyyyy456",
        "userId": "clzzzzzz789",
        "guestCount": "2"
      }
    }
  }
}
```

**Logs del servidor:**

```
[INFO] Stripe webhook event received
  type: payment_intent.succeeded
  id: evt_1ABC123
  created: 1706123456
  livemode: false

[INFO] Processing payment_intent.succeeded
  paymentIntentId: pi_1ABC123
  amount: 5000
  metadata: { bookingId: 'clxxxxxx123', experienceId: 'clyyyyyy456', userId: 'clzzzzzz789' }

[INFO] Booking confirmed successfully
  bookingId: clxxxxxx123
  experienceId: clyyyyyy456
  userId: clzzzzzz789
  amount: 50.00
```

**Estado en la BD:**

```sql
-- Antes
SELECT id, status, confirmed_at, stripe_payment_id
FROM "Booking"
WHERE id = 'clxxxxxx123';

-- id: clxxxxxx123
-- status: PENDING
-- confirmed_at: NULL
-- stripe_payment_id: pi_1ABC123

-- Después del webhook
-- id: clxxxxxx123
-- status: CONFIRMED
-- confirmed_at: 2025-01-25 10:30:00
-- stripe_payment_id: pi_1ABC123
```

### 2. Payment Intent Failed - Booking

**Webhook recibido de Stripe:**

```json
{
  "type": "payment_intent.payment_failed",
  "data": {
    "object": {
      "id": "pi_1ABC123",
      "status": "requires_payment_method",
      "last_payment_error": {
        "message": "Your card was declined."
      },
      "metadata": {
        "bookingId": "clxxxxxx123"
      }
    }
  }
}
```

**Logs del servidor:**

```
[INFO] Stripe webhook event received
  type: payment_intent.payment_failed

[INFO] Processing payment_intent.payment_failed
  paymentIntentId: pi_1ABC123
  metadata: { bookingId: 'clxxxxxx123' }
  lastPaymentError: Your card was declined.

[INFO] Booking marked as PAYMENT_FAILED
  bookingId: clxxxxxx123
  error: Your card was declined.
```

**Estado en la BD:**

```sql
SELECT id, status FROM "Booking" WHERE id = 'clxxxxxx123';
-- status: PAYMENT_FAILED
```

### 3. Charge Refunded - Booking

**Webhook recibido de Stripe:**

```json
{
  "type": "charge.refunded",
  "data": {
    "object": {
      "id": "ch_1ABC123",
      "amount": 5000,
      "amount_refunded": 5000,
      "payment_intent": "pi_1ABC123",
      "refunded": true
    }
  }
}
```

**Logs del servidor:**

```
[INFO] Processing charge.refunded
  chargeId: ch_1ABC123
  paymentIntentId: pi_1ABC123
  amount: 5000
  amountRefunded: 5000

[INFO] Booking refunded and cancelled successfully
  bookingId: clxxxxxx123
  amountRefunded: 50.00
  guestCount: 2
```

**Estado en la BD:**

```sql
-- Booking cancelado
SELECT id, status, cancelled_at FROM "Booking" WHERE id = 'clxxxxxx123';
-- status: CANCELLED
-- cancelled_at: 2025-01-25 11:00:00

-- Capacidad del slot restaurada
SELECT id, booked_count, capacity FROM "ExperienceTimeSlot" WHERE id = 'slot123';
-- booked_count: 0 (decrementado en 2)
-- capacity: 10
```

### 4. Payment Intent Succeeded - Order

**Webhook recibido:**

```json
{
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_1DEF456",
      "amount": 30000,
      "metadata": {
        "orderId": "clorder123",
        "sellerId": "clseller456",
        "userId": "cluser789"
      }
    }
  }
}
```

**Logs:**

```
[INFO] Order marked as PAID successfully
  orderId: clorder123
  sellerId: clseller456
  userId: cluser789
  amount: 300.00
```

**Estado en BD:**

```sql
SELECT id, status FROM "Order" WHERE id = 'clorder123';
-- status: PAID
```

---

## Sincronización Manual

### Caso 1: Verificar un booking específico

```bash
# Verificar sin hacer cambios
npm run sync:payments -- --booking=clxxxxxx123 --dry-run

# Output:
# 🔄 Iniciando sincronización de pagos...
# ⚠️  MODO DRY-RUN: No se realizarán cambios en la BD
#
# 📋 Sincronizando bookings...
#    Encontrados: 1 bookings pendientes
#
#    🔍 Verificando booking clxxxxxx123
#       Payment Intent: pi_1ABC123
#       Estado en Stripe: succeeded
#       ✨ Actualizando: PENDING → CONFIRMED
#
# ✅ Sincronización completada
#    • 1 pagos sincronizados
#    • 0 errores

# Si todo se ve bien, ejecutar sin --dry-run
npm run sync:payments -- --booking=clxxxxxx123
```

### Caso 2: Sincronizar todos los pendientes

```bash
# Ver cuántos hay sin hacer cambios
npm run sync:payments -- --dry-run

# Output:
# 📋 Sincronizando bookings...
#    Encontrados: 15 bookings pendientes
#
# 🛒 Sincronizando órdenes...
#    Encontradas: 8 órdenes pendientes
#
# ✅ Sincronización completada
#    • 23 pagos sincronizados
#    • 0 errores

# Ejecutar la sincronización
npm run sync:payments
```

### Caso 3: Sincronizar rango de fechas

```bash
# Sincronizar bookings de ayer
npm run sync:payments -- --from=2025-01-24 --to=2025-01-25 --dry-run

# Si todo correcto, ejecutar
npm run sync:payments -- --from=2025-01-24 --to=2025-01-25
```

### Caso 4: Encontrar discrepancias

```bash
# Script para encontrar bookings con estados inconsistentes
npm run sync:payments -- --dry-run 2>&1 | grep "✨ Actualizando"

# Output:
#       ✨ Actualizando: PENDING → CONFIRMED
#       ✨ Actualizando: PENDING → CONFIRMED
#       ✨ Actualizando: PENDING_PAYMENT → PAYMENT_FAILED
```

---

## Monitoreo

### 1. Verificar Estado de Webhooks en Stripe

```bash
# Abrir dashboard de webhooks
open https://dashboard.stripe.com/webhooks

# Verificar:
# - Eventos recibidos
# - Respuestas del servidor
# - Reintentos
# - Errores
```

### 2. Logs en Tiempo Real

```bash
# Ver todos los webhooks
tail -f backend/logs/app.log | grep webhook

# Ver solo éxitos
tail -f backend/logs/app.log | grep "successfully"

# Ver solo errores
tail -f backend/logs/app.log | grep -E "ERROR|WARN"

# Ver webhooks de un tipo específico
tail -f backend/logs/app.log | grep "payment_intent.succeeded"
```

### 3. Query de Auditoría en BD

```sql
-- Bookings confirmados hoy
SELECT
  id,
  status,
  confirmed_at,
  stripe_payment_id
FROM "Booking"
WHERE status = 'CONFIRMED'
  AND confirmed_at::date = CURRENT_DATE
ORDER BY confirmed_at DESC;

-- Bookings con pagos fallidos
SELECT
  id,
  status,
  created_at,
  stripe_payment_id
FROM "Booking"
WHERE status = 'PAYMENT_FAILED'
ORDER BY created_at DESC
LIMIT 10;

-- Bookings pendientes por más de 30 minutos
SELECT
  id,
  status,
  created_at,
  EXTRACT(EPOCH FROM (NOW() - created_at))/60 as minutes_pending
FROM "Booking"
WHERE status IN ('PENDING', 'PENDING_PAYMENT')
  AND created_at < NOW() - INTERVAL '30 minutes'
ORDER BY created_at;
```

### 4. Verificar Salud del Sistema

```bash
# Endpoint de health check
curl http://localhost:3001/health

# Verificar webhook endpoint (debe retornar 400 sin firma)
curl -X POST http://localhost:3001/api/webhooks/stripe

# Output esperado:
# {"error":"Missing stripe-signature header"}
```

### 5. Alertas Recomendadas

**Configurar alertas para:**

1. **Tasa de Error >5%**
   ```
   (webhook_errors / webhook_total) > 0.05
   ```

2. **Bookings Pendientes por >1 hora**
   ```sql
   SELECT COUNT(*) FROM "Booking"
   WHERE status IN ('PENDING', 'PENDING_PAYMENT')
     AND created_at < NOW() - INTERVAL '1 hour'
   ```

3. **Webhook Signature Failures**
   ```
   grep "signature verification failed" logs/app.log | wc -l
   ```

---

## Troubleshooting Común

### Problema 1: Webhook no llega al servidor

**Diagnóstico:**
```bash
# Verificar que el servidor esté corriendo
curl http://localhost:3001/health

# Verificar que Stripe CLI esté forwardeando
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Verificar logs
tail -f backend/logs/app.log
```

**Solución:**
- Verificar firewall
- Verificar que el puerto 3001 esté abierto
- Verificar URL en Stripe Dashboard

### Problema 2: Signature verification failed

**Diagnóstico:**
```bash
# Ver el error completo
tail -f backend/logs/app.log | grep "signature verification failed"
```

**Solución:**
```bash
# Verificar que STRIPE_WEBHOOK_SECRET esté configurado
echo $STRIPE_WEBHOOK_SECRET

# Obtener el secret correcto
stripe listen --print-secret

# Actualizar .env
echo "STRIPE_WEBHOOK_SECRET=whsec_..." >> .env

# Reiniciar servidor
```

### Problema 3: Booking not found

**Diagnóstico:**
```sql
-- Buscar booking por payment intent
SELECT * FROM "Booking" WHERE stripe_payment_id = 'pi_1ABC123';

-- Buscar bookings recientes sin payment intent
SELECT * FROM "Booking"
WHERE stripe_payment_id IS NULL
  AND created_at > NOW() - INTERVAL '1 hour';
```

**Solución:**
- Verificar que el booking se esté creando con `stripePaymentId`
- Verificar que el metadata del payment intent tenga `bookingId`
- Usar script de sincronización

### Problema 4: Estado inconsistente

**Diagnóstico:**
```bash
# Verificar estado en Stripe
stripe payment_intents retrieve pi_1ABC123

# Verificar estado en BD
psql -d guelaguetza -c "SELECT * FROM \"Booking\" WHERE stripe_payment_id = 'pi_1ABC123'"
```

**Solución:**
```bash
# Sincronizar manualmente
npm run sync:payments -- --booking=clxxxxxx123
```

---

## Recursos Adicionales

### Stripe CLI Cheat Sheet

```bash
# Autenticarse
stripe login

# Ver eventos en tiempo real
stripe listen

# Forward a localhost
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# Trigger evento
stripe trigger payment_intent.succeeded

# Ver payment intent
stripe payment_intents retrieve pi_xxx

# Ver eventos recientes
stripe events list --limit 10

# Ver detalles de un evento
stripe events retrieve evt_xxx
```

### Comandos Útiles

```bash
# Iniciar ambiente completo
docker-compose up -d && npm run dev

# Ver todos los logs
tail -f backend/logs/app.log

# Contar webhooks procesados hoy
grep "Stripe webhook event received" backend/logs/app.log | grep $(date +%Y-%m-%d) | wc -l

# Ver últimos 10 webhooks
grep "Stripe webhook event received" backend/logs/app.log | tail -10
```

---

## Conclusión

Este documento proporciona ejemplos prácticos para:
- ✅ Configurar el sistema de webhooks
- ✅ Testear localmente
- ✅ Monitorear en producción
- ✅ Solucionar problemas comunes
- ✅ Sincronizar pagos manualmente

Para más información, consultar:
- `WEBHOOKS_GUIDE.md` - Guía completa
- `WEBHOOKS_README.md` - Resumen de implementación
- `WEBHOOKS_IMPLEMENTATION_SUMMARY.md` - Detalles técnicos
