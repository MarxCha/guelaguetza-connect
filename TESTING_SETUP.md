# Testing Setup - Guelaguetza Connect

Configuración completa de Vitest con React Testing Library para el frontend.

## Instalación Completada

### Dependencias Instaladas

```json
{
  "devDependencies": {
    "vitest": "^4.0.18",
    "@testing-library/react": "^16.3.2",
    "@testing-library/jest-dom": "^6.9.1",
    "@testing-library/user-event": "^14.6.1",
    "jsdom": "^27.4.0",
    "happy-dom": "^20.3.7",
    "@vitest/coverage-v8": "^4.0.18"
  }
}
```

### Scripts Agregados

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

## Estructura de Archivos Creados

```
guelaguetza-connect/
├── vitest.config.ts              # Configuración de Vitest
├── test/
│   ├── setup.ts                  # Setup global (mocks de DOM APIs)
│   ├── test-utils.tsx            # Utilidades y contextos mockeados
│   ├── example.test.tsx          # Tests de ejemplo
│   └── README.md                 # Guía completa de testing
├── components/
│   └── ui/
│       ├── Button.tsx
│       ├── Button.test.tsx       # 23 tests del componente Button
│       ├── UserWelcome.tsx
│       └── UserWelcome.test.tsx  # 12 tests de ejemplo con contextos
└── TESTING_SETUP.md              # Este archivo
```

## Archivos de Configuración

### vitest.config.ts

Configuración principal de Vitest con:
- Environment: jsdom
- Setup files: test/setup.ts
- Coverage provider: v8
- Exclusión automática de backend/
- Alias @ configurado

### test/setup.ts

Mocks globales configurados:
- localStorage
- fetch API
- matchMedia
- IntersectionObserver
- ResizeObserver
- Cleanup automático con afterEach()

### test/test-utils.tsx

Utilidades de testing:
- `renderWithProviders()` - Render con contextos mockeados
- `mockAuthContext` - Usuario autenticado de prueba
- `mockLanguageContext` - Idioma español por defecto
- `mockFetchResponse()` - Helper para mockear fetch
- `mockSuccessfulFetch()` - Mock de API exitoso
- `mockFailedFetch()` - Mock de API fallido

## Uso Rápido

### Ejecutar Tests

```bash
# Modo watch (desarrollo)
npm test

# Una sola ejecución
npm test -- --run

# Con cobertura
npm run test:coverage

# UI gráfica
npm run test:ui
```

### Escribir un Test

1. Crea el archivo junto al componente: `Component.test.tsx`

2. Estructura básica:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '../../test/test-utils';
import MyComponent from './MyComponent';

describe('MyComponent', () => {
  it('renders correctly', () => {
    render(<MyComponent />);

    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

3. Con interacciones:

```tsx
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';

it('handles click', async () => {
  const onClick = vi.fn();
  const user = userEvent.setup();

  render(<Button onClick={onClick}>Click</Button>);

  await user.click(screen.getByRole('button'));

  expect(onClick).toHaveBeenCalledTimes(1);
});
```

4. Con contextos:

```tsx
render(<UserProfile />, {
  authContext: {
    user: { nombre: 'Test', email: 'test@example.com' }
  },
  languageContext: {
    language: 'zapoteco',
    greeting: 'Padiuxhi'
  }
});
```

## Tests de Ejemplo Incluidos

### Button.test.tsx (23 tests)
- Renderizado básico
- Variantes (primary, secondary, danger, outline)
- Tamaños (sm, md, lg)
- Estados (loading, disabled)
- Interacciones con onClick
- Iconos (left, right)
- IconButton component
- Chip component

### UserWelcome.test.tsx (12 tests)
- Renderizado con contextos
- Props condicionales
- Diferentes idiomas
- Accesibilidad
- Estados de autenticación

### example.test.tsx (7 tests)
- localStorage mock
- fetch API mock
- Interacciones asíncronas

## Resultados Actuales

```
Test Files: 3 passed (3)
Tests: 42 passed (42)
Duration: ~3s
```

### Cobertura

```
File             | % Stmts | % Branch | % Funcs | % Lines
-----------------|---------|----------|---------|----------
Button.tsx       |   46.66 |    37.32 |   21.05 |   47.45
UserWelcome.tsx  |   85.71 |    80.00 |  100.00 |   85.71
```

## Mocks de Contextos

### AuthContext Mock

```tsx
mockAuthContext = {
  user: {
    id: 'test-user-1',
    email: 'test@guelaguetza.mx',
    nombre: 'Usuario',
    apellido: 'Test',
    region: 'Valles Centrales',
    role: 'USER',
  },
  token: 'mock-token-123',
  isLoading: false,
  isAuthenticated: true,
  isDemoMode: false,
  login: vi.fn(),
  loginWithFace: vi.fn(),
  loginAsDemo: vi.fn(),
  register: vi.fn(),
  logout: vi.fn(),
  updateProfile: vi.fn(),
}
```

### LanguageContext Mock

```tsx
mockLanguageContext = {
  language: 'es',
  setLanguage: vi.fn(),
  t: (key: string) => key,
  greeting: 'Bienvenido',
  languageLabel: 'Espanol',
}
```

## Próximos Pasos

1. **Agregar tests a componentes existentes**
   - EventCard
   - BadgesView
   - ChatAssistant
   - Etc.

2. **Tests de integración**
   - Flujos completos de usuario
   - Navegación entre vistas
   - Formularios con validación

3. **Tests de hooks personalizados**
   - useAuth
   - useLanguage
   - Custom hooks en hooks/

4. **Mejorar cobertura**
   - Objetivo: >70% en componentes críticos
   - Cubrir branches y edge cases

5. **CI/CD**
   - Ejecutar tests en cada PR
   - Bloquear merge si fallan tests
   - Reportes de cobertura automáticos

## Recursos

- [Documentación completa](./test/README.md)
- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)

## Notas Importantes

1. **Backend excluido**: Los tests del backend están en `/Users/marxchavez/Projects/guelaguetza-connect/backend` y usan su propia configuración.

2. **Contextos reales vs mocks**: Los componentes de ejemplo (`UserWelcome.tsx`) usan mocks internos para demostración. En componentes reales que usen `useAuth()` y `useLanguage()`, los contextos mockeados funcionarán correctamente.

3. **Performance**: Los tests corren rápido (~3s para 42 tests). Si se vuelven lentos:
   - Usa `--no-coverage` en desarrollo
   - Filtra tests específicos
   - Considera `happy-dom` en lugar de `jsdom`

4. **Watch mode**: Por defecto `npm test` corre en modo watch para desarrollo rápido.

## Soporte

Para dudas o problemas:
1. Revisa [test/README.md](./test/README.md)
2. Consulta ejemplos en los tests existentes
3. Verifica la configuración en `vitest.config.ts`
