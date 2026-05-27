import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';
import type { AdminProfile } from '../../types/cms';
import ProtectedRoute from './ProtectedRoute';
import type { AdminRole } from '../../lib/permissions';

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

vi.mock('../../hooks/useAuth', () => ({
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

function renderWithRoutes() {
  return render(
    <MemoryRouter initialEntries={['/admin']}>
      <Routes>
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <div>Conteudo Admin</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Tela de Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderWithCustomRoles(allowedRoles: readonly AdminRole[]) {
  return render(
    <MemoryRouter initialEntries={['/admin-users']}>
      <Routes>
        <Route
          path="/admin-users"
          element={
            <ProtectedRoute allowedRoles={allowedRoles}>
              <div>Conteudo Usuarios</div>
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<div>Tela de Login</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ProtectedRoute', () => {
  it('bloqueia usuario nao autenticado e redireciona para login', () => {
    authState = {
      isLoading: false,
      isAuthenticated: false,
      profile: null,
    };

    renderWithRoutes();
    expect(screen.getByText('Tela de Login')).toBeInTheDocument();
  });

  it('renderiza conteudo quando autenticado e autorizado', () => {
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

    renderWithRoutes();
    expect(screen.getByText('Conteudo Admin')).toBeInTheDocument();
  });

  it('bloqueia usuario autenticado sem permissao de role na rota', () => {
    authState = {
      isLoading: false,
      isAuthenticated: true,
      profile: {
        id: 'profile-2',
        user_id: 'user-2',
        name: 'Editor',
        role: 'editor',
        avatar_url: null,
        is_active: true,
        created_at: '2026-01-01T00:00:00.000Z',
        updated_at: '2026-01-01T00:00:00.000Z',
      },
    };

    renderWithCustomRoles(['super_admin']);

    expect(screen.queryByText('Conteudo Usuarios')).not.toBeInTheDocument();
    expect(screen.getByText(/acesso administrativo negado/i)).toBeInTheDocument();
  });
});
