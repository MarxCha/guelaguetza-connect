# Testing Guide - Guelaguetza Connect Frontend

Configuración de testing con Vitest y React Testing Library para el frontend de Guelaguetza Connect.

## Stack de Testing

- **Vitest** - Framework de testing rápido y moderno
- **React Testing Library** - Testing de componentes React
- **@testing-library/jest-dom** - Matchers personalizados
- **@testing-library/user-event** - Simulación de interacciones de usuario
- **jsdom** - Entorno DOM para tests

## Comandos

```bash
# Ejecutar tests en modo watch
npm test

# Ejecutar tests una vez
npm test -- --run

# Ver interfaz gráfica de Vitest
npm run test:ui

# Generar reporte de cobertura
npm run test:coverage

# Ejecutar tests específicos
npm test Button.test.tsx

# Ejecutar tests con filtro
npm test -- --grep "renders button"
```

## Estructura de Tests

```
guelaguetza-connect/
├── test/
│   ├── setup.ts              # Configuración global de tests
│   ├── test-utils.tsx        # Utilidades y helpers
│   ├── example.test.tsx      # Tests de ejemplo
│   └── README.md             # Esta guía
├── components/
│   └── ui/
│       ├── Button.tsx
│       └── Button.test.tsx   # Test junto al componente
└── vitest.config.ts          # Configuración de Vitest
```

## Escribir Tests

### Test Básico de Componente

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Button from './Button';

describe('Button', () => {
  it('renders button with text', () => {
    render(<Button>Click me</Button>);

    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });
});
```

### Test con Interacciones

```tsx
import { vi } from 'vitest';
import userEvent from '@testing-library/user-event';

it('calls onClick when clicked', async () => {
  const handleClick = vi.fn();
  const user = userEvent.setup();

  render(<Button onClick={handleClick}>Click</Button>);

  await user.click(screen.getByRole('button'));

  expect(handleClick).toHaveBeenCalledTimes(1);
});
```

### Test con Contextos Mockeados

```tsx
import { render } from '../test/test-utils';

it('renders with auth context', () => {
  render(<UserProfile />, {
    authContext: {
      user: { nombre: 'Test', email: 'test@example.com' }
    }
  });

  expect(screen.getByText('Test')).toBeInTheDocument();
});
```

### Test de API Calls

```tsx
import { mockSuccessfulFetch, mockFailedFetch } from '../test/test-utils';

it('loads data successfully', async () => {
  mockSuccessfulFetch({ events: [{ id: 1, name: 'Test Event' }] });

  render(<EventsList />);

  expect(await screen.findByText('Test Event')).toBeInTheDocument();
});
```

## Mocks Disponibles

### AuthContext Mock

```tsx
const mockAuthContext = {
  user: mockUser,              // Usuario de prueba
  token: 'mock-token-123',
  isLoading: false,
  isAuthenticated: true,
  isDemoMode: false,
  login: vi.fn(),
  logout: vi.fn(),
  // ... más métodos
};
```

### LanguageContext Mock

```tsx
const mockLanguageContext = {
  language: 'es',
  setLanguage: vi.fn(),
  t: (key: string) => key,    // Retorna la key directamente
  greeting: 'Bienvenido',
  languageLabel: 'Espanol',
};
```

### localStorage Mock

```tsx
localStorage.setItem('key', 'value');
expect(localStorage.getItem('key')).toBe('value');
localStorage.clear();
```

### fetch API Mock

```tsx
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ data: 'test' }),
});
```

## Buenas Prácticas

### 1. Usar Queries Apropiadas

```tsx
// Preferir en este orden:
screen.getByRole('button', { name: /submit/i })  // ✅ Mejor
screen.getByLabelText(/email/i)                  // ✅ Bueno
screen.getByPlaceholderText(/enter email/i)      // ⚠️ OK
screen.getByTestId('submit-button')              // ❌ Último recurso
```

### 2. Esperar Actualizaciones Asíncronas

```tsx
// ✅ Correcto
expect(await screen.findByText('Loaded')).toBeInTheDocument();

// ❌ Incorrecto
expect(screen.getByText('Loaded')).toBeInTheDocument(); // Puede fallar
```

### 3. Limpiar después de cada Test

```tsx
// Ya configurado en test/setup.ts
afterEach(() => {
  cleanup();
});
```

### 4. Mockear Servicios Externos

```tsx
// Mockear fetch, APIs, librerías pesadas
vi.mock('../services/api', () => ({
  fetchEvents: vi.fn().mockResolvedValue([]),
}));
```

## Cobertura de Código

La configuración de cobertura genera reportes en:

- **Terminal** - Resumen rápido
- **HTML** - Ver en `coverage/index.html`
- **JSON/LCOV** - Para integración con CI/CD

### Métricas Recomendadas

| Métrica | Mínimo |
|---------|--------|
| Statements | 70% |
| Branches | 60% |
| Functions | 70% |
| Lines | 70% |

## Debugging Tests

### Ver UI de Vitest

```bash
npm run test:ui
```

Abre una interfaz web en http://localhost:51204

### Ver HTML Renderizado

```tsx
import { screen } from '@testing-library/react';

it('debug test', () => {
  render(<MyComponent />);
  screen.debug(); // Imprime el HTML en consola
});
```

### Ejecutar en modo watch con filtro

```bash
npm test -- --watch Button
```

## Recursos

- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [User Event](https://testing-library.com/docs/user-event/intro)

## Troubleshooting

### Error: "Cannot find module"

Verifica que las rutas de importación sean correctas y que el alias `@` esté configurado.

### Error: "act(...) warning"

Usa `await` con `findBy*` queries o `waitFor` para operaciones asíncronas.

### Tests lentos

- Usa `--no-coverage` para desarrollo
- Filtra tests específicos con `--grep`
- Considera usar `happy-dom` en lugar de `jsdom` (más rápido)

### CSS/Styles no funcionan

Los estilos CSS son parseados pero no aplicados en jsdom. Usa clases CSS para verificar.
