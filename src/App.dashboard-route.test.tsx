import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AdminProfile } from './types/cms';
import { DashboardAliasRedirect } from './App';
import ProtectedRoute from './components/auth/ProtectedRoute';

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
  profile: AdminProfile | null;
}

let authState: AuthState = {
  isLoading: false,
  isAuthenticated: false,
  profile: null,
};

vi.mock('./hooks/useAuth', () => ({
  useAuth: () => ({
    ...authState,
    user: null,
    session: null,
    signIn: vi.fn(),
    signOut: vi.fn().mockResolvedValue({ error: null }),
    resetPassword: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

function renderDashboardAliasRoute() {
  return render(
    <MemoryRouter initialEntries={['/dashboard']}>
      <Routes>
        <Route
          path="/dashboard"
          element={(
            <ProtectedRoute>
              <DashboardAliasRedirect />
            </ProtectedRoute>
          )}
        />
        <Route path="/admin" element={<div>Painel Admin</div>} />
        <Route path="/login" element={<div>Tela de Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('dashboard alias route', () => {
  it('redireciona para login quando nao autenticado', () => {
    authState = {
      isLoading: false,
      isAuthenticated: false,
      profile: null,
    };

    renderDashboardAliasRoute();
    expect(screen.getByText('Tela de Login')).toBeInTheDocument();
  });

  it('redireciona para /admin quando autenticado', () => {
    authState = {
      isLoading: false,
      isAuthenticated: true,
      profile: {
        id: 'profile-1',
        user_id: 'user-1',
        name: 'Admin',
        role: 'admin',
        avatar_url: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    };

    renderDashboardAliasRoute();
    expect(screen.getByText('Painel Admin')).toBeInTheDocument();
  });
});
