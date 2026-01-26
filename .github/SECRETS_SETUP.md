# GitHub Secrets Configuration Guide

## Configurar Secrets

Ve a: **Settings → Secrets and variables → Actions → New repository secret**

---

## Secrets Requeridos

### 🔧 General (Opcional)

#### CODECOV_TOKEN
**Descripción**: Token para reportes de coverage en Codecov  
**Requerido**: No (opcional, pero recomendado)  
**Obtener**: 
1. Ve a https://codecov.io
2. Signup/Login con GitHub
3. Agregar repositorio
4. Copiar token

**Agregar en GitHub**:
```
Name: CODECOV_TOKEN
Value: [tu-token-de-codecov]
```

---

### 💳 Stripe (Testing)

#### STRIPE_TEST_SECRET_KEY
**Descripción**: Clave secreta de Stripe en modo test  
**Requerido**: No (para tests de pagos)  
**Obtener**: 
1. Ve a https://dashboard.stripe.com/test/apikeys
2. Copiar "Secret key" (empieza con `sk_test_`)

**Agregar en GitHub**:
```
Name: STRIPE_TEST_SECRET_KEY
Value: sk_test_xxxxxxxxxxxxx
```

#### STRIPE_TEST_WEBHOOK_SECRET
**Descripción**: Secret para validar webhooks de Stripe  
**Requerido**: No (para tests de webhooks)  
**Obtener**:
1. Ve a https://dashboard.stripe.com/test/webhooks
2. Click en el webhook configurado
3. Copiar "Signing secret" (empieza con `whsec_`)

**Agregar en GitHub**:
```
Name: STRIPE_TEST_WEBHOOK_SECRET
Value: whsec_xxxxxxxxxxxxx
```

---

### 🚀 Staging Environment

#### STAGING_HOST
**Descripción**: IP o hostname del servidor staging  
**Requerido**: Sí (para deployment a staging)  
**Ejemplo**: `staging.guelaguetza-connect.com` o `192.168.1.100`

**Agregar en GitHub**:
```
Name: STAGING_HOST
Value: staging.guelaguetza-connect.com
```

#### STAGING_USER
**Descripción**: Usuario SSH para conectar al servidor staging  
**Requerido**: Sí (para deployment)  
**Ejemplo**: `deploy`, `ubuntu`, `root`

**Agregar en GitHub**:
```
Name: STAGING_USER
Value: deploy
```

#### STAGING_SSH_KEY
**Descripción**: Private SSH key para autenticación  
**Requerido**: Sí (para deployment)  
**Obtener**:

```bash
# 1. Generar nuevo key pair (en tu máquina local)
ssh-keygen -t ed25519 -C "github-actions-staging" -f ~/.ssh/github_actions_staging

# 2. Agregar public key al servidor staging
cat ~/.ssh/github_actions_staging.pub
# Copiar el contenido y agregarlo a ~/.ssh/authorized_keys en el servidor

# 3. Copiar private key
cat ~/.ssh/github_actions_staging
# Copiar TODO el contenido, incluyendo:
# -----BEGIN OPENSSH PRIVATE KEY-----
# ...
# -----END OPENSSH PRIVATE KEY-----
```

**Agregar en GitHub**:
```
Name: STAGING_SSH_KEY
Value: [pegar-todo-el-private-key]
```

**IMPORTANTE**: El formato debe incluir los saltos de línea. GitHub los convertirá automáticamente.

#### STAGING_SSH_PORT (Opcional)
**Descripción**: Puerto SSH (default: 22)  
**Requerido**: No  
**Ejemplo**: `22`, `2222`

**Agregar en GitHub**:
```
Name: STAGING_SSH_PORT
Value: 22
```

#### STAGING_API_URL
**Descripción**: URL de la API en staging  
**Requerido**: Sí (para build del frontend)  
**Ejemplo**: `https://api-staging.guelaguetza-connect.com`

**Agregar en GitHub**:
```
Name: STAGING_API_URL
Value: https://api-staging.guelaguetza-connect.com
```

---

### 🏭 Production Environment

#### PROD_HOST
**Descripción**: IP o hostname del servidor de producción  
**Requerido**: Sí (para deployment a producción)  
**Ejemplo**: `guelaguetza-connect.com` o `192.168.1.200`

**Agregar en GitHub**:
```
Name: PROD_HOST
Value: guelaguetza-connect.com
```

#### PROD_USER
**Descripción**: Usuario SSH para conectar al servidor producción  
**Requerido**: Sí (para deployment)  
**Ejemplo**: `deploy`, `ubuntu`

**Agregar en GitHub**:
```
Name: PROD_USER
Value: deploy
```

#### PROD_SSH_KEY
**Descripción**: Private SSH key para autenticación en producción  
**Requerido**: Sí (para deployment)  
**Obtener**: (mismo proceso que STAGING_SSH_KEY, pero diferente key)

```bash
# Generar key específico para producción
ssh-keygen -t ed25519 -C "github-actions-production" -f ~/.ssh/github_actions_production

# Agregar public key al servidor
ssh-copy-id -i ~/.ssh/github_actions_production.pub deploy@prod-server

# Copiar private key
cat ~/.ssh/github_actions_production
```

**Agregar en GitHub**:
```
Name: PROD_SSH_KEY
Value: [pegar-todo-el-private-key]
```

#### PROD_SSH_PORT (Opcional)
**Descripción**: Puerto SSH en producción  
**Requerido**: No  
**Default**: 22

#### PROD_API_URL
**Descripción**: URL de la API en producción  
**Requerido**: Sí  
**Ejemplo**: `https://api.guelaguetza-connect.com`

**Agregar en GitHub**:
```
Name: PROD_API_URL
Value: https://api.guelaguetza-connect.com
```

---

### 📢 Notifications (Opcional)

#### SLACK_WEBHOOK_URL
**Descripción**: Webhook para notificaciones de deployment en Slack  
**Requerido**: No (pero recomendado para producción)  
**Obtener**:

1. Ve a tu Slack workspace
2. Apps → Manage → Custom Integrations → Incoming Webhooks
3. Click "Add Configuration"
4. Selecciona un canal
5. Copiar Webhook URL

**Agregar en GitHub**:
```
Name: SLACK_WEBHOOK_URL
Value: https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXX
```

---

## GitHub Environments

Además de secrets, necesitas configurar environments en:  
**Settings → Environments**

### Staging Environment

**Nombre**: `staging`

**Configuration**:
- Protection rules: None (deploy automático)
- URL: `https://staging.guelaguetza-connect.com`

**Environment secrets** (opcional - si son diferentes de los repository secrets):
- STAGING_API_URL (si difiere)

### Production Environment

**Nombre**: `production`

**Configuration**:
- Protection rules:
  - ✅ **Required reviewers**: Agregar al menos 1 reviewer
  - ⏱️ Wait timer: 5 minutes (opcional)
- URL: `https://guelaguetza-connect.com`

**Environment secrets**:
- PROD_API_URL (si difiere)

---

## Verificar Secrets

Para verificar que los secrets están configurados:

```bash
# Usando GitHub CLI
gh secret list

# Verificar workflow
gh workflow run deploy.yml --ref develop
gh run watch
```

---

## Security Best Practices

1. **Never commit secrets** al repositorio
2. **Rotate keys regularly** (cada 3-6 meses)
3. **Use different keys** para staging y producción
4. **Limit SSH key permissions**:
   ```bash
   # En el servidor, en ~/.ssh/authorized_keys, prefixar con:
   command="cd /opt/guelaguetza-connect && $SSH_ORIGINAL_COMMAND" ssh-ed25519 AAAA...
   ```
5. **Monitor secret usage** en GitHub Actions logs
6. **Use environment-specific secrets** cuando sea posible

---

## Troubleshooting

### "SSH connection failed"

```bash
# Test SSH connection localmente
ssh -i ~/.ssh/github_actions_staging deploy@staging-server

# Verificar permisos del key
chmod 600 ~/.ssh/github_actions_staging

# Verificar que el key está en el servidor
cat ~/.ssh/authorized_keys
```

### "Secret not found"

- Verifica que el nombre del secret coincida exactamente (case-sensitive)
- Verifica que el secret esté en el scope correcto (repository o environment)
- Si usas environment secrets, asegúrate de tener el environment configurado

### "Invalid key format"

- Asegúrate de copiar TODO el private key
- Incluyendo `-----BEGIN OPENSSH PRIVATE KEY-----` y `-----END OPENSSH PRIVATE KEY-----`
- GitHub maneja automáticamente los saltos de línea

---

## Checklist

- [ ] CODECOV_TOKEN (opcional)
- [ ] STRIPE_TEST_SECRET_KEY (opcional)
- [ ] STRIPE_TEST_WEBHOOK_SECRET (opcional)
- [ ] STAGING_HOST
- [ ] STAGING_USER
- [ ] STAGING_SSH_KEY
- [ ] STAGING_API_URL
- [ ] PROD_HOST
- [ ] PROD_USER
- [ ] PROD_SSH_KEY
- [ ] PROD_API_URL
- [ ] SLACK_WEBHOOK_URL (opcional)
- [ ] Environment: staging
- [ ] Environment: production

---

Una vez configurado, procede a:
1. **Probar CI**: Crear un PR de prueba
2. **Probar Deploy a Staging**: Merge a develop
3. **Probar Deploy a Production**: Merge a main (con aprobación)

Ver [QUICK_START.md](./QUICK_START.md) para más detalles.
