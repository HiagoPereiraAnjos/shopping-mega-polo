import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type { ActivityLog, CmsServiceResult } from '../types/cms';
import type { Json } from '../types/database';

export interface CreateActivityLogPayload {
  user_id?: string | null;
  action: string;
  entity: string;
  entity_id?: string | null;
  metadata?: Json;
}

export interface ActivityLogListFilters {
  userId?: string;
  action?: string;
  entity?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

export interface ActivityLogWithUser extends ActivityLog {
  admin_name: string | null;
  admin_role: string | null;
}

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function mapErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('row-level security')) {
    return 'Sua conta nao possui permissao para acessar logs de atividade.';
  }

  return message;
}

function normalizeDateBoundary(value: string, boundary: 'start' | 'end'): string | null {
  if (!value.trim()) {
    return null;
  }

  const suffix = boundary === 'start' ? 'T00:00:00.000Z' : 'T23:59:59.999Z';
  const parsed = new Date(`${value}${suffix}`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

async function resolveCurrentUserId(): Promise<string | null> {
  if (!supabase) {
    return null;
  }

  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

async function enrichLogsWithAdminProfile(
  rows: ActivityLog[],
): Promise<ActivityLogWithUser[]> {
  if (!supabase || !rows.length) {
    return rows.map((row) => ({
      ...row,
      admin_name: null,
      admin_role: null,
    }));
  }

  const userIds = Array.from(
    new Set(rows.map((row) => row.user_id).filter((value): value is string => !!value)),
  );

  if (!userIds.length) {
    return rows.map((row) => ({
      ...row,
      admin_name: null,
      admin_role: null,
    }));
  }

  const { data: profiles, error } = await supabase
    .from('admin_profiles')
    .select('user_id,name,role')
    .in('user_id', userIds);

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('Falha ao carregar perfis para enriquecer logs:', error.message);
    }

    return rows.map((row) => ({
      ...row,
      admin_name: null,
      admin_role: null,
    }));
  }

  const profileMap = new Map(
    (profiles ?? []).map((profile) => [
      profile.user_id,
      { name: profile.name ?? null, role: profile.role ?? null },
    ]),
  );

  return rows.map((row) => {
    const profile = row.user_id ? profileMap.get(row.user_id) : null;
    return {
      ...row,
      admin_name: profile?.name ?? null,
      admin_role: profile?.role ?? null,
    };
  });
}

export async function createActivityLog(
  payload: CreateActivityLogPayload,
): Promise<CmsServiceResult<ActivityLog>> {
  if (!supabase) {
    return missingConfigResult<ActivityLog>();
  }

  const action = payload.action?.trim();
  const entity = payload.entity?.trim();

  if (!action) {
    return { data: null, error: 'A acao do log e obrigatoria.' };
  }

  if (!entity) {
    return { data: null, error: 'A entidade do log e obrigatoria.' };
  }

  const resolvedUserId = payload.user_id !== undefined
    ? payload.user_id
    : await resolveCurrentUserId();

  const { data, error } = await supabase
    .from('activity_logs')
    .insert({
      user_id: resolvedUserId ?? null,
      action,
      entity,
      entity_id: payload.entity_id ?? null,
      metadata: payload.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  return { data, error: null };
}

export async function listActivityLogs(
  filters: ActivityLogListFilters = {},
): Promise<CmsServiceResult<ActivityLogWithUser[]>> {
  if (!supabase) {
    return missingConfigResult<ActivityLogWithUser[]>();
  }

  let query = supabase
    .from('activity_logs')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters.userId?.trim()) {
    query = query.eq('user_id', filters.userId.trim());
  }

  if (filters.action?.trim()) {
    query = query.eq('action', filters.action.trim());
  }

  if (filters.entity?.trim()) {
    query = query.eq('entity', filters.entity.trim());
  }

  const normalizedDateFrom = filters.dateFrom
    ? normalizeDateBoundary(filters.dateFrom, 'start')
    : null;
  const normalizedDateTo = filters.dateTo
    ? normalizeDateBoundary(filters.dateTo, 'end')
    : null;

  if (normalizedDateFrom) {
    query = query.gte('created_at', normalizedDateFrom);
  }

  if (normalizedDateTo) {
    query = query.lte('created_at', normalizedDateTo);
  }

  if (filters.limit && filters.limit > 0) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  const rows = data ?? [];
  const enriched = await enrichLogsWithAdminProfile(rows);
  return { data: enriched, error: null };
}

export async function getActivityLogById(
  id: string,
): Promise<CmsServiceResult<ActivityLogWithUser>> {
  if (!supabase) {
    return missingConfigResult<ActivityLogWithUser>();
  }

  const logId = id.trim();
  if (!logId) {
    return { data: null, error: 'ID do log e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('activity_logs')
    .select('*')
    .eq('id', logId)
    .maybeSingle();

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  if (!data) {
    return { data: null, error: 'Log de atividade nao encontrado.' };
  }

  const enriched = await enrichLogsWithAdminProfile([data]);
  return { data: enriched[0] ?? null, error: null };
}
