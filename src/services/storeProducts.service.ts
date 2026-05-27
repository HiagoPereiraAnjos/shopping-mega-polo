import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type { Json } from '../types/database';
import type {
  CmsServiceResult,
  StoreProduct,
  StoreProductInsert,
  StoreProductUpdate,
} from '../types/cms';

export interface ReorderStoreProductItem {
  id: string;
  sort_order: number;
}

export interface StoreProductAssetUploadResult {
  path: string;
  publicUrl: string;
}

type StoreProductLogAction =
  | 'create_store_product'
  | 'update_store_product'
  | 'delete_store_product'
  | 'reorder_store_products';

const STORE_PRODUCTS_BUCKET = 'products';

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
    .toLowerCase();
}

function normalizeNullableText(value?: string | null): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized || null;
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

async function logStoreProductAction(
  action: StoreProductLogAction,
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
    entity: 'store_products',
    entity_id: entityId ?? null,
    metadata: metadata as Json,
  });

  if (error && import.meta.env.DEV) {
    console.warn('Falha ao registrar log de produto da loja:', error.message);
  }
}

async function getNextSortOrder(storeId: string): Promise<CmsServiceResult<number>> {
  if (!supabase) {
    return missingConfigResult<number>();
  }

  const { data, error } = await supabase
    .from('store_products')
    .select('sort_order')
    .eq('store_id', storeId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: error.message };
  }

  const nextSortOrder = (data?.sort_order ?? -1) + 1;
  return { data: nextSortOrder, error: null };
}

export async function listProductsByStore(storeId: string): Promise<CmsServiceResult<StoreProduct[]>> {
  if (!supabase) {
    return missingConfigResult<StoreProduct[]>();
  }

  if (!storeId.trim()) {
    return { data: null, error: 'ID da loja e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('store_products')
    .select('*')
    .eq('store_id', storeId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true });

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function createProduct(data: StoreProductInsert): Promise<CmsServiceResult<StoreProduct>> {
  if (!supabase) {
    return missingConfigResult<StoreProduct>();
  }

  const storeId = data.store_id?.trim();
  const name = data.name?.trim();

  if (!storeId) {
    return { data: null, error: 'Loja obrigatoria para criar produto.' };
  }

  if (!name) {
    return { data: null, error: 'Nome do produto e obrigatorio.' };
  }

  const normalizedPrice = normalizePrice(data.price);
  if (Number.isNaN(normalizedPrice)) {
    return { data: null, error: 'Preco invalido. Informe um valor numerico positivo.' };
  }

  const sortOrderResult = data.sort_order === undefined || data.sort_order === null
    ? await getNextSortOrder(storeId)
    : { data: data.sort_order, error: null as string | null };

  if (sortOrderResult.error || sortOrderResult.data === null) {
    return { data: null, error: sortOrderResult.error ?? 'Falha ao definir ordenacao do produto.' };
  }

  const payload: StoreProductInsert = {
    store_id: storeId,
    name,
    description: normalizeNullableText(data.description),
    image_url: normalizeNullableText(data.image_url),
    category: normalizeNullableText(data.category),
    price: normalizedPrice,
    is_active: data.is_active ?? true,
    sort_order: sortOrderResult.data,
  };

  const { data: created, error } = await supabase
    .from('store_products')
    .insert(payload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logStoreProductAction(
    'create_store_product',
    {
      product_id: created.id,
      store_id: created.store_id,
      name: created.name,
    },
    created.id,
  );

  return { data: created, error: null };
}

export async function updateProduct(
  id: string,
  data: StoreProductUpdate,
): Promise<CmsServiceResult<StoreProduct>> {
  if (!supabase) {
    return missingConfigResult<StoreProduct>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do produto e obrigatorio.' };
  }

  const payload: StoreProductUpdate = {};

  if (data.store_id !== undefined) {
    const storeId = data.store_id?.trim();
    if (!storeId) {
      return { data: null, error: 'Loja obrigatoria para atualizar produto.' };
    }
    payload.store_id = storeId;
  }

  if (data.name !== undefined) {
    const name = data.name?.trim();
    if (!name) {
      return { data: null, error: 'Nome do produto e obrigatorio.' };
    }
    payload.name = name;
  }

  if (data.description !== undefined) {
    payload.description = normalizeNullableText(data.description);
  }

  if (data.image_url !== undefined) {
    payload.image_url = normalizeNullableText(data.image_url);
  }

  if (data.category !== undefined) {
    payload.category = normalizeNullableText(data.category);
  }

  if (data.price !== undefined) {
    const normalizedPrice = normalizePrice(data.price);
    if (Number.isNaN(normalizedPrice)) {
      return { data: null, error: 'Preco invalido. Informe um valor numerico positivo.' };
    }
    payload.price = normalizedPrice;
  }

  if (data.is_active !== undefined) {
    payload.is_active = data.is_active;
  }

  if (data.sort_order !== undefined) {
    if (!Number.isFinite(data.sort_order)) {
      return { data: null, error: 'sort_order deve ser numerico.' };
    }
    payload.sort_order = data.sort_order;
  }

  const { data: updated, error } = await supabase
    .from('store_products')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logStoreProductAction(
    'update_store_product',
    {
      product_id: updated.id,
      store_id: updated.store_id,
      updated_fields: Object.keys(payload),
    },
    updated.id,
  );

  return { data: updated, error: null };
}

export async function deleteProduct(id: string): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do produto e obrigatorio.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('store_products')
    .select('id,store_id,name')
    .eq('id', id)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: existingError.message };
  }

  if (!existing) {
    return { data: null, error: 'Produto nao encontrado.' };
  }

  const { error } = await supabase.from('store_products').delete().eq('id', id);

  if (error) {
    return { data: null, error: error.message };
  }

  await logStoreProductAction(
    'delete_store_product',
    {
      product_id: existing.id,
      store_id: existing.store_id,
      name: existing.name,
    },
    existing.id,
  );

  return { data: { id }, error: null };
}

export async function uploadProductImage(
  file: File,
): Promise<CmsServiceResult<StoreProductAssetUploadResult>> {
  if (!supabase) {
    return missingConfigResult<StoreProductAssetUploadResult>();
  }

  const extension = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase() || 'png'
    : 'png';
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const filePath = `store-products/${Date.now()}-${safeName}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(STORE_PRODUCTS_BUCKET).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    return { data: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(STORE_PRODUCTS_BUCKET).getPublicUrl(filePath);

  return {
    data: {
      path: filePath,
      publicUrl: data.publicUrl,
    },
    error: null,
  };
}

export async function reorderProducts(
  storeId: string,
  items: ReorderStoreProductItem[],
): Promise<CmsServiceResult<StoreProduct[]>> {
  if (!supabase) {
    return missingConfigResult<StoreProduct[]>();
  }

  if (!storeId.trim()) {
    return { data: null, error: 'ID da loja e obrigatorio para ordenar produtos.' };
  }

  if (!items.length) {
    return { data: [], error: null };
  }

  const invalidItem = items.find(
    (item) => !item.id.trim() || !Number.isFinite(item.sort_order),
  );
  if (invalidItem) {
    return { data: null, error: 'Lista de ordenacao invalida.' };
  }

  for (const item of items) {
    const { error } = await supabase
      .from('store_products')
      .update({ sort_order: item.sort_order })
      .eq('id', item.id)
      .eq('store_id', storeId);

    if (error) {
      return { data: null, error: error.message };
    }
  }

  await logStoreProductAction(
    'reorder_store_products',
    {
      store_id: storeId,
      item_count: items.length,
      ordered_ids: items.map((item) => item.id),
    },
    null,
  );

  return listProductsByStore(storeId);
}
