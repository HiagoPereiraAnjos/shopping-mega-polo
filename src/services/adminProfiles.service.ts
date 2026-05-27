import { supabase, supabaseConfigMessage } from '../lib/supabase';
import { logActivity } from '../lib/logActivity';
import {
  hasRole,
  type AdminRole,
  toAdminRole,
} from '../lib/permissions';
import type { AdminProfile, CmsServiceResult } from '../types/cms';
import type { TableUpdate } from '../types/database';

type AdminProfileUpdate = TableUpdate<'admin_profiles'>;
type AdminProfileLogAction =
  | 'update_user_role'
  | 'update_admin_profile'
  | 'disable_admin_user';

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function normalizeText(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }
  return value.trim();
}

function normalizeRole(value?: string | null): AdminRole | null {
  return toAdminRole(value);
}

function mapErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('row-level security')) {
    return 'Sua conta nao possui permissao para gerenciar usuarios administrativos.';
  }

  if (normalized.includes('ultimo super_admin') || normalized.includes('último super_admin')) {
    return 'Nao e permitido remover, desativar ou rebaixar o ultimo super_admin ativo.';
  }

  if (normalized.includes('permission denied')) {
    return 'Permissao negada para atualizar este usuario administrativo.';
  }

  return message;
}

async function logAdminProfileAction(
  action: AdminProfileLogAction,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await logActivity({
    action,
    entity: 'admin_profiles',
    entity_id: entityId,
    metadata,
  });
}

function validateUpdatePayload(
  payload: Partial<Pick<AdminProfile, 'name' | 'role' | 'is_active'>>,
): { payload: AdminProfileUpdate | null; error: string | null } {
  const sanitized: AdminProfileUpdate = {};

  if (payload.name !== undefined) {
    const name = normalizeText(payload.name);
    if (!name) {
      return { payload: null, error: 'Nome do usuario admin e obrigatorio.' };
    }
    sanitized.name = name;
  }

  if (payload.role !== undefined) {
    const role = normalizeRole(payload.role);
    if (!role) {
      return { payload: null, error: 'Role invalida. Use super_admin, admin, editor ou viewer.' };
    }
    sanitized.role = role;
  }

  if (payload.is_active !== undefined) {
    sanitized.is_active = payload.is_active;
  }

  if (!Object.keys(sanitized).length) {
    return { payload: null, error: 'Nenhum campo foi informado para atualizacao.' };
  }

  return { payload: sanitized, error: null };
}

function canChangeTargetProfile(
  actor: AdminProfile | null,
  target: AdminProfile,
  nextRole?: string | null,
  nextIsActive?: boolean,
): string | null {
  if (!actor || !actor.is_active) {
    return 'Perfil administrativo atual nao encontrado ou inativo.';
  }

  const actorIsSuper = hasRole(actor, ['super_admin']);
  if (actorIsSuper) {
    return null;
  }

  if (target.role === 'super_admin') {
    return 'Apenas super_admin pode alterar outro super_admin.';
  }

  if (nextRole && nextRole !== target.role) {
    return 'Apenas super_admin pode alterar papeis administrativos.';
  }

  if (nextIsActive === false) {
    return 'Apenas super_admin pode desativar usuarios administrativos.';
  }

  return null;
}

export async function listAdminProfiles(): Promise<CmsServiceResult<AdminProfile[]>> {
  if (!supabase) {
    return missingConfigResult<AdminProfile[]>();
  }

  const { data, error } = await supabase
    .from('admin_profiles')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  return { data: data ?? [], error: null };
}

export async function updateAdminProfile(
  id: string,
  payload: Partial<Pick<AdminProfile, 'name' | 'role' | 'is_active'>>,
  actorProfile: AdminProfile | null,
): Promise<CmsServiceResult<AdminProfile>> {
  if (!supabase) {
    return missingConfigResult<AdminProfile>();
  }

  const adminProfileId = id.trim();
  if (!adminProfileId) {
    return { data: null, error: 'ID do perfil administrativo e obrigatorio.' };
  }

  const validated = validateUpdatePayload(payload);
  if (validated.error || !validated.payload) {
    return { data: null, error: validated.error ?? 'Dados invalidos para atualizacao.' };
  }

  const { data: target, error: targetError } = await supabase
    .from('admin_profiles')
    .select('*')
    .eq('id', adminProfileId)
    .maybeSingle();

  if (targetError) {
    return { data: null, error: mapErrorMessage(targetError.message) };
  }

  if (!target) {
    return { data: null, error: 'Perfil administrativo nao encontrado.' };
  }

  const permissionError = canChangeTargetProfile(
    actorProfile,
    target,
    validated.payload.role as string | null | undefined,
    validated.payload.is_active,
  );

  if (permissionError) {
    return { data: null, error: permissionError };
  }

  const { data: updated, error: updateError } = await supabase
    .from('admin_profiles')
    .update(validated.payload)
    .eq('id', adminProfileId)
    .select('*')
    .single();

  if (updateError) {
    return { data: null, error: mapErrorMessage(updateError.message) };
  }

  if (validated.payload.role !== undefined && validated.payload.role !== target.role) {
    await logAdminProfileAction('update_user_role', updated.id, {
      admin_profile_id: updated.id,
      user_id: updated.user_id,
      previous_role: target.role,
      new_role: updated.role,
    });
  }

  if (validated.payload.is_active === false && target.is_active) {
    await logAdminProfileAction('disable_admin_user', updated.id, {
      admin_profile_id: updated.id,
      user_id: updated.user_id,
      previous_status: target.is_active,
      new_status: updated.is_active,
    });
  }

  const touchedFields = Object.keys(validated.payload).filter((field) => {
    if (field === 'role' && validated.payload.role !== target.role) {
      return false;
    }
    if (field === 'is_active' && validated.payload.is_active === false && target.is_active) {
      return false;
    }
    return true;
  });

  if (touchedFields.length) {
    await logAdminProfileAction('update_admin_profile', updated.id, {
      admin_profile_id: updated.id,
      user_id: updated.user_id,
      updated_fields: touchedFields,
    });
  }

  return { data: updated, error: null };
}
