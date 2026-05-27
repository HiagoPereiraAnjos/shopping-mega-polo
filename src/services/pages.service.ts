import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type { CmsServiceResult, Page, PageInsert, PageUpdate } from '../types/cms';
import type { Json } from '../types/database';

const PAGE_IMAGE_BUCKETS = ['pages', 'institutional'] as const;
const MAX_PAGE_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB

type PageLogAction =
  | 'create_page'
  | 'update_page'
  | 'publish_page'
  | 'unpublish_page'
  | 'delete_page';

export interface PageImageUploadResult {
  bucket: string;
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

  const trimmed = value.trim();
  return trimmed || null;
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

function sanitizeFileName(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

async function logPageAction(
  action: PageLogAction,
  entityId: string,
  metadata: Record<string, unknown>,
): Promise<void> {
  if (!supabase) {
    return;
  }

  const { data: authData } = await supabase.auth.getUser();

  const { error } = await supabase.from('activity_logs').insert({
    user_id: authData.user?.id ?? null,
    action,
    entity: 'pages',
    entity_id: entityId,
    metadata: metadata as Json,
  });

  if (error && import.meta.env.DEV) {
    console.warn('Falha ao registrar log de pagina:', error.message);
  }
}

async function ensureSlugUnique(
  slug: string,
  excludeId?: string,
): Promise<{ isUnique: boolean; error: string | null }> {
  if (!supabase) {
    return { isUnique: false, error: missingConfigResult<Page>().error };
  }

  let query = supabase.from('pages').select('id').eq('slug', slug).limit(1);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { isUnique: false, error: error.message };
  }

  return { isUnique: !data, error: null };
}

function sanitizePageInsertPayload(payload: PageInsert): PageInsert | { error: string } {
  const slug = normalizeSlug(payload.slug ?? '');
  const title = payload.title?.trim();

  if (!slug) {
    return { error: 'Slug da pagina e obrigatorio.' };
  }

  if (!title) {
    return { error: 'Titulo da pagina e obrigatorio.' };
  }

  return {
    slug,
    title,
    subtitle: normalizeNullableText(payload.subtitle),
    content: normalizeNullableText(payload.content),
    hero_image_url: normalizeNullableText(payload.hero_image_url),
    seo_title: normalizeNullableText(payload.seo_title),
    seo_description: normalizeNullableText(payload.seo_description),
    og_image_url: normalizeNullableText(payload.og_image_url),
    og_title: normalizeNullableText(payload.og_title),
    og_description: normalizeNullableText(payload.og_description),
    canonical_url: normalizeNullableText(payload.canonical_url),
    robots_index: payload.robots_index ?? true,
    robots_follow: payload.robots_follow ?? true,
    is_published: payload.is_published ?? false,
  };
}

function sanitizePageUpdatePayload(payload: PageUpdate): PageUpdate | { error: string } {
  const sanitized: PageUpdate = {};

  if (payload.slug !== undefined) {
    const slug = normalizeSlug(payload.slug ?? '');
    if (!slug) {
      return { error: 'Slug da pagina e obrigatorio.' };
    }
    sanitized.slug = slug;
  }

  if (payload.title !== undefined) {
    const title = payload.title?.trim();
    if (!title) {
      return { error: 'Titulo da pagina e obrigatorio.' };
    }
    sanitized.title = title;
  }

  if (payload.subtitle !== undefined) {
    sanitized.subtitle = normalizeNullableText(payload.subtitle);
  }

  if (payload.content !== undefined) {
    sanitized.content = normalizeNullableText(payload.content);
  }

  if (payload.hero_image_url !== undefined) {
    sanitized.hero_image_url = normalizeNullableText(payload.hero_image_url);
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

  if (payload.og_title !== undefined) {
    sanitized.og_title = normalizeNullableText(payload.og_title);
  }

  if (payload.og_description !== undefined) {
    sanitized.og_description = normalizeNullableText(payload.og_description);
  }

  if (payload.canonical_url !== undefined) {
    sanitized.canonical_url = normalizeNullableText(payload.canonical_url);
  }

  if (payload.robots_index !== undefined) {
    sanitized.robots_index = payload.robots_index;
  }

  if (payload.robots_follow !== undefined) {
    sanitized.robots_follow = payload.robots_follow;
  }

  if (payload.is_published !== undefined) {
    sanitized.is_published = payload.is_published;
  }

  return sanitized;
}

export async function listPages(): Promise<CmsServiceResult<Page[]>> {
  if (!supabase) {
    return missingConfigResult<Page[]>();
  }

  const { data, error } = await supabase
    .from('pages')
    .select('*')
    .order('updated_at', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function getPageBySlug(
  slug: string,
  includeUnpublished = false,
): Promise<CmsServiceResult<Page>> {
  if (!supabase) {
    return missingConfigResult<Page>();
  }

  const normalizedSlug = normalizeSlug(slug);
  if (!normalizedSlug) {
    return { data: null, error: 'Slug da pagina e obrigatorio.' };
  }

  let query = supabase.from('pages').select('*').eq('slug', normalizedSlug);

  if (!includeUnpublished) {
    query = query.eq('is_published', true);
  }

  const { data, error } = await query.maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

export async function getPageById(id: string): Promise<CmsServiceResult<Page>> {
  if (!supabase) {
    return missingConfigResult<Page>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da pagina e obrigatorio.' };
  }

  const { data, error } = await supabase.from('pages').select('*').eq('id', id).maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

export async function createPage(payload: PageInsert): Promise<CmsServiceResult<Page>> {
  if (!supabase) {
    return missingConfigResult<Page>();
  }

  const sanitized = sanitizePageInsertPayload(payload);
  if ('error' in sanitized) {
    return { data: null, error: sanitized.error };
  }

  const slugUnique = await ensureSlugUnique(sanitized.slug);
  if (slugUnique.error) {
    return { data: null, error: slugUnique.error };
  }

  if (!slugUnique.isUnique) {
    return { data: null, error: 'Slug ja existe. Escolha outro slug.' };
  }

  const { data, error } = await supabase.from('pages').insert(sanitized).select('*').single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logPageAction('create_page', data.id, {
    page_id: data.id,
    slug: data.slug,
    title: data.title,
  });

  return { data, error: null };
}

export async function updatePage(id: string, payload: PageUpdate): Promise<CmsServiceResult<Page>> {
  if (!supabase) {
    return missingConfigResult<Page>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da pagina e obrigatorio.' };
  }

  const sanitized = sanitizePageUpdatePayload(payload);
  if ('error' in sanitized) {
    return { data: null, error: sanitized.error };
  }

  if (sanitized.slug) {
    const slugUnique = await ensureSlugUnique(sanitized.slug, id);
    if (slugUnique.error) {
      return { data: null, error: slugUnique.error };
    }

    if (!slugUnique.isUnique) {
      return { data: null, error: 'Slug ja existe. Escolha outro slug.' };
    }
  }

  const { data, error } = await supabase
    .from('pages')
    .update(sanitized)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logPageAction('update_page', data.id, {
    page_id: data.id,
    updated_fields: Object.keys(sanitized),
  });

  return { data, error: null };
}

export async function deletePage(id: string): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da pagina e obrigatorio.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('pages')
    .select('id,slug,title')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: existingError.message };
  }

  if (!existing) {
    return { data: null, error: 'Pagina nao encontrada.' };
  }

  const { error } = await supabase.from('pages').delete().eq('id', id);

  if (error) {
    return { data: null, error: error.message };
  }

  await logPageAction('delete_page', existing.id, {
    page_id: existing.id,
    slug: existing.slug,
    title: existing.title,
  });

  return { data: { id }, error: null };
}

export async function publishPage(id: string): Promise<CmsServiceResult<Page>> {
  if (!supabase) {
    return missingConfigResult<Page>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da pagina e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('pages')
    .update({ is_published: true })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logPageAction('publish_page', data.id, {
    page_id: data.id,
    slug: data.slug,
    title: data.title,
  });

  return { data, error: null };
}

export async function unpublishPage(id: string): Promise<CmsServiceResult<Page>> {
  if (!supabase) {
    return missingConfigResult<Page>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da pagina e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('pages')
    .update({ is_published: false })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logPageAction('unpublish_page', data.id, {
    page_id: data.id,
    slug: data.slug,
    title: data.title,
  });

  return { data, error: null };
}

export async function uploadPageImage(file: File): Promise<CmsServiceResult<PageImageUploadResult>> {
  if (!supabase) {
    return missingConfigResult<PageImageUploadResult>();
  }

  if (!file.type.startsWith('image/')) {
    return { data: null, error: 'Arquivo invalido. Envie uma imagem.' };
  }

  if (file.size > MAX_PAGE_IMAGE_SIZE) {
    return { data: null, error: 'Imagem muito grande. Limite maximo de 8MB.' };
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const filePath = `pages/${Date.now()}-${safeName}.${extension}`;

  let latestError: string | null = null;

  for (const bucket of PAGE_IMAGE_BUCKETS) {
    const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || undefined,
    });

    if (uploadError) {
      latestError = uploadError.message;
      continue;
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

    return {
      data: {
        bucket,
        path: filePath,
        publicUrl: data.publicUrl,
      },
      error: null,
    };
  }

  return {
    data: null,
    error: latestError ?? 'Falha ao enviar imagem da pagina para o Storage.',
  };
}

// Backward-compatible aliases
export const getPublishedPages = async (): Promise<CmsServiceResult<Page[]>> => {
  const result = await listPages();

  if (result.error) {
    return result;
  }

  return {
    data: (result.data ?? []).filter((page) => page.is_published),
    error: null,
  };
};

export const upsertPage = async (payload: PageInsert | PageUpdate): Promise<CmsServiceResult<Page>> => {
  if ('id' in payload && payload.id) {
    return updatePage(payload.id, payload);
  }

  return createPage(payload as PageInsert);
};
