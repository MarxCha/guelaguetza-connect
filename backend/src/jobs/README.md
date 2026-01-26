# Jobs

Esta carpeta contiene jobs periódicos que se ejecutan en background.

## Jobs Disponibles

### 1. Cleanup de Pagos Fallidos

**Archivo:** `cleanup-payments.job.ts`

**Descripción:** Limpia automáticamente bookings y órdenes que quedaron en estado `PENDING_PAYMENT` o `PAYMENT_FAILED` por más de 30 minutos. Restaura el inventario (capacidad de slots / stock de productos).

**Ejecución:**
- **Automática:** Cada 15 minutos (ver scheduler)
- **Manual:** `node --loader ts-node/esm src/jobs/cleanup-payments.job.ts`

**Configuración:**
```typescript
const PAYMENT_TIMEOUT_MINUTES = 30; // Modificar en el archivo
```

---

## Schedulers

### Opción 1: Simple (setInterval)

**Archivo:** `scheduler.ts`

**Uso:**
```typescript
// En src/index.ts
import { startScheduler } from './jobs/scheduler.js';

startScheduler();
```

**Características:**
- ✅ Sin dependencias externas
- ✅ Simple y directo
- ❌ Menos flexible para expresiones cron complejas

---

### Opción 2: Cron (node-cron)

**Archivo:** `scheduler.cron.ts`

**Instalación:**
```bash
npm install node-cron
npm install -D @types/node-cron
```

**Uso:**
```typescript
// En src/index.ts
import { startCronScheduler } from './jobs/scheduler.cron.js';

startCronScheduler();
```

**Características:**
- ✅ Sintaxis cron estándar (`*/15 * * * *`)
- ✅ Más expresivo y familiar
- ❌ Requiere dependencia adicional

---

## Ejecutar Jobs Manualmente

### Cleanup Job
```bash
# Ejecutar job de limpieza una vez
npm run job:cleanup

# O directamente con Node
node --loader ts-node/esm src/jobs/cleanup-payments.job.ts
```

### Scheduler Standalone
```bash
# Iniciar scheduler como proceso separado
npm run scheduler

# O directamente con Node
node --loader ts-node/esm src/jobs/scheduler.ts
```

---

## Agregar al package.json

```json
{
  "scripts": {
    "job:cleanup": "node --loader ts-node/esm src/jobs/cleanup-payments.job.ts",
    "scheduler": "node --loader ts-node/esm src/jobs/scheduler.ts"
  }
}
```

---

## Producción

### Opción 1: Integrado en la aplicación
```typescript
// src/index.ts
import { startScheduler } from './jobs/scheduler.js';

async function main() {
  const app = await buildApp();
  await app.listen({ port: PORT, host: HOST });

  // Iniciar jobs
  startScheduler();
}
```

### Opción 2: Proceso separado

**Docker Compose:**
```yaml
services:
  api:
    image: guelaguetza-api
    command: npm start

  scheduler:
    image: guelaguetza-api
    command: npm run scheduler
```

**PM2:**
```json
{
  "apps": [
    {
      "name": "api",
      "script": "dist/index.js"
    },
    {
      "name": "scheduler",
      "script": "dist/jobs/scheduler.js"
    }
  ]
}
```

### Opción 3: Serverless Cron (Recomendado para producción)

**AWS EventBridge:**
```yaml
# serverless.yml
functions:
  cleanupPayments:
    handler: src/jobs/cleanup-payments.handler
    events:
      - schedule: rate(15 minutes)
```

**Google Cloud Scheduler:**
```bash
gcloud scheduler jobs create http cleanup-payments \
  --schedule="*/15 * * * *" \
  --uri="https://api.example.com/jobs/cleanup" \
  --http-method=POST
```

**Vercel Cron:**
```json
{
  "crons": [
    {
      "path": "/api/jobs/cleanup",
      "schedule": "*/15 * * * *"
    }
  ]
}
```

---

## Monitoreo

### Logs
Todos los jobs escriben logs a stdout:
```
[Cleanup Job] Starting...
[Cleanup Job] Cleaned 5 failed bookings
[Cleanup Job] Cleaned 3 failed orders
[Cleanup Job] Completed in 234ms
```

### Métricas Recomendadas
- Número de registros limpiados por ejecución
- Duración de cada job
- Tasa de errores
- Alertas si no se ejecuta por > 30 minutos

### Ejemplo con Winston Logger
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'jobs.log' }),
  ],
});

export async function runCleanupJob() {
  logger.info('[Cleanup Job] Starting...');
  // ...
}
```

---

## Testing

### Test Manual
```typescript
// src/jobs/cleanup-payments.test.ts
import { runCleanupJob } from './cleanup-payments.job';

describe('Cleanup Job', () => {
  it('should clean expired bookings', async () => {
    // 1. Crear booking en PENDING_PAYMENT hace 31 minutos
    // 2. Ejecutar job
    // 3. Verificar que fue cancelado y slot restaurado

    const result = await runCleanupJob();
    expect(result.bookingsCleaned).toBe(1);
  });
});
```

---

## Troubleshooting

### Job no se ejecuta
1. Verificar que el scheduler está iniciado
2. Revisar logs de la aplicación
3. Verificar que no hay excepciones no manejadas

### Job muy lento
1. Verificar cantidad de registros a limpiar
2. Agregar índices a columnas `status` y `createdAt`
3. Procesar en lotes si hay miles de registros

### Limpia registros que no debería
1. Verificar timeout configurado (`PAYMENT_TIMEOUT_MINUTES`)
2. Revisar zona horaria del servidor
3. Validar lógica de query en el servicio

---

## Próximos Jobs a Implementar

### 1. Recordatorios de Bookings
```typescript
// jobs/booking-reminders.job.ts
// Enviar email 24h antes de una experiencia
```

### 2. Actualización de Ratings
```typescript
// jobs/update-ratings.job.ts
// Recalcular ratings de sellers/hosts periódicamente
```

### 3. Reporte de Métricas
```typescript
// jobs/daily-metrics.job.ts
// Generar reporte diario de ventas, bookings, etc.
```

### 4. Limpieza de Sesiones
```typescript
// jobs/cleanup-sessions.job.ts
// Limpiar sesiones expiradas de la BD
```
