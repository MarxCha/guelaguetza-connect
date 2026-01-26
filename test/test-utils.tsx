import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// Mock user types
type UserRole = 'USER' | 'MODERATOR' | 'ADMIN' | 'HOST' | 'SELLER';

interface MockUser {
  id: string;
  email: string;
  nombre: string;
  apellido?: string;
  avatar?: string;
  region?: string;
  role?: UserRole;
}

// Default mock user
export const mockUser: MockUser = {
  id: 'test-user-1',
  email: 'test@guelaguetza.mx',
  nombre: 'Usuario',
  apellido: 'Test',
  region: 'Valles Centrales',
  role: 'USER',
};

// Mock AuthContext
export const mockAuthContext = {
  user: mockUser,
  token: 'mock-token-123',
  isLoading: false,
  isAuthenticated: true,
  isDemoMode: false,
  login: vi.fn().mockResolvedValue(true),
  loginWithFace: vi.fn().mockResolvedValue(true),
  loginAsDemo: vi.fn().mockResolvedValue(true),
  register: vi.fn().mockResolvedValue(true),
  logout: vi.fn(),
  updateProfile: vi.fn().mockResolvedValue(true),
};

// Mock LanguageContext
export const mockLanguageContext = {
  language: 'es' as const,
  setLanguage: vi.fn(),
  t: (key: string) => key,
  greeting: 'Bienvenido',
  languageLabel: 'Espanol',
};

// Create mock contexts
const AuthContext = React.createContext(mockAuthContext);
const LanguageContext = React.createContext(mockLanguageContext);

// Mock useAuth hook
export const useAuth = () => React.useContext(AuthContext);

// Mock useLanguage hook
export const useLanguage = () => React.useContext(LanguageContext);

// Custom render function with providers
interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  authContext?: Partial<typeof mockAuthContext>;
  languageContext?: Partial<typeof mockLanguageContext>;
}

export function renderWithProviders(
  ui: ReactElement,
  {
    authContext = {},
    languageContext = {},
    ...renderOptions
  }: CustomRenderOptions = {}
) {
  const mergedAuthContext = { ...mockAuthContext, ...authContext };
  const mergedLanguageContext = { ...mockLanguageContext, ...languageContext };

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <AuthContext.Provider value={mergedAuthContext}>
        <LanguageContext.Provider value={mergedLanguageContext}>
          {children}
        </LanguageContext.Provider>
      </AuthContext.Provider>
    );
  }

  return render(ui, { wrapper: Wrapper, ...renderOptions });
}

// Re-export everything from @testing-library/react
export * from '@testing-library/react';

// Override render with our custom render
export { renderWithProviders as render };

// Helper to create mock fetch responses
export const mockFetchResponse = (data: any, ok = true, status = 200) => {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => data,
    text: async () => JSON.stringify(data),
    headers: new Headers(),
  });
};

// Helper to wait for async updates
export const waitForAsync = () => new Promise((resolve) => setTimeout(resolve, 0));

// Helper to mock successful API calls
export const mockSuccessfulFetch = (responseData: any) => {
  (global.fetch as any) = mockFetchResponse(responseData, true, 200);
};

// Helper to mock failed API calls
export const mockFailedFetch = (errorMessage: string, status = 500) => {
  (global.fetch as any) = mockFetchResponse(
    { message: errorMessage },
    false,
    status
  );
};
