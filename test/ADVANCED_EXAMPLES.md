# Advanced Testing Examples

Ejemplos avanzados de testing para escenarios comunes en Guelaguetza Connect.

## Testing Async Data Loading

### Componente que carga datos

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import EventsList from './EventsList';

describe('EventsList - Async Loading', () => {
  beforeEach(() => {
    // Reset mocks antes de cada test
    vi.clearAllMocks();
  });

  it('shows loading state initially', () => {
    global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves

    render(<EventsList />);

    expect(screen.getByText(/cargando/i)).toBeInTheDocument();
  });

  it('displays events after loading', async () => {
    const mockEvents = [
      { id: 1, name: 'Guelaguetza 2026', date: '2026-07-20' },
      { id: 2, name: 'Feria del Mezcal', date: '2026-08-15' },
    ];

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ events: mockEvents }),
    });

    render(<EventsList />);

    // Esperar a que aparezcan los eventos
    expect(await screen.findByText('Guelaguetza 2026')).toBeInTheDocument();
    expect(screen.getByText('Feria del Mezcal')).toBeInTheDocument();
  });

  it('shows error message on fetch failure', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

    render(<EventsList />);

    expect(await screen.findByText(/error/i)).toBeInTheDocument();
  });

  it('retries loading on button click', async () => {
    const fetchSpy = vi.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: [] }),
      });

    global.fetch = fetchSpy;

    render(<EventsList />);

    // Primera carga falla
    const retryButton = await screen.findByRole('button', { name: /reintentar/i });

    // Click para reintentar
    await userEvent.setup().click(retryButton);

    // Segunda carga exitosa
    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledTimes(2);
    });
  });
});
```

## Testing Forms

### Formulario con validación

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import LoginForm from './LoginForm';

describe('LoginForm', () => {
  it('validates email format', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    // Email inválido
    await user.type(emailInput, 'invalid-email');
    await user.click(submitButton);

    expect(await screen.findByText(/email inválido/i)).toBeInTheDocument();
  });

  it('requires password', async () => {
    const user = userEvent.setup();
    render(<LoginForm />);

    const emailInput = screen.getByLabelText(/email/i);
    const submitButton = screen.getByRole('button', { name: /iniciar sesión/i });

    await user.type(emailInput, 'test@example.com');
    await user.click(submitButton);

    expect(await screen.findByText(/contraseña requerida/i)).toBeInTheDocument();
  });

  it('submits form with valid data', async () => {
    const onSubmit = vi.fn();
    const user = userEvent.setup();

    render(<LoginForm onSubmit={onSubmit} />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'password123',
      });
    });
  });

  it('shows loading state during submission', async () => {
    const user = userEvent.setup();
    global.fetch = vi.fn(() => new Promise(() => {})); // Never resolves

    render(<LoginForm />);

    await user.type(screen.getByLabelText(/email/i), 'test@example.com');
    await user.type(screen.getByLabelText(/contraseña/i), 'password123');
    await user.click(screen.getByRole('button', { name: /iniciar sesión/i }));

    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByText(/enviando/i)).toBeInTheDocument();
  });
});
```

## Testing Modal Dialogs

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

describe('ConfirmDialog', () => {
  it('renders when open is true', () => {
    render(
      <ConfirmDialog
        open={true}
        title="Confirmar acción"
        message="¿Estás seguro?"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText('Confirmar acción')).toBeInTheDocument();
    expect(screen.getByText('¿Estás seguro?')).toBeInTheDocument();
  });

  it('does not render when open is false', () => {
    const { container } = render(
      <ConfirmDialog
        open={false}
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it('calls onConfirm when confirm button clicked', async () => {
    const onConfirm = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        open={true}
        title="Test"
        message="Test"
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    await user.click(screen.getByRole('button', { name: /confirmar/i }));

    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it('calls onCancel when cancel button clicked', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        open={true}
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    await user.click(screen.getByRole('button', { name: /cancelar/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('closes on backdrop click', async () => {
    const onCancel = vi.fn();
    const user = userEvent.setup();

    render(
      <ConfirmDialog
        open={true}
        title="Test"
        message="Test"
        onConfirm={vi.fn()}
        onCancel={onCancel}
        closeOnBackdrop={true}
      />
    );

    // Click en el backdrop (elemento con role="dialog" padre)
    const backdrop = screen.getByRole('dialog').parentElement;
    if (backdrop) {
      await user.click(backdrop);
      expect(onCancel).toHaveBeenCalled();
    }
  });
});
```

## Testing Custom Hooks

```tsx
import { describe, it, expect } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  it('returns initial value', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'initial')
    );

    expect(result.current[0]).toBe('initial');
  });

  it('updates localStorage when value changes', () => {
    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'initial')
    );

    const [, setValue] = result.current;
    setValue('updated');

    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('updated'));
  });

  it('loads value from localStorage on mount', () => {
    localStorage.setItem('test-key', JSON.stringify('stored'));

    const { result } = renderHook(() =>
      useLocalStorage('test-key', 'initial')
    );

    expect(result.current[0]).toBe('stored');
  });

  it('handles complex objects', () => {
    const { result } = renderHook(() =>
      useLocalStorage('user', { name: 'Test', age: 25 })
    );

    const [, setValue] = result.current;
    setValue({ name: 'Updated', age: 30 });

    expect(result.current[0]).toEqual({ name: 'Updated', age: 30 });
  });
});
```

## Testing with Multiple Contexts

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '../test/test-utils';
import UserDashboard from './UserDashboard';

describe('UserDashboard with Contexts', () => {
  it('displays user info in selected language', () => {
    render(<UserDashboard />, {
      authContext: {
        user: {
          id: '1',
          email: 'maria@example.com',
          nombre: 'Maria',
          apellido: 'Garcia',
          region: 'Mixteca',
        },
        isAuthenticated: true,
      },
      languageContext: {
        language: 'zapoteco',
        greeting: 'Padiuxhi',
        t: (key: string) => {
          const translations: Record<string, string> = {
            'profile': 'Laanu',
            'settings': 'Guendaró',
          };
          return translations[key] || key;
        },
      },
    });

    expect(screen.getByText('Padiuxhi')).toBeInTheDocument();
    expect(screen.getByText('Maria Garcia')).toBeInTheDocument();
  });

  it('shows login prompt when not authenticated', () => {
    render(<UserDashboard />, {
      authContext: {
        user: null,
        isAuthenticated: false,
      },
    });

    expect(screen.getByText(/iniciar sesión/i)).toBeInTheDocument();
  });

  it('shows seller dashboard for seller role', () => {
    render(<UserDashboard />, {
      authContext: {
        user: {
          id: '1',
          email: 'seller@example.com',
          nombre: 'Seller',
          role: 'SELLER',
        },
        isAuthenticated: true,
      },
    });

    expect(screen.getByText(/mis productos/i)).toBeInTheDocument();
  });
});
```

## Testing Infinite Scroll

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import InfiniteEventList from './InfiniteEventList';

describe('InfiniteEventList', () => {
  it('loads more items on scroll', async () => {
    const mockEvents = Array.from({ length: 20 }, (_, i) => ({
      id: i + 1,
      name: `Event ${i + 1}`,
    }));

    global.fetch = vi.fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: mockEvents.slice(0, 10) }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ events: mockEvents.slice(10, 20) }),
      });

    const { container } = render(<InfiniteEventList />);

    // Esperar primera carga
    expect(await screen.findByText('Event 1')).toBeInTheDocument();

    // Simular scroll al final
    const scrollableElement = container.querySelector('[data-infinite-scroll]');
    if (scrollableElement) {
      scrollableElement.scrollTop = scrollableElement.scrollHeight;
      scrollableElement.dispatchEvent(new Event('scroll'));
    }

    // Esperar segunda carga
    expect(await screen.findByText('Event 15')).toBeInTheDocument();
  });
});
```

## Testing File Upload

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import userEvent from '@testing-library/user-event';
import ImageUpload from './ImageUpload';

describe('ImageUpload', () => {
  it('accepts and previews image file', async () => {
    const user = userEvent.setup();
    const onUpload = vi.fn();

    render(<ImageUpload onUpload={onUpload} />);

    const file = new File(['image'], 'test.png', { type: 'image/png' });
    const input = screen.getByLabelText(/subir imagen/i);

    await user.upload(input, file);

    await waitFor(() => {
      expect(screen.getByAltText(/preview/i)).toBeInTheDocument();
    });
  });

  it('rejects invalid file types', async () => {
    const user = userEvent.setup();

    render(<ImageUpload accept="image/*" />);

    const file = new File(['text'], 'test.txt', { type: 'text/plain' });
    const input = screen.getByLabelText(/subir imagen/i);

    await user.upload(input, file);

    expect(await screen.findByText(/tipo de archivo no válido/i)).toBeInTheDocument();
  });

  it('enforces file size limit', async () => {
    const user = userEvent.setup();

    render(<ImageUpload maxSize={1024} />); // 1KB limit

    const largeFile = new File(['x'.repeat(2000)], 'large.png', {
      type: 'image/png',
    });
    const input = screen.getByLabelText(/subir imagen/i);

    await user.upload(input, largeFile);

    expect(await screen.findByText(/archivo muy grande/i)).toBeInTheDocument();
  });
});
```

## Testing WebSocket Connections

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import ChatRoom from './ChatRoom';

describe('ChatRoom with WebSocket', () => {
  let mockWebSocket: any;

  beforeEach(() => {
    // Mock WebSocket
    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    };

    global.WebSocket = vi.fn(() => mockWebSocket) as any;
  });

  it('connects to WebSocket on mount', () => {
    render(<ChatRoom roomId="test-room" />);

    expect(global.WebSocket).toHaveBeenCalledWith(
      expect.stringContaining('test-room')
    );
  });

  it('displays incoming messages', async () => {
    render(<ChatRoom roomId="test-room" />);

    // Simular mensaje entrante
    const messageHandler = mockWebSocket.addEventListener.mock.calls.find(
      (call: any[]) => call[0] === 'message'
    )?.[1];

    messageHandler?.({
      data: JSON.stringify({
        user: 'TestUser',
        message: 'Hello from WebSocket!',
      }),
    });

    expect(await screen.findByText('Hello from WebSocket!')).toBeInTheDocument();
  });

  it('sends messages through WebSocket', async () => {
    const user = userEvent.setup();
    render(<ChatRoom roomId="test-room" />);

    const input = screen.getByPlaceholderText(/escribe un mensaje/i);
    const sendButton = screen.getByRole('button', { name: /enviar/i });

    await user.type(input, 'Test message');
    await user.click(sendButton);

    expect(mockWebSocket.send).toHaveBeenCalledWith(
      expect.stringContaining('Test message')
    );
  });

  it('closes connection on unmount', () => {
    const { unmount } = render(<ChatRoom roomId="test-room" />);

    unmount();

    expect(mockWebSocket.close).toHaveBeenCalled();
  });
});
```

## Testing Geolocation

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '../test/test-utils';
import LocationPicker from './LocationPicker';

describe('LocationPicker', () => {
  beforeEach(() => {
    // Mock geolocation API
    global.navigator.geolocation = {
      getCurrentPosition: vi.fn(),
      watchPosition: vi.fn(),
      clearWatch: vi.fn(),
    };
  });

  it('gets current location on button click', async () => {
    const mockPosition = {
      coords: {
        latitude: 17.0732,
        longitude: -96.7266,
      },
    };

    (global.navigator.geolocation.getCurrentPosition as any).mockImplementation(
      (success: any) => success(mockPosition)
    );

    const user = userEvent.setup();
    render(<LocationPicker />);

    await user.click(screen.getByRole('button', { name: /mi ubicación/i }));

    await waitFor(() => {
      expect(screen.getByText(/17.0732/)).toBeInTheDocument();
      expect(screen.getByText(/-96.7266/)).toBeInTheDocument();
    });
  });

  it('handles geolocation error', async () => {
    (global.navigator.geolocation.getCurrentPosition as any).mockImplementation(
      (_: any, error: any) => error({ message: 'Permission denied' })
    );

    const user = userEvent.setup();
    render(<LocationPicker />);

    await user.click(screen.getByRole('button', { name: /mi ubicación/i }));

    expect(await screen.findByText(/error de ubicación/i)).toBeInTheDocument();
  });
});
```

## Performance Testing

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '../test/test-utils';
import LargeList from './LargeList';

describe('LargeList Performance', () => {
  it('renders large list efficiently', () => {
    const items = Array.from({ length: 1000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));

    const startTime = performance.now();

    render(<LargeList items={items} />);

    const renderTime = performance.now() - startTime;

    // Debe renderizar en menos de 500ms
    expect(renderTime).toBeLessThan(500);
  });

  it('virtualizes long lists', () => {
    const items = Array.from({ length: 10000 }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));

    const { container } = render(<LargeList items={items} virtualized />);

    // Solo debe renderizar elementos visibles
    const renderedItems = container.querySelectorAll('[data-list-item]');
    expect(renderedItems.length).toBeLessThan(100);
  });
});
```

## Snapshot Testing

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '../test/test-utils';
import EventCard from './EventCard';

describe('EventCard Snapshots', () => {
  it('matches snapshot for regular event', () => {
    const event = {
      id: '1',
      name: 'Guelaguetza 2026',
      date: '2026-07-20',
      location: 'Auditorio Guelaguetza',
      image: '/images/event.jpg',
    };

    const { container } = render(<EventCard event={event} />);

    expect(container.firstChild).toMatchSnapshot();
  });

  it('matches snapshot for featured event', () => {
    const event = {
      id: '1',
      name: 'Guelaguetza 2026',
      date: '2026-07-20',
      location: 'Auditorio Guelaguetza',
      image: '/images/event.jpg',
      featured: true,
    };

    const { container } = render(<EventCard event={event} featured />);

    expect(container.firstChild).toMatchSnapshot();
  });
});
```

## Tips Finales

1. **Organiza tests por funcionalidad**: Agrupa tests relacionados en `describe` blocks
2. **Usa `beforeEach` para setup común**: Evita duplicación de código
3. **Mock solo lo necesario**: No mockees todo, prueba comportamiento real cuando sea posible
4. **Nombres descriptivos**: Los nombres de tests deben explicar qué hacen
5. **Un assert principal por test**: Facilita identificar qué falló
6. **Evita timeouts**: Usa `findBy*` queries en lugar de esperas manuales
7. **Cleanup automático**: Ya está configurado en `test/setup.ts`
