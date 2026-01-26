<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# Guelaguetza Connect

**Plataforma de turismo cultural para Oaxaca**

[![CI Status](https://github.com/YOUR_USERNAME/guelaguetza-connect/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/guelaguetza-connect/actions/workflows/ci.yml)
[![Deploy Status](https://github.com/YOUR_USERNAME/guelaguetza-connect/workflows/Deploy/badge.svg)](https://github.com/YOUR_USERNAME/guelaguetza-connect/actions/workflows/deploy.yml)
[![codecov](https://codecov.io/gh/YOUR_USERNAME/guelaguetza-connect/branch/main/graph/badge.svg)](https://codecov.io/gh/YOUR_USERNAME/guelaguetza-connect)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)

[Demo](https://guelaguetza-connect.com) • [Documentación](./docs) • [Reportar Bug](https://github.com/YOUR_USERNAME/guelaguetza-connect/issues)

</div>

---

## Descripción

Guelaguetza Connect es una plataforma web que conecta a turistas con experiencias culturales auténticas en Oaxaca, México. Permite a los usuarios descubrir eventos, reservar experiencias, comprar productos artesanales y conectar con la comunidad local.

### Características Principales

- **Marketplace de Experiencias**: Reserva tours, talleres y eventos culturales
- **Tienda de Artesanías**: Compra productos auténticos de artesanos locales
- **Sistema de Gamificación**: Gana badges y recompensas por participar
- **Soporte Multilingüe**: Español, Inglés y Zapoteco
- **Sistema de Pagos**: Integración con Stripe
- **Panel de Administración**: Dashboard para vendedores y administradores
- **Notificaciones en Tiempo Real**: WebSockets para actualizaciones instantáneas

---

## Stack Tecnológico

### Frontend
- **React 19** - UI Library
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Three.js / React Three Fiber** - 3D graphics
- **Recharts** - Data visualization
- **Leaflet** - Maps
- **Vitest + Testing Library** - Testing

### Backend
- **Fastify** - Web framework
- **TypeScript** - Type safety
- **Prisma** - ORM
- **PostgreSQL** - Database
- **Redis** - Cache
- **Stripe** - Payments
- **Vitest + Supertest** - Testing

### Infrastructure
- **Docker** - Containerization
- **GitHub Actions** - CI/CD
- **Prometheus + Grafana** - Monitoring

---

## Inicio Rápido

### Requisitos Previos

- **Node.js** >= 18.0.0
- **Docker** y Docker Compose
- **npm** o **pnpm**

### Instalación Local

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/YOUR_USERNAME/guelaguetza-connect.git
   cd guelaguetza-connect
   ```

2. **Configurar variables de entorno**
   ```bash
   # Frontend
   cp .env.example .env.local
   
   # Backend
   cp backend/.env.example backend/.env
   ```

3. **Iniciar servicios con Docker**
   ```bash
   docker-compose up -d
   ```

4. **Acceder a la aplicación**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001
   - Prisma Studio: http://localhost:5555

### Desarrollo Local (sin Docker)

1. **Iniciar PostgreSQL y Redis**
   ```bash
   docker-compose up -d postgres redis
   ```

2. **Instalar dependencias**
   ```bash
   # Frontend
   npm install
   
   # Backend
   cd backend && npm install
   ```

3. **Ejecutar migraciones**
   ```bash
   cd backend
   npx prisma migrate dev
   npx prisma db seed
   ```

4. **Iniciar servidores de desarrollo**
   ```bash
   # Terminal 1 - Backend
   cd backend && npm run dev
   
   # Terminal 2 - Frontend
   npm run dev
   ```

---

## Scripts Disponibles

### Frontend
```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run preview      # Preview del build
npm run test         # Tests unitarios
npm run test:e2e     # Tests E2E con Playwright
```

### Backend
```bash
npm run dev                # Servidor de desarrollo con hot-reload
npm run build              # Compilar TypeScript
npm run start              # Servidor de producción
npm run test               # Tests unitarios
npm run test:integration   # Tests de integración
npm run test:coverage      # Coverage report
npm run db:migrate         # Ejecutar migraciones
npm run db:seed            # Seed de la base de datos
npm run db:studio          # Prisma Studio
```

### Docker
```bash
npm run docker:up         # Levantar todos los servicios
npm run docker:down       # Bajar todos los servicios
npm run docker:logs       # Ver logs
npm run docker:rebuild    # Rebuild containers
```

---

## Testing

### Unit Tests
```bash
# Frontend
npm run test

# Backend
cd backend && npm run test
```

### Integration Tests
```bash
cd backend && npm run test:integration
```

### E2E Tests
```bash
npm run test:e2e
```

### Coverage
```bash
# Frontend
npm run test:coverage

# Backend
cd backend && npm run test:coverage
```

**Coverage Goals**: 70% statements, 60% branches, 70% functions, 70% lines

---

## CI/CD

Este proyecto utiliza GitHub Actions para CI/CD automatizado.

### CI Pipeline
- **Lint**: TypeScript type checking
- **Tests**: Unit & integration tests con PostgreSQL/Redis
- **Build**: Compilación en Node 18, 20, 22
- **Coverage**: Reportes automáticos

### CD Pipeline
- **Staging**: Deploy automático en push a `develop`
- **Production**: Deploy manual en push a `main` (requiere aprobación)
- **Features**: Zero-downtime, rollback automático, smoke tests

Ver [CI/CD Documentation](./.github/CI_CD_README.md) para más detalles.

---

## Estructura del Proyecto

```
guelaguetza-connect/
├── backend/
│   ├── src/
│   │   ├── domain/          # Entidades y lógica de dominio
│   │   ├── application/     # Casos de uso
│   │   ├── infrastructure/  # Implementaciones técnicas
│   │   ├── routes/          # Endpoints de la API
│   │   └── services/        # Servicios de negocio
│   ├── prisma/             # Schema y migraciones
│   ├── test/               # Tests
│   └── Dockerfile
├── components/             # Componentes React
├── services/              # API clients
├── hooks/                 # Custom React hooks
├── contexts/              # React contexts
├── public/                # Assets estáticos
├── .github/
│   └── workflows/         # GitHub Actions CI/CD
└── docker-compose.yml
```

---

## Arquitectura

El proyecto sigue **Clean Architecture** con separación de capas:

1. **Domain Layer**: Entidades, value objects, domain events
2. **Application Layer**: Use cases, DTOs
3. **Infrastructure Layer**: Prisma, Redis, external APIs
4. **Presentation Layer**: Fastify routes, controllers

Ver [ARQUITECTURA_ANALISIS_COMPLETO.md](./ARQUITECTURA_ANALISIS_COMPLETO.md) para más detalles.

---

## API Documentation

### Endpoints Principales

#### Events
```
GET    /api/events          # Listar eventos
GET    /api/events/:id      # Detalle de evento
POST   /api/events          # Crear evento (admin)
```

#### Bookings
```
POST   /api/bookings        # Crear reserva
GET    /api/bookings/user   # Mis reservas
PUT    /api/bookings/:id    # Actualizar reserva
```

#### Marketplace
```
GET    /api/marketplace/products    # Listar productos
POST   /api/marketplace/orders      # Crear orden
```

#### Auth
```
POST   /api/auth/register   # Registro
POST   /api/auth/login      # Login
GET    /api/auth/me         # Usuario actual
```

Ver [API Documentation](./backend/docs/api.md) para la documentación completa.

---

## Deployment

### Requisitos de Producción

- **Servidor**: Ubuntu 20.04+ o similar
- **Docker**: >= 20.10
- **RAM**: Mínimo 2GB
- **Storage**: 20GB+ recomendado

### Deployment Manual

1. **Configurar servidor**
   ```bash
   # Instalar Docker
   curl -fsSL https://get.docker.com | sh
   
   # Clonar repositorio
   git clone https://github.com/YOUR_USERNAME/guelaguetza-connect.git
   cd guelaguetza-connect
   ```

2. **Configurar variables de entorno**
   ```bash
   cp .env.docker.prod.example .env.docker.prod
   # Editar .env.docker.prod con valores de producción
   ```

3. **Iniciar servicios**
   ```bash
   docker-compose -f docker-compose.prod.yml up -d
   ```

4. **Ejecutar migraciones**
   ```bash
   docker-compose -f docker-compose.prod.yml exec backend npx prisma migrate deploy
   ```

### Deployment con GitHub Actions

El deployment automático se activa en:
- Push a `develop` → Staging
- Push a `main` → Production (con aprobación)

Ver [CI/CD Documentation](./.github/CI_CD_README.md) para configuración.

---

## Monitoring

### Prometheus + Grafana

```bash
# Iniciar stack de monitoring
cd backend
docker-compose -f docker-compose.monitoring.yml up -d
```

**Accesos:**
- Prometheus: http://localhost:9090
- Grafana: http://localhost:3000 (admin/admin)

**Métricas disponibles:**
- Request rate, latency, errors
- Database connection pool
- Redis cache hit rate
- Custom business metrics

---

## Contributing

¡Las contribuciones son bienvenidas! Por favor:

1. Fork el proyecto
2. Crea un branch para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'feat: add amazing feature'`)
4. Push al branch (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

### Commit Convention

Usamos [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: nueva característica
fix: corrección de bug
docs: cambios en documentación
style: formato, semicolons, etc
refactor: refactoring de código
test: agregar tests
chore: actualizar dependencies, etc
```

Ver [CODEOWNERS](./.github/CODEOWNERS) para ownership del código.

---

## License

Este proyecto está bajo la licencia MIT. Ver [LICENSE](./LICENSE) para más detalles.

---

## Contacto

**Maintainer**: Marx Chavez - [@marxchavez](https://github.com/marxchavez)

**Project Link**: https://github.com/marxchavez/guelaguetza-connect

---

## Acknowledgments

- [Fastify](https://www.fastify.io/)
- [Prisma](https://www.prisma.io/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- Comunidad de Oaxaca

---

<div align="center">

**Made with ❤️ in Oaxaca, Mexico**

</div>
