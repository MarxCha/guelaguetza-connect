# CI/CD Setup Checklist

## Pre-requisitos

- [ ] Repositorio en GitHub
- [ ] Acceso admin al repositorio
- [ ] Node.js >= 18 instalado localmente
- [ ] Docker instalado (para testing local)
- [ ] GitHub CLI instalado (opcional pero recomendado)

---

## Fase 1: Verificación de Archivos

- [x] `.github/workflows/ci.yml` creado
- [x] `.github/workflows/deploy.yml` creado
- [x] `.github/workflows/code-quality.yml` creado
- [x] `.github/dependabot.yml` creado
- [x] `.github/CODEOWNERS` creado
- [x] `.github/PULL_REQUEST_TEMPLATE.md` creado
- [x] `.github/ISSUE_TEMPLATE/bug_report.md` creado
- [x] `.github/ISSUE_TEMPLATE/feature_request.md` creado
- [x] `.github/ISSUE_TEMPLATE/config.yml` creado

**Verificar**:
```bash
./.github/scripts/verify-ci-setup.sh
```

---

## Fase 2: Configuración de GitHub

### Branch Protection Rules

- [ ] Ir a: **Settings → Branches → Add rule**

#### Proteger `main` branch
- [ ] Branch name pattern: `main`
- [ ] Require pull request before merging
  - [ ] Require approvals: 1
  - [ ] Dismiss stale reviews when new commits are pushed
  - [ ] Require review from Code Owners
- [ ] Require status checks to pass
  - [ ] Require branches to be up to date
  - [ ] Status checks:
    - [ ] `CI / lint`
    - [ ] `CI / test-backend`
    - [ ] `CI / test-frontend`
    - [ ] `CI / build`
- [ ] Require conversation resolution before merging
- [ ] Include administrators
- [ ] Do not allow bypassing the above settings
- [ ] Save changes

#### Proteger `develop` branch
- [ ] Branch name pattern: `develop`
- [ ] Require status checks to pass
  - [ ] Status checks:
    - [ ] `CI / lint`
    - [ ] `CI / test-backend`
    - [ ] `CI / test-frontend`
- [ ] Save changes

---

### GitHub Secrets

- [ ] Ir a: **Settings → Secrets and variables → Actions**

#### Optional (for CI enhancement)
- [ ] `CODECOV_TOKEN` (opcional)
- [ ] `STRIPE_TEST_SECRET_KEY` (opcional)
- [ ] `STRIPE_TEST_WEBHOOK_SECRET` (opcional)

#### Required for Staging Deployment
- [ ] `STAGING_HOST`
- [ ] `STAGING_USER`
- [ ] `STAGING_SSH_KEY`
- [ ] `STAGING_API_URL`

#### Required for Production Deployment
- [ ] `PROD_HOST`
- [ ] `PROD_USER`
- [ ] `PROD_SSH_KEY`
- [ ] `PROD_API_URL`

#### Optional (Notifications)
- [ ] `SLACK_WEBHOOK_URL` (opcional)

**Ver guía completa**: [SECRETS_SETUP.md](./SECRETS_SETUP.md)

---

### GitHub Environments

- [ ] Ir a: **Settings → Environments**

#### Staging Environment
- [ ] Click "New environment"
- [ ] Name: `staging`
- [ ] No protection rules
- [ ] Environment URL: `https://staging.guelaguetza-connect.com`
- [ ] Save

#### Production Environment
- [ ] Click "New environment"
- [ ] Name: `production`
- [ ] Protection rules:
  - [ ] Required reviewers (seleccionar al menos 1)
  - [ ] Wait timer: 5 minutes (opcional)
- [ ] Environment URL: `https://guelaguetza-connect.com`
- [ ] Save

---

### Dependabot

- [ ] Ir a: **Settings → Security**
- [ ] Dependabot alerts: Enable
- [ ] Dependabot security updates: Enable
- [ ] Grouped security updates: Enable

---

## Fase 3: Testing Local

### Test CI Workflows

```bash
# 1. Lint
npm run lint || npx tsc --noEmit
cd backend && npx tsc --noEmit

# 2. Tests Frontend
npm run test

# 3. Tests Backend
cd backend
docker-compose -f docker-compose.test.yml up -d
npm run test
npm run test:integration
docker-compose -f docker-compose.test.yml down

# 4. Build
npm run build
cd backend && npm run build
```

- [ ] Todos los tests pasan localmente
- [ ] Build completa sin errores

---

## Fase 4: Testing en GitHub

### Test CI Pipeline

```bash
# 1. Crear branch de prueba
git checkout -b test/ci-pipeline

# 2. Hacer cambio
echo "# Test CI" >> TEST_CI.md
git add TEST_CI.md
git commit -m "test: verify CI pipeline"

# 3. Push
git push origin test/ci-pipeline

# 4. Crear Pull Request
gh pr create --title "Test: CI Pipeline" --body "Testing CI/CD setup"
```

- [ ] CI workflow se ejecuta automáticamente
- [ ] Todos los jobs pasan (lint, test-backend, test-frontend, build)
- [ ] Coverage report aparece como comentario en el PR
- [ ] Code quality checks pasan
- [ ] No hay errores

**Verificar en**: https://github.com/YOUR_USERNAME/guelaguetza-connect/actions

---

### Test Deploy to Staging

```bash
# 1. Merge el PR de prueba a develop
gh pr merge --merge

# 2. Monitor deployment
gh run watch
```

- [ ] Deploy workflow se ejecuta automáticamente
- [ ] Docker images se construyen correctamente
- [ ] Deploy a staging completa
- [ ] Aplicación funciona en staging
- [ ] Health checks pasan

**Verificar aplicación**: https://staging.guelaguetza-connect.com

---

### Test Deploy to Production

```bash
# 1. Merge develop a main
git checkout main
git pull origin main
git merge develop

# 2. Push
git push origin main

# 3. Aprobar deployment
# → Ir a GitHub Actions
# → Click en el workflow run
# → Click "Review deployments"
# → Seleccionar "production"
# → Click "Approve and deploy"

# 4. Monitor deployment
gh run watch
```

- [ ] Deploy workflow espera aprobación manual
- [ ] Backup de base de datos se crea
- [ ] Deploy a production completa
- [ ] Smoke tests pasan
- [ ] Aplicación funciona en producción
- [ ] GitHub Release se crea automáticamente

**Verificar aplicación**: https://guelaguetza-connect.com

---

## Fase 5: Documentación

### Update README

```bash
# 1. Reemplazar README
mv README.md README_OLD.md
mv README_NEW.md README.md

# 2. Actualizar badges
# Editar README.md y reemplazar YOUR_USERNAME con tu username

# 3. Commit
git add README.md README_OLD.md
git commit -m "docs: update README with CI/CD badges and documentation"
git push origin main
```

- [ ] README actualizado con badges
- [ ] Badges muestran status correcto
- [ ] Links funcionan
- [ ] Documentación es clara

---

### Verificar Documentación

- [ ] [CI_CD_README.md](./.github/CI_CD_README.md) - Documentación completa
- [ ] [QUICK_START.md](./.github/QUICK_START.md) - Guía rápida
- [ ] [SECRETS_SETUP.md](./.github/SECRETS_SETUP.md) - Setup de secrets
- [ ] [CI_CD_SETUP_COMPLETE.md](./.github/CI_CD_SETUP_COMPLETE.md) - Resumen completo
- [ ] README principal actualizado

---

## Fase 6: Monitoring & Maintenance

### Setup Monitoring

- [ ] Revisar métricas en GitHub Actions Insights
- [ ] Configurar notificaciones de Slack (si aplica)
- [ ] Revisar reportes de Codecov (si aplica)
- [ ] Configurar alertas de Dependabot

### Best Practices

- [ ] Revisar PRs de Dependabot semanalmente
- [ ] Mantener coverage arriba del 70%
- [ ] Deployar a staging antes de producción
- [ ] Hacer deploys en horarios controlados
- [ ] Monitorear logs después de deployments

---

## Troubleshooting

Si algo falla, revisa:

- [ ] [QUICK_START.md](./.github/QUICK_START.md) - Sección Troubleshooting
- [ ] [CI_CD_README.md](./.github/CI_CD_README.md) - Sección Troubleshooting
- [ ] GitHub Actions logs
- [ ] Server logs (staging/production)

---

## Status Final

### CI/CD Setup
- [x] Workflows creados
- [x] Templates creados
- [x] Documentación completa
- [ ] Secrets configurados
- [ ] Environments configurados
- [ ] Branch protection configurado
- [ ] CI tested
- [ ] Staging deployment tested
- [ ] Production deployment tested
- [ ] README actualizado

### Next Steps
1. [ ] Configurar secrets (si no lo has hecho)
2. [ ] Probar CI con un PR real
3. [ ] Probar deployment a staging
4. [ ] Configurar monitoring adicional (opcional)
5. [ ] Entrenar al equipo en el nuevo workflow

---

## Recursos Adicionales

- **GitHub Actions Docs**: https://docs.github.com/en/actions
- **Docker Docs**: https://docs.docker.com/
- **Fastify Docs**: https://www.fastify.io/
- **Vite Docs**: https://vitejs.dev/

---

**Setup Date**: 2026-01-25  
**Maintainer**: @marxchavez  
**Project**: Guelaguetza Connect

---

Cuando completes todos los items del checklist, tu CI/CD estará 100% operativo.

¡Buena suerte! 🚀
