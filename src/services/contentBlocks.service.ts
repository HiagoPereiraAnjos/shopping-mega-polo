import { logActivity } from '../lib/logActivity';
import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type {
  CmsServiceResult,
  ContentBlock,
  ContentBlockInsert,
  ContentBlockItem,
  ContentBlockItemInsert,
  ContentBlockItemUpdate,
  ContentBlockUpdate,
} from '../types/cms';
import type { Json } from '../types/database';
import type { ContentBlockWithItems } from '../types/contentBlocks';

type ContentBlockAction =
  | 'create_content_block'
  | 'update_content_block'
  | 'delete_content_block'
  | 'reorder_content_blocks'
  | 'create_content_block_item'
  | 'update_content_block_item'
  | 'delete_content_block_item'
  | 'reorder_content_block_items';

export interface ReorderContentBlockItem {
  id: string;
  sort_order: number;
}

export interface ReorderContentBlockListItem {
  id: string;
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

function mapServiceError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('content_blocks_page_key_block_key_key')) {
    return 'Ja existe um bloco com este page_key e block_key.';
  }

  if (normalized.includes('row-level security')) {
    return 'Sua conta nao possui permissao para executar esta acao.';
  }

  return message;
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeKey(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
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

function normalizeJson(value: Json | undefined, fallback: Json = {}): Json {
  if (value === undefined) {
    return fallback;
  }

  if (value === null) {
    return {};
  }

  return value;
}

async function logContentBlockAction(
  action: ContentBlockAction,
  entity: 'content_blocks' | 'content_block_items',
  metadata: Record<string, unknown>,
  entityId?: string | null,
): Promise<void> {
  await logActivity({
    action,
    entity,
    entity_id: entityId ?? null,
    metadata,
  });
}

function sanitizeContentBlockInsertPayload(
  payload: ContentBlockInsert,
): ContentBlockInsert | { error: string } {
  const pageKey = normalizeKey(payload.page_key);
  const blockKey = normalizeKey(payload.block_key);
  const blockType = normalizeKey(payload.block_type);
  const sortOrder = normalizeSortOrder(payload.sort_order);

  if (!pageKey) {
    return { error: 'page_key e obrigatorio.' };
  }

  if (!blockKey) {
    return { error: 'block_key e obrigatorio.' };
  }

  if (!blockType) {
    return { error: 'block_type e obrigatorio.' };
  }

  if (Number.isNaN(sortOrder)) {
    return { error: 'sort_order deve ser numerico.' };
  }

  return {
    page_key: pageKey,
    block_key: blockKey,
    block_type: blockType,
    title: normalizeNullableText(payload.title),
    subtitle: normalizeNullableText(payload.subtitle),
    content: normalizeNullableText(payload.content),
    image_url: normalizeNullableText(payload.image_url),
    icon: normalizeNullableText(payload.icon),
    button_label: normalizeNullableText(payload.button_label),
    button_url: normalizeNullableText(payload.button_url),
    secondary_button_label: normalizeNullableText(payload.secondary_button_label),
    secondary_button_url: normalizeNullableText(payload.secondary_button_url),
    settings: normalizeJson(payload.settings),
    sort_order: sortOrder ?? 0,
    is_active: payload.is_active ?? true,
  };
}

function sanitizeContentBlockUpdatePayload(
  payload: ContentBlockUpdate,
): ContentBlockUpdate | { error: string } {
  const sanitized: ContentBlockUpdate = {};

  if (payload.page_key !== undefined) {
    const pageKey = normalizeKey(payload.page_key);
    if (!pageKey) {
      return { error: 'page_key invalido.' };
    }
    sanitized.page_key = pageKey;
  }

  if (payload.block_key !== undefined) {
    const blockKey = normalizeKey(payload.block_key);
    if (!blockKey) {
      return { error: 'block_key invalido.' };
    }
    sanitized.block_key = blockKey;
  }

  if (payload.block_type !== undefined) {
    const blockType = normalizeKey(payload.block_type);
    if (!blockType) {
      return { error: 'block_type invalido.' };
    }
    sanitized.block_type = blockType;
  }

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

  if (payload.icon !== undefined) {
    sanitized.icon = normalizeNullableText(payload.icon);
  }

  if (payload.button_label !== undefined) {
    sanitized.button_label = normalizeNullableText(payload.button_label);
  }

  if (payload.button_url !== undefined) {
    sanitized.button_url = normalizeNullableText(payload.button_url);
  }

  if (payload.secondary_button_label !== undefined) {
    sanitized.secondary_button_label = normalizeNullableText(payload.secondary_button_label);
  }

  if (payload.secondary_button_url !== undefined) {
    sanitized.secondary_button_url = normalizeNullableText(payload.secondary_button_url);
  }

  if (payload.settings !== undefined) {
    sanitized.settings = normalizeJson(payload.settings);
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

function sanitizeContentBlockItemInsertPayload(
  payload: ContentBlockItemInsert,
): ContentBlockItemInsert | { error: string } {
  const blockId = payload.block_id?.trim();
  const sortOrder = normalizeSortOrder(payload.sort_order);

  if (!blockId) {
    return { error: 'block_id e obrigatorio.' };
  }

  if (Number.isNaN(sortOrder)) {
    return { error: 'sort_order deve ser numerico.' };
  }

  return {
    block_id: blockId,
    title: normalizeNullableText(payload.title),
    subtitle: normalizeNullableText(payload.subtitle),
    content: normalizeNullableText(payload.content),
    image_url: normalizeNullableText(payload.image_url),
    icon: normalizeNullableText(payload.icon),
    button_label: normalizeNullableText(payload.button_label),
    button_url: normalizeNullableText(payload.button_url),
    metadata: normalizeJson(payload.metadata),
    sort_order: sortOrder ?? 0,
    is_active: payload.is_active ?? true,
  };
}

function sanitizeContentBlockItemUpdatePayload(
  payload: ContentBlockItemUpdate,
): ContentBlockItemUpdate | { error: string } {
  const sanitized: ContentBlockItemUpdate = {};

  if (payload.block_id !== undefined) {
    const blockId = payload.block_id.trim();
    if (!blockId) {
      return { error: 'block_id invalido.' };
    }
    sanitized.block_id = blockId;
  }

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

  if (payload.icon !== undefined) {
    sanitized.icon = normalizeNullableText(payload.icon);
  }

  if (payload.button_label !== undefined) {
    sanitized.button_label = normalizeNullableText(payload.button_label);
  }

  if (payload.button_url !== undefined) {
    sanitized.button_url = normalizeNullableText(payload.button_url);
  }

  if (payload.metadata !== undefined) {
    sanitized.metadata = normalizeJson(payload.metadata);
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

export async function listContentBlocks(pageKey: string): Promise<CmsServiceResult<ContentBlock[]>> {
  if (!supabase) {
    return missingConfigResult<ContentBlock[]>();
  }

  const normalizedPageKey = normalizeKey(pageKey);
  if (!normalizedPageKey) {
    return { data: null, error: 'page_key e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('content_blocks')
    .select('*')
    .eq('page_key', normalizedPageKey)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: mapServiceError(error.message) };
  }

  return { data: data ?? [], error: null };
}

export async function getContentBlock(
  pageKey: string,
  blockKey: string,
): Promise<CmsServiceResult<ContentBlock>> {
  if (!supabase) {
    return missingConfigResult<ContentBlock>();
  }

  const normalizedPageKey = normalizeKey(pageKey);
  const normalizedBlockKey = normalizeKey(blockKey);

  if (!normalizedPageKey || !normalizedBlockKey) {
    return { data: null, error: 'page_key e block_key sao obrigatorios.' };
  }

  const { data, error } = await supabase
    .from('content_blocks')
    .select('*')
    .eq('page_key', normalizedPageKey)
    .eq('block_key', normalizedBlockKey)
    .maybeSingle();

  if (error) {
    return { data: null, error: mapServiceError(error.message) };
  }

  return { data: data ?? null, error: null };
}

export async function getContentBlockWithItems(
  pageKey: string,
  blockKey: string,
): Promise<CmsServiceResult<ContentBlockWithItems>> {
  const blockResult = await getContentBlock(pageKey, blockKey);

  if (blockResult.error) {
    return { data: null, error: blockResult.error };
  }

  if (!blockResult.data) {
    return { data: null, error: 'Bloco de conteudo nao encontrado.' };
  }

  const itemsResult = await listBlockItems(blockResult.data.id);
  if (itemsResult.error) {
    return { data: null, error: itemsResult.error };
  }

  return {
    data: {
      ...blockResult.data,
      items: itemsResult.data ?? [],
    },
    error: null,
  };
}

export async function createContentBlock(
  payload: ContentBlockInsert,
): Promise<CmsServiceResult<ContentBlock>> {
  if (!supabase) {
    return missingConfigResult<ContentBlock>();
  }

  const sanitizedPayload = sanitizeContentBlockInsertPayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('content_blocks')
    .insert(sanitizedPayload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapServiceError(error.message) };
  }

  await logContentBlockAction(
    'create_content_block',
    'content_blocks',
    {
      page_key: data.page_key,
      block_key: data.block_key,
      block_type: data.block_type,
    },
    data.id,
  );

  return { data, error: null };
}

export async function updateContentBlock(
  id: string,
  payload: ContentBlockUpdate,
): Promise<CmsServiceResult<ContentBlock>> {
  if (!supabase) {
    return missingConfigResult<ContentBlock>();
  }

  const blockId = id.trim();
  if (!blockId) {
    return { data: null, error: 'ID do bloco e obrigatorio.' };
  }

  const sanitizedPayload = sanitizeContentBlockUpdatePayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('content_blocks')
    .update(sanitizedPayload)
    .eq('id', blockId)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapServiceError(error.message) };
  }

  await logContentBlockAction(
    'update_content_block',
    'content_blocks',
    {
      page_key: data.page_key,
      block_key: data.block_key,
      updated_fields: Object.keys(sanitizedPayload),
    },
    data.id,
  );

  return { data, error: null };
}

export async function deleteContentBlock(id: string): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  const blockId = id.trim();
  if (!blockId) {
    return { data: null, error: 'ID do bloco e obrigatorio.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('content_blocks')
    .select('id,page_key,block_key')
    .eq('id', blockId)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: mapServiceError(existingError.message) };
  }

  if (!existing) {
    return { data: null, error: 'Bloco de conteudo nao encontrado.' };
  }

  const { error } = await supabase.from('content_blocks').delete().eq('id', blockId);

  if (error) {
    return { data: null, error: mapServiceError(error.message) };
  }

  await logContentBlockAction(
    'delete_content_block',
    'content_blocks',
    {
      page_key: existing.page_key,
      block_key: existing.block_key,
    },
    existing.id,
  );

  return { data: { id: blockId }, error: null };
}

export async function reorderContentBlocks(
  pageKey: string,
  items: ReorderContentBlockListItem[],
): Promise<CmsServiceResult<ContentBlock[]>> {
  if (!supabase) {
    return missingConfigResult<ContentBlock[]>();
  }

  const normalizedPageKey = normalizeKey(pageKey);
  if (!normalizedPageKey) {
    return { data: null, error: 'page_key e obrigatorio.' };
  }

  if (!items.length) {
    return listContentBlocks(normalizedPageKey);
  }

  const invalidItem = items.find((item) => !item.id?.trim() || !Number.isFinite(item.sort_order));
  if (invalidItem) {
    return { data: null, error: 'Lista de ordenacao invalida.' };
  }

  const ids = items.map((item) => item.id.trim());
  const { data: scopedBlocks, error: scopedError } = await supabase
    .from('content_blocks')
    .select('id')
    .eq('page_key', normalizedPageKey)
    .in('id', ids);

  if (scopedError) {
    return { data: null, error: mapServiceError(scopedError.message) };
  }

  if ((scopedBlocks?.length ?? 0) !== ids.length) {
    return { data: null, error: 'Existem blocos fora da pagina informada.' };
  }

  const updates = await Promise.all(
    items.map((item) =>
      supabase
        .from('content_blocks')
        .update({ sort_order: Number(item.sort_order) })
        .eq('id', item.id.trim())
        .select('id')
        .single(),
    ),
  );

  const failed = updates.find((result) => result.error);
  if (failed?.error) {
    return { data: null, error: mapServiceError(failed.error.message) };
  }

  await logContentBlockAction(
    'reorder_content_blocks',
    'content_blocks',
    {
      page_key: normalizedPageKey,
      items: items.map((item) => ({
        id: item.id.trim(),
        sort_order: Number(item.sort_order),
      })),
    },
  );

  return listContentBlocks(normalizedPageKey);
}

export async function listBlockItems(blockId: string): Promise<CmsServiceResult<ContentBlockItem[]>> {
  if (!supabase) {
    return missingConfigResult<ContentBlockItem[]>();
  }

  const normalizedBlockId = blockId.trim();
  if (!normalizedBlockId) {
    return { data: null, error: 'block_id e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('content_block_items')
    .select('*')
    .eq('block_id', normalizedBlockId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: mapServiceError(error.message) };
  }

  return { data: data ?? [], error: null };
}

export async function createBlockItem(
  payload: ContentBlockItemInsert,
): Promise<CmsServiceResult<ContentBlockItem>> {
  if (!supabase) {
    return missingConfigResult<ContentBlockItem>();
  }

  const sanitizedPayload = sanitizeContentBlockItemInsertPayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('content_block_items')
    .insert(sanitizedPayload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapServiceError(error.message) };
  }

  await logContentBlockAction(
    'create_content_block_item',
    'content_block_items',
    {
      block_id: data.block_id,
      title: data.title,
    },
    data.id,
  );

  return { data, error: null };
}

export async function updateBlockItem(
  id: string,
  payload: ContentBlockItemUpdate,
): Promise<CmsServiceResult<ContentBlockItem>> {
  if (!supabase) {
    return missingConfigResult<ContentBlockItem>();
  }

  const itemId = id.trim();
  if (!itemId) {
    return { data: null, error: 'ID do item e obrigatorio.' };
  }

  const sanitizedPayload = sanitizeContentBlockItemUpdatePayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('content_block_items')
    .update(sanitizedPayload)
    .eq('id', itemId)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapServiceError(error.message) };
  }

  await logContentBlockAction(
    'update_content_block_item',
    'content_block_items',
    {
      block_id: data.block_id,
      updated_fields: Object.keys(sanitizedPayload),
    },
    data.id,
  );

  return { data, error: null };
}

export async function deleteBlockItem(id: string): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  const itemId = id.trim();
  if (!itemId) {
    return { data: null, error: 'ID do item e obrigatorio.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('content_block_items')
    .select('id,block_id,title')
    .eq('id', itemId)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: mapServiceError(existingError.message) };
  }

  if (!existing) {
    return { data: null, error: 'Item de bloco nao encontrado.' };
  }

  const { error } = await supabase.from('content_block_items').delete().eq('id', itemId);

  if (error) {
    return { data: null, error: mapServiceError(error.message) };
  }

  await logContentBlockAction(
    'delete_content_block_item',
    'content_block_items',
    {
      block_id: existing.block_id,
      title: existing.title,
    },
    existing.id,
  );

  return { data: { id: itemId }, error: null };
}

export async function reorderBlockItems(
  blockId: string,
  items: ReorderContentBlockItem[],
): Promise<CmsServiceResult<ContentBlockItem[]>> {
  if (!supabase) {
    return missingConfigResult<ContentBlockItem[]>();
  }

  const normalizedBlockId = blockId.trim();
  if (!normalizedBlockId) {
    return { data: null, error: 'block_id e obrigatorio.' };
  }

  if (!items.length) {
    return listBlockItems(normalizedBlockId);
  }

  const invalidItem = items.find((item) => !item.id?.trim() || !Number.isFinite(item.sort_order));
  if (invalidItem) {
    return { data: null, error: 'Lista de ordenacao invalida.' };
  }

  const ids = items.map((item) => item.id.trim());
  const { data: scopedItems, error: scopedError } = await supabase
    .from('content_block_items')
    .select('id')
    .eq('block_id', normalizedBlockId)
    .in('id', ids);

  if (scopedError) {
    return { data: null, error: mapServiceError(scopedError.message) };
  }

  if ((scopedItems?.length ?? 0) !== ids.length) {
    return { data: null, error: 'Existem itens fora do bloco informado.' };
  }

  const updates = await Promise.all(
    items.map((item) =>
      supabase
        .from('content_block_items')
        .update({ sort_order: Number(item.sort_order) })
        .eq('id', item.id.trim())
        .select('id')
        .single(),
    ),
  );

  const failed = updates.find((result) => result.error);
  if (failed?.error) {
    return { data: null, error: mapServiceError(failed.error.message) };
  }

  await logContentBlockAction(
    'reorder_content_block_items',
    'content_block_items',
    {
      block_id: normalizedBlockId,
      items: items.map((item) => ({
        id: item.id.trim(),
        sort_order: Number(item.sort_order),
      })),
    },
  );

  return listBlockItems(normalizedBlockId);
}
