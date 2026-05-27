import { supabase, supabaseConfigMessage } from '../lib/supabase';
import { logActivity } from '../lib/logActivity';
import type {
  CmsServiceResult,
  Launch,
  LaunchInsert,
  LaunchQueryFilters,
  LaunchUpdate,
} from '../types/cms';

const LAUNCH_IMAGES_BUCKET = 'products';
const MAX_LAUNCH_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB

type LaunchLogAction =
  | 'create_launch'
  | 'update_launch'
  | 'publish_launch'
  | 'unpublish_launch'
  | 'delete_launch';

export interface LaunchImageUploadResult {
  path: string;
  publicUrl: string;
}

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

  const normalized = value.trim();
  return normalized || null;
}

function normalizeNullableDate(value: string | null | undefined): string | null {
  const normalized = normalizeNullableText(value);
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return parsed.toISOString();
}

function normalizePrice(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value) || value < 0) {
    return Number.NaN;
  }

  return Number(value);
}

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function validateLaunchDates(
  publishDate: string | null,
  expirationDate: string | null,
): string | null {
  if (!publishDate || !expirationDate) {
    return null;
  }

  const publishTimestamp = new Date(publishDate).getTime();
  const expirationTimestamp = new Date(expirationDate).getTime();

  if (Number.isNaN(publishTimestamp) || Number.isNaN(expirationTimestamp)) {
    return 'Data de publicacao ou expiracao invalida.';
  }

  if (expirationTimestamp < publishTimestamp) {
    return 'A data de expiracao nao pode ser anterior a data de publicacao.';
  }

  return null;
}

async function logLaunchAction(
  action: LaunchLogAction,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await logActivity({
    action,
    entity: 'launches',
    entity_id: entityId,
    metadata,
  });
}

function applyLaunchFilters(
  queryBuilder: ReturnType<NonNullable<typeof supabase>['from']>,
  filters: LaunchQueryFilters,
) {
  let query = queryBuilder
    .select('*')
    .order('is_featured', { ascending: false })
    .order('publish_date', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  if (filters.publishedOnly || filters.status === 'published') {
    query = query.eq('is_published', true);
  }

  if (filters.status === 'unpublished') {
    query = query.eq('is_published', false);
  }

  if (filters.featuredOnly) {
    query = query.eq('is_featured', true);
  }

  if (filters.categoryId) {
    query = query.eq('category_id', filters.categoryId);
  }

  if (filters.storeId) {
    query = query.eq('store_id', filters.storeId);
  }

  if (!filters.includeExpired) {
    const nowIso = new Date().toISOString();
    query = query.or(`expiration_date.is.null,expiration_date.gte.${nowIso}`);
  }

  if (filters.query?.trim()) {
    const sanitized = filters.query.replace(/[%_,]/g, '').trim();
    if (sanitized) {
      query = query.or(`title.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
    }
  }

  if (filters.limit && filters.limit > 0) {
    query = query.limit(filters.limit);
  }

  return query;
}

function sanitizeLaunchInsertPayload(payload: LaunchInsert): LaunchInsert | { error: string } {
  const storeId = normalizeNullableText(payload.store_id);
  const title = normalizeNullableText(payload.title);
  const publishDate = normalizeNullableDate(payload.publish_date);
  const expirationDate = normalizeNullableDate(payload.expiration_date);
  const dateValidationError = validateLaunchDates(publishDate, expirationDate);

  if (!storeId) {
    return { error: 'Loja vinculada e obrigatoria.' };
  }

  if (!title) {
    return { error: 'Titulo do lancamento e obrigatorio.' };
  }

  if (dateValidationError) {
    return { error: dateValidationError };
  }

  const normalizedPrice = normalizePrice(payload.price);
  if (Number.isNaN(normalizedPrice)) {
    return { error: 'Preco invalido. Informe um valor numerico positivo.' };
  }

  return {
    ...payload,
    store_id: storeId,
    title,
    description: normalizeNullableText(payload.description),
    image_url: normalizeNullableText(payload.image_url),
    category_id: normalizeNullableText(payload.category_id),
    price: normalizedPrice,
    publish_date: publishDate,
    expiration_date: expirationDate,
    seo_title: normalizeNullableText(payload.seo_title),
    seo_description: normalizeNullableText(payload.seo_description),
    og_image_url: normalizeNullableText(payload.og_image_url),
    is_featured: payload.is_featured ?? false,
    is_published: payload.is_published ?? false,
  };
}

function sanitizeLaunchUpdatePayload(payload: LaunchUpdate): LaunchUpdate | { error: string } {
  const sanitized: LaunchUpdate = {};

  if (payload.store_id !== undefined) {
    const storeId = normalizeNullableText(payload.store_id);
    if (!storeId) {
      return { error: 'Loja vinculada e obrigatoria.' };
    }
    sanitized.store_id = storeId;
  }

  if (payload.title !== undefined) {
    const title = normalizeNullableText(payload.title);
    if (!title) {
      return { error: 'Titulo do lancamento e obrigatorio.' };
    }
    sanitized.title = title;
  }

  if (payload.description !== undefined) {
    sanitized.description = normalizeNullableText(payload.description);
  }

  if (payload.image_url !== undefined) {
    sanitized.image_url = normalizeNullableText(payload.image_url);
  }

  if (payload.category_id !== undefined) {
    sanitized.category_id = normalizeNullableText(payload.category_id);
  }

  if (payload.price !== undefined) {
    const normalizedPrice = normalizePrice(payload.price);
    if (Number.isNaN(normalizedPrice)) {
      return { error: 'Preco invalido. Informe um valor numerico positivo.' };
    }
    sanitized.price = normalizedPrice;
  }

  if (payload.publish_date !== undefined) {
    sanitized.publish_date = normalizeNullableDate(payload.publish_date);
  }

  if (payload.expiration_date !== undefined) {
    sanitized.expiration_date = normalizeNullableDate(payload.expiration_date);
  }

  const dateValidationError = validateLaunchDates(
    (sanitized.publish_date as string | null | undefined) ?? null,
    (sanitized.expiration_date as string | null | undefined) ?? null,
  );
  if (dateValidationError && (payload.publish_date !== undefined || payload.expiration_date !== undefined)) {
    return { error: dateValidationError };
  }

  if (payload.seo_title !== undefined) {
    sanitized.seo_title = normalizeNullableText(payload.seo_title);
  }

  if (payload.seo_description !== undefined) {
    sanitized.seo_description = normalizeNullableText(payload.seo_description);
  }

  if (payload.og_image_url !== undefined) {
    sanitized.og_image_url = normalizeNullableText(payload.og_image_url);
  }

  if (payload.is_featured !== undefined) {
    sanitized.is_featured = payload.is_featured;
  }

  if (payload.is_published !== undefined) {
    sanitized.is_published = payload.is_published;
  }

  return sanitized;
}

export async function listLaunches(
  filters: LaunchQueryFilters = { status: 'all', includeExpired: true },
): Promise<CmsServiceResult<Launch[]>> {
  if (!supabase) {
    return missingConfigResult<Launch[]>();
  }

  const query = applyLaunchFilters(supabase.from('launches'), {
    includeExpired: true,
    ...filters,
  });

  const { data, error } = await query;
  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function listPublishedLaunches(
  filters: LaunchQueryFilters = {},
): Promise<CmsServiceResult<Launch[]>> {
  return listLaunches({
    ...filters,
    publishedOnly: true,
    status: 'published',
    includeExpired: false,
  });
}

export async function getLaunchById(id: string): Promise<CmsServiceResult<Launch>> {
  if (!supabase) {
    return missingConfigResult<Launch>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do lancamento e obrigatorio.' };
  }

  const { data, error } = await supabase.from('launches').select('*').eq('id', id).maybeSingle();
  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

export async function createLaunch(payload: LaunchInsert): Promise<CmsServiceResult<Launch>> {
  if (!supabase) {
    return missingConfigResult<Launch>();
  }

  const sanitizedPayload = sanitizeLaunchInsertPayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('launches')
    .insert(sanitizedPayload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logLaunchAction('create_launch', data.id, {
    launch_id: data.id,
    title: data.title,
    store_id: data.store_id,
  });

  return { data, error: null };
}

export async function updateLaunch(
  id: string,
  payload: LaunchUpdate,
): Promise<CmsServiceResult<Launch>> {
  if (!supabase) {
    return missingConfigResult<Launch>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do lancamento e obrigatorio.' };
  }

  const sanitizedPayload = sanitizeLaunchUpdatePayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('launches')
    .update(sanitizedPayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logLaunchAction('update_launch', data.id, {
    launch_id: data.id,
    updated_fields: Object.keys(sanitizedPayload),
  });

  return { data, error: null };
}

export async function deleteLaunch(id: string): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do lancamento e obrigatorio.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('launches')
    .select('id,title,store_id')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: existingError.message };
  }

  if (!existing) {
    return { data: null, error: 'Lancamento nao encontrado.' };
  }

  const { error } = await supabase.from('launches').delete().eq('id', id);
  if (error) {
    return { data: null, error: error.message };
  }

  await logLaunchAction('delete_launch', existing.id, {
    launch_id: existing.id,
    title: existing.title,
    store_id: existing.store_id,
  });

  return { data: { id }, error: null };
}

export async function publishLaunch(id: string): Promise<CmsServiceResult<Launch>> {
  const result = await updateLaunch(id, { is_published: true });
  if (result.error || !result.data) {
    return result;
  }

  await logLaunchAction('publish_launch', result.data.id, {
    launch_id: result.data.id,
    title: result.data.title,
  });

  return result;
}

export async function unpublishLaunch(id: string): Promise<CmsServiceResult<Launch>> {
  const result = await updateLaunch(id, { is_published: false });
  if (result.error || !result.data) {
    return result;
  }

  await logLaunchAction('unpublish_launch', result.data.id, {
    launch_id: result.data.id,
    title: result.data.title,
  });

  return result;
}

export async function uploadLaunchImage(file: File): Promise<CmsServiceResult<LaunchImageUploadResult>> {
  if (!supabase) {
    return missingConfigResult<LaunchImageUploadResult>();
  }

  if (!file.type.startsWith('image/')) {
    return { data: null, error: 'Arquivo invalido. Envie uma imagem.' };
  }

  if (file.size > MAX_LAUNCH_IMAGE_SIZE) {
    return { data: null, error: 'Imagem muito grande. Limite maximo de 8MB.' };
  }

  const extension = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase() || 'jpg'
    : 'jpg';
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const filePath = `launches/${Date.now()}-${safeName}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(LAUNCH_IMAGES_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    return { data: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(LAUNCH_IMAGES_BUCKET).getPublicUrl(filePath);

  return {
    data: {
      path: filePath,
      publicUrl: data.publicUrl,
    },
    error: null,
  };
}

// Backwards-compatible aliases
export const getLaunches = listLaunches;
export async function getFeaturedLaunches(limit = 8): Promise<CmsServiceResult<Launch[]>> {
  return listPublishedLaunches({ featuredOnly: true, limit });
}
export const upsertLaunch = async (
  payload: LaunchInsert | LaunchUpdate,
): Promise<CmsServiceResult<Launch>> => {
  if ('id' in payload && payload.id) {
    return updateLaunch(payload.id, payload);
  }
  return createLaunch(payload as LaunchInsert);
};
