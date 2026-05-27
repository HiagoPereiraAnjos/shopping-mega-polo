import { logActivity } from '../lib/logActivity';
import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type {
  CmsServiceResult,
  NavigationItem,
  NavigationItemInsert,
  NavigationItemUpdate,
} from '../types/cms';

export const NAVIGATION_LOCATIONS = [
  'main_nav',
  'mobile_nav',
  'header_cta',
  'header_secondary',
  'account_area',
] as const;

export type NavigationLocation = (typeof NAVIGATION_LOCATIONS)[number];

export interface ReorderNavigationItemPayload {
  id: string;
  sort_order: number;
}

type NavigationLogAction =
  | 'create_navigation_item'
  | 'update_navigation_item'
  | 'delete_navigation_item'
  | 'reorder_navigation_items';

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeRequiredText(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeLocation(value: string | null | undefined): NavigationLocation | null {
  const normalized = normalizeRequiredText(value).toLowerCase();
  if (!normalized) {
    return null;
  }

  if (NAVIGATION_LOCATIONS.includes(normalized as NavigationLocation)) {
    return normalized as NavigationLocation;
  }

  return null;
}

function normalizeSortOrder(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  return Number(value);
}

function mapErrorMessage(message: string): string {
  const normalized = message.toLowerCase();
  if (normalized.includes('row-level security')) {
    return 'Sua conta nao possui permissao para esta operacao de menu.';
  }

  if (normalized.includes('navigation_items_location_check')) {
    return 'Localizacao invalida para item de menu.';
  }

  return message;
}

async function logNavigationAction(
  action: NavigationLogAction,
  metadata: Record<string, unknown>,
  entityId?: string | null,
): Promise<void> {
  await logActivity({
    action,
    entity: 'navigation_items',
    entity_id: entityId ?? null,
    metadata,
  });
}

function sanitizeNavigationInsertPayload(
  payload: NavigationItemInsert,
): NavigationItemInsert | { error: string } {
  const label = normalizeRequiredText(payload.label);
  const url = normalizeRequiredText(payload.url);
  const location = normalizeLocation(payload.location);
  const sortOrder = normalizeSortOrder(payload.sort_order);

  if (!label) {
    return { error: 'label e obrigatorio.' };
  }

  if (!url) {
    return { error: 'url e obrigatorio.' };
  }

  if (!location) {
    return { error: 'location invalida.' };
  }

  if (Number.isNaN(sortOrder)) {
    return { error: 'sort_order deve ser numerico.' };
  }

  return {
    label,
    url,
    location,
    icon: normalizeNullableText(payload.icon),
    style: normalizeNullableText(payload.style),
    sort_order: sortOrder ?? 0,
    is_active: payload.is_active ?? true,
    open_in_new_tab: payload.open_in_new_tab ?? false,
    requires_auth: payload.requires_auth ?? false,
  };
}

function sanitizeNavigationUpdatePayload(
  payload: NavigationItemUpdate,
): NavigationItemUpdate | { error: string } {
  const sanitized: NavigationItemUpdate = {};

  if (payload.label !== undefined) {
    const label = normalizeRequiredText(payload.label);
    if (!label) {
      return { error: 'label e obrigatorio.' };
    }
    sanitized.label = label;
  }

  if (payload.url !== undefined) {
    const url = normalizeRequiredText(payload.url);
    if (!url) {
      return { error: 'url e obrigatorio.' };
    }
    sanitized.url = url;
  }

  if (payload.location !== undefined) {
    const location = normalizeLocation(payload.location);
    if (!location) {
      return { error: 'location invalida.' };
    }
    sanitized.location = location;
  }

  if (payload.icon !== undefined) {
    sanitized.icon = normalizeNullableText(payload.icon);
  }

  if (payload.style !== undefined) {
    sanitized.style = normalizeNullableText(payload.style);
  }

  if (payload.sort_order !== undefined) {
    const sortOrder = normalizeSortOrder(payload.sort_order);
    if (Number.isNaN(sortOrder)) {
      return { error: 'sort_order deve ser numerico.' };
    }
    sanitized.sort_order = sortOrder;
  }

  if (payload.is_active !== undefined) {
    sanitized.is_active = payload.is_active;
  }

  if (payload.open_in_new_tab !== undefined) {
    sanitized.open_in_new_tab = payload.open_in_new_tab;
  }

  if (payload.requires_auth !== undefined) {
    sanitized.requires_auth = payload.requires_auth;
  }

  return sanitized;
}

export async function listNavigationItems(
  location?: string,
): Promise<CmsServiceResult<NavigationItem[]>> {
  if (!supabase) {
    return missingConfigResult<NavigationItem[]>();
  }

  const normalizedLocation = location ? normalizeLocation(location) : null;
  if (location && !normalizedLocation) {
    return { data: null, error: 'location invalida.' };
  }

  let query = supabase
    .from('navigation_items')
    .select('*')
    .order('location', { ascending: true })
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (normalizedLocation) {
    query = query.eq('location', normalizedLocation);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  return { data: data ?? [], error: null };
}

export async function listActiveNavigationItems(
  location?: string,
): Promise<CmsServiceResult<NavigationItem[]>> {
  if (!supabase) {
    return missingConfigResult<NavigationItem[]>();
  }

  const normalizedLocation = location ? normalizeLocation(location) : null;
  if (location && !normalizedLocation) {
    return { data: null, error: 'location invalida.' };
  }

  let query = supabase
    .from('navigation_items')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (normalizedLocation) {
    query = query.eq('location', normalizedLocation);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  return { data: data ?? [], error: null };
}

export async function createNavigationItem(
  payload: NavigationItemInsert,
): Promise<CmsServiceResult<NavigationItem>> {
  if (!supabase) {
    return missingConfigResult<NavigationItem>();
  }

  const sanitizedPayload = sanitizeNavigationInsertPayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('navigation_items')
    .insert(sanitizedPayload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  await logNavigationAction(
    'create_navigation_item',
    {
      location: data.location,
      label: data.label,
      url: data.url,
      style: data.style,
    },
    data.id,
  );

  return { data, error: null };
}

export async function updateNavigationItem(
  id: string,
  payload: NavigationItemUpdate,
): Promise<CmsServiceResult<NavigationItem>> {
  if (!supabase) {
    return missingConfigResult<NavigationItem>();
  }

  const navigationId = normalizeRequiredText(id);
  if (!navigationId) {
    return { data: null, error: 'ID do item de menu e obrigatorio.' };
  }

  const sanitizedPayload = sanitizeNavigationUpdatePayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('navigation_items')
    .update(sanitizedPayload)
    .eq('id', navigationId)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  await logNavigationAction(
    'update_navigation_item',
    {
      location: data.location,
      updated_fields: Object.keys(sanitizedPayload),
    },
    data.id,
  );

  return { data, error: null };
}

export async function deleteNavigationItem(
  id: string,
): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  const navigationId = normalizeRequiredText(id);
  if (!navigationId) {
    return { data: null, error: 'ID do item de menu e obrigatorio.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('navigation_items')
    .select('id,label,location,url')
    .eq('id', navigationId)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: mapErrorMessage(existingError.message) };
  }

  if (!existing) {
    return { data: null, error: 'Item de menu nao encontrado.' };
  }

  const { error } = await supabase.from('navigation_items').delete().eq('id', navigationId);
  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  await logNavigationAction(
    'delete_navigation_item',
    {
      location: existing.location,
      label: existing.label,
      url: existing.url,
    },
    existing.id,
  );

  return { data: { id: navigationId }, error: null };
}

export async function reorderNavigationItems(
  location: string,
  items: ReorderNavigationItemPayload[],
): Promise<CmsServiceResult<NavigationItem[]>> {
  if (!supabase) {
    return missingConfigResult<NavigationItem[]>();
  }

  const normalizedLocation = normalizeLocation(location);
  if (!normalizedLocation) {
    return { data: null, error: 'location invalida.' };
  }

  if (!items.length) {
    return listNavigationItems(normalizedLocation);
  }

  const invalidItem = items.find((item) => !normalizeRequiredText(item.id) || !Number.isFinite(item.sort_order));
  if (invalidItem) {
    return { data: null, error: 'Lista de ordenacao invalida.' };
  }

  const ids = items.map((item) => normalizeRequiredText(item.id));
  const { data: scopedItems, error: scopedError } = await supabase
    .from('navigation_items')
    .select('id')
    .eq('location', normalizedLocation)
    .in('id', ids);

  if (scopedError) {
    return { data: null, error: mapErrorMessage(scopedError.message) };
  }

  if ((scopedItems?.length ?? 0) !== ids.length) {
    return { data: null, error: 'Existem itens fora da location informada.' };
  }

  const updates = await Promise.all(
    items.map((item) =>
      supabase
        .from('navigation_items')
        .update({ sort_order: Number(item.sort_order) })
        .eq('id', normalizeRequiredText(item.id))
        .select('id')
        .single(),
    ),
  );

  const failed = updates.find((item) => item.error);
  if (failed?.error) {
    return { data: null, error: mapErrorMessage(failed.error.message) };
  }

  await logNavigationAction('reorder_navigation_items', {
    location: normalizedLocation,
    total_items: items.length,
    item_ids: items.map((item) => normalizeRequiredText(item.id)),
  });

  return listNavigationItems(normalizedLocation);
}
