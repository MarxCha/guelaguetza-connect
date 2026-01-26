# 🚀 START HERE - Docker Setup

## ¿Primera vez con este proyecto?

Sigue estos pasos para levantar el proyecto con Docker:

### Paso 1: Verificar requisitos

```bash
# Verificar que Docker esté instalado
docker --version

# Verificar que Docker Compose esté instalado
docker-compose --version

# Verificar que Docker esté corriendo
docker info
```

Si algo falla, instala Docker Desktop: https://docs.docker.com/get-docker/

### Paso 2: Ejecutar el Quick Start (Recomendado)

```bash
./scripts/quick-start-docker.sh
```

Este script interactivo:
- ✅ Verifica requisitos
- ✅ Configura variables de entorno
- ✅ Build de imágenes
- ✅ Levanta servicios
- ✅ Te guía paso a paso

### Paso 3: Acceder a la aplicación

Una vez levantado:
- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:3001
- **Docs API**: http://localhost:3001/docs

### Paso 4: Seed de datos (opcional)

```bash
# Ejecutar migraciones
npm run docker:migrate

# Cargar datos de prueba
npm run docker:seed
```

---

## Comandos rápidos

```bash
# Ver logs en tiempo real
npm run docker:logs

# Bajar servicios
npm run docker:down

# Reiniciar todo
npm run docker:restart

# Acceder a Prisma Studio
npm run docker:studio
```

---

## ¿Problemas?

### 1. Validar configuración
```bash
./scripts/validate-docker.sh
```

### 2. Ver logs de errores
```bash
docker-compose logs backend
docker-compose logs postgres
```

### 3. Rebuild completo
```bash
npm run docker:rebuild
```

### 4. Limpiar todo y empezar de cero
```bash
npm run docker:clean
npm run docker:up
```

---

## Documentación completa

Una vez que tengas todo funcionando, lee:

1. **DOCKER_QUICK_REFERENCE.md** - Cheat sheet de comandos
2. **DOCKER_GUIDE.md** - Guía completa con todo el detalle
3. **DOCKER_SETUP_SUMMARY.md** - Resumen de la arquitectura

---

## Comandos Make (alternativa a npm)

Si prefieres comandos más cortos:

```bash
make up          # Levantar servicios
make down        # Bajar servicios  
make logs        # Ver logs
make migrate     # Ejecutar migraciones
make seed        # Seed de datos
make help        # Ver todos los comandos
```

---

## ¿Listo para desarrollo?

Una vez que todo funcione:

1. Los cambios en el código se reflejan automáticamente (hot reload)
2. No necesitas reiniciar servicios
3. Los datos persisten entre reinicios
4. Puedes usar tu editor favorito normalmente

**¡Feliz desarrollo!** 🎉

---

**Siguiente paso**: Lee `DOCKER_QUICK_REFERENCE.md` para ver todos los comandos disponibles.
