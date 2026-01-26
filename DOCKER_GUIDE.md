# 🐳 Guía Docker - Guelaguetza Connect

Configuración completa de Docker para desarrollo y producción.

## 📋 Stack

- **PostgreSQL 15** - Base de datos principal
- **Redis 7** - Cache y gestión de sesiones
- **Backend** - Fastify + Prisma + TypeScript
- **Frontend** - Vite + React + TypeScript

---

## 🚀 Quick Start - Desarrollo

### 1. Configuración inicial

```bash
# Copiar archivo de entorno
cp .env.docker.example .env.docker

# Editar variables de entorno (opcional)
nano .env.docker
```

### 2. Levantar servicios

```bash
# Opción 1: Usando npm scripts (RECOMENDADO)
npm run docker:up

# Opción 2: Usando docker-compose directamente
docker-compose up -d

# Ver logs en tiempo real
npm run docker:logs

# Ver logs de un servicio específico
npm run docker:logs:backend
npm run docker:logs:frontend
```

### 3. Ejecutar migraciones y seed

```bash
# Ejecutar migraciones
npm run docker:migrate

# Seed de datos iniciales (opcional)
npm run docker:seed
```

### 4. Acceder a la aplicación

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Prisma Studio**: http://localhost:5555 (ejecutar `npm run docker:studio`)

---

## 🛠️ Comandos útiles

### Gestión de contenedores

```bash
# Levantar servicios
npm run docker:up

# Bajar servicios
npm run docker:down

# Reiniciar servicios
npm run docker:restart

# Ver logs
npm run docker:logs

# Rebuild completo (después de cambios en Dockerfile)
npm run docker:rebuild

# Limpiar todo (contenedores + volumes + imágenes huérfanas)
npm run docker:clean
```

### Base de datos

```bash
# Acceder a PostgreSQL
npm run docker:psql

# Ejecutar migraciones
npm run docker:migrate

# Seed de datos
npm run docker:seed

# Abrir Prisma Studio
npm run docker:studio
```

### Redis

```bash
# Acceder a Redis CLI
npm run docker:redis-cli

# Verificar keys en Redis
docker-compose exec redis redis-cli KEYS "*"

# Limpiar cache de Redis
docker-compose exec redis redis-cli FLUSHALL
```

### Debugging

```bash
# Acceder al shell del backend
npm run docker:shell

# Ver logs de un servicio específico
docker-compose logs -f backend
docker-compose logs -f postgres
docker-compose logs -f redis

# Verificar estado de los contenedores
docker-compose ps

# Ver recursos utilizados
docker stats
```

---

## 🏭 Producción

### 1. Configuración de producción

```bash
# Copiar archivo de entorno de producción
cp .env.docker.prod.example .env.docker.prod

# IMPORTANTE: Editar y cambiar TODOS los secretos
nano .env.docker.prod
```

**Variables críticas a cambiar:**
- `POSTGRES_PASSWORD`
- `REDIS_PASSWORD`
- `JWT_SECRET`
- `STRIPE_SECRET_KEY`
- `CORS_ORIGINS`

### 2. Build y Deploy

```bash
# Build de imágenes de producción (sin cache)
npm run docker:prod:build

# Levantar servicios en producción
npm run docker:prod:up

# Ver logs
npm run docker:prod:logs

# Bajar servicios
npm run docker:prod:down
```

### 3. Diferencias Desarrollo vs Producción

| Feature | Desarrollo | Producción |
|---------|-----------|------------|
| Hot Reload | ✅ Sí | ❌ No |
| Source Maps | ✅ Sí | ❌ No |
| Logs | Verbose | Warning/Error |
| Restart Policy | `unless-stopped` | `always` |
| Build | Single stage | Multi-stage optimizado |
| Usuario | root | non-root (nodejs) |
| HTTPS | No | Sí (Nginx) |
| Limits | No | CPU/Memory limits |

---

## 📁 Estructura de archivos

```
guelaguetza-connect/
├── docker-compose.yml              # Desarrollo
├── docker-compose.prod.yml         # Producción
├── .dockerignore                   # Exclusiones root
├── Dockerfile.frontend             # Multi-stage frontend
├── .env.docker.example             # Ejemplo desarrollo
├── .env.docker.prod.example        # Ejemplo producción
│
├── backend/
│   ├── Dockerfile                  # Multi-stage backend
│   ├── .dockerignore              # Exclusiones backend
│   └── scripts/
│       ├── docker-entrypoint.sh   # Entrypoint con health checks
│       └── init-db.sh             # Inicialización PostgreSQL
│
└── DOCKER_GUIDE.md                # Esta guía
```

---

## 🔍 Healthchecks

Todos los servicios tienen healthchecks configurados:

### PostgreSQL
```bash
pg_isready -U postgres -d guelaguetza_db
```

### Redis
```bash
redis-cli ping
```

### Backend
```bash
wget --spider http://localhost:3001/health
```

### Frontend
```bash
wget --spider http://localhost:5173
```

Verificar estado:
```bash
docker-compose ps
```

---

## 🐛 Troubleshooting

### Puerto ocupado

```bash
# Encontrar proceso usando el puerto
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :3001  # Backend
lsof -i :5173  # Frontend

# Matar proceso
kill -9 <PID>
```

### Contenedor no inicia

```bash
# Ver logs detallados
docker-compose logs backend

# Verificar healthcheck
docker inspect guelaguetza-backend | grep -A 10 Health

# Reiniciar contenedor específico
docker-compose restart backend
```

### Base de datos no conecta

```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps postgres

# Verificar logs de PostgreSQL
docker-compose logs postgres

# Probar conexión manual
docker-compose exec postgres psql -U postgres -d guelaguetza_db -c "SELECT 1"
```

### Error de permisos

```bash
# Dar permisos a scripts
chmod +x backend/scripts/*.sh

# Rebuild sin cache
npm run docker:rebuild
```

### Limpiar todo y empezar de cero

```bash
# Parar contenedores
docker-compose down

# Eliminar volumes (CUIDADO: borra datos)
docker-compose down -v

# Limpiar imágenes
docker system prune -af

# Rebuild
npm run docker:rebuild
```

---

## 📊 Monitoring (Opcional)

Para habilitar Prometheus y Grafana:

```bash
# Levantar stack de monitoring
cd backend
npm run monitoring:up

# Acceder a Grafana
open http://localhost:3001/grafana

# Ver métricas en Prometheus
open http://localhost:9090
```

---

## 🔒 Seguridad

### Desarrollo
- ✅ Contraseñas simples OK
- ✅ Puertos expuestos OK
- ✅ Root user OK

### Producción
- ❌ NUNCA usar contraseñas por defecto
- ❌ NUNCA commitear `.env.docker.prod`
- ✅ Usar usuario non-root
- ✅ Limitar puertos expuestos
- ✅ CPU/Memory limits
- ✅ Restart policies
- ✅ Log rotation
- ✅ HTTPS con certificados válidos

---

## 📝 Notas importantes

1. **Volúmenes persistentes**: Los datos de PostgreSQL y Redis se guardan en volumes de Docker
2. **Hot reload**: En desarrollo, los cambios en el código se reflejan automáticamente
3. **Node modules**: Se usa un volume separado para `node_modules` en desarrollo
4. **Migraciones**: Se ejecutan automáticamente al iniciar el backend (production)
5. **Seed**: Solo se ejecuta si `AUTO_SEED=true` (desarrollo)

---

## 🚨 Comandos de emergencia

```bash
# Parar TODO
docker stop $(docker ps -q)

# Eliminar TODO (contenedores + volumes + imágenes)
docker system prune -af --volumes

# Verificar espacio en disco
docker system df

# Limpiar volumes huérfanos
docker volume prune
```

---

## 📚 Recursos

- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Multi-stage builds](https://docs.docker.com/build/building/multi-stage/)
- [Dockerfile best practices](https://docs.docker.com/develop/dev-best-practices/)
- [PostgreSQL Docker Hub](https://hub.docker.com/_/postgres)
- [Redis Docker Hub](https://hub.docker.com/_/redis)

---

## ✅ Checklist pre-deploy

- [ ] Variables de entorno configuradas
- [ ] Secretos cambiados de los valores por defecto
- [ ] CORS configurado correctamente
- [ ] Stripe keys de producción
- [ ] Database backups configurados
- [ ] Health checks funcionando
- [ ] Logs configurados
- [ ] HTTPS configurado
- [ ] Firewall rules configuradas
- [ ] Monitoring habilitado

---

## 🤝 Contribuir

Si encuentras algún problema o mejora para esta configuración Docker, por favor:

1. Crea un issue
2. Propón una mejora en el PR
3. Actualiza esta documentación

---

**Happy Dockering! 🐳**
