# Configuración de Testing - Backend

Vitest está configurado y funcionando correctamente para el backend de Guelaguetza Connect.

## Resumen de Configuración

### Dependencias Instaladas

```json
{
  "devDependencies": {
    "vitest": "^4.0.18",
    "@vitest/ui": "^4.0.18",
    "@vitest/coverage-v8": "^4.0.18",
    "@types/supertest": "^6.0.3",
    "supertest": "^7.2.2"
  }
}
```

### Archivos Creados

1. **vitest.config.ts** - Configuración de Vitest con coverage y thresholds
2. **test/setup.ts** - Mocks globales de Prisma Client
3. **test/helpers.ts** - Funciones helper para tests (createTestApp, generateTestToken, etc.)
4. **test/README.md** - Documentación completa de testing
5. **.gitignore** - Excluye coverage y node_modules

### Tests de Ejemplo

- **src/app.test.ts** - Tests de endpoints principales (health, root, 404)
- **src/services/auth.service.test.ts** - Tests unitarios del servicio de auth
- **src/utils/errors.test.ts** - Tests de clases de error personalizadas

## Scripts Disponibles

```bash
# Ejecutar todos los tests
npm test

# Ejecutar en modo watch (recomendado para desarrollo)
npm run test:watch

# Interfaz visual de Vitest
npm run test:ui

# Generar reporte de cobertura
npm run test:coverage
```

## Estado Actual

### Tests

- ✅ 19 tests pasando
- ✅ 3 archivos de test
- ✅ 100% de los tests escritos pasan

### Cobertura de Código

| Categoría | Cobertura Actual | Objetivo |
|-----------|------------------|----------|
| Statements | ~17% | 70% |
| Branches | ~3% | 60% |
| Functions | ~11% | 70% |
| Lines | ~18% | 70% |

**Nota**: La cobertura es baja porque solo hemos creado tests para algunos módulos. A medida que se agreguen más tests, la cobertura aumentará automáticamente.

### Cobertura por Módulo

| Módulo | Cobertura |
|--------|-----------|
| auth.service.ts | 100% ✅ |
| app.ts | 82% ✅ |
| prisma.ts | 100% ✅ |
| errors.ts | 100% ✅ |
| Otros servicios | <10% ⚠️ |

## Próximos Pasos

### Prioridad Alta

1. **Tests de servicios críticos**:
   - `story.service.ts` - Manejo de historias
   - `event.service.ts` - Gestión de eventos
   - `booking.service.ts` - Reservaciones

2. **Tests de rutas principales**:
   - `/api/auth/*` - Autenticación
   - `/api/events/*` - Eventos
   - `/api/bookings/*` - Reservaciones

### Prioridad Media

3. **Tests de integración**:
   - Crear base de datos de prueba (SQLite o PostgreSQL en Docker)
   - Tests de endpoints completos con BD real

4. **Tests de middleware**:
   - `middleware/admin.ts`
   - `plugins/auth.ts`

### Prioridad Baja

5. **Tests E2E** (opcional):
   - Considerar Playwright para flujos completos
   - Tests de integración frontend-backend

## Estructura Recomendada

```
backend/
├── src/
│   ├── services/
│   │   ├── auth.service.ts
│   │   └── auth.service.test.ts    # Test junto al código
│   ├── routes/
│   │   ├── auth.ts
│   │   └── auth.test.ts
│   └── utils/
│       ├── errors.ts
│       └── errors.test.ts
├── test/
│   ├── setup.ts                     # Setup global
│   ├── helpers.ts                   # Helpers de test
│   └── README.md                    # Documentación
├── vitest.config.ts
└── coverage/                        # Generado automáticamente
```

## Patrones de Testing

### Test Unitario de Servicio

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { MyService } from './my.service.js';
import { prismaMock } from '../../test/setup.js';

describe('MyService', () => {
  let service: MyService;

  beforeEach(() => {
    service = new MyService(prismaMock as any);
  });

  it('should do something', async () => {
    prismaMock.model.findMany.mockResolvedValue([]);
    const result = await service.doSomething();
    expect(result).toEqual([]);
  });
});
```

### Test de Endpoint HTTP

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTestApp, closeTestApp } from '../../test/helpers.js';

describe('Auth Routes', () => {
  let app;

  beforeAll(async () => {
    app = await createTestApp();
  });

  afterAll(async () => {
    await closeTestApp(app);
  });

  it('should return 200', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
    });
    expect(response.statusCode).toBe(200);
  });
});
```

## Mocks de Prisma

El archivo `test/setup.ts` proporciona mocks automáticos de Prisma para todos los tests:

```typescript
import { prismaMock } from '../../test/setup.js';

// Configurar mock
prismaMock.user.findUnique.mockResolvedValue({ id: '1', email: 'test@example.com' });

// Verificar llamadas
expect(prismaMock.user.findUnique).toHaveBeenCalledWith({
  where: { email: 'test@example.com' }
});
```

## Recursos

- [Documentación de Vitest](https://vitest.dev/)
- [Fastify Testing](https://fastify.dev/docs/latest/Guides/Testing/)
- [Testing Best Practices](https://testingjavascript.com/)

## Notas Importantes

1. **No requiere base de datos**: Los tests unitarios usan mocks de Prisma
2. **Rápidos**: Todos los tests corren en <2 segundos
3. **Aislados**: Cada test es independiente
4. **Tipo-safe**: TypeScript completo en los tests
5. **Watch mode**: Recomendado para desarrollo (`npm run test:watch`)

## Ejemplo de Flujo de Desarrollo

```bash
# 1. Iniciar tests en watch mode
npm run test:watch

# 2. Escribir código y tests
# (Los tests se re-ejecutan automáticamente)

# 3. Ver cobertura
npm run test:coverage

# 4. Antes de commit
npm test
```

---

**Configurado el**: 2026-01-25
**Framework**: Vitest 4.0.18
**Backend**: Fastify 5.2.0 + Prisma 6.2.1
