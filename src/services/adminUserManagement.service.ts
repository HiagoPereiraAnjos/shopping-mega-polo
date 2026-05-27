import { toAdminRole, type AdminRole } from '../lib/permissions';
import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type { CmsServiceResult } from '../types/cms';

export interface AdminAuthDirectoryEntry {
  user_id: string;
  email: string | null;
  last_sign_in_at: string | null;
  invited_at: string | null;
  created_at: string | null;
}

interface AdminDirectoryResponse {
  users?: unknown;
}

interface AdminInviteResponse {
  user?: unknown;
}

interface AdminInvitePayload {
  email: string;
  name: string;
  role: AdminRole;
}

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function mapEdgeFunctionError(message: string): string {
  const normalized = message.toLowerCase();

  if (
    normalized.includes('404')
    || normalized.includes('not found')
    || normalized.includes('function not found')
  ) {
    return 'Edge Function de usuarios administrativos nao encontrada. Implante admin-users-directory/admin-invite-user no Supabase.';
  }

  if (normalized.includes('row-level security')) {
    return 'Sua conta nao possui permissao para consultar dados sensiveis de usuarios.';
  }

  if (normalized.includes('jwt') || normalized.includes('permission')) {
    return 'Acesso negado ao endpoint administrativo de usuarios.';
  }

  return message;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeDate(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString();
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  return trimmed.toLowerCase();
}

function parseDirectoryUser(value: unknown): AdminAuthDirectoryEntry | null {
  if (!isRecord(value)) {
    return null;
  }

  const userId = typeof value.user_id === 'string' && value.user_id.trim()
    ? value.user_id.trim()
    : null;

  if (!userId) {
    return null;
  }

  return {
    user_id: userId,
    email: normalizeEmail(value.email),
    last_sign_in_at: normalizeDate(value.last_sign_in_at),
    invited_at: normalizeDate(value.invited_at),
    created_at: normalizeDate(value.created_at),
  };
}

function parseDirectoryResponse(data: unknown): AdminAuthDirectoryEntry[] {
  if (!isRecord(data)) {
    return [];
  }

  const payload = data as AdminDirectoryResponse;
  if (!Array.isArray(payload.users)) {
    return [];
  }

  return payload.users
    .map((entry) => parseDirectoryUser(entry))
    .filter((entry): entry is AdminAuthDirectoryEntry => !!entry);
}

function parseInviteResponse(data: unknown): AdminAuthDirectoryEntry | null {
  if (!isRecord(data)) {
    return null;
  }

  const payload = data as AdminInviteResponse;
  if (!payload.user) {
    return null;
  }

  return parseDirectoryUser(payload.user);
}

export async function listAdminAuthDirectory(): Promise<CmsServiceResult<AdminAuthDirectoryEntry[]>> {
  if (!supabase) {
    return missingConfigResult<AdminAuthDirectoryEntry[]>();
  }

  const { data, error } = await supabase.functions.invoke('admin-users-directory', {
    body: {},
  });

  if (error) {
    return { data: null, error: mapEdgeFunctionError(error.message) };
  }

  return { data: parseDirectoryResponse(data), error: null };
}

export async function inviteAdminUser(
  payload: AdminInvitePayload,
): Promise<CmsServiceResult<AdminAuthDirectoryEntry>> {
  if (!supabase) {
    return missingConfigResult<AdminAuthDirectoryEntry>();
  }

  const email = payload.email.trim().toLowerCase();
  const name = payload.name.trim();
  const role = toAdminRole(payload.role);

  if (!email) {
    return { data: null, error: 'E-mail e obrigatorio para enviar convite.' };
  }

  if (!name) {
    return { data: null, error: 'Nome e obrigatorio para enviar convite.' };
  }

  if (!role) {
    return { data: null, error: 'Papel invalido para convite.' };
  }

  const { data, error } = await supabase.functions.invoke('admin-invite-user', {
    body: {
      email,
      name,
      role,
    },
  });

  if (error) {
    return { data: null, error: mapEdgeFunctionError(error.message) };
  }

  const parsed = parseInviteResponse(data);
  if (!parsed) {
    return { data: null, error: 'Resposta invalida da Edge Function de convite.' };
  }

  return { data: parsed, error: null };
}
