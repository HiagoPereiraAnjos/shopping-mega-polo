import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type {
  Category,
  CategoryInsert,
  CategoryUpdate,
  CmsServiceResult,
} from '../types/cms';
import { logActivity } from '../lib/logActivity';

export interface ListCategoriesOptions {
  activeOnly?: boolean;
  query?: string;
}

export interface ReorderCategoryItem {
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

function isValidSortOrder(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value);
}

async function logCategoryAction(
  action: 'create_category' | 'update_category' | 'delete_category' | 'reorder_categories',
  metadata: Record<string, unknown>,
  entityId?: string | null,
): Promise<void> {
  await logActivity({
    action,
    entity: 'categories',
    entity_id: entityId ?? null,
    metadata,
  });
}

async function ensureSlugIsUnique(
  slug: string,
  excludeId?: string,
): Promise<{ isUnique: boolean; error: string | null }> {
  if (!supabase) {
    return { isUnique: false, error: missingConfigResult<Category>().error };
  }

  let query = supabase.from('categories').select('id').eq('slug', slug).limit(1);

  if (excludeId) {
    query = query.neq('id', excludeId);
  }

  const { data, error } = await query.maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { isUnique: false, error: error.message };
  }

  return { isUnique: !data, error: null };
}

export async function listCategories(
  options: ListCategoriesOptions = {},
): Promise<CmsServiceResult<Category[]>> {
  if (!supabase) {
    return missingConfigResult<Category[]>();
  }

  let query = supabase
    .from('categories')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (options.activeOnly) {
    query = query.eq('is_active', true);
  }

  if (options.query?.trim()) {
    const sanitized = options.query.replace(/[%_,]/g, '').trim();
    if (sanitized) {
      query = query.or(`name.ilike.%${sanitized}%,slug.ilike.%${sanitized}%,description.ilike.%${sanitized}%`);
    }
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function getCategoryById(id: string): Promise<CmsServiceResult<Category>> {
  if (!supabase) {
    return missingConfigResult<Category>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da categoria e obrigatorio.' };
  }

  const { data, error } = await supabase.from('categories').select('*').eq('id', id).maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

export async function createCategory(data: CategoryInsert): Promise<CmsServiceResult<Category>> {
  if (!supabase) {
    return missingConfigResult<Category>();
  }

  const name = data.name?.trim();
  const inputSlug = data.slug?.trim();

  if (!name) {
    return { data: null, error: 'Nome da categoria e obrigatorio.' };
  }

  if (!inputSlug) {
    return { data: null, error: 'Slug da categoria e obrigatorio.' };
  }

  const slug = normalizeSlug(inputSlug);

  if (!slug) {
    return { data: null, error: 'Slug invalido. Use letras, numeros e hifens.' };
  }

  const unique = await ensureSlugIsUnique(slug);
  if (unique.error) {
    return { data: null, error: unique.error };
  }

  if (!unique.isUnique) {
    return { data: null, error: 'Slug ja existe. Escolha outro slug.' };
  }

  const sortOrder = data.sort_order ?? 0;
  if (!isValidSortOrder(sortOrder)) {
    return { data: null, error: 'sort_order deve ser numerico.' };
  }

  const payload: CategoryInsert = {
    name,
    slug,
    description: data.description?.trim() || null,
    icon: data.icon?.trim() || null,
    color: data.color?.trim() || null,
    sort_order: sortOrder,
    is_active: data.is_active ?? true,
  };

  const { data: created, error } = await supabase
    .from('categories')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logCategoryAction('create_category', {
    category_id: created.id,
    name: created.name,
    slug: created.slug,
  }, created.id);

  return { data: created, error: null };
}

export async function updateCategory(
  id: string,
  data: CategoryUpdate,
): Promise<CmsServiceResult<Category>> {
  if (!supabase) {
    return missingConfigResult<Category>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da categoria e obrigatorio.' };
  }

  const payload: CategoryUpdate = {};

  if (typeof data.name === 'string') {
    const name = data.name.trim();
    if (!name) {
      return { data: null, error: 'Nome da categoria e obrigatorio.' };
    }
    payload.name = name;
  }

  if (typeof data.slug === 'string') {
    const slug = normalizeSlug(data.slug);
    if (!slug) {
      return { data: null, error: 'Slug invalido. Use letras, numeros e hifens.' };
    }

    const unique = await ensureSlugIsUnique(slug, id);
    if (unique.error) {
      return { data: null, error: unique.error };
    }

    if (!unique.isUnique) {
      return { data: null, error: 'Slug ja existe. Escolha outro slug.' };
    }

    payload.slug = slug;
  }

  if (data.description !== undefined) {
    payload.description = data.description?.trim() || null;
  }

  if (data.icon !== undefined) {
    payload.icon = data.icon?.trim() || null;
  }

  if (data.color !== undefined) {
    payload.color = data.color?.trim() || null;
  }

  if (data.sort_order !== undefined) {
    if (!isValidSortOrder(data.sort_order)) {
      return { data: null, error: 'sort_order deve ser numerico.' };
    }
    payload.sort_order = data.sort_order;
  }

  if (data.is_active !== undefined) {
    payload.is_active = data.is_active;
  }

  const { data: updated, error } = await supabase
    .from('categories')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logCategoryAction('update_category', {
    category_id: updated.id,
    updated_fields: Object.keys(payload),
  }, updated.id);

  return { data: updated, error: null };
}

export async function deleteCategory(id: string): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID da categoria e obrigatorio.' };
  }

  const { data: category, error: categoryError } = await supabase
    .from('categories')
    .select('id,name,slug')
    .eq('id', id)
    .maybeSingle();

  if (categoryError) {
    return { data: null, error: categoryError.message };
  }

  if (!category) {
    return { data: null, error: 'Categoria nao encontrada.' };
  }

  const { error } = await supabase.from('categories').delete().eq('id', id);

  if (error) {
    return { data: null, error: error.message };
  }

  await logCategoryAction('delete_category', {
    category_id: category.id,
    name: category.name,
    slug: category.slug,
  }, category.id);

  return { data: { id }, error: null };
}

export async function reorderCategories(
  items: ReorderCategoryItem[],
): Promise<CmsServiceResult<Category[]>> {
  if (!supabase) {
    return missingConfigResult<Category[]>();
  }

  if (!items.length) {
    return { data: [], error: null };
  }

  const invalidItem = items.find((item) => !item.id || !isValidSortOrder(item.sort_order));
  if (invalidItem) {
    return { data: null, error: 'Lista de ordenacao invalida.' };
  }

  const updates = await Promise.all(
    items.map((item) =>
      supabase
        .from('categories')
        .update({ sort_order: item.sort_order })
        .eq('id', item.id)
        .select('id')
        .single(),
    ),
  );

  const failed = updates.find((result) => result.error);
  if (failed?.error) {
    return { data: null, error: failed.error.message };
  }

  await logCategoryAction('reorder_categories', {
    total_items: items.length,
    item_ids: items.map((item) => item.id),
  });

  return listCategories({ activeOnly: false });
}
