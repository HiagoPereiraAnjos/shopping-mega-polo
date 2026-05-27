import { supabase, supabaseConfigMessage } from '../lib/supabase';
import { logActivity } from '../lib/logActivity';
import type {
  CmsServiceResult,
  Store,
  StoreInsert,
  StoreQueryFilters,
  StoreUpdate,
} from '../types/cms';

export interface StoreAssetUploadResult {
  path: string;
  publicUrl: string;
}

type StoreLogAction =
  | 'create_store'
  | 'update_store'
  | 'publish_store'
  | 'unpublish_store'
  | 'delete_store';

const STORE_LOGO_BUCKET = 'stores';
const STORE_BANNER_BUCKET = 'banners';

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function normalizeSlug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeInstagram(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  const cleaned = value
    .trim()
    .replace(/^@+/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/$/, '');

  return cleaned || null;
}

function normalizeTags(value?: string[] | null): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => item.trim())
    .filter((item) => !!item)
    .map((item) => item.replace(/^#+/, ''));
}

function normalizePhone(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  return digits || null;
}

function validateWhatsapp(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  const digits = value.replace(/\D/g, '');

  if (digits.length < 10 || digits.length > 13) {
    return 'WhatsApp invalido. Use de 10 a 13 digitos com DDD e codigo do pais se necessario.';
  }

  return null;
}

function normalizeWebsite(value?: string | null): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

async function uploadStoreAsset(
  file: File,
  options: { bucket: string; prefix: string },
): Promise<CmsServiceResult<StoreAssetUploadResult>> {
  if (!supabase) {
    return missingConfigResult<StoreAssetUploadResult>();
  }

  const extension = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase() || 'png'
    : 'png';

  const baseName = file.name
    .replace(/\.[^.]+$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .toLowerCase();

  const filePath = `${options.prefix}/${Date.now()}-${baseName}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(options.bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    return { data: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(options.bucket).getPublicUrl(filePath);

  return {
    data: {
      path: filePath,
      publicUrl: data.publicUrl,
    },
    error: null,
  };
}

async function logStoreAction(
  action: StoreLogAction,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  await logActivity({
    action,
    entity: 'stores',
    entity_id: entityId,
    metadata,
  });
}

async function ensureStoreSlugIsUnique(
  slug: string,
  excludeId?: string,
): Promise<{ isUnique: boolean; error: string | null }> {
  if (!supabase) {
    return { isUnique: false, error: missingConfigResult<Store>().error };
  }

  let query = supabase.from('stores').select('id').eq('slug', slug).limit(1);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { isUnique: false, error: error.message };
  }

  return { isUnique: !data, error: null };
}

async function listActiveCatalogStoreIds(storeIds: string[]): Promise<Set<string>> {
  if (!supabase || !storeIds.length) {
    return new Set<string>();
  }

  const { data, error } = await supabase
    .from('catalogs')
    .select('store_id,file_url,is_active')
    .in('store_id', storeIds)
    .eq('is_active', true)
    .not('file_url', 'is', null);

  if (error) {
    if (import.meta.env.DEV) {
      console.warn('Falha ao carregar catalogos ativos:', error.message);
    }
    return new Set<string>();
  }

  const result = new Set<string>();

  (data ?? []).forEach((item) => {
    if (item.file_url?.trim()) {
      result.add(item.store_id);
    }
  });

  return result;
}

function sanitizeStoreInsertPayload(payload: StoreInsert): StoreInsert | { error: string } {
  const name = payload.name?.trim();
  const slugInput = payload.slug?.trim();

  if (!name) {
    return { error: 'Nome da loja e obrigatorio.' };
  }

  if (!slugInput) {
    return { error: 'Slug da loja e obrigatorio.' };
  }

  if (!payload.category_id) {
    return { error: 'Categoria da loja e obrigatoria.' };
  }

  const whatsappError = validateWhatsapp(payload.whatsapp);
  if (whatsappError) {
    return { error: whatsappError };
  }

  const normalizedWebsite = normalizeWebsite(payload.website);
  if (payload.website?.trim() && !normalizedWebsite) {
    return { error: 'URL do site invalida. Use um endereco completo, como https://exemplo.com.' };
  }

  return {
    ...payload,
    name,
    slug: normalizeSlug(slugInput),
    description: payload.description?.trim() || null,
    segment: payload.segment?.trim() || null,
    floor: payload.floor?.trim() || null,
    store_number: payload.store_number?.trim() || null,
    whatsapp: normalizePhone(payload.whatsapp),
    phone: normalizePhone(payload.phone),
    email: payload.email?.trim() || null,
    instagram: normalizeInstagram(payload.instagram),
    website: normalizedWebsite,
    logo_url: payload.logo_url?.trim() || null,
    banner_url: payload.banner_url?.trim() || null,
    tags: normalizeTags(payload.tags),
    seo_title: payload.seo_title?.trim() || null,
    seo_description: payload.seo_description?.trim() || null,
    og_image_url: payload.og_image_url?.trim() || null,
    is_featured: payload.is_featured ?? false,
    is_published: payload.is_published ?? false,
  };
}

function sanitizeStoreUpdatePayload(payload: StoreUpdate): StoreUpdate | { error: string } {
  const sanitized: StoreUpdate = {};

  if (payload.name !== undefined) {
    const name = payload.name?.trim();
    if (!name) {
      return { error: 'Nome da loja e obrigatorio.' };
    }
    sanitized.name = name;
  }

  if (payload.slug !== undefined) {
    const normalizedSlug = normalizeSlug(payload.slug);
    if (!normalizedSlug) {
      return { error: 'Slug da loja e obrigatorio.' };
    }
    sanitized.slug = normalizedSlug;
  }

  if (payload.category_id !== undefined) {
    if (!payload.category_id) {
      return { error: 'Categoria da loja e obrigatoria.' };
    }
    sanitized.category_id = payload.category_id;
  }

  if (payload.whatsapp !== undefined) {
    const whatsappError = validateWhatsapp(payload.whatsapp);
    if (whatsappError) {
      return { error: whatsappError };
    }
    sanitized.whatsapp = normalizePhone(payload.whatsapp);
  }

  if (payload.phone !== undefined) {
    sanitized.phone = normalizePhone(payload.phone);
  }

  if (payload.email !== undefined) {
    sanitized.email = payload.email?.trim() || null;
  }

  if (payload.instagram !== undefined) {
    sanitized.instagram = normalizeInstagram(payload.instagram);
  }

  if (payload.website !== undefined) {
    const normalizedWebsite = normalizeWebsite(payload.website);
    if (payload.website?.trim() && !normalizedWebsite) {
      return { error: 'URL do site invalida. Use um endereco completo, como https://exemplo.com.' };
    }
    sanitized.website = normalizedWebsite;
  }

  if (payload.description !== undefined) {
    sanitized.description = payload.description?.trim() || null;
  }

  if (payload.segment !== undefined) {
    sanitized.segment = payload.segment?.trim() || null;
  }

  if (payload.floor !== undefined) {
    sanitized.floor = payload.floor?.trim() || null;
  }

  if (payload.store_number !== undefined) {
    sanitized.store_number = payload.store_number?.trim() || null;
  }

  if (payload.logo_url !== undefined) {
    sanitized.logo_url = payload.logo_url?.trim() || null;
  }

  if (payload.banner_url !== undefined) {
    sanitized.banner_url = payload.banner_url?.trim() || null;
  }

  if (payload.tags !== undefined) {
    sanitized.tags = normalizeTags(payload.tags);
  }

  if (payload.seo_title !== undefined) {
    sanitized.seo_title = payload.seo_title?.trim() || null;
  }

  if (payload.seo_description !== undefined) {
    sanitized.seo_description = payload.seo_description?.trim() || null;
  }

  if (payload.og_image_url !== undefined) {
    sanitized.og_image_url = payload.og_image_url?.trim() || null;
  }

  if (payload.is_featured !== undefined) {
    sanitized.is_featured = payload.is_featured;
  }

  if (payload.is_published !== undefined) {
    sanitized.is_published = payload.is_published;
  }

  return sanitized;
}

export async function listStores(
  filters: StoreQueryFilters = { status: 'all' },
): Promise<CmsServiceResult<Store[]>> {
  if (!supabase) {
    return missingConfigResult<Store[]>();
  }

  let query = supabase.from('stores').select('*').order('name', { ascending: true });

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

  if (filters.segment) {
    query = query.eq('segment', filters.segment);
  }

  if (filters.floor) {
    query = query.eq('floor', filters.floor);
  }

  if (filters.query?.trim()) {
    const sanitized = filters.query.replace(/[%_,]/g, '').trim();
    if (sanitized) {
      query = query.or(
        `name.ilike.%${sanitized}%,slug.ilike.%${sanitized}%,description.ilike.%${sanitized}%,segment.ilike.%${sanitized}%`,
      );
    }
  }

  if (filters.limit && filters.limit > 0) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  let stores = data ?? [];

  if (filters.hasCatalogDigital) {
    const storeIds = stores.map((store) => store.id);
    const catalogStoreIds = await listActiveCatalogStoreIds(storeIds);
    stores = stores.filter((store) => catalogStoreIds.has(store.id));
  }

  return { data: stores, error: null };
}

export async function listPublishedStores(
  filters: StoreQueryFilters = {},
): Promise<CmsServiceResult<Store[]>> {
  return listStores({ ...filters, publishedOnly: true, status: 'published' });
}

export async function getStoreById(id: string): Promise<CmsServiceResult<Store>> {
  if (!supabase) {
    return missingConfigResult<Store>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da loja e obrigatorio.' };
  }

  const { data, error } = await supabase.from('stores').select('*').eq('id', id).maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

export async function getStoreBySlug(
  slug: string,
  includeUnpublished = false,
): Promise<CmsServiceResult<Store>> {
  if (!supabase) {
    return missingConfigResult<Store>();
  }

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return { data: null, error: 'Slug da loja e obrigatorio.' };
  }

  let query = supabase.from('stores').select('*').eq('slug', normalizedSlug);

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

export async function createStore(payload: StoreInsert): Promise<CmsServiceResult<Store>> {
  if (!supabase) {
    return missingConfigResult<Store>();
  }

  const sanitizedPayload = sanitizeStoreInsertPayload(payload);

  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const unique = await ensureStoreSlugIsUnique(sanitizedPayload.slug);

  if (unique.error) {
    return { data: null, error: unique.error };
  }

  if (!unique.isUnique) {
    return { data: null, error: 'Slug ja existe. Escolha outro slug.' };
  }

  const { data, error } = await supabase.from('stores').insert(sanitizedPayload).select('*').single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logStoreAction('create_store', data.id, {
    store_id: data.id,
    name: data.name,
    slug: data.slug,
  });

  return { data, error: null };
}

export async function updateStore(
  id: string,
  payload: StoreUpdate,
): Promise<CmsServiceResult<Store>> {
  if (!supabase) {
    return missingConfigResult<Store>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da loja e obrigatorio.' };
  }

  const sanitizedPayload = sanitizeStoreUpdatePayload(payload);

  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  if (sanitizedPayload.slug) {
    const unique = await ensureStoreSlugIsUnique(sanitizedPayload.slug, id);
    if (unique.error) {
      return { data: null, error: unique.error };
    }

    if (!unique.isUnique) {
      return { data: null, error: 'Slug ja existe. Escolha outro slug.' };
    }
  }

  const { data, error } = await supabase
    .from('stores')
    .update(sanitizedPayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logStoreAction('update_store', data.id, {
    store_id: data.id,
    updated_fields: Object.keys(sanitizedPayload),
  });

  return { data, error: null };
}

export async function deleteStore(id: string): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da loja e obrigatorio.' };
  }

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id,name,slug')
    .eq('id', id)
    .maybeSingle();

  if (storeError) {
    return { data: null, error: storeError.message };
  }

  if (!store) {
    return { data: null, error: 'Loja nao encontrada.' };
  }

  const { error } = await supabase.from('stores').delete().eq('id', id);

  if (error) {
    return { data: null, error: error.message };
  }

  await logStoreAction('delete_store', store.id, {
    store_id: store.id,
    name: store.name,
    slug: store.slug,
  });

  return { data: { id }, error: null };
}

export async function publishStore(id: string): Promise<CmsServiceResult<Store>> {
  const result = await updateStore(id, { is_published: true });

  if (result.data) {
    await logStoreAction('publish_store', result.data.id, {
      store_id: result.data.id,
      slug: result.data.slug,
    });
  }

  return result;
}

export async function unpublishStore(id: string): Promise<CmsServiceResult<Store>> {
  const result = await updateStore(id, { is_published: false });

  if (result.data) {
    await logStoreAction('unpublish_store', result.data.id, {
      store_id: result.data.id,
      slug: result.data.slug,
    });
  }

  return result;
}

export async function uploadStoreLogo(
  file: File,
): Promise<CmsServiceResult<StoreAssetUploadResult>> {
  return uploadStoreAsset(file, {
    bucket: STORE_LOGO_BUCKET,
    prefix: 'logos',
  });
}

export async function uploadStoreBanner(
  file: File,
): Promise<CmsServiceResult<StoreAssetUploadResult>> {
  return uploadStoreAsset(file, {
    bucket: STORE_BANNER_BUCKET,
    prefix: 'banners',
  });
}

// Backward-compat aliases while remaining modules migrate to explicit CRUD API.
export const getStores = listStores;
export async function getFeaturedStores(limit = 8): Promise<CmsServiceResult<Store[]>> {
  return listPublishedStores({ featuredOnly: true, limit });
}
export async function upsertStore(payload: StoreInsert | StoreUpdate): Promise<CmsServiceResult<Store>> {
  if ((payload as StoreInsert).name && (payload as StoreInsert).slug && !(payload as StoreUpdate).id) {
    return createStore(payload as StoreInsert);
  }

  const id = (payload as StoreUpdate).id;
  if (id) {
    const updatePayload = { ...payload } as StoreUpdate;
    delete updatePayload.id;
    return updateStore(id, updatePayload);
  }

  return { data: null, error: 'Nao foi possivel determinar se deve criar ou atualizar a loja.' };
}
