# Testing Backend - Guelaguetza Connect

Configuración de testing unitario y de integración para el backend con Vitest.

## Stack de Testing

- **Vitest**: Framework de testing rápido y moderno
- **@vitest/ui**: Interfaz visual para ejecutar y ver tests
- **@vitest/coverage-v8**: Análisis de cobertura de código
- **Supertest**: Testing de endpoints HTTP (preparado para futuros tests de integración)

## Estructura de Tests

```
backend/
├── src/
│   ├── app.test.ts                    # Tests de la app principal
│   └── services/
│       └── auth.service.test.ts       # Tests del servicio de auth
├── test/
│   ├── setup.ts                       # Configuración y mocks globales
│   ├── helpers.ts                     # Funciones helper para tests
│   └── README.md                      # Esta documentación
└── vitest.config.ts                   # Configuración de Vitest
```

## Comandos Disponibles

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch (recomendado para desarrollo)
npm run test:watch

# Ver tests en interfaz visual
npm run test:ui

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar un test específico
npm test -- src/services/auth.service.test.ts

# Ejecutar tests que contengan cierto patrón
npm test -- --grep "login"
```

## Mocks de Prisma

El archivo `test/setup.ts` contiene mocks de Prisma Client que se utilizan automáticamente en todos los tests. Esto permite:

- Tests rápidos sin conexión a base de datos
- Control total sobre los datos de respuesta
- Verificación de que se llamen los métodos correctos

### Ejemplo de uso:

```typescript
import { prismaMock } from '../../test/setup.js';

// En tu test
prismaMock.user.findUnique.mockResolvedValue({
  id: '1',
  email: 'test@example.com',
  // ... otros campos
});

const result = await authService.login('test@example.com', 'password');

expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
  where: { email: 'test@example.com' },
});
```

## Helpers de Testing

El archivo `test/helpers.ts` proporciona utilidades comunes:

- `createTestApp()`: Crea una instancia de Fastify para tests
- `closeTestApp()`: Cierra la app después de los tests
- `mockUser`: Usuario de ejemplo para tests
- `generateTestToken()`: Genera tokens JWT para tests autenticados

## Cobertura de Código

Objetivos mínimos configurados:

| Métrica | Objetivo |
|---------|----------|
| Statements | 70% |
| Branches | 60% |
| Functions | 70% |
| Lines | 70% |

Ver reporte de cobertura:
```bash
npm run test:coverage
open coverage/index.html
```

## Patrones de Testing

### Test de Servicio

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyService } from './my.service.js';
import { prismaMock } from '../../test/setup.js';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService(prismaMock as any);
    vi.clearAllMocks();
  });

  it('should do something', async () => {
    prismaMock.model.findMany.mockResolvedValue([]);

    const result = await service.doSomething();

    expect(result).toEqual([]);
    expect(prismaMock.model.findMany).toHaveBeenCalled();
  });
});
```

### Test de Endpoint (HTTP)

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, closeTestApp, generateTestToken } from '../../test/helpers.js';

describe('Auth Routes', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('should login user', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/api/auth/login',
      payload: {
        email: 'test@example.com',
        password: 'password123'
      }
    });

    expect(response.statusCode).toBe(200);
  });
});
```

## Mejores Prácticas

1. **Aislar tests**: Cada test debe ser independiente
2. **Limpiar mocks**: Usa `vi.clearAllMocks()` en `beforeEach`
3. **Nombres descriptivos**: Usa `describe` y `it` de forma clara
4. **AAA Pattern**: Arrange, Act, Assert en cada test
5. **Evitar tests frágiles**: No dependas del orden de ejecución

## Próximos Pasos

- Agregar tests para más servicios (stories, events, etc.)
- Implementar tests de integración con base de datos de prueba
- Configurar CI/CD para ejecutar tests automáticamente
- Agregar tests E2E con Playwright (opcional)
