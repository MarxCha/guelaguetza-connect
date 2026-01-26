# ============================================
# MULTI-STAGE BUILD: Backend Fastify
# ============================================
# Stage 1: Base - Dependencies comunes
# Stage 2: Development - Hot reload con tsx
# Stage 3: Builder - Compilación TypeScript
# Stage 4: Production - Imagen optimizada
# ============================================

# ============================================
# STAGE 1: BASE
# ============================================
FROM node:20-alpine AS base

# Metadata
LABEL maintainer="Guelaguetza Connect <dev@guelaguetzaconnect.com>"
LABEL version="1.0.0"
LABEL description="Guelaguetza Connect Backend API - Fastify + Prisma + PostgreSQL + Redis"

# Instalar dependencias del sistema para Prisma
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    wget

# Crear directorio de aplicación
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
COPY prisma ./prisma/

# ============================================
# STAGE 2: DEVELOPMENT
# ============================================
FROM base AS development

ENV NODE_ENV=development

# Instalar TODAS las dependencias (incluidas devDependencies para tsx watch)
RUN npm ci

# Copiar código fuente
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Exponer puerto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Comando de inicio (con hot reload)
CMD ["sh", "-c", "npx prisma migrate deploy && npm run dev"]

# ============================================
# STAGE 3: BUILDER
# ============================================
FROM base AS builder

ENV NODE_ENV=production

# Instalar dependencias de producción Y devDependencies para build
RUN npm ci

# Copiar código fuente
COPY . .

# Generar Prisma Client
RUN npx prisma generate

# Compilar TypeScript
RUN npm run build

# Limpiar devDependencies después del build
RUN npm prune --production

# ============================================
# STAGE 4: PRODUCTION
# ============================================
FROM node:20-alpine AS production

# Instalar dependencias del sistema
RUN apk add --no-cache \
    openssl \
    libc6-compat \
    wget \
    dumb-init

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Crear directorio de aplicación
WORKDIR /app

# Copiar archivos de producción desde builder
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./

# Copiar script de entrypoint
COPY --from=builder --chown=nodejs:nodejs /app/scripts/docker-entrypoint.sh /usr/local/bin/
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

# Variables de entorno por defecto
ENV NODE_ENV=production \
    PORT=3001

# Usar dumb-init para manejar señales correctamente
ENTRYPOINT ["dumb-init", "--"]

# Comando de inicio con entrypoint script
CMD ["/usr/local/bin/docker-entrypoint.sh"]
