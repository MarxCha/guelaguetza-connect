# ============================================
# Makefile - Guelaguetza Connect
# ============================================
# Facilita el uso de comandos Docker comunes
# ============================================

.PHONY: help up down restart logs build rebuild clean migrate seed studio shell psql redis-cli prod-up prod-down prod-logs prod-build health

# Colors
YELLOW := \033[1;33m
GREEN := \033[0;32m
NC := \033[0m

# Default target
.DEFAULT_GOAL := help

help: ## Mostrar esta ayuda
	@echo ""
	@echo "$(GREEN)🐳 Guelaguetza Connect - Docker Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# ============================================
# DESARROLLO
# ============================================

up: ## Levantar servicios de desarrollo
	@echo "$(GREEN)🚀 Levantando servicios...$(NC)"
	docker-compose up -d
	@echo "$(GREEN)✅ Servicios levantados!$(NC)"
	@echo "   - Frontend: http://localhost:5173"
	@echo "   - Backend:  http://localhost:3001"
	@make health

down: ## Bajar servicios
	@echo "$(YELLOW)⬇️  Bajando servicios...$(NC)"
	docker-compose down

restart: ## Reiniciar servicios
	@echo "$(YELLOW)🔄 Reiniciando servicios...$(NC)"
	docker-compose restart

logs: ## Ver logs de todos los servicios
	docker-compose logs -f

logs-backend: ## Ver logs del backend
	docker-compose logs -f backend

logs-frontend: ## Ver logs del frontend
	docker-compose logs -f frontend

logs-db: ## Ver logs de PostgreSQL
	docker-compose logs -f postgres

logs-redis: ## Ver logs de Redis
	docker-compose logs -f redis

build: ## Build de imágenes
	@echo "$(GREEN)🔨 Building imágenes...$(NC)"
	docker-compose build

rebuild: ## Rebuild completo (sin cache)
	@echo "$(YELLOW)🔨 Rebuild completo...$(NC)"
	docker-compose down
	docker-compose build --no-cache
	docker-compose up -d
	@echo "$(GREEN)✅ Rebuild completo!$(NC)"

clean: ## Limpiar todo (contenedores + volumes + imágenes)
	@echo "$(YELLOW)⚠️  ADVERTENCIA: Esto eliminará TODOS los datos!$(NC)"
	@read -p "Continuar? [y/N]: " confirm; \
	if [ "$$confirm" = "y" ]; then \
		docker-compose down -v; \
		docker system prune -f; \
		echo "$(GREEN)✅ Limpieza completa!$(NC)"; \
	else \
		echo "Cancelado."; \
	fi

# ============================================
# BASE DE DATOS
# ============================================

migrate: ## Ejecutar migraciones de Prisma
	@echo "$(GREEN)📦 Ejecutando migraciones...$(NC)"
	docker-compose exec backend npx prisma migrate deploy
	@echo "$(GREEN)✅ Migraciones completadas!$(NC)"

seed: ## Seed de datos iniciales
	@echo "$(GREEN)🌱 Seeding database...$(NC)"
	docker-compose exec backend npm run db:seed
	@echo "$(GREEN)✅ Seed completado!$(NC)"

studio: ## Abrir Prisma Studio
	@echo "$(GREEN)🎨 Abriendo Prisma Studio...$(NC)"
	docker-compose exec backend npx prisma studio

psql: ## Acceder a PostgreSQL CLI
	docker-compose exec postgres psql -U postgres -d guelaguetza_db

redis-cli: ## Acceder a Redis CLI
	docker-compose exec redis redis-cli

# ============================================
# DEBUGGING
# ============================================

shell: ## Acceder al shell del backend
	docker-compose exec backend sh

shell-frontend: ## Acceder al shell del frontend
	docker-compose exec frontend sh

health: ## Verificar salud de los servicios
	@echo "$(GREEN)🏥 Verificando salud de servicios...$(NC)"
	@docker-compose ps

stats: ## Ver estadísticas de recursos
	docker stats --no-stream

inspect: ## Inspeccionar configuración
	docker-compose config

# ============================================
# PRODUCCIÓN
# ============================================

prod-up: ## Levantar servicios en producción
	@echo "$(GREEN)🚀 Levantando servicios de PRODUCCIÓN...$(NC)"
	docker-compose -f docker-compose.prod.yml --env-file .env.docker.prod up -d
	@echo "$(GREEN)✅ Servicios de producción levantados!$(NC)"

prod-down: ## Bajar servicios de producción
	@echo "$(YELLOW)⬇️  Bajando servicios de producción...$(NC)"
	docker-compose -f docker-compose.prod.yml down

prod-logs: ## Ver logs de producción
	docker-compose -f docker-compose.prod.yml logs -f

prod-build: ## Build de producción (sin cache)
	@echo "$(GREEN)🔨 Building imágenes de producción...$(NC)"
	docker-compose -f docker-compose.prod.yml build --no-cache
	@echo "$(GREEN)✅ Build de producción completo!$(NC)"

# ============================================
# UTILIDADES
# ============================================

install: ## Instalar dependencias en contenedores
	@echo "$(GREEN)📦 Instalando dependencias...$(NC)"
	docker-compose exec backend npm install
	docker-compose exec frontend npm install

test: ## Ejecutar tests
	docker-compose exec backend npm test

test-coverage: ## Ejecutar tests con coverage
	docker-compose exec backend npm run test:coverage

backup-db: ## Backup de la base de datos
	@echo "$(GREEN)💾 Creando backup de la base de datos...$(NC)"
	docker-compose exec postgres pg_dump -U postgres guelaguetza_db > backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "$(GREEN)✅ Backup creado!$(NC)"

restore-db: ## Restaurar base de datos (requiere BACKUP_FILE=archivo.sql)
	@if [ -z "$(BACKUP_FILE)" ]; then \
		echo "$(YELLOW)⚠️  Error: Especifica BACKUP_FILE=archivo.sql$(NC)"; \
		exit 1; \
	fi
	@echo "$(YELLOW)⚠️  Restaurando base de datos desde $(BACKUP_FILE)...$(NC)"
	docker-compose exec -T postgres psql -U postgres guelaguetza_db < $(BACKUP_FILE)
	@echo "$(GREEN)✅ Base de datos restaurada!$(NC)"
