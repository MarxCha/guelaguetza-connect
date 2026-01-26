# Plan de Accion con Agentes Especializados
## Guelaguetza Connect

**Fecha:** 2026-01-25
**Version:** 2.0 (con asignacion de agentes)

---

## Resumen de Agentes Disponibles

| Agente | Especialidad | Uso Principal |
|--------|--------------|---------------|
| `system-logic` | Logica de negocio, arquitectura backend | Servicios, flujos, integraciones |
| `system-bootstrap` | Levantar servicios, BD, Docker | Infraestructura, DevOps |
| `testing-expert` | Tests unitarios, integracion, e2e | Cobertura, calidad |
| `code-auditor` | Seguridad, rendimiento, code smells | Auditorias, rate limiting |
| `nextjs-expert` | React, TypeScript, App Router | Frontend avanzado |
| `tailwind-expert` | Estilos, responsive, dark mode | UI/CSS |
| `code-uxui` | Interfaces, accesibilidad, UX | Componentes UI |
| `charts-expert` | Recharts, D3, dashboards | Visualizaciones |
| `geo-expert` | PostGIS, mapas, coordenadas | Geolocalizacion |
| `mexico-api-expert` | APIs mexicanas, INEGI | Datos Mexico |
| `context-recovery` | Recuperar contexto de sesion | Inicio de sesion |
| `session-tracker` | Registro de sesiones | Tracking |

---

## Matriz de Asignacion: Tareas vs Agentes

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPRINT 1: ESTABILIZACION CRITICA                          │
├─────────────────────────────────────────────────────────────────────────────┤
│ TAREA                          │ AGENTE           │ PRIORIDAD │ ESFUERZO    │
├────────────────────────────────┼──────────────────┼───────────┼─────────────┤
│ 1.1 Activar Jobs de Limpieza   │ system-logic     │ CRITICA   │ 4 horas     │
│ 1.2 Implementar Rate Limiting  │ code-auditor     │ CRITICA   │ 6 horas     │
│ 1.3 Optimistic Locking Products│ system-logic     │ ALTA      │ 8 horas     │
│ 1.4 Webhooks de Stripe         │ system-logic     │ ALTA      │ 12 horas    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPRINT 2: TESTING Y CALIDAD                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ TAREA                          │ AGENTE           │ PRIORIDAD │ ESFUERZO    │
├────────────────────────────────┼──────────────────┼───────────┼─────────────┤
│ 2.1 Tests de Integracion       │ testing-expert   │ ALTA      │ 20 horas    │
│ 2.2 Tests E2E Flujos Criticos  │ testing-expert   │ MEDIA     │ 16 horas    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPRINT 3: DEVOPS Y DEPLOYMENT                             │
├─────────────────────────────────────────────────────────────────────────────┤
│ TAREA                          │ AGENTE           │ PRIORIDAD │ ESFUERZO    │
├────────────────────────────────┼──────────────────┼───────────┼─────────────┤
│ 3.1 Docker Compose             │ system-bootstrap │ ALTA      │ 8 horas     │
│ 3.2 CI/CD Pipeline             │ system-bootstrap │ ALTA      │ 12 horas    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPRINT 4: MONITORING Y OBSERVABILIDAD                     │
├─────────────────────────────────────────────────────────────────────────────┤
│ TAREA                          │ AGENTE           │ PRIORIDAD │ ESFUERZO    │
├────────────────────────────────┼──────────────────┼───────────┼─────────────┤
│ 4.1 Logging Estructurado       │ code-auditor     │ ALTA      │ 6 horas     │
│ 4.2 Metricas Prometheus        │ charts-expert    │ MEDIA     │ 12 horas    │
│ 4.3 Error Tracking (Sentry)    │ code-auditor     │ MEDIA     │ 4 horas     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPRINT 5: PERFORMANCE OPTIMIZATION                        │
├─────────────────────────────────────────────────────────────────────────────┤
│ TAREA                          │ AGENTE           │ PRIORIDAD │ ESFUERZO    │
├────────────────────────────────┼──────────────────┼───────────┼─────────────┤
│ 5.1 Database Optimization      │ system-logic     │ MEDIA     │ 12 horas    │
│ 5.2 Caching Layer (Redis)      │ system-logic     │ MEDIA     │ 16 horas    │
│ 5.3 CDN para Assets            │ system-bootstrap │ BAJA      │ 8 horas     │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    SPRINT 6: REFACTORING ARQUITECTONICO                      │
├─────────────────────────────────────────────────────────────────────────────┤
│ TAREA                          │ AGENTE           │ PRIORIDAD │ ESFUERZO    │
├────────────────────────────────┼──────────────────┼───────────┼─────────────┤
│ 6.1 Domain Layer               │ system-logic     │ MEDIA     │ 40 horas    │
│ 6.2 Event-Driven Architecture  │ system-logic     │ BAJA      │ 32 horas    │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                    TAREAS FRONTEND (PARALELAS)                               │
├─────────────────────────────────────────────────────────────────────────────┤
│ TAREA                          │ AGENTE           │ PRIORIDAD │ ESFUERZO    │
├────────────────────────────────┼──────────────────┼───────────┼─────────────┤
│ F.1 UI Estados de Pago         │ code-uxui        │ ALTA      │ 8 horas     │
│ F.2 Manejo Error 409           │ nextjs-expert    │ ALTA      │ 6 horas     │
│ F.3 Dashboard Metricas         │ charts-expert    │ MEDIA     │ 16 horas    │
│ F.4 Estilos y Responsive       │ tailwind-expert  │ MEDIA     │ 12 horas    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Detalle por Sprint con Agentes

### Sprint 1: Estabilizacion Critica (Semana 1-2)

#### 1.1 Activar Jobs de Limpieza
**Agente:** `system-logic`
**Justificacion:** Requiere conocimiento de logica de negocio, servicios de booking/marketplace, y flujos de cleanup.

**Prompt para el agente:**
```
Activa los jobs de limpieza de pagos fallidos:
1. Descomenta el scheduler en backend/src/index.ts
2. Verifica que cleanup-payments.job.ts funciona correctamente
3. Configura intervalos de 15 minutos
4. Agrega logging detallado de resultados
5. Documenta metricas esperadas

Archivos: backend/src/index.ts, backend/src/jobs/scheduler.ts, backend/src/jobs/cleanup-payments.job.ts
```

**Validacion:**
- [ ] Logs muestran ejecucion cada 15 min
- [ ] Bookings PENDING_PAYMENT > 30min se cancelan
- [ ] Slots recuperan capacidad

---

#### 1.2 Implementar Rate Limiting
**Agente:** `code-auditor`
**Justificacion:** Es una tarea de seguridad y rendimiento, especialidad del auditor.

**Prompt para el agente:**
```
Implementa rate limiting para proteger la API:
1. Instala @fastify/rate-limit
2. Configura globalmente: 100 req/min
3. Configura especificamente:
   - /auth/*: 5 req/min (prevencion brute force)
   - /bookings/bookings: 20 req/min
   - /marketplace/orders: 10 req/min
4. Agrega headers X-RateLimit-*
5. Maneja 429 Too Many Requests apropiadamente

Archivos: backend/src/index.ts, backend/src/plugins/rate-limit.ts (crear)
```

**Validacion:**
- [ ] Request 101 en 1 minuto retorna 429
- [ ] Login bloqueado despues de 5 intentos

---

#### 1.3 Optimistic Locking en Products
**Agente:** `system-logic`
**Justificacion:** Requiere entendimiento profundo de concurrencia, transacciones, y logica de marketplace.

**Prompt para el agente:**
```
Implementa optimistic locking para prevenir race conditions en stock de productos:
1. Agrega campo "version" a modelo Product en Prisma
2. Crea migracion
3. Actualiza marketplace.service.ts:
   - createOrder() debe usar withRetry
   - Actualizar stock con updateMany + version check
4. Crea helper updateProductWithLocking() en utils/optimistic-locking.ts
5. Escribe tests de concurrencia

Archivos: backend/prisma/schema.prisma, backend/src/services/marketplace.service.ts, backend/src/utils/optimistic-locking.ts
```

**Validacion:**
- [ ] Tests de concurrencia pasan
- [ ] No hay stock negativo posible

---

#### 1.4 Implementar Webhooks de Stripe
**Agente:** `system-logic`
**Justificacion:** Integracion de pagos requiere conocimiento de flujos de negocio y Stripe.

**Prompt para el agente:**
```
Implementa endpoint de webhooks para Stripe:
1. Crea backend/src/routes/webhooks.ts
2. Endpoint POST /api/webhooks/stripe
3. Verifica signature con webhook secret
4. Maneja eventos:
   - payment_intent.succeeded → Confirmar booking/orden
   - payment_intent.payment_failed → Marcar PAYMENT_FAILED
   - charge.refunded → Procesar reembolso
5. Implementa idempotencia (verificar estado antes de actualizar)
6. Agrega logging detallado
7. Registra ruta en index.ts

Archivos: backend/src/routes/webhooks.ts (crear), backend/src/index.ts
```

**Validacion:**
- [ ] Webhook verifica signature
- [ ] payment_intent.succeeded confirma booking
- [ ] Eventos duplicados no causan errores

---

### Sprint 2: Testing y Calidad (Semana 3-4)

#### 2.1 Tests de Integracion
**Agente:** `testing-expert`
**Justificacion:** Especialista en testing, cobertura, y calidad.

**Prompt para el agente:**
```
Aumenta la cobertura de tests de integracion al 85%:

1. BookingService tests:
   - createBooking con payment intent
   - Concurrencia (5 bookings simultaneos)
   - cleanupFailedBookings
   - cancelBooking con refund

2. MarketplaceService tests:
   - createOrder multi-seller
   - Stock validation
   - Concurrencia de ordenes

3. AuthService tests:
   - register/login/profile
   - Usuarios baneados

4. Usa Docker para test DB
5. Mock Stripe apropiadamente

Archivos: backend/test/integration/*.test.ts
```

**Validacion:**
- [ ] Coverage > 85% en servicios criticos
- [ ] Tests de concurrencia pasan 100 veces

---

#### 2.2 Tests E2E de Flujos Criticos
**Agente:** `testing-expert`
**Justificacion:** Continuacion de testing, flujos completos.

**Prompt para el agente:**
```
Crea tests E2E para los flujos criticos del usuario:

1. User Journey: Reservar experiencia
   - Buscar → Ver detalle → Seleccionar horario → Booking → Pago

2. User Journey: Comprar productos
   - Navegar tienda → Agregar al carrito → Checkout → Pago

3. Admin Journey: Banear usuario
   - Login admin → Buscar usuario → Banear → Verificar acceso denegado

Herramientas: Playwright o Vitest browser mode
Incluye screenshots y videos de test runs.

Archivos: test/e2e/*.test.ts
```

**Validacion:**
- [ ] E2E tests pasan en CI
- [ ] Videos de test disponibles

---

### Sprint 3: DevOps y Deployment (Semana 5-6)

#### 3.1 Docker Compose
**Agente:** `system-bootstrap`
**Justificacion:** Especialista en levantar servicios, contenedores, y BD.

**Prompt para el agente:**
```
Configura Docker Compose para desarrollo y produccion:

1. Crea docker-compose.yml con:
   - PostgreSQL 15
   - Redis 7
   - Backend (Fastify)
   - Frontend (Vite)
   - Volumes para persistencia
   - Healthchecks

2. Crea docker-compose.prod.yml para produccion

3. Crea Dockerfiles:
   - backend/Dockerfile
   - Dockerfile.frontend

4. Scripts de inicializacion:
   - Migraciones automaticas
   - Seed de datos

5. Documenta en README

Archivos: docker-compose.yml, docker-compose.prod.yml, backend/Dockerfile, Dockerfile.frontend
```

**Validacion:**
- [ ] `docker-compose up` levanta todo
- [ ] Hot reload funciona
- [ ] Migraciones se aplican automaticamente

---

#### 3.2 CI/CD Pipeline
**Agente:** `system-bootstrap`
**Justificacion:** Infraestructura y automatizacion.

**Prompt para el agente:**
```
Configura CI/CD con GitHub Actions:

1. Crea .github/workflows/ci.yml con stages:
   - lint (ESLint)
   - test-backend (con PostgreSQL service)
   - test-frontend
   - build

2. Deploy automatico:
   - develop → staging
   - main → produccion (con approval)

3. Codecov para reportes de coverage

4. Cache de node_modules para velocidad

Archivos: .github/workflows/ci.yml, .github/workflows/deploy.yml
```

**Validacion:**
- [ ] PR triggers CI checks
- [ ] Merge a develop deploya a staging
- [ ] Coverage reportado en PR

---

### Sprint 4: Monitoring y Observabilidad (Semana 7-8)

#### 4.1 Logging Estructurado
**Agente:** `code-auditor`
**Justificacion:** Calidad de codigo, logs estructurados para debugging.

**Prompt para el agente:**
```
Configura logging estructurado con Pino:

1. Configura Fastify logger con:
   - JSON format en produccion
   - pino-pretty en desarrollo
   - Request IDs (crypto.randomUUID)
   - Log levels por environment

2. Agrega logs en puntos criticos:
   - Booking created/confirmed/cancelled
   - Order created/paid
   - Payment errors
   - Concurrency conflicts

3. Estructura consistente:
   app.log.info({ bookingId, userId }, 'message')

Archivos: backend/src/app.ts, backend/src/services/*.ts
```

**Validacion:**
- [ ] Logs en JSON en produccion
- [ ] Request ID en cada log
- [ ] Contexto util en cada log

---

#### 4.2 Metricas con Prometheus
**Agente:** `charts-expert`
**Justificacion:** Especialista en visualizaciones y dashboards.

**Prompt para el agente:**
```
Implementa metricas y dashboards con Prometheus/Grafana:

1. Instala prom-client
2. Crea endpoint /metrics
3. Instrumenta:
   - Counters: bookings_created_total, orders_created_total
   - Histograms: booking_creation_duration_seconds
   - Gauges: active_bookings, active_orders

4. Crea dashboards Grafana:
   - API Overview (request rate, error rate, latency)
   - Booking Metrics
   - Marketplace Metrics

5. Configura alertas (error rate > 5%)

Archivos: backend/src/utils/metrics.ts (crear), backend/src/routes/metrics.ts (crear)
```

**Validacion:**
- [ ] /metrics retorna datos Prometheus
- [ ] Dashboards Grafana funcionando
- [ ] Alertas configuradas

---

#### 4.3 Error Tracking con Sentry
**Agente:** `code-auditor`
**Justificacion:** Tracking de errores, calidad.

**Prompt para el agente:**
```
Configura Sentry para error tracking:

1. Backend:
   - Instala @sentry/node
   - Inicializa en index.ts
   - Captura excepciones en error handler
   - Incluye contexto (userId, requestId)

2. Frontend:
   - Instala @sentry/react
   - Inicializa en main.tsx
   - Configura browser tracing
   - Session replay (10%)

3. Source maps para stack traces utiles

Archivos: backend/src/index.ts, src/main.tsx
```

**Validacion:**
- [ ] Errores aparecen en Sentry
- [ ] Stack traces completos
- [ ] User context incluido

---

### Sprint 5: Performance Optimization (Semana 9-10)

#### 5.1 Database Optimization
**Agente:** `system-logic`
**Justificacion:** Optimizacion de queries, indices, arquitectura de datos.

**Prompt para el agente:**
```
Optimiza la base de datos:

1. Agrega indices faltantes en schema.prisma:
   - Booking: [userId, status, createdAt]
   - Order: [userId, status], [sellerId, status]
   - Product: [category, status]
   - ActivityLog: [userId, action, createdAt]

2. Identifica y corrige queries N+1:
   - Usa include selectivo
   - Evita includes innecesarios

3. Configura connection pooling:
   - connection_limit=10

4. Documenta con EXPLAIN ANALYZE

Archivos: backend/prisma/schema.prisma, backend/src/services/*.ts
```

**Validacion:**
- [ ] EXPLAIN muestra uso de indices
- [ ] Query time < 100ms principales

---

#### 5.2 Caching Layer con Redis
**Agente:** `system-logic`
**Justificacion:** Arquitectura de cache, invalidacion, logica de negocio.

**Prompt para el agente:**
```
Implementa caching con Redis:

1. Configura Redis en Docker Compose
2. Crea cache service wrapper
3. Cachea:
   - Badges (TTL: 1 hora)
   - Events (TTL: 10 min)
   - Leaderboard (TTL: 5 min)
   - Experience listings (TTL: 2 min)

4. Implementa invalidacion:
   - Al crear booking → invalidar slots
   - Al crear product → invalidar listings

5. Monitorea hit rate

Archivos: backend/src/services/cache.service.ts (crear), backend/src/services/*.ts
```

**Validacion:**
- [ ] Cache hit rate > 70%
- [ ] Latency reducida 50%
- [ ] Invalidacion correcta

---

#### 5.3 CDN para Assets
**Agente:** `system-bootstrap`
**Justificacion:** Infraestructura, configuracion de servicios cloud.

**Prompt para el agente:**
```
Configura CDN para assets estaticos:

1. Setup S3 bucket o Cloudflare R2
2. Crea upload service para imagenes
3. Migra imagenes existentes
4. Configura CloudFront/Cloudflare CDN
5. Implementa lazy loading en frontend

Archivos: backend/src/services/upload.service.ts (crear), componentes de imagen en frontend
```

**Validacion:**
- [ ] Imagenes servidas desde CDN
- [ ] TTL configurado (1 año)

---

### Sprint 6: Refactoring Arquitectonico (Semana 11-14)

#### 6.1 Domain Layer
**Agente:** `system-logic`
**Justificacion:** Arquitectura de software, Clean Architecture, DDD.

**Prompt para el agente:**
```
Refactoriza a Clean Architecture con Domain Layer:

1. Crea estructura:
   backend/src/
   ├── domain/
   │   ├── booking/entities/, value-objects/, repositories/
   │   └── marketplace/entities/, value-objects/, repositories/
   ├── application/use-cases/
   └── infrastructure/repositories/

2. Implementa entidades de dominio:
   - Booking con metodos confirm(), cancel()
   - Product con validaciones de stock

3. Crea interfaces de repositorio

4. Implementa repositorios Prisma

5. Tests unitarios 100% en domain/

Archivos: backend/src/domain/**, backend/src/application/**, backend/src/infrastructure/**
```

**Validacion:**
- [ ] Domain entities con 100% coverage
- [ ] Sin dependencias de Prisma en domain/
- [ ] Business rules centralizadas

---

#### 6.2 Event-Driven Architecture
**Agente:** `system-logic`
**Justificacion:** Arquitectura, desacoplamiento, patrones de diseno.

**Prompt para el agente:**
```
Implementa arquitectura basada en eventos:

1. Crea EventBus simple:
   - on(event, handler)
   - emit(event, data)

2. Define eventos:
   - booking.created, booking.confirmed, booking.cancelled
   - order.created, order.paid
   - user.registered

3. Mueve side effects a handlers:
   - Notificaciones
   - Gamificacion (XP)
   - Analytics

4. Error handling en handlers (no afecta operacion principal)

Archivos: backend/src/infrastructure/events/EventBus.ts (crear), backend/src/services/*.ts
```

**Validacion:**
- [ ] Events disparan handlers
- [ ] Error en handler no afecta operacion
- [ ] Events loggeados

---

### Tareas Frontend (Paralelas)

#### F.1 UI para Estados de Pago
**Agente:** `code-uxui`
**Justificacion:** Especialista en interfaces y UX.

**Prompt para el agente:**
```
Actualiza la UI para manejar nuevos estados de pago:

1. Crea badges/indicadores para:
   - PENDING_PAYMENT (amarillo, "Procesando...")
   - PAYMENT_FAILED (rojo, "Error en pago")
   - PENDING (azul, "Pendiente")
   - CONFIRMED (verde, "Confirmado")

2. Boton "Reintentar pago" para PAYMENT_FAILED

3. Loading states apropiados

4. Mensajes claros para cada estado

Archivos: components/BookingCard.tsx, components/OrderCard.tsx, components/ui/StatusBadge.tsx
```

**Validacion:**
- [ ] Todos los estados tienen UI clara
- [ ] Reintentar pago funciona
- [ ] Accesibilidad (aria-labels)

---

#### F.2 Manejo de Error 409 (Concurrencia)
**Agente:** `nextjs-expert`
**Justificacion:** Especialista en React, hooks, manejo de estado.

**Prompt para el agente:**
```
Implementa manejo de errores de concurrencia en frontend:

1. Crea hook useCreateBooking con:
   - Deteccion de error 409
   - Toast de notificacion
   - Estado shouldReload

2. Componente de recarga:
   - Mensaje claro "Disponibilidad actualizada"
   - Boton "Recargar disponibilidad"

3. Polling opcional para slots populares

4. Retry automatico (opcional, max 2)

Archivos: hooks/useCreateBooking.ts (crear), components/BookingForm.tsx
```

**Validacion:**
- [ ] Error 409 muestra mensaje claro
- [ ] Recarga actualiza datos
- [ ] No hay retry infinito

---

#### F.3 Dashboard de Metricas Admin
**Agente:** `charts-expert`
**Justificacion:** Especialista en visualizaciones.

**Prompt para el agente:**
```
Crea dashboard de metricas para admin:

1. Graficas con Recharts:
   - Tendencia mensual de bookings (LineChart)
   - Comparativa por zona (BarChart horizontal)
   - Distribucion por tipo (PieChart)
   - Horas pico (Heatmap)

2. Stats cards con comparativas:
   - Total bookings (con % vs mes anterior)
   - Revenue
   - Usuarios activos

3. Filtros de periodo (7d, 30d, 90d, 1y)

4. Responsive design

Archivos: components/admin/AdvancedDashboard.tsx (crear), components/admin/charts/*.tsx
```

**Validacion:**
- [ ] Graficas renderizan correctamente
- [ ] Datos actualizados en tiempo real
- [ ] Responsive en mobile

---

#### F.4 Estilos y Responsive
**Agente:** `tailwind-expert`
**Justificacion:** Especialista en Tailwind, responsive, dark mode.

**Prompt para el agente:**
```
Mejora estilos y responsive del proyecto:

1. Audita responsive breakpoints:
   - Mobile first
   - Tablet (md:)
   - Desktop (lg:)

2. Implementa dark mode:
   - Detectar preferencia del sistema
   - Toggle manual
   - Persistir en localStorage

3. Mejora componentes UI:
   - Consistencia de espaciado
   - Estados hover/focus
   - Animaciones sutiles

4. Accesibilidad:
   - Contraste suficiente
   - Focus visible

Archivos: tailwind.config.js, components/ui/*.tsx, App.tsx
```

**Validacion:**
- [ ] Responsive en todos los breakpoints
- [ ] Dark mode funciona
- [ ] Accesibilidad (WCAG AA)

---

## Diagrama de Secuencia de Ejecucion

```
SEMANA 1-2 (Sprint 1):
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  system-logic ──┬── 1.1 Jobs de Limpieza (4h)                     │
│                 ├── 1.3 Optimistic Locking (8h)                   │
│                 └── 1.4 Webhooks Stripe (12h)                     │
│                                                                    │
│  code-auditor ──── 1.2 Rate Limiting (6h)                         │
│                                                                    │
│  code-uxui ─────── F.1 UI Estados de Pago (8h) [PARALELO]         │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

SEMANA 3-4 (Sprint 2):
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  testing-expert ─┬─ 2.1 Tests Integracion (20h)                   │
│                  └─ 2.2 Tests E2E (16h)                           │
│                                                                    │
│  nextjs-expert ──── F.2 Manejo Error 409 (6h) [PARALELO]          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

SEMANA 5-6 (Sprint 3):
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  system-bootstrap ─┬─ 3.1 Docker Compose (8h)                     │
│                    └─ 3.2 CI/CD Pipeline (12h)                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

SEMANA 7-8 (Sprint 4):
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  code-auditor ───┬─ 4.1 Logging Estructurado (6h)                 │
│                  └─ 4.3 Sentry (4h)                               │
│                                                                    │
│  charts-expert ──┬─ 4.2 Metricas Prometheus (12h)                 │
│                  └─ F.3 Dashboard Admin (16h) [PARALELO]          │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

SEMANA 9-10 (Sprint 5):
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  system-logic ───┬─ 5.1 Database Optimization (12h)               │
│                  └─ 5.2 Redis Caching (16h)                       │
│                                                                    │
│  system-bootstrap ── 5.3 CDN Assets (8h)                          │
│                                                                    │
│  tailwind-expert ─── F.4 Estilos y Responsive (12h) [PARALELO]    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘

SEMANA 11-14 (Sprint 6 - Opcional):
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  system-logic ───┬─ 6.1 Domain Layer (40h)                        │
│                  └─ 6.2 Event-Driven Architecture (32h)           │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## Resumen de Carga por Agente

| Agente | Tareas | Horas Totales | Sprints |
|--------|--------|---------------|---------|
| `system-logic` | 8 | 136h | 1, 5, 6 |
| `testing-expert` | 2 | 36h | 2 |
| `system-bootstrap` | 4 | 36h | 3, 5 |
| `code-auditor` | 4 | 22h | 1, 4 |
| `charts-expert` | 2 | 28h | 4 |
| `code-uxui` | 1 | 8h | 1 |
| `nextjs-expert` | 1 | 6h | 2 |
| `tailwind-expert` | 1 | 12h | 5 |

**Total:** 284 horas (~7 semanas de trabajo full-time de 1 dev)

---

## Comandos para Invocar Agentes

### Ejemplo de uso en Claude Code:

```bash
# Sprint 1 - Tarea 1.1
"Usa el agente system-logic para activar los jobs de limpieza de pagos fallidos"

# Sprint 2 - Tarea 2.1
"Usa el agente testing-expert para crear tests de integracion con 85% coverage"

# Sprint 3 - Tarea 3.1
"Usa el agente system-bootstrap para configurar Docker Compose"

# Sprint 4 - Tarea 4.2
"Usa el agente charts-expert para implementar metricas con Prometheus y dashboards"
```

---

## Checklist de Go-Live con Agentes

### Must-Have (Bloqueantes)

| Tarea | Agente | Estado |
|-------|--------|--------|
| Jobs de limpieza activos | system-logic | [ ] |
| Webhooks Stripe | system-logic | [ ] |
| Optimistic locking Products | system-logic | [ ] |
| Rate limiting | code-auditor | [ ] |
| Tests coverage >80% | testing-expert | [ ] |
| CI/CD pipeline | system-bootstrap | [ ] |
| Docker Compose | system-bootstrap | [ ] |
| Logging estructurado | code-auditor | [ ] |
| Error tracking (Sentry) | code-auditor | [ ] |
| UI estados de pago | code-uxui | [ ] |

### Nice-to-Have

| Tarea | Agente | Estado |
|-------|--------|--------|
| Metricas Prometheus | charts-expert | [ ] |
| Dashboard admin | charts-expert | [ ] |
| Redis caching | system-logic | [ ] |
| CDN assets | system-bootstrap | [ ] |
| Domain layer | system-logic | [ ] |
| Dark mode | tailwind-expert | [ ] |

---

**Documento generado:** 2026-01-25
**Version:** 2.0 (con agentes especializados)
**Autor:** Claude Code + Sequential Thinking
