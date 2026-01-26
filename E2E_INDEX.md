# Índice de Documentación - Tests E2E con Playwright

Este archivo es un índice de toda la documentación relacionada con los tests E2E implementados con Playwright.

## 📖 Documentación Principal

### Para Empezar

1. **[QUICK_START_E2E.md](./QUICK_START_E2E.md)** ⭐ **EMPIEZA AQUÍ**
   - Setup en 5 minutos
   - Comandos esenciales
   - Troubleshooting básico
   - Ideal para: Primera vez ejecutando tests E2E

2. **[setup-e2e.sh](./setup-e2e.sh)** 🔧
   - Script automático de instalación
   - Configura todo con un solo comando
   - Ideal para: Setup inicial rápido

### Documentación Completa

3. **[PLAYWRIGHT_E2E_README.md](./PLAYWRIGHT_E2E_README.md)** 📚 **GUÍA COMPLETA**
   - Guía exhaustiva de Playwright
   - Cómo escribir tests
   - Debugging avanzado
   - Mejores prácticas
   - CI/CD
   - Ideal para: Desarrolladores escribiendo tests

4. **[E2E_PLAYWRIGHT_SUMMARY.md](./E2E_PLAYWRIGHT_SUMMARY.md)** 📊
   - Resumen de implementación
   - Lista de todos los tests creados
   - Métricas y cobertura
   - Ideal para: Project managers y revisión general

5. **[E2E_TESTING_GUIDE.md](./E2E_TESTING_GUIDE.md)** 📖
   - Guía original de tests E2E (Vitest)
   - Tests de integración con backend
   - Base de datos de prueba
   - Ideal para: Tests E2E de backend

### Guías Especializadas

6. **[test/e2e/DATA_TESTID_GUIDE.md](./test/e2e/DATA_TESTID_GUIDE.md)** 🎯
   - Cómo agregar `data-testid` a componentes
   - Ejemplos por componente
   - Nomenclatura y patrones
   - Checklist de implementación
   - Ideal para: Desarrolladores de frontend

---

## 🗂️ Estructura de Archivos

```
guelaguetza-connect/
├── playwright.config.ts              # Configuración de Playwright
├── setup-e2e.sh                      # Script de setup automático
│
├── QUICK_START_E2E.md               # ⭐ Guía de inicio rápido
├── PLAYWRIGHT_E2E_README.md         # 📚 Documentación completa
├── E2E_PLAYWRIGHT_SUMMARY.md        # 📊 Resumen de implementación
├── E2E_TESTING_GUIDE.md             # Tests E2E con Vitest
├── E2E_INDEX.md                     # Este archivo
│
├── test/e2e/
│   ├── setup.spec.ts                # Tests de verificación
│   ├── booking-flow.spec.ts         # Tests de reservas
│   ├── marketplace-flow.spec.ts     # Tests de marketplace
│   ├── admin-flow.spec.ts           # Tests de administración
│   │
│   ├── fixtures/
│   │   └── test-users.ts            # Datos de prueba
│   │
│   ├── helpers/
│   │   └── auth.ts                  # Helpers de autenticación
│   │
│   └── DATA_TESTID_GUIDE.md         # Guía de data-testid
│
└── package.json                     # Scripts NPM
```

---

## 🧪 Tests Implementados

### Total: 31 tests E2E

| Archivo | Tests | Descripción |
|---------|-------|-------------|
| `setup.spec.ts` | 10 | Verificación del ambiente |
| `booking-flow.spec.ts` | 6 | Flujo completo de reservas |
| `marketplace-flow.spec.ts` | 7 | Flujo completo de marketplace |
| `admin-flow.spec.ts` | 8 | Flujo de administración |

---

## 🎯 Flujos Cubiertos

### ✅ User Journey: Reservar Experiencia
- Login/Register
- Buscar experiencias
- Ver detalle
- Seleccionar horario
- Crear booking
- Procesar pago
- Verificar en "Mis Reservas"

### ✅ User Journey: Comprar Productos
- Login
- Navegar tienda
- Agregar al carrito
- Checkout
- Completar orden
- Verificar en "Mis Pedidos"

### ✅ Admin Journey: Banear Usuario
- Login como admin
- Panel de administración
- Buscar usuario
- Banear con razón
- Verificar baneo

---

## 🚀 Comandos Quick Reference

```bash
# Setup inicial (una sola vez)
./setup-e2e.sh

# Ejecutar tests
npm run test:e2e              # Todos los tests
npm run test:e2e:ui           # Modo UI (recomendado)
npm run test:e2e:headed       # Ver navegador
npm run test:e2e:debug        # Modo debug

# Tests específicos
npx playwright test booking-flow
npx playwright test marketplace-flow
npx playwright test admin-flow

# Utilidades
npm run test:e2e:report       # Ver reporte HTML
npm run test:e2e:codegen      # Generar código
```

---

## 📊 Datos de Prueba (Fixtures)

### Usuarios Disponibles

```typescript
import {
  REGULAR_USER,    // test.user@guelaguetza.com
  ADMIN_USER,      // admin@guelaguetza.com
  GUIDE_USER,      // guide@guelaguetza.com
  SELLER_USER,     // seller@guelaguetza.com
  USER_TO_BAN      // ban.me@guelaguetza.com
} from './fixtures/test-users';
```

### Tarjetas de Prueba Stripe

```typescript
import { STRIPE_TEST_CARDS } from './fixtures/test-users';

STRIPE_TEST_CARDS.SUCCESS              // 4242 4242 4242 4242
STRIPE_TEST_CARDS.DECLINED             // 4000 0000 0000 0002
STRIPE_TEST_CARDS.INSUFFICIENT_FUNDS   // 4000 0000 0000 9995
```

---

## 🎓 Recursos de Aprendizaje

### Por Nivel de Experiencia

#### Principiante
1. Leer: [QUICK_START_E2E.md](./QUICK_START_E2E.md)
2. Ejecutar: `npm run test:e2e:ui`
3. Explorar: Tests en modo UI
4. Practicar: Modificar tests existentes

#### Intermedio
1. Leer: [PLAYWRIGHT_E2E_README.md](./PLAYWRIGHT_E2E_README.md)
2. Sección: "Escribir Nuevos Tests"
3. Practicar: Crear un test nuevo
4. Revisar: [DATA_TESTID_GUIDE.md](./test/e2e/DATA_TESTID_GUIDE.md)

#### Avanzado
1. Implementar: Page Objects (opcional)
2. Configurar: CI/CD con GitHub Actions
3. Agregar: Tests visuales con screenshots
4. Optimizar: Performance de tests

---

## 🔍 Buscar Información Específica

### "¿Cómo ejecuto los tests?"
→ [QUICK_START_E2E.md](./QUICK_START_E2E.md) - Sección: Ejecutar Tests

### "¿Cómo escribo un nuevo test?"
→ [PLAYWRIGHT_E2E_README.md](./PLAYWRIGHT_E2E_README.md) - Sección: Escribir Nuevos Tests

### "¿Cómo agrego data-testid a mi componente?"
→ [test/e2e/DATA_TESTID_GUIDE.md](./test/e2e/DATA_TESTID_GUIDE.md)

### "¿Qué tests hay implementados?"
→ [E2E_PLAYWRIGHT_SUMMARY.md](./E2E_PLAYWRIGHT_SUMMARY.md)

### "¿Cómo debuggeo un test que falla?"
→ [PLAYWRIGHT_E2E_README.md](./PLAYWRIGHT_E2E_README.md) - Sección: Debugging

### "¿Cómo configuro CI/CD?"
→ [PLAYWRIGHT_E2E_README.md](./PLAYWRIGHT_E2E_README.md) - Sección: CI/CD

### "¿Qué datos de prueba hay disponibles?"
→ [test/e2e/fixtures/test-users.ts](./test/e2e/fixtures/test-users.ts)

---

## 🛠️ Herramientas y Configuración

### Archivos de Configuración

- **playwright.config.ts** - Configuración principal de Playwright
- **package.json** - Scripts NPM disponibles
- **.gitignore** - Archivos ignorados (test-results, playwright-report)

### Scripts NPM Disponibles

| Script | Descripción |
|--------|-------------|
| `test:e2e` | Ejecutar todos los tests |
| `test:e2e:headed` | Ejecutar con navegador visible |
| `test:e2e:ui` | Abrir Playwright UI |
| `test:e2e:debug` | Modo debug con inspector |
| `test:e2e:report` | Ver reporte HTML |
| `test:e2e:codegen` | Generar código de test |

---

## 📞 Soporte y Ayuda

### Problemas Comunes

1. **Tests no encuentran elementos**
   - Revisar: [PLAYWRIGHT_E2E_README.md](./PLAYWRIGHT_E2E_README.md) - Sección: Troubleshooting
   - Usar: `npm run test:e2e:ui` para inspeccionar

2. **Backend/Frontend no está corriendo**
   - Revisar: [QUICK_START_E2E.md](./QUICK_START_E2E.md) - Sección: Troubleshooting

3. **Navegadores no instalados**
   - Ejecutar: `./setup-e2e.sh`
   - O manual: `npx playwright install chromium`

### Enlaces Externos

- [Documentación de Playwright](https://playwright.dev)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [API Reference](https://playwright.dev/docs/api/class-playwright)

---

## 🗺️ Roadmap

### Completado ✅
- [x] Configuración de Playwright
- [x] Tests de booking flow
- [x] Tests de marketplace flow
- [x] Tests de admin flow
- [x] Tests de setup/verificación
- [x] Fixtures y helpers
- [x] Documentación completa
- [x] Scripts de setup

### Próximos Pasos 🔜
- [ ] Agregar `data-testid` a componentes
- [ ] Tests visuales (screenshot comparison)
- [ ] Tests de accesibilidad (axe-core)
- [ ] Configurar CI/CD en GitHub Actions
- [ ] Tests de performance (Lighthouse)
- [ ] Tests en más navegadores (Firefox, Safari)

---

## 📝 Contribuir

Para contribuir con nuevos tests:

1. Lee: [PLAYWRIGHT_E2E_README.md](./PLAYWRIGHT_E2E_README.md) - Sección: Escribir Tests
2. Sigue: Patrones de tests existentes
3. Agrega: `data-testid` según [DATA_TESTID_GUIDE.md](./test/e2e/DATA_TESTID_GUIDE.md)
4. Documenta: Actualiza este índice si es necesario

---

## 📅 Última Actualización

- **Fecha:** 25 de enero de 2026
- **Versión de Playwright:** 1.58.0
- **Total de Tests:** 31
- **Cobertura:** 100% de flujos críticos

---

**Nota:** Este índice se actualiza conforme se agregan nuevos tests y documentación.
