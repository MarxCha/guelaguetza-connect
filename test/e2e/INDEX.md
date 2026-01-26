# Índice de Tests E2E

Guía rápida para navegar la documentación de tests E2E.

## Empezar Aquí

### Para Desarrolladores Nuevos
1. **QUICK_START.md** - Ejecutar tests en 5 minutos
2. **E2E_TESTING_GUIDE.md** (en raíz) - Guía completa

### Para Entender la Arquitectura
1. **ARCHITECTURE.md** - Diagramas y flujos
2. **README.md** - Documentación detallada

### Para Ver Resultados
1. **SUCCESS.txt** - Resumen de lo creado
2. **E2E_TESTS_SUMMARY.md** (en raíz) - Métricas y ejemplos

## Archivos por Propósito

### Configuración
- `setup.ts` - Setup global de todos los tests
- `vitest.config.e2e.ts` (en raíz) - Config de Vitest
- `.env.test.example` (en raíz) - Variables de entorno
- `docker-compose.test.yml` - Base de datos de prueba

### Tests
- `health.test.ts` - Tests de verificación (9 tests)
- `booking-flow.test.ts` - Reservar experiencia (6 tests)
- `marketplace-flow.test.ts` - Comprar productos (7 tests)
- `admin-flow.test.ts` - Gestión de usuarios (11 tests)

### Datos de Prueba
- `fixtures/users.ts` - 5 usuarios con diferentes roles
- `fixtures/experiences.ts` - 3 experiencias + horarios
- `fixtures/products.ts` - 5 productos + vendedor

### Utilidades
- `utils.ts` - Helpers comunes
- `setup-test-db.sh` - Script de setup automático

## Flujos de Lectura Recomendados

### Quiero ejecutar tests rápidamente
```
QUICK_START.md → Ejecutar: ./test/e2e/setup-test-db.sh → pnpm test:e2e
```

### Quiero entender cómo funcionan
```
ARCHITECTURE.md → README.md → Ver código: booking-flow.test.ts
```

### Quiero agregar nuevos tests
```
E2E_TESTING_GUIDE.md → Ver ejemplos existentes → utils.ts para helpers
```

### Quiero integrar con CI/CD
```
E2E_TESTING_GUIDE.md (sección CI/CD) → .github/workflows/e2e-tests.yml.example
```

## Quick Links

| Documento | Propósito | Tiempo Lectura |
|-----------|-----------|----------------|
| QUICK_START.md | Inicio rápido | 2 min |
| SUCCESS.txt | Ver qué se creó | 1 min |
| README.md | Detalles técnicos | 10 min |
| ARCHITECTURE.md | Entender estructura | 15 min |
| E2E_TESTING_GUIDE.md | Guía completa | 20 min |
| E2E_TESTS_SUMMARY.md | Resumen ejecutivo | 5 min |

## Comandos Esenciales

```bash
# Setup inicial
./test/e2e/setup-test-db.sh

# Ejecutar todos los tests
pnpm test:e2e

# Test específico
pnpm test:e2e booking

# Modo desarrollo
pnpm test:e2e:watch

# Con UI
pnpm test:e2e:ui
```

## Estructura Visual

```
test/e2e/
│
├── 📚 DOCUMENTACIÓN
│   ├── INDEX.md (este archivo)
│   ├── QUICK_START.md
│   ├── README.md
│   ├── ARCHITECTURE.md
│   └── SUCCESS.txt
│
├── ⚙️  CONFIGURACIÓN
│   ├── setup.ts
│   ├── docker-compose.test.yml
│   └── setup-test-db.sh
│
├── 🧪 TESTS
│   ├── health.test.ts
│   ├── booking-flow.test.ts
│   ├── marketplace-flow.test.ts
│   └── admin-flow.test.ts
│
├── 📦 FIXTURES
│   └── fixtures/
│       ├── users.ts
│       ├── experiences.ts
│       └── products.ts
│
└── 🔧 UTILIDADES
    └── utils.ts
```

## Preguntas Frecuentes

### ¿Cómo ejecuto un solo test?
```bash
pnpm test:e2e "nombre del test"
```

### ¿Dónde están los datos de prueba?
En `fixtures/` - users, experiences, products

### ¿Cómo debugging?
Ver sección "Debugging" en E2E_TESTING_GUIDE.md

### ¿Cómo agregar nuevo flujo?
Ver sección "Agregar nuevo flujo" en README.md

### ¿Dónde está la BD de prueba?
PostgreSQL en Docker, puerto 5433

## Contacto

Para preguntas sobre tests E2E:
1. Leer documentación primero
2. Revisar ejemplos en tests existentes
3. Ver utils.ts para helpers disponibles
