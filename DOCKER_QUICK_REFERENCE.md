# 🐳 Docker - Quick Reference Card

## ⚡ Comandos Esenciales

### Inicio Rápido
```bash
# Setup inicial
./scripts/quick-start-docker.sh

# O manual
cp .env.docker.example .env.docker
npm run docker:up
npm run docker:migrate
```

### Comandos Diarios
```bash
make up          # Levantar todo
make down        # Bajar todo
make logs        # Ver logs
make restart     # Reiniciar
```

## 📋 Cheat Sheet

| Acción | Comando Make | Comando NPM |
|--------|-------------|-------------|
| Levantar servicios | `make up` | `npm run docker:up` |
| Bajar servicios | `make down` | `npm run docker:down` |
| Ver logs | `make logs` | `npm run docker:logs` |
| Rebuild | `make rebuild` | `npm run docker:rebuild` |
| Migraciones | `make migrate` | `npm run docker:migrate` |
| Seed | `make seed` | `npm run docker:seed` |
| Shell backend | `make shell` | `npm run docker:shell` |
| PostgreSQL CLI | `make psql` | `npm run docker:psql` |
| Redis CLI | `make redis-cli` | `npm run docker:redis-cli` |

## 🔥 Troubleshooting Rápido

```bash
# Logs de un servicio
docker-compose logs -f backend
docker-compose logs -f postgres

# Estado de contenedores
docker-compose ps

# Reiniciar un servicio
docker-compose restart backend

# Limpiar todo
make clean

# Puerto ocupado
lsof -i :5432 && kill -9 <PID>
```

## 🌐 URLs

| Servicio | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:3001 |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| Prisma Studio | http://localhost:5555 |

## 🎯 Flujo Típico de Desarrollo

```bash
# 1. Levantar servicios
make up

# 2. Ver logs en otra terminal
make logs

# 3. Hacer cambios en el código
# (hot reload automático)

# 4. Si cambias el schema de Prisma
make migrate

# 5. Ver la base de datos
make studio

# 6. Al terminar
make down
```

## 🚨 Comandos de Emergencia

```bash
# Parar TODO
docker stop $(docker ps -q)

# Limpiar TODO
docker system prune -af --volumes

# Rebuild desde cero
make rebuild
```

## 📦 Estructura

```
guelaguetza-connect/
├── docker-compose.yml       # Dev
├── docker-compose.prod.yml  # Prod
├── Makefile                 # Comandos fáciles
├── .env.docker             # Config dev
└── backend/
    ├── Dockerfile          # Multi-stage
    └── scripts/
        ├── docker-entrypoint.sh
        └── init-db.sh
```

## 🔍 Validar Configuración

```bash
./scripts/validate-docker.sh
```

## 📚 Docs Completas

- `DOCKER_GUIDE.md` - Guía completa
- `DOCKER_SETUP_SUMMARY.md` - Resumen detallado
- `backend/DOCKER_README.md` - Backend específico

---

**Tip**: Ejecuta `make help` para ver todos los comandos disponibles
