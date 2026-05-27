import type { MediaBucket, MediaFileItem } from '../../../services/media.service';

export type MediaPickerTypeFilter = 'all' | 'image' | 'pdf' | 'document' | 'other';

export type MediaItemType = Exclude<MediaPickerTypeFilter, 'all'>;

export interface MediaPickerSelection {
  id: string;
  url: string;
  name: string;
  type: MediaItemType;
  bucket: MediaBucket;
  fullPath: string;
}

export const MEDIA_BUCKET_LABELS: Record<MediaBucket, string> = {
  logos: 'Logos',
  banners: 'Banners',
  stores: 'Lojas',
  products: 'Produtos',
  catalogs: 'Catalogos',
  pages: 'Paginas',
  institutional: 'Institucional',
};

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'svg', 'gif', 'avif']);
const PDF_EXTENSIONS = new Set(['pdf']);
const DOCUMENT_EXTENSIONS = new Set([
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'txt',
  'rtf',
  'odt',
  'ods',
  'csv',
]);

export function normalizeStoragePath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

export function getParentPath(path: string): string {
  const normalized = normalizeStoragePath(path);
  if (!normalized.includes('/')) {
    return '';
  }

  return normalized.split('/').slice(0, -1).join('/');
}

export function getFileExtension(fileName: string): string {
  const fileParts = fileName.toLowerCase().split('.');
  if (fileParts.length < 2) {
    return '';
  }

  return fileParts.at(-1) ?? '';
}

function isImageExtension(extension: string): boolean {
  return IMAGE_EXTENSIONS.has(extension);
}

function isPdfExtension(extension: string): boolean {
  return PDF_EXTENSIONS.has(extension);
}

function isDocumentExtension(extension: string): boolean {
  return DOCUMENT_EXTENSIONS.has(extension);
}

export function getMediaItemType(item: Pick<MediaFileItem, 'isFolder' | 'name' | 'mimeType'>): MediaItemType {
  if (item.isFolder) {
    return 'other';
  }

  const extension = getFileExtension(item.name);
  const mimeType = (item.mimeType ?? '').toLowerCase();

  if (mimeType.startsWith('image/') || isImageExtension(extension)) {
    return 'image';
  }

  if (mimeType === 'application/pdf' || isPdfExtension(extension)) {
    return 'pdf';
  }

  if (
    mimeType.startsWith('text/') ||
    mimeType.includes('word') ||
    mimeType.includes('excel') ||
    mimeType.includes('spreadsheet') ||
    mimeType.includes('presentation') ||
    mimeType.includes('officedocument') ||
    isDocumentExtension(extension)
  ) {
    return 'document';
  }

  return 'other';
}

export function matchesTypeFilter(
  item: Pick<MediaFileItem, 'isFolder' | 'name' | 'mimeType'>,
  filter: MediaPickerTypeFilter,
): boolean {
  if (item.isFolder) {
    return false;
  }

  if (filter === 'all') {
    return true;
  }

  return getMediaItemType(item) === filter;
}

export function inferMediaTypeByUrl(url: string): MediaItemType {
  const extension = getFileExtension(url.split('?')[0] ?? url);

  if (isImageExtension(extension)) {
    return 'image';
  }

  if (isPdfExtension(extension)) {
    return 'pdf';
  }

  if (isDocumentExtension(extension)) {
    return 'document';
  }

  return 'other';
}
