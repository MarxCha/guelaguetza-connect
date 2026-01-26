# Checklist de Revisión - UI Payment States

## Frontend Implementation ✅

### Components

#### StatusBadge.tsx
- [x] Importa `Loader2` de lucide-react
- [x] `PENDING_PAYMENT` usa `Loader2` con `animate-spin`
- [x] `PAYMENT_FAILED` usa `XCircle` rojo
- [x] Todos los badges tienen `aria-label` descriptivo
- [x] Todos los iconos tienen `aria-hidden="true"`
- [x] Badge tiene `role="status"`
- [x] Exports: `BookingStatusBadge`, `OrderStatusBadge`
- [x] Exports: `canRetryBookingPayment()`, `canRetryOrderPayment()`

#### PaymentErrorModal.tsx (NUEVO)
- [x] Archivo creado en `/components/ui/PaymentErrorModal.tsx`
- [x] Props: `isOpen`, `onClose`, `onRetry`, `amount`, `bookingId`, `orderId`, `retrying`
- [x] Muestra monto a pagar
- [x] Lista de posibles causas de error
- [x] Botón "Reintentar pago" prominente
- [x] Botón "Cancelar"
- [x] Bloquea cierre durante `retrying`
- [x] ARIA labels correctos
- [x] Usa componente `Modal`

#### MyBookingsView.tsx
- [x] Importa `retryBookingPayment` de services/bookings
- [x] Importa `PaymentErrorModal`
- [x] Estados: `showPaymentErrorModal`, `paymentErrorBooking`, `retryingPayment`
- [x] Función `handleRetryPayment(booking)` abre modal
- [x] Función `handleRetryPaymentConfirm()` llama al API
- [x] `PENDING_PAYMENT`: spinner animado con `aria-live="polite"`
- [x] `PAYMENT_FAILED`: botón "Reintentar pago"
- [x] `CONFIRMED`: botón "Cancelar"
- [x] `COMPLETED`: botón "Dejar reseña"
- [x] Modal integrado al final del componente
- [x] `formatPrice()` usado correctamente

#### MyOrdersView.tsx
- [x] Importa `getMyOrders`, `retryOrderPayment`, `cancelOrder` de services/marketplace
- [x] Importa `PaymentErrorModal`
- [x] Estados: `showPaymentErrorModal`, `paymentErrorOrder`, `retryingPayment`
- [x] Función `loadOrders()` usa API real
- [x] Función `handleRetryPayment(order)` abre modal
- [x] Función `handleRetryPaymentConfirm()` llama al API
- [x] Función `handleCancelOrder()` usa `cancelOrderApi()`
- [x] `PENDING_PAYMENT`: spinner animado con `aria-live="polite"`
- [x] `PAYMENT_FAILED`: botón "Reintentar pago"
- [x] `SHIPPED`: botón "Rastrear envío"
- [x] Modal integrado al final del componente
- [x] Helper `formatPrice()` definido

### Services

#### /services/bookings.ts
- [x] Exporta tipo `BookingStatus`
- [x] Función `retryBookingPayment(id: string)` creada
- [x] Llama a `/bookings/bookings/:id/retry-payment`
- [x] Retorna `{ booking, clientSecret, paymentIntentId? }`
- [x] Maneja errores con mensaje descriptivo

#### /services/marketplace.ts
- [x] Tipo `OrderStatus` incluye `PENDING_PAYMENT` y `PAYMENT_FAILED`
- [x] Función `retryOrderPayment(id: string)` creada
- [x] Función `cancelOrder(id: string)` creada
- [x] Llama a `/marketplace/orders/:id/retry-payment`
- [x] Retorna `{ order, clientSecret, paymentIntentId? }`
- [x] Maneja errores con mensaje descriptivo

---

## Backend Implementation ⚠️ (PENDIENTE)

### Endpoints Requeridos

#### Bookings
- [ ] `POST /api/bookings/bookings/:id/retry-payment`
  - [ ] Obtiene booking por ID
  - [ ] Verifica que status sea `PAYMENT_FAILED`
  - [ ] Crea nuevo PaymentIntent en Stripe
  - [ ] Actualiza booking status a `PENDING_PAYMENT`
  - [ ] Retorna `{ booking, clientSecret, paymentIntentId }`

#### Marketplace
- [ ] `POST /api/marketplace/orders/:id/retry-payment`
  - [ ] Obtiene order por ID
  - [ ] Verifica que status sea `PAYMENT_FAILED`
  - [ ] Crea nuevo PaymentIntent en Stripe
  - [ ] Actualiza order status a `PENDING_PAYMENT`
  - [ ] Retorna `{ order, clientSecret, paymentIntentId }`

- [ ] `POST /api/marketplace/orders/:id/cancel`
  - [ ] Obtiene order por ID
  - [ ] Verifica que sea cancelable
  - [ ] Actualiza status a `CANCELLED`
  - [ ] Retorna order actualizado

### Webhooks
- [ ] Webhook `payment_intent.succeeded` actualiza a `CONFIRMED`/`PAID`
- [ ] Webhook `payment_intent.payment_failed` actualiza a `PAYMENT_FAILED`
- [ ] Webhook maneja reintentos automáticos de Stripe

---

## Testing

### Unit Tests
- [ ] `StatusBadge.test.tsx` - Todos los estados renderean correctamente
- [ ] `PaymentErrorModal.test.tsx` - Modal se abre/cierra correctamente
- [ ] `PaymentErrorModal.test.tsx` - Callback onRetry se ejecuta

### Integration Tests
- [ ] `MyBookingsView.integration.test.tsx` - Flujo de retry payment
- [ ] `MyOrdersView.integration.test.tsx` - Flujo de retry payment
- [ ] `MyOrdersView.integration.test.tsx` - Flujo de cancelar orden

### E2E Tests
- [ ] Crear booking → Pago falla → Reintentar pago → Éxito
- [ ] Crear orden → Pago falla → Reintentar pago → Éxito
- [ ] Crear orden → Cancelar orden

---

## Accesibilidad (WCAG 2.1 AA)

### Visual
- [x] Contraste mínimo 4.5:1 en texto
- [x] Contraste mínimo 3:1 en UI components
- [x] Colores no son el único indicador de estado

### Keyboard
- [x] Todos los botones son focusables
- [x] Focus visible en todos los elementos interactivos
- [x] Tab order lógico
- [x] Escape cierra modal

### Screen Reader
- [x] ARIA labels en todos los badges
- [x] `role="status"` en estados dinámicos
- [x] `aria-live="polite"` en cambios de estado
- [x] `aria-hidden="true"` en iconos decorativos
- [x] Botones tienen labels descriptivos

### Mobile
- [x] Touch targets mínimo 44x44px
- [x] Texto mínimo 16px
- [x] No scroll horizontal
- [x] Modal responsive

---

## Performance

### Optimizaciones
- [x] Spinners usan `animate-spin` nativo de Tailwind
- [x] Transiciones no bloquean UI
- [x] LoadingButton previene double-click
- [x] Estados locales para evitar re-renders innecesarios

### Cargas
- [ ] Lazy load de PaymentErrorModal (opcional)
- [ ] Prefetch de iconos de Lucide
- [ ] Debounce en retry button (opcional)

---

## Documentación

### Archivos Creados
- [x] `UI_PAYMENT_STATES_IMPLEMENTATION.md` - Documentación completa
- [x] `UI_PAYMENT_STATES_SUMMARY.md` - Resumen ejecutivo
- [x] `UI_PAYMENT_VISUAL_GUIDE.md` - Guía visual
- [x] `UI_PAYMENT_CHECKLIST.md` - Este checklist

### README Updates
- [ ] Actualizar README principal con sección de estados de pago
- [ ] Agregar capturas de pantalla de estados
- [ ] Documentar flujo de retry payment

---

## Deploy Checklist

### Pre-Deploy
- [ ] Todos los tests pasan
- [ ] Build sin warnings
- [ ] Lighthouse score > 90
- [ ] axe DevTools sin errores críticos

### Backend
- [ ] Endpoints de retry implementados
- [ ] Webhooks configurados
- [ ] Variables de entorno en producción
- [ ] Stripe en modo producción

### Frontend
- [ ] Environment variables correctas
- [ ] Analytics tracking agregado
- [ ] Error logging configurado
- [ ] Sentry/similar para errores

### Monitoring
- [ ] Dashboard para tracking de errores de pago
- [ ] Alertas cuando tasa de PAYMENT_FAILED > 5%
- [ ] Logs de retry attempts
- [ ] Métricas de conversión

---

## User Acceptance Testing

### Escenarios
- [ ] Usuario puede ver estado "Procesando pago" mientras se procesa
- [ ] Usuario ve error claro cuando el pago falla
- [ ] Usuario puede reintentar pago fácilmente
- [ ] Modal de error es claro y no técnico
- [ ] Usuario puede cancelar reservación confirmada
- [ ] Usuario puede dejar reseña después de experiencia completada

### Edge Cases
- [ ] Múltiples reintentos de pago
- [ ] Pago falla después de 3 intentos
- [ ] Usuario cancela durante procesamiento
- [ ] Webhook llega tarde (race condition)
- [ ] Usuario tiene múltiples tabs abiertos

---

## Rollout Plan

### Phase 1: Testing (Semana 1)
- [ ] Deploy a staging
- [ ] QA testing completo
- [ ] UAT con usuarios beta
- [ ] Ajustes según feedback

### Phase 2: Soft Launch (Semana 2)
- [ ] Deploy a producción
- [ ] Monitoring activo
- [ ] Recolección de métricas
- [ ] Hotfixes si es necesario

### Phase 3: Full Launch (Semana 3)
- [ ] Comunicado a usuarios
- [ ] Documentación en centro de ayuda
- [ ] Training a soporte

---

## Métricas de Éxito

### KPIs
- [ ] Tasa de retry exitoso > 60%
- [ ] Tiempo promedio de retry < 2 minutos
- [ ] Tasa de conversión post-error > 40%
- [ ] Tickets de soporte por pagos fallidos < 5%

### Analytics Events
```javascript
// Track retry attempt
analytics.track('payment_retry_attempted', {
  booking_id: string,
  amount: number,
  attempt_number: number
});

// Track retry success
analytics.track('payment_retry_succeeded', {
  booking_id: string,
  amount: number,
  total_attempts: number
});

// Track retry failure
analytics.track('payment_retry_failed', {
  booking_id: string,
  amount: number,
  error_code: string
});
```

---

## Rollback Plan

### Si algo falla:
1. [ ] Revertir deploy de frontend
2. [ ] Deshabilitar endpoints de retry en backend
3. [ ] Notificar a usuarios afectados
4. [ ] Investigar root cause
5. [ ] Fix y re-deploy

### Criterios de Rollback:
- Tasa de error > 10% en retry attempts
- Errores críticos en producción
- Performance degradation > 20%

---

## Aprobaciones

- [ ] Tech Lead: ___________________  Fecha: _______
- [ ] Product Manager: _____________  Fecha: _______
- [ ] UX Designer: _________________  Fecha: _______
- [ ] QA Lead: _____________________  Fecha: _______

---

**Versión**: 1.0.0
**Fecha**: 2026-01-25
**Próxima Revisión**: 2026-02-08
