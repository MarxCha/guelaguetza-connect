# Quick Start - Tests E2E con Playwright

Guía rápida para ejecutar los tests E2E en menos de 5 minutos.

## 🚀 Setup Rápido (Una Sola Vez)

```bash
# 1. Ejecutar script de setup automático
./setup-e2e.sh

# Alternativamente, manual:
npm install
npx playwright install chromium
```

## ▶️ Ejecutar Tests

### Pre-requisito: Servidores Corriendo

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```

**Terminal 2 - Frontend:**
```bash
npm run dev
```

### Ejecutar Tests (Terminal 3)

```bash
# Opción 1: Modo UI (RECOMENDADO para primera vez)
npm run test:e2e:ui

# Opción 2: Ejecutar todos los tests
npm run test:e2e

# Opción 3: Ver navegador mientras se ejecutan
npm run test:e2e:headed
```

## 📊 Ver Resultados

```bash
# Ver reporte HTML del último test
npm run test:e2e:report
```

## 🎯 Tests Disponibles

```bash
# Solo tests de reservas
npx playwright test booking-flow

# Solo tests de marketplace
npx playwright test marketplace-flow

# Solo tests de admin
npx playwright test admin-flow

# Solo tests de verificación del ambiente
npx playwright test setup
```

## 🐛 Debugging

```bash
# Modo debug con inspector
npm run test:e2e:debug

# Generar código de test automáticamente
npm run test:e2e:codegen
```

## 📁 Archivos Principales

```
playwright.config.ts           - Configuración
test/e2e/
├── setup.spec.ts             - Verificación del ambiente
├── booking-flow.spec.ts      - Tests de reservas
├── marketplace-flow.spec.ts  - Tests de marketplace
├── admin-flow.spec.ts        - Tests de administración
├── fixtures/
│   └── test-users.ts         - Datos de prueba
└── helpers/
    └── auth.ts               - Helpers de autenticación
```

## 🆘 Troubleshooting

### Error: "Cannot connect to server"

**Solución:** Asegúrate que el frontend (puerto 5173) y backend (puerto 3005) están corriendo.

```bash
# Verificar puertos
lsof -i :5173  # Frontend
lsof -i :3005  # Backend
```

### Error: "Browser not found"

**Solución:** Instala los navegadores de Playwright.

```bash
npx playwright install chromium
```

### Tests fallan aleatoriamente

**Solución:** Ejecuta en modo UI para ver qué está pasando.

```bash
npm run test:e2e:ui
```

## 📚 Documentación Completa

- **PLAYWRIGHT_E2E_README.md** - Guía completa de uso
- **E2E_PLAYWRIGHT_SUMMARY.md** - Resumen de implementación
- **test/e2e/DATA_TESTID_GUIDE.md** - Guía para agregar data-testid

## 💡 Tips

1. **Primera vez:** Usa `npm run test:e2e:ui` para explorar visualmente
2. **Desarrollo:** Usa `npm run test:e2e:headed` para ver el navegador
3. **CI/CD:** Usa `npm run test:e2e` para ejecución headless
4. **Debugging:** Usa `npm run test:e2e:debug` para depurar tests

## ✅ Checklist

Antes de ejecutar tests, verifica:

- [ ] Node.js instalado
- [ ] Dependencias instaladas (`npm install`)
- [ ] Navegadores de Playwright instalados (`npx playwright install chromium`)
- [ ] Backend corriendo en puerto 3005
- [ ] Frontend corriendo en puerto 5173

## 🎉 ¡Listo!

Ahora puedes ejecutar:

```bash
npm run test:e2e:ui
```

Y explorar los tests visualmente. ¡Disfruta! 🚀
