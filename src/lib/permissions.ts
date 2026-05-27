import type { AdminProfile } from '../types/cms';

export type AdminRole = 'super_admin' | 'admin' | 'editor' | 'viewer';

export const CMS_ROLES: AdminRole[] = ['super_admin', 'admin', 'editor', 'viewer'];
export const CONTENT_EDITOR_ROLES: AdminRole[] = ['super_admin', 'admin', 'editor'];
export const SETTINGS_EDITOR_ROLES: AdminRole[] = ['super_admin', 'admin'];
export const USER_MANAGER_ROLES: AdminRole[] = ['super_admin'];
export const LEADS_MANAGER_ROLES: AdminRole[] = ['super_admin', 'admin'];
export const LEADS_VIEWER_ROLES: AdminRole[] = LEADS_MANAGER_ROLES;
export const LOG_MANAGER_ROLES: AdminRole[] = ['super_admin', 'admin'];
export const NEWSLETTER_MANAGER_ROLES: AdminRole[] = ['super_admin', 'admin'];

const ROLE_LABELS: Record<AdminRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  editor: 'Editor',
  viewer: 'Viewer',
};

function normalizeRole(value: string | null | undefined): AdminRole | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'super_admin' || normalized === 'admin' || normalized === 'editor' || normalized === 'viewer') {
    return normalized;
  }

  return null;
}

export function toAdminRole(value: string | null | undefined): AdminRole | null {
  return normalizeRole(value);
}

export function getRoleLabel(value: string | null | undefined): string {
  const role = normalizeRole(value);
  if (!role) {
    return 'Sem papel';
  }
  return ROLE_LABELS[role];
}

export function hasRole(
  profile: AdminProfile | null | undefined,
  roles: readonly AdminRole[],
): boolean {
  if (!profile || !profile.is_active) {
    return false;
  }

  const role = normalizeRole(profile.role);
  if (!role) {
    return false;
  }

  return roles.includes(role);
}

export function canManageUsers(profile: AdminProfile | null | undefined): boolean {
  return hasRole(profile, USER_MANAGER_ROLES);
}

export function canEditSettings(profile: AdminProfile | null | undefined): boolean {
  return hasRole(profile, SETTINGS_EDITOR_ROLES);
}

export function canEditContent(profile: AdminProfile | null | undefined): boolean {
  return hasRole(profile, CONTENT_EDITOR_ROLES);
}

export function canViewAdmin(profile: AdminProfile | null | undefined): boolean {
  return hasRole(profile, CMS_ROLES);
}

export function canViewLeads(profile: AdminProfile | null | undefined): boolean {
  return hasRole(profile, LEADS_VIEWER_ROLES);
}

export function canManageLeads(profile: AdminProfile | null | undefined): boolean {
  return hasRole(profile, LEADS_MANAGER_ROLES);
}

export function canManageLogs(profile: AdminProfile | null | undefined): boolean {
  return hasRole(profile, LOG_MANAGER_ROLES);
}

export function canManageNewsletter(profile: AdminProfile | null | undefined): boolean {
  return hasRole(profile, NEWSLETTER_MANAGER_ROLES);
}
