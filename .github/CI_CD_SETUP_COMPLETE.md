# CI/CD Setup Complete - Guelaguetza Connect

## Archivos Creados

### Workflows de GitHub Actions

#### 1. `.github/workflows/ci.yml` ✅
**Continuous Integration Pipeline**

- **Triggers**: Push a cualquier branch, PRs a main/develop
- **Jobs**:
  - `lint`: TypeScript type checking (Frontend + Backend)
  - `test-backend`: Tests unitarios + integración (con PostgreSQL + Redis)
  - `test-frontend`: Tests unitarios del frontend
  - `build`: Build en Node 18, 20, 22 (matrix strategy)
  - `coverage-summary`: Reportes de coverage en PRs
  - `ci-status`: Status check global

**Features**:
- ✅ Service containers (PostgreSQL, Redis)
- ✅ Cache de node_modules para velocidad
- ✅ Matrix builds para múltiples versiones de Node
- ✅ Upload de coverage a Codecov
- ✅ Artifacts de builds
- ✅ Concurrency control

**Duración**: ~10-15 minutos

---

#### 2. `.github/workflows/deploy.yml` ✅
**Continuous Deployment Pipeline**

- **Triggers**: 
  - Push a `develop` → Staging (automático)
  - Push a `main` → Production (manual approval)
  - Workflow dispatch manual

- **Jobs**:
  - `build-images`: Build y push de Docker images (Backend + Frontend)
  - `deploy-staging`: Deploy automático a staging
  - `deploy-production`: Deploy a producción con aprobación
  - `post-deploy`: Tareas post-deployment (releases, cleanup)

**Features**:
- ✅ Docker multi-stage builds
- ✅ GitHub Container Registry integration
- ✅ Zero-downtime deployments
- ✅ Automatic database backups (production)
- ✅ Rollback automático on failure
- ✅ Smoke tests post-deployment
- ✅ Slack notifications
- ✅ GitHub releases automáticos

**Duración**: ~20-30 minutos

---

#### 3. `.github/workflows/code-quality.yml` ✅
**Code Quality Checks**

- **Triggers**: Pull Requests a main/develop

- **Jobs**:
  - `analyze`: Audit de dependencias, outdated packages
  - `security`: Trivy vulnerability scanner
  - `bundle-size`: Check de tamaño de bundles
  - `commit-lint`: Verificación de Conventional Commits
  - `todo-check`: Detección de TODOs y FIXMEs

**Duración**: ~5-10 minutos

---

### Configuración

#### 4. `.github/dependabot.yml` ✅
**Automatic Dependency Updates**

- **NPM** (Frontend): Weekly updates (Lunes 9:00 AM)
- **NPM** (Backend): Weekly updates (Lunes 9:00 AM)
- **Docker**: Weekly updates (Martes 10:00 AM)
- **GitHub Actions**: Monthly updates

**Features**:
- ✅ Grouped updates (React, Vite, Fastify, Prisma, etc.)
- ✅ Auto-assignment a @marxchavez
- ✅ Labels automáticas
- ✅ Conventional commit messages
- ✅ Security updates prioritarias

---

#### 5. `.github/CODEOWNERS` ✅
**Code Ownership**

Define ownership de diferentes áreas del código:
- Backend (src, prisma, services, routes)
- Frontend (components, services, hooks)
- Infrastructure (Docker, CI/CD)
- Documentation
- Security-sensitive files

**Owner**: @marxchavez

---

### Templates

#### 6. `.github/PULL_REQUEST_TEMPLATE.md` ✅
**Pull Request Template**

Checklist completo para PRs:
- Descripción y tipo de cambio
- Tests y coverage
- Documentación
- Base de datos
- Performance
- Seguridad
- API changes
- Deployment notes

---

#### 7. `.github/ISSUE_TEMPLATE/bug_report.md` ✅
**Bug Report Template**

- Descripción del bug
- Pasos para reproducir
- Comportamiento esperado vs actual
- Environment info
- Screenshots
- Logs
- Severidad

---

#### 8. `.github/ISSUE_TEMPLATE/feature_request.md` ✅
**Feature Request Template**

- Descripción de la feature
- Problema que resuelve
- Solución propuesta
- Beneficios
- Casos de uso
- Consideraciones técnicas
- Prioridad

---

#### 9. `.github/ISSUE_TEMPLATE/config.yml` ✅
**Issue Template Config**

- Deshabilita blank issues
- Links a documentación y discussions

---

### Documentación

#### 10. `.github/CI_CD_README.md` ✅
**CI/CD Documentation**

Documentación completa:
- Overview de workflows
- Configuración de secrets
- Setup de environments
- Diagramas de flujo
- Usage instructions
- Troubleshooting
- Best practices

---

#### 11. `README_NEW.md` ✅
**Updated Project README**

README completo con:
- ✅ CI/CD status badges
- ✅ Descripción del proyecto
- ✅ Stack tecnológico
- ✅ Quick start
- ✅ Scripts disponibles
- ✅ Testing guide
- ✅ CI/CD overview
- ✅ Deployment guide
- ✅ Contributing guide
- ✅ Estructura del proyecto
- ✅ API documentation

---

## Secrets Requeridos

Configura estos secrets en **GitHub Settings → Secrets and variables → Actions**:

### General
```
CODECOV_TOKEN                # Optional - para reportes de coverage
```

### Stripe (Testing)
```
STRIPE_TEST_SECRET_KEY       # Stripe test mode secret key
STRIPE_TEST_WEBHOOK_SECRET   # Stripe webhook secret (test)
```

### Staging
```
STAGING_HOST                 # Hostname/IP del servidor staging
STAGING_USER                 # Usuario SSH
STAGING_SSH_KEY              # Private SSH key
STAGING_SSH_PORT             # Puerto SSH (default: 22)
STAGING_API_URL              # URL de la API staging
```

### Production
```
PROD_HOST                    # Hostname/IP del servidor producción
PROD_USER                    # Usuario SSH
PROD_SSH_KEY                 # Private SSH key
PROD_SSH_PORT                # Puerto SSH (default: 22)
PROD_API_URL                 # URL de la API producción
```

### Notifications
```
SLACK_WEBHOOK_URL            # Webhook para notificaciones Slack
```

---

## GitHub Environments

Configura en **GitHub Settings → Environments**:

### Staging
- **Protection rules**: None (deploy automático)
- **Environment secrets**: STAGING_*
- **URL**: https://staging.guelaguetza-connect.com

### Production
- **Protection rules**: 
  - ✅ Required reviewers (al menos 1)
  - ✅ Wait timer (opcional: 5 minutos)
- **Environment secrets**: PROD_*
- **URL**: https://guelaguetza-connect.com

---

## Branch Protection Rules

Configura en **GitHub Settings → Branches**:

### `main` branch
- ✅ Require pull request reviews (1 reviewer)
- ✅ Require status checks to pass:
  - `CI / lint`
  - `CI / test-backend`
  - `CI / test-frontend`
  - `CI / build`
- ✅ Require conversation resolution
- ✅ Include administrators
- ✅ Allow force pushes: NO
- ✅ Allow deletions: NO

### `develop` branch
- ✅ Require status checks to pass:
  - `CI / lint`
  - `CI / test-backend`
  - `CI / test-frontend`
- ✅ Require conversation resolution
- ✅ Allow force pushes: NO

---

## Next Steps

### 1. Configurar Secrets ✅
```bash
# En GitHub UI
Settings → Secrets and variables → Actions → New repository secret
```

### 2. Configurar Environments ✅
```bash
# En GitHub UI
Settings → Environments → New environment
```

### 3. Configurar Branch Protection ✅
```bash
# En GitHub UI
Settings → Branches → Add rule
```

### 4. Habilitar Dependabot ✅
```bash
# En GitHub UI
Settings → Security → Dependabot → Enable
```

### 5. Integrar Codecov (Opcional)
```bash
# 1. Signup en codecov.io
# 2. Agregar repositorio
# 3. Copiar token a GitHub secrets
```

### 6. Configurar Slack Notifications (Opcional)
```bash
# 1. Crear Slack App
# 2. Activar Incoming Webhooks
# 3. Copiar webhook URL a GitHub secrets
```

### 7. Test CI/CD
```bash
# 1. Crear feature branch
git checkout -b test/ci-cd

# 2. Hacer cambio y push
echo "test" > test.txt
git add test.txt
git commit -m "test: CI/CD setup"
git push origin test/ci-cd

# 3. Crear Pull Request
# 4. Verificar que CI pasa
# 5. Merge a develop
# 6. Verificar deploy a staging
```

### 8. Actualizar README Principal
```bash
# Reemplazar README.md con README_NEW.md
mv README.md README_OLD.md
mv README_NEW.md README.md

# Actualizar badges con tu username
sed -i '' 's/YOUR_USERNAME/marxchavez/g' README.md

git add README.md
git commit -m "docs: update README with CI/CD badges"
git push origin main
```

---

## Monitoring & Observability

### GitHub Actions Dashboard
- **URL**: https://github.com/YOUR_USERNAME/guelaguetza-connect/actions
- **Insights**: https://github.com/YOUR_USERNAME/guelaguetza-connect/insights

### Métricas Clave
- ✅ CI Success Rate: Target > 95%
- ✅ Average CI Duration: Target < 15 min
- ✅ Deploy Success Rate: Target > 98%
- ✅ Time to Deploy: Target < 30 min

---

## Optimization Tips

### Para CI más rápido:
1. ✅ Cache de node_modules implementado
2. ✅ Jobs paralelos donde es posible
3. ✅ Matrix strategy para builds
4. Considerar self-hosted runners para más velocidad

### Para Deployments más seguros:
1. ✅ Backups automáticos antes de deploy
2. ✅ Rollback automático on failure
3. ✅ Smoke tests post-deployment
4. Considerar blue-green deployments

---

## Troubleshooting Common Issues

### CI falla en tests
```bash
# Verificar localmente
npm run test
cd backend && npm run test:integration

# Check service containers
docker ps
docker logs <container>
```

### Deploy falla por SSH
```bash
# Verificar SSH key
ssh -i ~/.ssh/key user@host

# Verificar permisos
chmod 600 ~/.ssh/key
```

### Docker build falla
```bash
# Build localmente
docker build -f backend/Dockerfile backend/

# Check logs
docker logs <container>
```

---

## Status

✅ **CI Pipeline**: Configurado y listo
✅ **CD Pipeline**: Configurado (requiere secrets)
✅ **Code Quality**: Configurado y listo
✅ **Dependabot**: Configurado y listo
✅ **Templates**: Creados
✅ **Documentation**: Completa

### Pending:
- [ ] Configurar secrets en GitHub
- [ ] Configurar environments
- [ ] Configurar branch protection
- [ ] Test CI/CD con PR
- [ ] Configurar Codecov (opcional)
- [ ] Configurar Slack (opcional)

---

**Created**: 2026-01-25  
**Author**: Marx Chavez (@marxchavez)  
**Project**: Guelaguetza Connect

---

¡Todo listo para comenzar a usar CI/CD! 🚀
