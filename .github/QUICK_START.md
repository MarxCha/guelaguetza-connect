# CI/CD Quick Start Guide

## ⚡ Setup Rápido (5 minutos)

### 1. Verificar Instalación
```bash
# Ejecutar script de verificación
./.github/scripts/verify-ci-setup.sh
```

### 2. Configurar Secrets en GitHub

Ve a: **Settings → Secrets and variables → Actions → New repository secret**

**Mínimo requerido para CI:**
```
# No requiere secrets - CI funciona out of the box!
```

**Para Deployment (opcional):**
```
STAGING_HOST=your-staging-server.com
STAGING_USER=deploy
STAGING_SSH_KEY=<paste-your-private-key>
```

### 3. Probar CI

```bash
# Crear branch de prueba
git checkout -b test/ci-pipeline

# Hacer un cambio
echo "# Test CI" >> TEST.md

# Commit y push
git add TEST.md
git commit -m "test: CI pipeline"
git push origin test/ci-pipeline

# Crear Pull Request en GitHub
# → Ver CI ejecutándose en la tab "Actions"
```

### 4. Ver Resultados

- **CI Status**: https://github.com/YOUR_USERNAME/guelaguetza-connect/actions
- **Coverage**: Se reporta en el PR como comentario
- **Build Artifacts**: Disponibles en el workflow run

---

## 🚀 Workflows Disponibles

### CI Pipeline (Automático)
- ✅ Se ejecuta en **cada push** y **cada PR**
- ✅ Lint, tests, build
- ✅ ~10-15 minutos

### Deploy Pipeline (Semi-automático)
- ✅ **develop** → Staging (automático)
- ✅ **main** → Production (requiere aprobación)
- ✅ ~20-30 minutos

### Code Quality (Automático en PRs)
- ✅ Security scan
- ✅ Bundle size check
- ✅ Dependency audit
- ✅ ~5-10 minutos

---

## 📝 Flujo de Trabajo Típico

### Feature Development

```bash
# 1. Crear branch desde develop
git checkout develop
git pull origin develop
git checkout -b feature/my-awesome-feature

# 2. Desarrollar y hacer commits
git add .
git commit -m "feat: add awesome feature"

# 3. Push y crear PR
git push origin feature/my-awesome-feature
# → Crear PR en GitHub hacia develop
# → CI se ejecuta automáticamente

# 4. Review y merge
# → Una vez aprobado, merge a develop
# → Deploy automático a staging

# 5. Testing en staging
# → Probar en https://staging.guelaguetza-connect.com

# 6. Release a producción
git checkout main
git merge develop
git push origin main
# → Requiere aprobación manual
# → Deploy a producción
```

---

## 🔧 Comandos Útiles

### Verificar CI localmente (antes de push)

```bash
# Lint
npm run lint              # Frontend (cuando se configure ESLint)
npx tsc --noEmit         # TypeScript check

# Tests
npm run test             # Frontend
cd backend && npm run test              # Backend unit
cd backend && npm run test:integration  # Backend integration

# Build
npm run build            # Frontend
cd backend && npm run build            # Backend
```

### Ver status de workflows

```bash
# Usando GitHub CLI
gh workflow list
gh run list
gh run view <run-id>
gh run watch
```

### Cancelar workflow en ejecución

```bash
# Via GitHub CLI
gh run cancel <run-id>

# O en GitHub UI
Actions → Click en el workflow → Cancel workflow
```

---

## 🐛 Troubleshooting

### "CI falla pero funciona localmente"

```bash
# Verificar versión de Node
node --version  # Debe ser >= 18

# Limpiar node_modules
rm -rf node_modules backend/node_modules
npm ci
cd backend && npm ci

# Verificar variables de entorno
cp .env.example .env
cp backend/.env.example backend/.env
```

### "Tests de backend fallan en CI"

```bash
# Los tests de integración necesitan PostgreSQL y Redis
# En CI se usan service containers (ya configurados)

# Localmente:
docker-compose up -d postgres redis
cd backend
npm run test:integration
```

### "Deploy falla por SSH"

```bash
# Verificar que el secret STAGING_SSH_KEY esté configurado
# El formato debe ser: -----BEGIN PRIVATE KEY-----\n...\n-----END...

# Generar nuevo key pair si es necesario
ssh-keygen -t ed25519 -C "github-actions"
# Agregar public key a ~/.ssh/authorized_keys en el servidor
# Agregar private key a GitHub secrets
```

---

## 📊 Monitoreo

### Ver métricas de CI

1. Ve a **Actions** tab
2. Click en **Insights** (arriba a la derecha)
3. Ver métricas de:
   - Success rate
   - Average duration
   - Popular workflows

### Status badges

Agregar a tu README:

```markdown
[![CI Status](https://github.com/YOUR_USERNAME/guelaguetza-connect/workflows/CI/badge.svg)](https://github.com/YOUR_USERNAME/guelaguetza-connect/actions/workflows/ci.yml)
```

---

## 🎯 Best Practices

### ✅ DO

- ✅ Hacer commits pequeños y frecuentes
- ✅ Escribir tests para nuevo código
- ✅ Usar conventional commits (`feat:`, `fix:`, etc.)
- ✅ Esperar a que CI pase antes de merge
- ✅ Revisar código antes de aprobar PRs
- ✅ Probar en staging antes de producción

### ❌ DON'T

- ❌ No hacer force push a main/develop
- ❌ No hacer merge sin que CI pase
- ❌ No commitear secrets o .env files
- ❌ No saltarse la aprobación en producción
- ❌ No deployar viernes en la tarde 😅

---

## 🆘 Ayuda

### Recursos

- 📖 [Documentación completa](./.github/CI_CD_README.md)
- 📋 [Setup completo](./.github/CI_CD_SETUP_COMPLETE.md)
- 🐙 [GitHub Actions Docs](https://docs.github.com/en/actions)

### Contacto

- **Maintainer**: @marxchavez
- **Issues**: https://github.com/YOUR_USERNAME/guelaguetza-connect/issues
- **Discussions**: https://github.com/YOUR_USERNAME/guelaguetza-connect/discussions

---

**¡Listo para empezar!** 🚀

Cualquier duda, revisa la documentación completa o abre un issue.
