import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type { CmsServiceResult } from '../types/cms';
import type { Json } from '../types/database';

export type MediaBucket =
  | 'logos'
  | 'banners'
  | 'stores'
  | 'products'
  | 'catalogs'
  | 'pages'
  | 'institutional';

export interface MediaFileItem {
  bucket: MediaBucket;
  name: string;
  fullPath: string;
  directory: string;
  size: number | null;
  mimeType: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isFolder: boolean;
}

export interface MediaUploadResult {
  bucket: MediaBucket;
  fullPath: string;
  publicUrl: string;
}

export const MEDIA_BUCKETS: MediaBucket[] = [
  'logos',
  'banners',
  'stores',
  'products',
  'catalogs',
  'pages',
  'institutional',
];

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg']);
const IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/svg+xml',
]);
const PDF_EXTENSIONS = new Set(['pdf']);
const PDF_MIME_TYPES = new Set(['application/pdf']);

const MAX_RASTER_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_SVG_SIZE = 2 * 1024 * 1024; // 2MB
const MAX_PDF_SIZE = 25 * 1024 * 1024; // 25MB

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function normalizePath(path?: string | null): string {
  if (!path?.trim()) {
    return '';
  }

  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-._]+|[-._]+$/g, '')
    .toLowerCase();
}

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  if (parts.length < 2) {
    return '';
  }
  return parts.at(-1) ?? '';
}

function normalizeMimeType(fileType?: string): string {
  return (fileType || '').toLowerCase();
}

function isCatalogBucket(bucket: MediaBucket): boolean {
  return bucket === 'catalogs';
}

function isSvgFile(file: File): boolean {
  const extension = getFileExtension(file.name);
  return extension === 'svg' || normalizeMimeType(file.type) === 'image/svg+xml';
}

function validateUploadFile(bucket: MediaBucket, file: File): string | null {
  const extension = getFileExtension(file.name);
  const mimeType = normalizeMimeType(file.type);

  if (isCatalogBucket(bucket)) {
    const validPdf = PDF_EXTENSIONS.has(extension) || PDF_MIME_TYPES.has(mimeType);
    if (!validPdf) {
      return 'Para o bucket de catalogos, envie apenas arquivos PDF.';
    }

    if (file.size > MAX_PDF_SIZE) {
      return 'Arquivo PDF excede o limite de 25MB.';
    }

    return null;
  }

  const validImage = IMAGE_EXTENSIONS.has(extension) || IMAGE_MIME_TYPES.has(mimeType);
  if (!validImage) {
    return 'Envie apenas imagens JPG, PNG, WEBP ou SVG para este bucket.';
  }

  if (isSvgFile(file) && file.size > MAX_SVG_SIZE) {
    return 'Arquivo SVG excede o limite de 2MB.';
  }

  if (!isSvgFile(file) && file.size > MAX_RASTER_IMAGE_SIZE) {
    return 'Imagem excede o limite de 10MB.';
  }

  return null;
}

async function logMediaAction(
  action: 'upload_media' | 'delete_media' | 'copy_media_url',
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
    entity: 'media',
    entity_id: entityId ?? null,
    metadata: metadata as Json,
  });

  if (error && import.meta.env.DEV) {
    console.warn('Falha ao registrar log de midia:', error.message);
  }
}

function resolveUploadFilePath(bucket: MediaBucket, file: File, path?: string): string {
  const normalizedBasePath = normalizePath(path);
  const originalName = file.name.replace(/\.[^.]+$/, '');
  const safeBaseName = sanitizeFileName(originalName) || 'arquivo';

  const extensionFromName = getFileExtension(file.name);
  const extension =
    extensionFromName ||
    (bucket === 'catalogs'
      ? 'pdf'
      : isSvgFile(file)
        ? 'svg'
        : 'png');

  const fileName = `${Date.now()}-${safeBaseName}.${extension}`;
  return normalizedBasePath ? `${normalizedBasePath}/${fileName}` : fileName;
}

function mapStorageItem(bucket: MediaBucket, directory: string, item: Record<string, unknown>): MediaFileItem {
  const name = String(item.name ?? '');
  const normalizedDirectory = normalizePath(directory);
  const fullPath = normalizedDirectory ? `${normalizedDirectory}/${name}` : name;
  const metadata = (item.metadata as { size?: number; mimetype?: string } | null) ?? null;
  const id = item.id as string | null | undefined;

  return {
    bucket,
    name,
    fullPath,
    directory: normalizedDirectory,
    size: typeof metadata?.size === 'number' ? metadata.size : null,
    mimeType: metadata?.mimetype ?? null,
    createdAt: (item.created_at as string | null | undefined) ?? null,
    updatedAt: (item.updated_at as string | null | undefined) ?? null,
    isFolder: id === null,
  };
}

export async function listFiles(
  bucket: MediaBucket,
  path = '',
): Promise<CmsServiceResult<MediaFileItem[]>> {
  if (!supabase) {
    return missingConfigResult<MediaFileItem[]>();
  }

  const normalizedPath = normalizePath(path);

  const { data, error } = await supabase.storage.from(bucket).list(normalizedPath, {
    limit: 1000,
    offset: 0,
    sortBy: { column: 'updated_at', order: 'desc' },
  });

  if (error) {
    return { data: null, error: error.message };
  }

  const files = (data ?? [])
    .map((item) => mapStorageItem(bucket, normalizedPath, item as unknown as Record<string, unknown>))
    .filter((item) => !!item.name);

  return { data: files, error: null };
}

export async function uploadFile(
  bucket: MediaBucket,
  file: File,
  path = '',
): Promise<CmsServiceResult<MediaUploadResult>> {
  if (!supabase) {
    return missingConfigResult<MediaUploadResult>();
  }

  const validationError = validateUploadFile(bucket, file);
  if (validationError) {
    return { data: null, error: validationError };
  }

  const filePath = resolveUploadFilePath(bucket, file, path);

  const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file, {
    cacheControl: '3600',
    contentType: file.type || undefined,
    upsert: false,
  });

  if (uploadError) {
    return { data: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);

  await logMediaAction('upload_media', {
    bucket,
    path: filePath,
    size: file.size,
    mime_type: file.type || null,
  });

  return {
    data: {
      bucket,
      fullPath: filePath,
      publicUrl: data.publicUrl,
    },
    error: null,
  };
}

export async function deleteFile(
  bucket: MediaBucket,
  filePath: string,
): Promise<CmsServiceResult<{ bucket: MediaBucket; fullPath: string }>> {
  if (!supabase) {
    return missingConfigResult<{ bucket: MediaBucket; fullPath: string }>();
  }

  const normalizedPath = normalizePath(filePath);
  if (!normalizedPath) {
    return { data: null, error: 'Caminho do arquivo obrigatorio para exclusao.' };
  }

  const { error } = await supabase.storage.from(bucket).remove([normalizedPath]);

  if (error) {
    return { data: null, error: error.message };
  }

  await logMediaAction('delete_media', {
    bucket,
    path: normalizedPath,
  });

  return { data: { bucket, fullPath: normalizedPath }, error: null };
}

export function getPublicUrl(bucket: MediaBucket, filePath: string): string {
  if (!supabase) {
    return '';
  }

  const normalizedPath = normalizePath(filePath);
  if (!normalizedPath) {
    return '';
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(normalizedPath);
  return data.publicUrl;
}

export async function logMediaUrlCopy(
  bucket: MediaBucket,
  filePath: string,
): Promise<CmsServiceResult<{ success: true }>> {
  if (!supabase) {
    return missingConfigResult<{ success: true }>();
  }

  await logMediaAction('copy_media_url', {
    bucket,
    path: normalizePath(filePath),
  });

  return { data: { success: true }, error: null };
}
