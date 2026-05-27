import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type { Json } from '../types/database';
import type {
  CmsServiceResult,
  HomeSection,
  HomeSectionInsert,
  HomeSectionUpdate,
} from '../types/cms';

const HOME_IMAGE_BUCKETS = ['pages', 'institutional'] as const;
const MAX_HOME_IMAGE_SIZE = 8 * 1024 * 1024; // 8MB

type HomeSectionLogAction = 'update_home_section' | 'upload_home_image' | 'reorder_home_sections';

export interface HomeImageUploadResult {
  bucket: string;
  path: string;
  publicUrl: string;
}

export interface ReorderHomeSectionItem {
  section_key: string;
  sort_order: number;
}

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .toLowerCase();
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeSectionKey(sectionKey: string): string {
  return sectionKey.trim().toLowerCase();
}

function normalizeSortOrder(sortOrder: number | null | undefined): number | null {
  if (sortOrder === null || sortOrder === undefined) {
    return null;
  }

  if (!Number.isFinite(sortOrder)) {
    return Number.NaN;
  }

  return Number(sortOrder);
}

async function logHomeSectionAction(
  action: HomeSectionLogAction,
  metadata: Record<string, unknown>,
  entityId?: string | null,
): Promise<void> {
  if (!supabase) {
    return;
  }

  const { data: authData } = await supabase.auth.getUser();

  const { error } = await supabase.from('activity_logs').insert({
    user_id: authData.user?.id ?? null,
    action,
    entity: 'home_sections',
    entity_id: entityId ?? null,
    metadata: metadata as Json,
  });

  if (error && import.meta.env.DEV) {
    console.warn('Falha ao registrar log de home_sections:', error.message);
  }
}

function sanitizeHomeSectionPayload(payload: HomeSectionUpdate): HomeSectionUpdate | { error: string } {
  const sanitized: HomeSectionUpdate = {};

  if (payload.title !== undefined) {
    sanitized.title = normalizeNullableText(payload.title);
  }

  if (payload.subtitle !== undefined) {
    sanitized.subtitle = normalizeNullableText(payload.subtitle);
  }

  if (payload.content !== undefined) {
    sanitized.content = normalizeNullableText(payload.content);
  }

  if (payload.image_url !== undefined) {
    sanitized.image_url = normalizeNullableText(payload.image_url);
  }

  if (payload.button_label !== undefined) {
    sanitized.button_label = normalizeNullableText(payload.button_label);
  }

  if (payload.button_url !== undefined) {
    sanitized.button_url = normalizeNullableText(payload.button_url);
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

  return sanitized;
}

export async function listHomeSections(): Promise<CmsServiceResult<HomeSection[]>> {
  if (!supabase) {
    return missingConfigResult<HomeSection[]>();
  }

  const { data, error } = await supabase
    .from('home_sections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function getHomeSection(sectionKey: string): Promise<CmsServiceResult<HomeSection>> {
  if (!supabase) {
    return missingConfigResult<HomeSection>();
  }

  const normalizedSectionKey = normalizeSectionKey(sectionKey);
  if (!normalizedSectionKey) {
    return { data: null, error: 'section_key e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('home_sections')
    .select('*')
    .eq('section_key', normalizedSectionKey)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

export async function updateHomeSection(
  sectionKey: string,
  payload: HomeSectionUpdate,
): Promise<CmsServiceResult<HomeSection>> {
  if (!supabase) {
    return missingConfigResult<HomeSection>();
  }

  const normalizedSectionKey = normalizeSectionKey(sectionKey);
  if (!normalizedSectionKey) {
    return { data: null, error: 'section_key e obrigatorio.' };
  }

  const sanitizedPayload = sanitizeHomeSectionPayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data: existing, error: existingError } = await supabase
    .from('home_sections')
    .select('id, section_key')
    .eq('section_key', normalizedSectionKey)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: existingError.message };
  }

  const persistenceResult = existing?.id
    ? await supabase
      .from('home_sections')
      .update(sanitizedPayload)
      .eq('section_key', normalizedSectionKey)
      .select('*')
      .single()
    : await supabase
      .from('home_sections')
      .insert({
        section_key: normalizedSectionKey,
        ...(sanitizedPayload as HomeSectionInsert),
      })
      .select('*')
      .single();

  const data = persistenceResult.data;
  const persistenceError = persistenceResult.error?.message ?? null;

  if (persistenceError) {
    return { data: null, error: persistenceError };
  }

  if (!data) {
    return { data: null, error: 'Nao foi possivel salvar a secao da Home.' };
  }

  await logHomeSectionAction(
    'update_home_section',
    {
      section_key: normalizedSectionKey,
      updated_fields: Object.keys(sanitizedPayload),
    },
    data.id,
  );

  return { data, error: null };
}

export async function uploadHomeImage(file: File): Promise<CmsServiceResult<HomeImageUploadResult>> {
  if (!supabase) {
    return missingConfigResult<HomeImageUploadResult>();
  }

  if (!file.type.startsWith('image/')) {
    return { data: null, error: 'Arquivo invalido. Envie uma imagem.' };
  }

  if (file.size > MAX_HOME_IMAGE_SIZE) {
    return { data: null, error: 'Imagem muito grande. Limite maximo de 8MB.' };
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() || 'jpg' : 'jpg';
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const filePath = `home-sections/${Date.now()}-${safeName}.${extension}`;

  let latestError: string | null = null;

  for (const bucket of HOME_IMAGE_BUCKETS) {
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

    await logHomeSectionAction('upload_home_image', {
      bucket,
      path: filePath,
      file_name: file.name,
      mime_type: file.type,
      size_bytes: file.size,
    });

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
    error: latestError ?? 'Falha ao enviar imagem da Home para o Storage.',
  };
}

export async function reorderHomeSections(
  items: ReorderHomeSectionItem[],
): Promise<CmsServiceResult<HomeSection[]>> {
  if (!supabase) {
    return missingConfigResult<HomeSection[]>();
  }

  if (!items.length) {
    return { data: [], error: null };
  }

  const invalidItem = items.find(
    (item) => !normalizeSectionKey(item.section_key) || !Number.isFinite(item.sort_order),
  );
  if (invalidItem) {
    return { data: null, error: 'Lista de ordenacao invalida.' };
  }

  const updates = await Promise.all(
    items.map((item) =>
      supabase
        .from('home_sections')
        .upsert(
          {
            section_key: normalizeSectionKey(item.section_key),
            sort_order: Number(item.sort_order),
          },
          { onConflict: 'section_key' },
        )
        .select('id')
        .single(),
    ),
  );

  const failed = updates.find((result) => result.error);
  if (failed?.error) {
    return { data: null, error: failed.error.message };
  }

  await logHomeSectionAction('reorder_home_sections', {
    total_items: items.length,
    sections: items.map((item) => ({
      section_key: normalizeSectionKey(item.section_key),
      sort_order: Number(item.sort_order),
    })),
  });

  return listHomeSections();
}
