# Backend - Docker Configuration

## Multi-Stage Build

El Dockerfile del backend usa un build de 4 etapas:

### Stage 1: Base
- Instala dependencias del sistema
- Configura el directorio de trabajo
- Copia archivos de dependencias

### Stage 2: Development
- Instala todas las dependencias (incluidas devDependencies)
- Habilita hot reload con `tsx watch`
- Expone puerto 3001
- Ejecuta migraciones automáticamente

### Stage 3: Builder
- Compila TypeScript a JavaScript
- Genera Prisma Client
- Elimina devDependencies

### Stage 4: Production
- Imagen mínima con solo lo necesario
- Usuario non-root (nodejs:nodejs)
- Entrypoint script para migraciones
- Health checks configurados

## Scripts de inicialización

### docker-entrypoint.sh
Script principal que se ejecuta al iniciar el contenedor:

1. **Wait for database** - Espera hasta que PostgreSQL esté listo
2. **Wait for Redis** - Espera hasta que Redis esté listo
3. **Run migrations** - Ejecuta `prisma migrate deploy`
4. **Seed database** - Opcional si `AUTO_SEED=true`
5. **Health check** - Verifica que Prisma Client esté generado
6. **Start server** - Inicia Fastify

### init-db.sh
Script de inicialización de PostgreSQL:

- Crea la base de datos principal (`guelaguetza_db`)
- Crea la base de datos de testing (`guelaguetza_test`)
- Instala extensiones PostgreSQL (`uuid-ossp`, `pg_trgm`)

### healthcheck.sh
Script personalizado para verificar la salud del servicio:

- Verifica que el servidor HTTP responda
- Verifica conexión a PostgreSQL
- Verifica conexión a Redis (opcional)

## Variables de entorno

### Requeridas
- `DATABASE_URL` - Connection string de PostgreSQL
- `JWT_SECRET` - Secret para JWT
- `CORS_ORIGINS` - Orígenes permitidos

### Opcionales
- `PORT` - Puerto del servidor (default: 3001)
- `NODE_ENV` - Entorno (development/production)
- `REDIS_URL` - URL de Redis
- `LOG_LEVEL` - Nivel de logs (debug/info/warn/error)
- `AUTO_SEED` - Ejecutar seed automáticamente (solo dev)

## Volúmenes

### Desarrollo
```yaml
volumes:
  - ./src:/app/src:cached              # Hot reload
  - ./prisma:/app/prisma:cached        # Migraciones
  - backend_node_modules:/app/node_modules  # Aislado
```

### Producción
No se montan volúmenes de código. Todo está en la imagen.

## Healthchecks

### Development
```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost:3001/health"]
  interval: 15s
  timeout: 5s
  retries: 5
  start_period: 40s
```

### Production
```yaml
healthcheck:
  test: ["CMD", "wget", "--spider", "http://localhost:3001/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 60s
```

## Comandos útiles

```bash
# Build development
docker build --target development -t guelaguetza-backend:dev .

# Build production
docker build --target production -t guelaguetza-backend:prod .

# Run development
docker run -p 3001:3001 --env-file .env guelaguetza-backend:dev

# Ejecutar comando dentro del contenedor
docker-compose exec backend npm run db:seed

# Ver logs
docker-compose logs -f backend

# Acceder al shell
docker-compose exec backend sh

# Ejecutar migraciones
docker-compose exec backend npx prisma migrate deploy
```

## Troubleshooting

### Error: Cannot find module '@prisma/client'
```bash
docker-compose exec backend npx prisma generate
```

### Error: Database connection failed
```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps postgres

# Ver logs de PostgreSQL
docker-compose logs postgres

# Probar conexión manual
docker-compose exec postgres psql -U postgres -d guelaguetza_db
```

### Error: Port already in use
```bash
# Encontrar proceso usando el puerto
lsof -i :3001

# Cambiar puerto en docker-compose.yml
ports:
  - "3002:3001"  # Host:Container
```

### Hot reload no funciona
Verifica que los volúmenes estén correctamente montados:
```bash
docker-compose exec backend ls -la /app/src
```

## Seguridad

### Desarrollo
- Usuario: root (para facilitar debugging)
- Secretos: valores simples
- Logs: verbose

### Producción
- Usuario: nodejs (non-root)
- Secretos: desde variables de entorno o secret manager
- Logs: warn/error only
- Resource limits configurados
- Health checks estrictos

## Performance

### Development
- No hay límites de recursos
- Hot reload habilitado
- Source maps habilitados

### Production
```yaml
deploy:
  resources:
    limits:
      cpus: '2'
      memory: 2G
    reservations:
      cpus: '1'
      memory: 1G
```

## Logs

Los logs se gestionan con rotation automática en producción:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```

Ver logs:
```bash
docker-compose logs -f backend
docker-compose logs --tail=100 backend
```
