# 🐳 Docker Setup - Resumen Completo

## ✅ Archivos Creados/Modificados

### Configuración Docker Principal
- ✅ `docker-compose.yml` - Desarrollo con hot reload
- ✅ `docker-compose.prod.yml` - Producción optimizada
- ✅ `Dockerfile.frontend` - Multi-stage build frontend (4 etapas)
- ✅ `backend/Dockerfile` - Multi-stage build backend (4 etapas)
- ✅ `.dockerignore` - Exclusiones root
- ✅ `backend/.dockerignore` - Exclusiones backend

### Scripts de Inicialización
- ✅ `backend/scripts/docker-entrypoint.sh` - Entrypoint con migraciones automáticas
- ✅ `backend/scripts/init-db.sh` - Inicialización PostgreSQL
- ✅ `backend/scripts/healthcheck.sh` - Health checks personalizados

### Archivos de Entorno
- ✅ `.env.docker.example` - Template desarrollo
- ✅ `.env.docker.prod.example` - Template producción
- ✅ `.env.docker` - Configuración de desarrollo (creado)

### Herramientas
- ✅ `Makefile` - Comandos simplificados
- ✅ `scripts/validate-docker.sh` - Validador de configuración
- ✅ `scripts/quick-start-docker.sh` - Setup interactivo

### Documentación
- ✅ `DOCKER_GUIDE.md` - Guía completa de uso
- ✅ `backend/DOCKER_README.md` - Documentación específica del backend
- ✅ `DOCKER_SETUP_SUMMARY.md` - Este archivo

### Package.json Updates
- ✅ Scripts npm para Docker agregados (root)
- ✅ Scripts npm para Docker agregados (backend)

---

## 🚀 Inicio Rápido

### Opción 1: Script Interactivo (RECOMENDADO)
```bash
./scripts/quick-start-docker.sh
```

### Opción 2: Manual
```bash
# 1. Copiar archivo de entorno
cp .env.docker.example .env.docker

# 2. Levantar servicios
npm run docker:up

# 3. Ejecutar migraciones
npm run docker:migrate

# 4. Seed de datos (opcional)
npm run docker:seed
```

### Opción 3: Usando Make
```bash
make up
make migrate
make seed
```

---

## 📦 Stack Completo

### Servicios Configurados

| Servicio | Puerto | Imagen | Descripción |
|----------|--------|--------|-------------|
| **PostgreSQL** | 5432 | postgres:15-alpine | Base de datos principal |
| **Redis** | 6379 | redis:7-alpine | Cache y sesiones |
| **Backend** | 3001 | Custom multi-stage | Fastify + Prisma API |
| **Frontend** | 5173 (dev)<br>80 (prod) | Custom multi-stage | Vite + React SPA |

### Características Principales

#### PostgreSQL
- ✅ Versión 15 Alpine
- ✅ Volume persistente
- ✅ Health checks configurados
- ✅ Extensiones: uuid-ossp, pg_trgm
- ✅ Base de datos de testing incluida
- ✅ Script de inicialización automático

#### Redis
- ✅ Versión 7 Alpine
- ✅ Persistencia AOF habilitada
- ✅ MaxMemory configurado
- ✅ LRU eviction policy
- ✅ Health checks

#### Backend
- ✅ Multi-stage build (4 etapas)
- ✅ Hot reload en desarrollo (tsx watch)
- ✅ Migraciones automáticas al inicio
- ✅ Usuario non-root en producción
- ✅ Health checks personalizados
- ✅ Resource limits en producción
- ✅ Log rotation configurado

#### Frontend
- ✅ Multi-stage build (4 etapas)
- ✅ Hot reload en desarrollo (Vite HMR)
- ✅ Nginx optimizado en producción
- ✅ Gzip compression habilitada
- ✅ Cache headers configurados
- ✅ Security headers incluidos
- ✅ SPA routing configurado

---

## 🛠️ Comandos Disponibles

### NPM Scripts

```bash
# Desarrollo
npm run docker:up              # Levantar servicios
npm run docker:down            # Bajar servicios
npm run docker:restart         # Reiniciar servicios
npm run docker:logs            # Ver logs de todos
npm run docker:logs:backend    # Ver logs backend
npm run docker:logs:frontend   # Ver logs frontend

# Build
npm run docker:build           # Build de imágenes
npm run docker:rebuild         # Rebuild completo sin cache
npm run docker:clean           # Limpiar todo

# Base de datos
npm run docker:migrate         # Ejecutar migraciones
npm run docker:seed            # Seed de datos
npm run docker:studio          # Abrir Prisma Studio
npm run docker:psql            # Acceder a PostgreSQL CLI
npm run docker:redis-cli       # Acceder a Redis CLI

# Shell
npm run docker:shell           # Acceder al shell del backend

# Producción
npm run docker:prod:up         # Levantar producción
npm run docker:prod:down       # Bajar producción
npm run docker:prod:logs       # Ver logs producción
npm run docker:prod:build      # Build producción
```

### Make Commands

```bash
# Básicos
make up                # Levantar servicios
make down              # Bajar servicios
make restart           # Reiniciar servicios
make logs              # Ver logs
make build             # Build imágenes
make rebuild           # Rebuild completo
make clean             # Limpiar todo

# Logs específicos
make logs-backend      # Logs del backend
make logs-frontend     # Logs del frontend
make logs-db           # Logs de PostgreSQL
make logs-redis        # Logs de Redis

# Base de datos
make migrate           # Ejecutar migraciones
make seed              # Seed de datos
make studio            # Abrir Prisma Studio
make psql              # PostgreSQL CLI
make redis-cli         # Redis CLI

# Debugging
make shell             # Shell del backend
make shell-frontend    # Shell del frontend
make health            # Verificar salud
make stats             # Ver estadísticas
make inspect           # Inspeccionar config

# Producción
make prod-up           # Levantar producción
make prod-down         # Bajar producción
make prod-logs         # Logs producción
make prod-build        # Build producción

# Utilidades
make install           # Instalar dependencias
make test              # Ejecutar tests
make backup-db         # Backup de DB
make restore-db        # Restaurar DB

# Ayuda
make help              # Mostrar todos los comandos
```

---

## 🔍 Validación

### Validador Automático
```bash
./scripts/validate-docker.sh
```

Verifica:
- ✅ Docker instalado
- ✅ Docker Compose instalado
- ✅ Docker daemon corriendo
- ✅ Archivos de configuración presentes
- ✅ Scripts ejecutables
- ✅ Variables de entorno configuradas
- ✅ Sintaxis de docker-compose válida
- ✅ Puertos disponibles
- ✅ NPM scripts configurados

---

## 🏗️ Arquitectura Multi-Stage

### Backend Dockerfile (4 etapas)

```
┌─────────────────────────────────────────┐
│  STAGE 1: BASE                          │
│  - Node 20 Alpine                       │
│  - Dependencias del sistema             │
│  - Setup básico                         │
└─────────────────────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼──────────────┐  ┌────────▼─────────┐
│ STAGE 2: DEV     │  │ STAGE 3: BUILDER │
│ - Hot reload     │  │ - Compile TS     │
│ - All deps       │  │ - Build          │
│ - tsx watch      │  │ - Prune deps     │
└──────────────────┘  └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │ STAGE 4: PROD    │
                      │ - Non-root user  │
                      │ - Minimal image  │
                      │ - Optimized      │
                      └──────────────────┘
```

### Frontend Dockerfile (4 etapas)

```
┌─────────────────────────────────────────┐
│  STAGE 1: BASE                          │
│  - Node 20 Alpine                       │
│  - Setup básico                         │
└─────────────────────────────────────────┘
                  │
    ┌─────────────┴─────────────┐
    │                           │
┌───▼──────────────┐  ┌────────▼─────────┐
│ STAGE 2: DEV     │  │ STAGE 3: BUILDER │
│ - Vite HMR       │  │ - Vite build     │
│ - Hot reload     │  │ - Optimize       │
│ - Port 5173      │  │ - Minify         │
└──────────────────┘  └────────┬─────────┘
                               │
                      ┌────────▼─────────┐
                      │ STAGE 4: NGINX   │
                      │ - Static files   │
                      │ - Gzip enabled   │
                      │ - SPA routing    │
                      └──────────────────┘
```

---

## 🔐 Seguridad

### Desarrollo
- Contraseñas simples OK
- Puertos expuestos OK
- Usuario root OK
- Logs verbose

### Producción
- ❌ NUNCA usar contraseñas por defecto
- ❌ NUNCA commitear .env.docker.prod
- ✅ Usuario non-root
- ✅ Resource limits
- ✅ Health checks estrictos
- ✅ Log rotation
- ✅ Security headers
- ✅ HTTPS ready

---

## 📊 Performance

### Resource Limits (Producción)

| Servicio | CPU Limit | Memory Limit | CPU Reserved | Memory Reserved |
|----------|-----------|--------------|--------------|-----------------|
| PostgreSQL | 2 cores | 2GB | 1 core | 1GB |
| Redis | 1 core | 1GB | 0.5 cores | 512MB |
| Backend | 2 cores | 2GB | 1 core | 1GB |
| Frontend | 1 core | 512MB | 0.5 cores | 256MB |

### Optimizaciones

#### Backend
- ✅ TypeScript compilado a JS
- ✅ DevDependencies removidas
- ✅ Source maps deshabilitados en prod
- ✅ Connection pooling configurado
- ✅ Rate limiting habilitado

#### Frontend
- ✅ Assets minificados
- ✅ Tree shaking habilitado
- ✅ Code splitting automático
- ✅ Gzip compression
- ✅ Cache headers optimizados
- ✅ Static serving con Nginx

---

## 🩺 Health Checks

Todos los servicios tienen health checks:

```yaml
# PostgreSQL
pg_isready -U postgres -d guelaguetza_db

# Redis
redis-cli ping

# Backend
wget --spider http://localhost:3001/health

# Frontend
wget --spider http://localhost:5173
```

Verificar estado:
```bash
docker-compose ps
make health
```

---

## 📝 Variables de Entorno

### Requeridas en Producción
```bash
# Database
POSTGRES_PASSWORD=*****
DATABASE_URL=postgresql://...

# Redis
REDIS_PASSWORD=*****

# Auth
JWT_SECRET=*****

# CORS
CORS_ORIGINS=https://...

# Stripe
STRIPE_SECRET_KEY=sk_live_*****
STRIPE_PUBLISHABLE_KEY=pk_live_*****
STRIPE_WEBHOOK_SECRET=whsec_*****
```

### Opcionales
```bash
# External Services
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
SENDGRID_API_KEY=

# Performance
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Feature Flags
ENABLE_PAYMENTS=true
ENABLE_NOTIFICATIONS=true
ENABLE_ANALYTICS=true
```

---

## 🐛 Troubleshooting

### Puerto ocupado
```bash
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :3001  # Backend
lsof -i :5173  # Frontend
kill -9 <PID>
```

### Contenedor no inicia
```bash
docker-compose logs <service>
docker inspect <container>
docker-compose restart <service>
```

### Limpiar todo
```bash
make clean
# O
npm run docker:clean
```

### Rebuild completo
```bash
make rebuild
# O
npm run docker:rebuild
```

---

## ✅ Checklist Pre-Deploy Producción

- [ ] Variables de entorno configuradas (.env.docker.prod)
- [ ] Secretos cambiados (NO usar valores por defecto)
- [ ] CORS configurado con dominios reales
- [ ] Stripe keys de producción configuradas
- [ ] Database backups programados
- [ ] Health checks verificados
- [ ] Logs configurados y rotación habilitada
- [ ] HTTPS configurado (certificados SSL)
- [ ] Firewall rules configuradas
- [ ] Monitoring habilitado (Grafana/Prometheus)
- [ ] Resource limits ajustados según carga
- [ ] DNS configurado
- [ ] CDN configurado (opcional)
- [ ] Rate limiting ajustado

---

## 📚 Documentación Adicional

- **Guía completa**: `DOCKER_GUIDE.md`
- **Backend específico**: `backend/DOCKER_README.md`
- **Docker Compose**: https://docs.docker.com/compose/
- **Multi-stage builds**: https://docs.docker.com/build/building/multi-stage/
- **Dockerfile best practices**: https://docs.docker.com/develop/dev-best-practices/

---

## 🎯 Próximos Pasos

1. Ejecutar el quick start: `./scripts/quick-start-docker.sh`
2. Verificar que todo funciona: `make health`
3. Ejecutar migraciones: `make migrate`
4. Seed de datos: `make seed`
5. Acceder a la app: http://localhost:5173

---

## 🤝 Soporte

Si encuentras problemas:

1. Ejecuta el validador: `./scripts/validate-docker.sh`
2. Revisa los logs: `make logs`
3. Consulta la guía: `DOCKER_GUIDE.md`
4. Crea un issue en el repositorio

---

**¡Happy Dockering! 🐳**

Last updated: 2026-01-25
