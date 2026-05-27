import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Copy,
  ExternalLink,
  FileImage,
  FileText,
  FolderOpen,
  RefreshCcw,
  Trash2,
  Upload,
} from 'lucide-react';
import { SEO } from '../../components/ui/SEO';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminTable, { type AdminTableColumn } from '../../components/admin/AdminTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  deleteFile,
  getPublicUrl,
  listFiles,
  logMediaUrlCopy,
  MEDIA_BUCKETS,
  uploadFile,
  type MediaBucket,
  type MediaFileItem,
} from '../../services/media.service';

const BUCKET_LABELS: Record<MediaBucket, string> = {
  logos: 'Logos',
  banners: 'Banners',
  stores: 'Lojas',
  products: 'Produtos',
  catalogs: 'Catalogos',
  pages: 'Paginas',
  institutional: 'Institucional',
};

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) {
    return 'Tamanho nao informado';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(value: string | null): string {
  if (!value) {
    return '-';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR');
}

function normalizePath(path: string): string {
  return path
    .trim()
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/\/+$/, '');
}

function getFileExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split('.');
  if (parts.length < 2) {
    return '';
  }
  return parts.at(-1) ?? '';
}

function isImageItem(item: MediaFileItem): boolean {
  if (item.isFolder) {
    return false;
  }

  const mimeType = (item.mimeType || '').toLowerCase();
  const extension = getFileExtension(item.name);

  return (
    mimeType.startsWith('image/') ||
    ['jpg', 'jpeg', 'png', 'webp', 'svg'].includes(extension)
  );
}

function isPdfItem(item: MediaFileItem): boolean {
  if (item.isFolder) {
    return false;
  }

  const mimeType = (item.mimeType || '').toLowerCase();
  const extension = getFileExtension(item.name);
  return mimeType === 'application/pdf' || extension === 'pdf';
}

async function copyTextToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Fallback below.
  }

  try {
    const textArea = document.createElement('textarea');
    textArea.value = value;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    const copied = document.execCommand('copy');
    document.body.removeChild(textArea);
    return copied;
  } catch {
    return false;
  }
}

function getParentPath(path: string): string {
  const normalized = normalizePath(path);
  if (!normalized.includes('/')) {
    return '';
  }
  return normalized.split('/').slice(0, -1).join('/');
}

export default function MediaAdmin() {
  const [bucket, setBucket] = useState<MediaBucket>('logos');
  const [pathDraft, setPathDraft] = useState('');
  const [activePath, setActivePath] = useState('');

  const [files, setFiles] = useState<MediaFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [uploadTargetFile, setUploadTargetFile] = useState<File | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<MediaFileItem | null>(null);

  const refreshFiles = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setFiles([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await listFiles(bucket, activePath);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setFiles(result.data ?? []);
  }, [bucket, activePath]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshFiles();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshFiles]);

  const folders = useMemo(
    () => files.filter((item) => item.isFolder),
    [files],
  );
  const imageItems = useMemo(
    () => files.filter((item) => isImageItem(item)),
    [files],
  );
  const documentItems = useMemo(
    () => files.filter((item) => !item.isFolder && !isImageItem(item)),
    [files],
  );

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const handleApplyPath = () => {
    clearMessages();
    const normalized = normalizePath(pathDraft);
    setActivePath(normalized);
    setPathDraft(normalized);
  };

  const handleResetPath = () => {
    clearMessages();
    setPathDraft('');
    setActivePath('');
  };

  const handleChangeBucket = (nextBucket: MediaBucket) => {
    clearMessages();
    setBucket(nextBucket);
    setPathDraft('');
    setActivePath('');
    setUploadTargetFile(null);
  };

  const handleUpload = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!uploadTargetFile) {
      setError('Selecione um arquivo para upload.');
      return;
    }

    setIsUploading(true);
    const result = await uploadFile(bucket, uploadTargetFile, activePath);
    setIsUploading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setUploadTargetFile(null);
    setSuccessMessage('Arquivo enviado com sucesso.');
    await refreshFiles();
  };

  const handleDelete = async () => {
    if (!pendingDeleteItem) {
      return;
    }

    clearMessages();
    setIsDeleting(true);
    const result = await deleteFile(bucket, pendingDeleteItem.fullPath);
    setIsDeleting(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPendingDeleteItem(null);
    setSuccessMessage('Arquivo removido com sucesso.');
    await refreshFiles();
  };

  const handleCopyUrl = async (item: MediaFileItem) => {
    clearMessages();
    const publicUrl = getPublicUrl(bucket, item.fullPath);

    if (!publicUrl) {
      setError('Nao foi possivel gerar URL publica para este arquivo.');
      return;
    }

    const copied = await copyTextToClipboard(publicUrl);

    if (!copied) {
      setError('Nao foi possivel copiar a URL. Copie manualmente: ' + publicUrl);
      return;
    }

    await logMediaUrlCopy(bucket, item.fullPath);
    setSuccessMessage('URL publica copiada para a area de transferencia.');
  };

  const documentColumns: Array<AdminTableColumn<MediaFileItem>> = [
    {
      key: 'file',
      label: 'Arquivo',
      render: (row) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            {isPdfItem(row) ? (
              <FileText className="w-4 h-4 text-brand-red" />
            ) : (
              <FileImage className="w-4 h-4 text-brand-dark/60" />
            )}
            <p className="font-semibold text-brand-dark">{row.name}</p>
          </div>
          <p className="text-xs text-brand-dark/60">{formatFileSize(row.size)}</p>
        </div>
      ),
    },
    {
      key: 'updated',
      label: 'Atualizado em',
      render: (row) => (
        <span className="text-xs text-brand-dark/70">{formatDate(row.updatedAt)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => {
        const publicUrl = getPublicUrl(bucket, row.fullPath);

        return (
          <div className="flex flex-wrap gap-2">
            <a
              href={publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Abrir
            </a>
            <button
              type="button"
              onClick={() => void handleCopyUrl(row)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
            >
              <Copy className="w-3.5 h-3.5" />
              Copiar URL
            </button>
            <button
              type="button"
              onClick={() => setPendingDeleteItem(row)}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <>
      <SEO
        title="Midias | CMS Mega Polo Moda"
        description="Biblioteca de midia para upload, consulta e remocao de arquivos dos buckets do Supabase."
      />

      <AdminPageHeader
        title="Biblioteca de Midia"
        description="Visualize, envie, copie URL publica e remova arquivos dos buckets de conteudo."
        actions={(
          <button
            type="button"
            onClick={() => void refreshFiles()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Atualizar
          </button>
        )}
      />

      {!isSupabaseConfigured && (
        <div className="mb-6">
          <AdminEmptyState
            title="Supabase nao configurado"
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar a biblioteca de midia."
          />
        </div>
      )}

      {isLoading && <AdminLoadingState label="Carregando arquivos do bucket..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshFiles()} />}

      {!isLoading && !error && (
        <div className="space-y-6">
          <AdminCard title="Upload e navegacao" description="Selecione bucket e caminho para listar e enviar arquivos.">
            <form className="space-y-5" onSubmit={handleUpload}>
              {successMessage && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                  {successMessage}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label htmlFor="media-bucket" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Bucket
                  </label>
                  <select
                    id="media-bucket"
                    value={bucket}
                    onChange={(event) => handleChangeBucket(event.target.value as MediaBucket)}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  >
                    {MEDIA_BUCKETS.map((bucketOption) => (
                      <option key={bucketOption} value={bucketOption}>
                        {BUCKET_LABELS[bucketOption]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <label htmlFor="media-path" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Caminho (opcional)
                  </label>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      id="media-path"
                      type="text"
                      value={pathDraft}
                      onChange={(event) => setPathDraft(event.target.value)}
                      placeholder="Ex: home/hero ou store-catalogs"
                      className="flex-1 rounded-xl border border-brand-dark/15 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    />
                    <button
                      type="button"
                      onClick={handleApplyPath}
                      className="px-4 py-2.5 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                    >
                      Aplicar
                    </button>
                    <button
                      type="button"
                      onClick={handleResetPath}
                      className="px-4 py-2.5 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/40 p-4 space-y-3">
                <p className="text-xs text-brand-dark/70">
                  Bucket atual: <span className="font-semibold text-brand-dark">{BUCKET_LABELS[bucket]}</span>
                  {' '}| Caminho ativo: <span className="font-semibold text-brand-dark">{activePath || '/'}</span>
                </p>

                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
                  <Upload className="w-4 h-4" />
                  {uploadTargetFile ? 'Trocar arquivo' : 'Selecionar arquivo'}
                  <input
                    type="file"
                    className="hidden"
                    accept={bucket === 'catalogs' ? 'application/pdf,.pdf' : 'image/jpeg,image/jpg,image/png,image/webp,image/svg+xml,.jpg,.jpeg,.png,.webp,.svg'}
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] ?? null;
                      setUploadTargetFile(nextFile);
                    }}
                  />
                </label>

                {uploadTargetFile && (
                  <p className="text-sm text-brand-dark/70">
                    {uploadTargetFile.name} | {formatFileSize(uploadTargetFile.size)}
                  </p>
                )}

                <p className="text-xs text-brand-dark/60">
                  {bucket === 'catalogs'
                    ? 'Catalogos: somente PDF, ate 25MB.'
                    : 'Imagens: JPG, PNG, WEBP ou SVG. Limites: raster 10MB, SVG 2MB.'}
                </p>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isUploading}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Upload className="w-4 h-4" />
                  {isUploading ? 'Enviando...' : 'Enviar arquivo'}
                </button>
              </div>
            </form>
          </AdminCard>

          {folders.length > 0 && (
            <AdminCard title="Pastas" description="Abra uma pasta para navegar no conteudo interno.">
              <div className="flex flex-wrap gap-2">
                {activePath && (
                  <button
                    type="button"
                    onClick={() => {
                      const parentPath = getParentPath(activePath);
                      setActivePath(parentPath);
                      setPathDraft(parentPath);
                      clearMessages();
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    Voltar nivel
                  </button>
                )}
                {folders.map((folder) => (
                  <button
                    key={folder.fullPath}
                    type="button"
                    onClick={() => {
                      setActivePath(folder.fullPath);
                      setPathDraft(folder.fullPath);
                      clearMessages();
                    }}
                    className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                  >
                    <FolderOpen className="w-4 h-4" />
                    {folder.name}
                  </button>
                ))}
              </div>
            </AdminCard>
          )}

          <AdminCard title="Imagens" description="Visualizacao em grade para arquivos de imagem.">
            {imageItems.length === 0 ? (
              <AdminEmptyState
                title="Sem imagens neste local"
                description="Envie imagens para este bucket ou ajuste o caminho para visualizar outros arquivos."
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {imageItems.map((item) => {
                  const publicUrl = getPublicUrl(bucket, item.fullPath);

                  return (
                    <article
                      key={item.fullPath}
                      className="rounded-xl border border-brand-dark/10 bg-white overflow-hidden"
                    >
                      <div className="aspect-[4/3] bg-brand-paper/70">
                        {publicUrl ? (
                          <ImageWithFallback
                            src={publicUrl}
                            alt={item.name}
                            className="w-full h-full object-cover"
                            loading="lazy"
                            width={640}
                            height={480}
                            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-brand-dark/50">
                            <FileImage className="w-8 h-8" />
                          </div>
                        )}
                      </div>
                      <div className="p-3 space-y-2">
                        <p className="text-sm font-semibold text-brand-dark break-all">{item.name}</p>
                        <p className="text-xs text-brand-dark/60">{formatFileSize(item.size)}</p>
                        <p className="text-xs text-brand-dark/60">{formatDate(item.updatedAt)}</p>
                        <div className="flex flex-wrap gap-2">
                          <a
                            href={publicUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-dark/15 text-[11px] font-semibold hover:bg-brand-paper transition-colors"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Abrir
                          </a>
                          <button
                            type="button"
                            onClick={() => void handleCopyUrl(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-dark/15 text-[11px] font-semibold hover:bg-brand-paper transition-colors"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            Copiar URL
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeleteItem(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 text-[11px] font-semibold hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </AdminCard>

          <AdminCard title="Documentos" description="Lista para PDFs e outros arquivos nao-imagem.">
            {documentItems.length === 0 ? (
              <AdminEmptyState
                title="Sem documentos neste local"
                description="PDFs e outros documentos aparecem aqui."
              />
            ) : (
              <AdminTable
                columns={documentColumns}
                rows={documentItems}
                rowKey={(row) => row.fullPath}
                emptyMessage="Nenhum documento encontrado."
              />
            )}
          </AdminCard>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDeleteItem}
        title="Excluir arquivo"
        description={
          pendingDeleteItem
            ? `Tem certeza que deseja excluir "${pendingDeleteItem.name}" deste bucket?`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isDeleting}
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
