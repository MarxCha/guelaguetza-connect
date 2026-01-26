# Sistema de Webhooks de Stripe - Implementación

## Resumen de Implementación

Se ha implementado un sistema completo de webhooks para Stripe que permite:

1. Procesar pagos exitosos automáticamente
2. Manejar fallos de pago
3. Procesar reembolsos
4. Mantener sincronía entre Stripe y la base de datos
5. Implementar idempotencia para evitar procesamiento duplicado

## Archivos Creados/Modificados

### 1. Nuevos Archivos

- **`src/routes/webhooks.ts`**: Endpoint principal de webhooks
- **`src/types/fastify.d.ts`**: Tipos de TypeScript para Fastify
- **`src/routes/webhooks.test.ts`**: Tests básicos
- **`scripts/sync-payments.ts`**: Script de sincronización manual
- **`WEBHOOKS_GUIDE.md`**: Guía completa de uso y configuración

### 2. Archivos Modificados

- **`src/app.ts`**:
  - Agregado plugin `fastify-raw-body`
  - Registrada ruta `/api/webhooks`

- **`src/index.ts`**:
  - Actualizado banner con endpoint de webhooks

- **`package.json`**:
  - Agregado script `sync:payments`

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                         STRIPE WEBHOOK                          │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POST /api/webhooks/stripe                    │
│                                                                 │
│  1. Verificar firma con STRIPE_WEBHOOK_SECRET                  │
│  2. Parsear evento                                             │
│  3. Routing por tipo de evento                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
                ▼             ▼             ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │ payment_     │  │ payment_     │  │ charge.      │
    │ intent.      │  │ intent.      │  │ refunded     │
    │ succeeded    │  │ payment_     │  │              │
    │              │  │ failed       │  │              │
    └──────────────┘  └──────────────┘  └──────────────┘
          │                 │                 │
          ▼                 ▼                 ▼
    ┌──────────────────────────────────────────────────┐
    │         BookingService / MarketplaceService      │
    │                                                  │
    │  • Verificar idempotencia                       │
    │  • Actualizar estado en BD                      │
    │  • Restaurar inventario (si aplica)            │
    │  • Logging detallado                            │
    └──────────────────────────────────────────────────┘
```

## Eventos Implementados

### 1. payment_intent.succeeded

**Qué hace**: Confirma un booking u orden tras pago exitoso

**Estados afectados**:
- Bookings: `PENDING` → `CONFIRMED`
- Órdenes: `PENDING` → `PAID`

**Idempotencia**:
- Si ya está confirmado → Skip
- Si está en estado final → Advertencia y skip
- Verifica que el payment intent ID coincida

### 2. payment_intent.payment_failed

**Qué hace**: Marca un booking u orden como fallido

**Estados afectados**:
- Bookings: `PENDING` → `PAYMENT_FAILED`
- Órdenes: `PENDING` → `PAYMENT_FAILED`

**Idempotencia**:
- Si ya está en `PAYMENT_FAILED` → Skip
- Si ya está confirmado → No sobrescribe

### 3. charge.refunded

**Qué hace**: Procesa un reembolso

**Estados afectados**:
- Bookings: `CONFIRMED` → `CANCELLED` (restaura capacidad del slot)
- Órdenes: `PAID` → `REFUNDED`

**Idempotencia**:
- Si ya está cancelado/reembolsado → Skip
- Si está completado → Advertencia (requiere revisión manual)

## Características Clave

### 1. Verificación de Firma

Cada webhook de Stripe incluye una firma HMAC en el header `stripe-signature`. El sistema:

- Verifica que la firma sea válida usando `STRIPE_WEBHOOK_SECRET`
- Rechaza requests con firma inválida (400)
- Previene replay attacks

### 2. Idempotencia

El sistema implementa idempotencia completa:

- Verifica el estado actual antes de actualizar
- No procesa eventos si el recurso ya está en el estado deseado
- No sobrescribe estados finales (COMPLETED, CANCELLED, etc.)
- Registra advertencias para casos edge

### 3. Logging Detallado

Cada evento se registra con información completa:

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

### 4. Manejo de Errores

- **400**: Firma inválida o missing
- **200**: Evento procesado (o error de negocio)
- **500**: Error inesperado (Stripe reintentará)

## Configuración

### Variables de Entorno

```bash
# .env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### Obtener el Webhook Secret

1. Dashboard de Stripe: https://dashboard.stripe.com/webhooks
2. Crear endpoint: `https://tu-dominio.com/api/webhooks/stripe`
3. Eventos: `payment_intent.succeeded`, `payment_intent.payment_failed`, `charge.refunded`
4. Copiar el "Signing secret" a `.env`

## Testing Local

### Con Stripe CLI

```bash
# 1. Instalar Stripe CLI
brew install stripe/stripe-cli/stripe

# 2. Autenticarse
stripe login

# 3. Iniciar servidor
npm run dev

# 4. Forward webhooks
stripe listen --forward-to localhost:3001/api/webhooks/stripe

# 5. En otra terminal, trigger eventos
stripe trigger payment_intent.succeeded
stripe trigger payment_intent.payment_failed
stripe trigger charge.refunded
```

### Ver Logs

```bash
# Terminal del servidor mostrará logs detallados
[INFO] Stripe webhook event received: payment_intent.succeeded
[INFO] Processing payment_intent.succeeded
[INFO] Booking confirmed successfully
```

## Scripts de Mantenimiento

### Sincronizar Pagos Manualmente

En caso de que los webhooks fallen, usar el script de sincronización:

```bash
# Sincronizar todos los pagos pendientes
npm run sync:payments

# Sincronizar un booking específico
npm run sync:payments -- --booking=clxxx123

# Sincronizar por rango de fechas
npm run sync:payments -- --from=2025-01-20 --to=2025-01-25

# Dry-run (no hacer cambios)
npm run sync:payments -- --dry-run
```

## Checklist de Deployment

- [ ] Configurar `STRIPE_WEBHOOK_SECRET` en producción
- [ ] Crear webhook en Stripe Dashboard con URL de producción
- [ ] Habilitar solo eventos necesarios
- [ ] Configurar monitoreo de fallos
- [ ] Configurar alertas para tasa de error >5%
- [ ] Documentar URL de webhook en documentación del equipo

## Monitoreo

### Dashboard de Stripe

https://dashboard.stripe.com/webhooks

Ver:
- Eventos enviados
- Respuestas del servidor
- Reintentos
- Errores

### Logs de la Aplicación

```bash
# Filtrar solo webhooks
tail -f logs/app.log | grep webhook

# Ver solo errores
tail -f logs/app.log | grep -E "ERROR|WARN"
```

## Troubleshooting

### Error: "Webhook signature verification failed"

**Solución**:
1. Verificar que `STRIPE_WEBHOOK_SECRET` esté configurado correctamente
2. Usar `stripe listen` para obtener el secret correcto en desarrollo
3. Verificar que no haya middleware modificando el body

### Error: "Booking not found"

**Solución**:
1. Verificar que el booking se esté creando con `stripePaymentId`
2. Revisar metadata del payment intent
3. Buscar booking en la BD manualmente

### Evento no procesado

**Solución**:
1. Revisar logs: "Unhandled webhook event type"
2. Agregar handler si el evento es necesario
3. Actualizar eventos en Stripe Dashboard

## Próximas Mejoras

- [ ] Tabla de auditoría de webhooks procesados
- [ ] Sistema de notificaciones al usuario
- [ ] Métricas de procesamiento
- [ ] Dead letter queue para eventos fallidos
- [ ] Tests de integración completos
- [ ] Circuit breaker para fallos de BD

## Referencias

- [Stripe Webhooks Documentation](https://stripe.com/docs/webhooks)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
- [Webhook Best Practices](https://stripe.com/docs/webhooks/best-practices)
- [Guía completa](./WEBHOOKS_GUIDE.md)

## Soporte

Para dudas o problemas:
1. Revisar `WEBHOOKS_GUIDE.md` para documentación detallada
2. Revisar logs del servidor
3. Revisar Dashboard de Stripe
4. Usar script de sincronización manual si es necesario
