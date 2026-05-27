import { supabase, supabaseConfigMessage } from '../lib/supabase';
import { logActivity } from '../lib/logActivity';
import type {
  Catalog,
  CatalogInsert,
  CatalogUpdate,
  CmsServiceResult,
} from '../types/cms';

const CATALOGS_BUCKET = 'catalogs';
const MAX_CATALOG_FILE_SIZE = 25 * 1024 * 1024; // 25MB

type CatalogLogAction =
  | 'upload_catalog'
  | 'update_catalog'
  | 'activate_catalog'
  | 'deactivate_catalog'
  | 'delete_catalog';

export interface CatalogPdfUploadResult {
  path: string;
  publicUrl: string;
  fileSize: number;
  fileName: string;
}

export interface ListCatalogsOptions {
  storeId?: string;
  status?: 'all' | 'active' | 'inactive';
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

function normalizeTitle(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeFileUrl(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function isPdfFile(file: File): boolean {
  const isMimePdf = file.type === 'application/pdf';
  const hasPdfExtension = file.name.toLowerCase().endsWith('.pdf');
  return isMimePdf || hasPdfExtension;
}

async function logCatalogAction(
  action: CatalogLogAction,
  metadata: Record<string, unknown>,
  entityId?: string | null,
): Promise<void> {
  await logActivity({
    action,
    entity: 'catalogs',
    entity_id: entityId ?? null,
    metadata,
  });
}

async function deactivateOtherActiveCatalogs(storeId: string, excludeCatalogId?: string): Promise<string | null> {
  if (!supabase) {
    return missingConfigResult<Catalog[]>().error;
  }

  let query = supabase
    .from('catalogs')
    .update({ is_active: false })
    .eq('store_id', storeId)
    .eq('is_active', true);

  if (excludeCatalogId) {
    query = query.neq('id', excludeCatalogId);
  }

  const { error } = await query;
  return error ? error.message : null;
}

export async function listCatalogs(
  options: ListCatalogsOptions = {},
): Promise<CmsServiceResult<Catalog[]>> {
  if (!supabase) {
    return missingConfigResult<Catalog[]>();
  }

  let query = supabase
    .from('catalogs')
    .select('*')
    .order('updated_at', { ascending: false });

  if (options.storeId) {
    query = query.eq('store_id', options.storeId);
  }

  if (options.status === 'active') {
    query = query.eq('is_active', true);
  }

  if (options.status === 'inactive') {
    query = query.eq('is_active', false);
  }

  const { data, error } = await query;

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? [], error: null };
}

export async function listCatalogsByStore(storeId: string): Promise<CmsServiceResult<Catalog[]>> {
  if (!storeId.trim()) {
    return { data: null, error: 'ID da loja e obrigatorio.' };
  }

  return listCatalogs({ storeId });
}

export async function getActiveCatalogByStore(storeId: string): Promise<CmsServiceResult<Catalog>> {
  if (!supabase) {
    return missingConfigResult<Catalog>();
  }

  if (!storeId.trim()) {
    return { data: null, error: 'ID da loja e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('catalogs')
    .select('*')
    .eq('store_id', storeId)
    .eq('is_active', true)
    .not('file_url', 'is', null)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    return { data: null, error: error.message };
  }

  if (data && !data.file_url.trim()) {
    return { data: null, error: null };
  }

  return { data: data ?? null, error: null };
}

export async function createCatalog(payload: CatalogInsert): Promise<CmsServiceResult<Catalog>> {
  if (!supabase) {
    return missingConfigResult<Catalog>();
  }

  const storeId = payload.store_id?.trim();
  const title = normalizeTitle(payload.title);
  const fileUrl = normalizeFileUrl(payload.file_url);

  if (!storeId) {
    return { data: null, error: 'Loja obrigatoria para criar catalogo.' };
  }

  if (!title) {
    return { data: null, error: 'Titulo do catalogo e obrigatorio.' };
  }

  if (!fileUrl) {
    return { data: null, error: 'Arquivo PDF do catalogo e obrigatorio.' };
  }

  const isActive = payload.is_active ?? true;
  if (isActive) {
    const deactivateError = await deactivateOtherActiveCatalogs(storeId);
    if (deactivateError) {
      return { data: null, error: deactivateError };
    }
  }

  const insertPayload: CatalogInsert = {
    store_id: storeId,
    title,
    file_url: fileUrl,
    file_size: payload.file_size ?? null,
    is_active: isActive,
  };

  const { data, error } = await supabase
    .from('catalogs')
    .insert(insertPayload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logCatalogAction(
    'upload_catalog',
    {
      catalog_id: data.id,
      store_id: data.store_id,
      title: data.title,
      is_active: data.is_active,
    },
    data.id,
  );

  return { data, error: null };
}

export async function updateCatalog(
  id: string,
  payload: CatalogUpdate,
): Promise<CmsServiceResult<Catalog>> {
  if (!supabase) {
    return missingConfigResult<Catalog>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do catalogo e obrigatorio.' };
  }

  const updatePayload: CatalogUpdate = {};

  if (payload.store_id !== undefined) {
    const normalizedStoreId = payload.store_id?.trim();
    if (!normalizedStoreId) {
      return { data: null, error: 'Loja obrigatoria para atualizar catalogo.' };
    }
    updatePayload.store_id = normalizedStoreId;
  }

  if (payload.title !== undefined) {
    const normalizedTitle = normalizeTitle(payload.title);
    if (!normalizedTitle) {
      return { data: null, error: 'Titulo do catalogo e obrigatorio.' };
    }
    updatePayload.title = normalizedTitle;
  }

  if (payload.file_url !== undefined) {
    const normalizedFileUrl = normalizeFileUrl(payload.file_url);
    if (!normalizedFileUrl) {
      return { data: null, error: 'file_url do catalogo e obrigatorio.' };
    }
    updatePayload.file_url = normalizedFileUrl;
  }

  if (payload.file_size !== undefined) {
    updatePayload.file_size = payload.file_size;
  }

  if (payload.is_active !== undefined) {
    updatePayload.is_active = payload.is_active;
  }

  const { data: current, error: currentError } = await supabase
    .from('catalogs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (currentError) {
    return { data: null, error: currentError.message };
  }

  if (!current) {
    return { data: null, error: 'Catalogo nao encontrado.' };
  }

  const willBeActive = updatePayload.is_active ?? current.is_active;
  const targetStoreId = updatePayload.store_id ?? current.store_id;

  if (willBeActive) {
    const deactivateError = await deactivateOtherActiveCatalogs(targetStoreId, current.id);
    if (deactivateError) {
      return { data: null, error: deactivateError };
    }
  }

  const { data, error } = await supabase
    .from('catalogs')
    .update(updatePayload)
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logCatalogAction(
    'update_catalog',
    {
      catalog_id: data.id,
      store_id: data.store_id,
      updated_fields: Object.keys(updatePayload),
    },
    data.id,
  );

  return { data, error: null };
}

export async function activateCatalog(id: string): Promise<CmsServiceResult<Catalog>> {
  if (!supabase) {
    return missingConfigResult<Catalog>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do catalogo e obrigatorio.' };
  }

  const { data: current, error: currentError } = await supabase
    .from('catalogs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (currentError) {
    return { data: null, error: currentError.message };
  }

  if (!current) {
    return { data: null, error: 'Catalogo nao encontrado.' };
  }

  if (!current.file_url.trim()) {
    return { data: null, error: 'Nao e possivel ativar catalogo sem PDF valido.' };
  }

  const deactivateError = await deactivateOtherActiveCatalogs(current.store_id, current.id);
  if (deactivateError) {
    return { data: null, error: deactivateError };
  }

  const { data, error } = await supabase
    .from('catalogs')
    .update({ is_active: true })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logCatalogAction(
    'activate_catalog',
    {
      catalog_id: data.id,
      store_id: data.store_id,
      title: data.title,
    },
    data.id,
  );

  return { data, error: null };
}

export async function deactivateCatalog(id: string): Promise<CmsServiceResult<Catalog>> {
  if (!supabase) {
    return missingConfigResult<Catalog>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do catalogo e obrigatorio.' };
  }

  const { data, error } = await supabase
    .from('catalogs')
    .update({ is_active: false })
    .eq('id', id)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  await logCatalogAction(
    'deactivate_catalog',
    {
      catalog_id: data.id,
      store_id: data.store_id,
      title: data.title,
    },
    data.id,
  );

  return { data, error: null };
}

export async function deleteCatalog(id: string): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  if (!id.trim()) {
    return { data: null, error: 'ID do catalogo e obrigatorio.' };
  }

  const { data: current, error: currentError } = await supabase
    .from('catalogs')
    .select('id,store_id,title')
    .eq('id', id)
    .maybeSingle();

  if (currentError) {
    return { data: null, error: currentError.message };
  }

  if (!current) {
    return { data: null, error: 'Catalogo nao encontrado.' };
  }

  const { error } = await supabase.from('catalogs').delete().eq('id', id);
  if (error) {
    return { data: null, error: error.message };
  }

  await logCatalogAction(
    'delete_catalog',
    {
      catalog_id: current.id,
      store_id: current.store_id,
      title: current.title,
    },
    current.id,
  );

  return { data: { id }, error: null };
}

export async function uploadCatalogPdf(file: File): Promise<CmsServiceResult<CatalogPdfUploadResult>> {
  if (!supabase) {
    return missingConfigResult<CatalogPdfUploadResult>();
  }

  if (!isPdfFile(file)) {
    return { data: null, error: 'Arquivo invalido. Envie um PDF.' };
  }

  if (file.size > MAX_CATALOG_FILE_SIZE) {
    return { data: null, error: 'PDF muito grande. Limite maximo de 25MB.' };
  }

  const originalName = file.name.toLowerCase().endsWith('.pdf')
    ? file.name
    : `${file.name}.pdf`;

  const safeName = sanitizeFileName(originalName.replace(/\.pdf$/i, ''));
  const filePath = `store-catalogs/${Date.now()}-${safeName}.pdf`;

  const { error: uploadError } = await supabase.storage
    .from(CATALOGS_BUCKET)
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf',
    });

  if (uploadError) {
    return { data: null, error: `Falha no upload do PDF: ${uploadError.message}` };
  }

  const { data } = supabase.storage.from(CATALOGS_BUCKET).getPublicUrl(filePath);

  return {
    data: {
      path: filePath,
      publicUrl: data.publicUrl,
      fileSize: file.size,
      fileName: `${safeName}.pdf`,
    },
    error: null,
  };
}
