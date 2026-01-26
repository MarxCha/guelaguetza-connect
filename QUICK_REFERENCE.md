# QUICK REFERENCE - guelaguetza-connect

## Iniciar Ambiente Local

```bash
# Terminal 1: Servicios Docker
cd /Users/marxchavez/Projects/guelaguetza-connect
docker-compose up -d

# Terminal 2: Backend
cd backend
npm install
npm run dev
# Escucha en http://localhost:3001

# Terminal 3: Frontend
npm install
npm run dev
# Abre http://localhost:3000 automáticamente
```

## URLs de Desarrollo

| Componente | URL | Puerto |
|-----------|-----|--------|
| Frontend | http://localhost:3000 | 3000 |
| Backend API | http://localhost:3001 | 3001 |
| PostgreSQL | localhost:5432 | 5432 |
| Redis | localhost:6379 | 6379 |
| pgAdmin (opcional) | http://localhost:5050 | 5050 |

## Archivos Críticos

| Archivo | Propósito | Última Edición |
|---------|-----------|---|
| `/backend/package.json` | Dependencias backend | ✅ Actualizado |
| `/backend/prisma/schema.prisma` | Schema DB | ✅ Completo |
| `/backend/.env` | Variables entorno | ✅ Configurado para Docker |
| `/docker-compose.yml` | Orquestación servicios | ✅ Listo |
| `/package.json` | Dependencias frontend | ✅ Actualizado |
| `components/DirectMessagesView.tsx` | Avatar fix | ✅ Corregido |
| `backend/src/services/upload.service.ts` | CDN tolerante | ✅ Resiliente |

## Git Status

```bash
cd /Users/marxchavez/Projects/guelaguetza-connect

# Ver cambios
git status

# Ver últimos commits
git log --oneline -5

# GitHub
# https://github.com/MarxCha/guelaguetza-connect
```

## Errores Comunes y Soluciones

### Puerto ya en uso
```bash
# Encontrar proceso en puerto
lsof -i :3000
lsof -i :3001

# Matar proceso
kill -9 <PID>
```

### Base de datos no se conecta
```bash
# Verificar servicios Docker
docker-compose ps

# Recrear contenedores
docker-compose down -v
docker-compose up -d
```

### Módulos no encontrados
```bash
cd backend && npm install && npm run build
npm install && npm run build
```

### Redis connection refused
```bash
# Verificar Redis
docker-compose logs redis

# Reconectar
docker-compose restart redis
```

## Estructura del Proyecto

```
guelaguetza-connect/
├── backend/                          # Fastify + Prisma
│   ├── src/
│   │   ├── routes/                   # API endpoints
│   │   ├── services/                 # Business logic
│   │   ├── plugins/                  # Event bus, Redis
│   │   └── utils/                    # Helpers
│   ├── prisma/
│   │   ├── schema.prisma             # Database schema
│   │   └── migrations/               # DB migrations
│   └── package.json
│
├── components/                       # React components
│   ├── DirectMessagesView.tsx
│   ├── CheckoutView.tsx
│   ├── ExperienceDetailView.tsx
│   └── ui/                           # Reusable UI
│
├── services/                         # API clients
│   ├── api.ts
│   └── bookings.ts
│
├── docker-compose.yml                # Services orchestration
├── package.json                      # Frontend deps
└── index.tsx                         # App entry
```

## Tareas Prioritarias

1. **JWT + Refresh Tokens**
   - Archivo: `backend/src/services/auth.service.ts`
   - Status: Pendiente

2. **CDN Integration (Google Cloud Storage)**
   - Archivo: `backend/src/services/upload.service.ts`
   - Status: Estructura lista, necesita configuración

3. **E2E Tests**
   - Archivo: `vitest.config.e2e.ts` (existe)
   - Status: Framework configurado, tests faltantes

## Comandos Útiles

```bash
# Backend
npm run dev              # Desarrollo con hot-reload
npm run build            # Build TypeScript
npm run test             # Ejecutar tests
npm run test:integration # Tests de integración
npm run prisma:migrate   # Ejecutar migraciones

# Frontend
npm run dev              # Vite development server
npm run build            # Build producción
npm run test             # Vitest unit tests
npm run test:e2e         # E2E tests

# Docker
docker-compose up -d     # Iniciar servicios
docker-compose down      # Detener servicios
docker-compose logs -f   # Ver logs

# Base de datos
npm run prisma:studio   # Visualizar DB en UI
npm run prisma:reset    # Reset DB (CUIDADO!)
```

## Historial de Sesiones

```bash
# Ver todas las sesiones del proyecto
grep "guelaguetza-connect" ~/.claude/history.jsonl | jq .

# Ver solo últimas 3
tail ~/.claude/history.jsonl | jq . | grep -A 20 guelaguetza-connect
```

## Stack Técnico

**Backend:**
- Fastify (framework web)
- Prisma (ORM)
- PostgreSQL (database)
- Redis (cache)
- Stripe (payments)
- TypeScript

**Frontend:**
- React 18+
- Vite (bundler)
- TypeScript
- Responsive design

**DevOps:**
- Docker & Docker Compose
- GitHub (versioning)
- GitHub Actions (CI/CD pending)

## Contacto / Referencias

- **Repo:** https://github.com/MarxCha/guelaguetza-connect
- **Documentación Completa:** `/SESSION_SUMMARY_2026-01-26.md`
- **Plan Arquitectura:** `PLAN_ACCION_ARQUITECTURA.md`
- **Análisis Técnico:** `ARQUITECTURA_ANALISIS_COMPLETO.md`

---

Última actualización: 2026-01-26T05:18:31Z
