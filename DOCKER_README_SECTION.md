# 🐳 Docker Setup

Este proyecto incluye una configuración completa de Docker para desarrollo y producción.

## Quick Start

### Opción 1: Script Interactivo (Recomendado)
```bash
./scripts/quick-start-docker.sh
```

### Opción 2: Manual
```bash
# 1. Copiar variables de entorno
cp .env.docker.example .env.docker

# 2. Levantar servicios
npm run docker:up

# 3. Ejecutar migraciones
npm run docker:migrate

# 4. Seed inicial (opcional)
npm run docker:seed

# 5. Acceder a la app
open http://localhost:5173
```

### Opción 3: Usando Make
```bash
make up
make migrate
make seed
```

## Stack

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| Frontend | 5173 | Vite + React con hot reload |
| Backend | 3001 | Fastify + Prisma API |
| PostgreSQL | 5432 | Base de datos |
| Redis | 6379 | Cache y sesiones |

## Comandos Útiles

```bash
# Ver logs
npm run docker:logs

# Bajar servicios
npm run docker:down

# Acceder al shell del backend
npm run docker:shell

# Prisma Studio
npm run docker:studio

# Ver todos los comandos
make help
```

## Documentación Completa

- 📖 [Guía Completa de Docker](DOCKER_GUIDE.md)
- 📋 [Resumen de Setup](DOCKER_SETUP_SUMMARY.md)
- ⚡ [Quick Reference](DOCKER_QUICK_REFERENCE.md)
- 🔧 [Backend Docker README](backend/DOCKER_README.md)

## Troubleshooting

```bash
# Validar configuración
./scripts/validate-docker.sh

# Ver logs de un servicio específico
docker-compose logs -f backend

# Rebuild completo
npm run docker:rebuild

# Limpiar todo
npm run docker:clean
```

## Producción

```bash
# Configurar variables de producción
cp .env.docker.prod.example .env.docker.prod
nano .env.docker.prod  # Editar secretos

# Build y deploy
npm run docker:prod:build
npm run docker:prod:up
```

---

**Nota**: Todos los servicios incluyen health checks, hot reload en desarrollo, y están optimizados para producción con multi-stage builds.
