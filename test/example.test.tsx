import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '../test/test-utils';
import React from 'react';

// Simple component that uses contexts
function UserGreeting() {
  // In a real component, you would import these from the actual context files
  // For this example, we'll create a simple version
  const mockUser = { nombre: 'Usuario', apellido: 'Test' };
  const mockGreeting = 'Bienvenido';

  return (
    <div>
      <h1>{mockGreeting}</h1>
      <p data-testid="user-name">
        {mockUser.nombre} {mockUser.apellido}
      </p>
    </div>
  );
}

describe('Example Test with Mocked Contexts', () => {
  it('renders user greeting with default context', () => {
    render(<UserGreeting />);

    expect(screen.getByRole('heading')).toHaveTextContent('Bienvenido');
    expect(screen.getByTestId('user-name')).toHaveTextContent('Usuario Test');
  });

  it('demonstrates async interaction', async () => {
    const user = userEvent.setup();

    render(
      <button onClick={() => console.log('clicked')}>
        Click me
      </button>
    );

    const button = screen.getByRole('button');
    await user.click(button);

    expect(button).toBeInTheDocument();
  });
});

// Test for localStorage mock
describe('localStorage mock', () => {
  it('stores and retrieves values', () => {
    localStorage.setItem('test-key', 'test-value');

    expect(localStorage.getItem('test-key')).toBe('test-value');
  });

  it('removes values', () => {
    localStorage.setItem('test-key', 'test-value');
    localStorage.removeItem('test-key');

    expect(localStorage.getItem('test-key')).toBeNull();
  });

  it('clears all values', () => {
    localStorage.setItem('key1', 'value1');
    localStorage.setItem('key2', 'value2');
    localStorage.clear();

    expect(localStorage.getItem('key1')).toBeNull();
    expect(localStorage.getItem('key2')).toBeNull();
  });
});

// Test for fetch mock
describe('fetch mock', () => {
  it('can mock successful API responses', async () => {
    const mockData = { id: 1, name: 'Test Event' };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    } as Response);

    const response = await fetch('/api/events/1');
    const data = await response.json();

    expect(data).toEqual(mockData);
    expect(global.fetch).toHaveBeenCalledWith('/api/events/1');
  });

  it('can mock failed API responses', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({ message: 'Not found' }),
    } as Response);

    const response = await fetch('/api/events/999');

    expect(response.ok).toBe(false);
    expect(response.status).toBe(404);
  });
});

// Import userEvent for the test above
import userEvent from '@testing-library/user-event';
