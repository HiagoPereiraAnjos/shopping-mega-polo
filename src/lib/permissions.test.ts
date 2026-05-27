import { describe, expect, it } from 'vitest';
import type { AdminProfile } from '../types/cms';
import {
  CONTENT_EDITOR_ROLES,
  canEditContent,
  canEditSettings,
  canManageLogs,
  canManageLeads,
  canManageNewsletter,
  canManageUsers,
  canViewAdmin,
  canViewLeads,
  getRoleLabel,
  hasRole,
} from './permissions';

function makeProfile(role: string, isActive = true): AdminProfile {
  return {
    id: 'profile-1',
    user_id: 'user-1',
    name: 'Admin Teste',
    role,
    avatar_url: null,
    is_active: isActive,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
  };
}

describe('permissions helpers', () => {
  it('hasRole respeita papel e status ativo', () => {
    expect(hasRole(makeProfile('admin'), CONTENT_EDITOR_ROLES)).toBe(true);
    expect(hasRole(makeProfile('viewer'), CONTENT_EDITOR_ROLES)).toBe(false);
    expect(hasRole(makeProfile('admin', false), CONTENT_EDITOR_ROLES)).toBe(false);
  });

  it('permite capacidade por papel', () => {
    expect(canManageUsers(makeProfile('super_admin'))).toBe(true);
    expect(canEditSettings(makeProfile('admin'))).toBe(true);
    expect(canEditContent(makeProfile('editor'))).toBe(true);
    expect(canViewAdmin(makeProfile('viewer'))).toBe(true);
    expect(canViewLeads(makeProfile('viewer'))).toBe(false);
    expect(canManageLeads(makeProfile('viewer'))).toBe(false);
    expect(canManageNewsletter(makeProfile('editor'))).toBe(false);
    expect(canManageLogs(makeProfile('admin'))).toBe(true);
  });

  it('retorna label legivel de papel', () => {
    expect(getRoleLabel('super_admin')).toBe('Super Admin');
    expect(getRoleLabel('papel-invalido')).toBe('Sem papel');
  });
});
