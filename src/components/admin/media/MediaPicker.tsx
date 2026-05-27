import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Check,
  File as FileIcon,
  FileImage,
  FileText,
  FolderOpen,
  RefreshCcw,
  Search,
  UploadCloud,
} from 'lucide-react';
import AdminEmptyState from '../AdminEmptyState';
import AdminErrorState from '../AdminErrorState';
import AdminFormModal from '../AdminFormModal';
import AdminLoadingState from '../AdminLoadingState';
import { ImageWithFallback } from '../../ui/ImageWithFallback';
import { isSupabaseConfigured } from '../../../lib/supabase';
import {
  getPublicUrl,
  listFiles,
  MEDIA_BUCKETS,
  type MediaBucket,
  type MediaFileItem,
} from '../../../services/media.service';
import {
  getMediaItemType,
  getParentPath,
  matchesTypeFilter,
  MEDIA_BUCKET_LABELS,
  normalizeStoragePath,
  type MediaPickerSelection,
  type MediaPickerTypeFilter,
} from './mediaPicker.utils';

interface MediaPickerProps {
  open: boolean;
  onClose: () => void;
  onSelect: (selection: MediaPickerSelection) => void;
  title?: string;
  description?: string;
  allowedBuckets?: MediaBucket[];
  initialBucket?: MediaBucket;
  initialPath?: string;
  initialTypeFilter?: MediaPickerTypeFilter;
}

const TYPE_FILTER_OPTIONS: Array<{ value: MediaPickerTypeFilter; label: string }> = [
  { value: 'all', label: 'Todos os tipos' },
  { value: 'image', label: 'Imagem' },
  { value: 'pdf', label: 'PDF' },
  { value: 'document', label: 'Documento' },
  { value: 'other', label: 'Outros' },
];

function resolveInitialBucket(
  allowedBuckets: MediaBucket[],
  initialBucket: MediaBucket | undefined,
): MediaBucket {
  if (initialBucket && allowedBuckets.includes(initialBucket)) {
    return initialBucket;
  }

  return allowedBuckets[0] ?? 'logos';
}

function fileUpdatedAt(file: MediaFileItem): string {
  return file.updatedAt ?? file.createdAt ?? '';
}

export default function MediaPicker({
  open,
  onClose,
  onSelect,
  title = 'Selecionar arquivo da biblioteca',
  description = 'Escolha um arquivo existente na Biblioteca de Midia para preencher a URL automaticamente.',
  allowedBuckets,
  initialBucket,
  initialPath = '',
  initialTypeFilter = 'all',
}: MediaPickerProps) {
  const permittedBuckets = useMemo(
    () => (allowedBuckets?.length ? allowedBuckets : MEDIA_BUCKETS),
    [allowedBuckets],
  );

  const [bucket, setBucket] = useState<MediaBucket>(() =>
    resolveInitialBucket(permittedBuckets, initialBucket),
  );
  const [activePath, setActivePath] = useState(() => normalizeStoragePath(initialPath));
  const [pathDraft, setPathDraft] = useState(() => normalizeStoragePath(initialPath));
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<MediaPickerTypeFilter>(initialTypeFilter);

  const [files, setFiles] = useState<MediaFileItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshFiles = useCallback(async () => {
    if (!open) {
      return;
    }

    if (!isSupabaseConfigured) {
      setFiles([]);
      setError('Supabase nao configurado para listar arquivos da Biblioteca de Midia.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await listFiles(bucket, activePath);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      setFiles([]);
      return;
    }

    setFiles(result.data ?? []);
  }, [activePath, bucket, open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void refreshFiles();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [open, refreshFiles]);

  const folders = useMemo(
    () =>
      files
        .filter((file) => file.isFolder)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [files],
  );

  const filteredFiles = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return files
      .filter((file) => !file.isFolder)
      .filter((file) => {
        if (normalizedSearch && !file.name.toLowerCase().includes(normalizedSearch)) {
          return false;
        }

        return matchesTypeFilter(file, typeFilter);
      })
      .sort((a, b) => fileUpdatedAt(b).localeCompare(fileUpdatedAt(a)));
  }, [files, searchTerm, typeFilter]);

  const imageFiles = useMemo(
    () => filteredFiles.filter((file) => getMediaItemType(file) === 'image'),
    [filteredFiles],
  );

  const nonImageFiles = useMemo(
    () => filteredFiles.filter((file) => getMediaItemType(file) !== 'image'),
    [filteredFiles],
  );

  const handleApplyPath = () => {
    const normalized = normalizeStoragePath(pathDraft);
    setActivePath(normalized);
    setPathDraft(normalized);
  };

  const handleResetPath = () => {
    setActivePath('');
    setPathDraft('');
  };

  const handleSelectFile = (file: MediaFileItem) => {
    const fileUrl = getPublicUrl(bucket, file.fullPath);
    if (!fileUrl) {
      setError('Nao foi possivel gerar URL publica para este arquivo.');
      return;
    }

    onSelect({
      id: `${bucket}/${file.fullPath}`,
      url: fileUrl,
      name: file.name,
      type: getMediaItemType(file),
      bucket,
      fullPath: file.fullPath,
    });
    onClose();
  };

  const isEmpty = !isLoading && !error && folders.length === 0 && filteredFiles.length === 0;

  return (
    <AdminFormModal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      size="xl"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
        >
          Fechar
        </button>
      }
    >
      <div className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="space-y-1 md:col-span-3">
            <label htmlFor="media-picker-bucket" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
              Bucket
            </label>
            <select
              id="media-picker-bucket"
              value={bucket}
              onChange={(event) => setBucket(event.target.value as MediaBucket)}
              className="w-full rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
            >
              {permittedBuckets.map((bucketOption) => (
                <option key={bucketOption} value={bucketOption}>
                  {MEDIA_BUCKET_LABELS[bucketOption]}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-3">
            <label htmlFor="media-picker-type-filter" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
              Tipo
            </label>
            <select
              id="media-picker-type-filter"
              value={typeFilter}
              onChange={(event) => setTypeFilter(event.target.value as MediaPickerTypeFilter)}
              className="w-full rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
            >
              {TYPE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1 md:col-span-6">
            <label htmlFor="media-picker-search" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
              Buscar por nome
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/40" />
              <input
                id="media-picker-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Digite o nome do arquivo"
                className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
              />
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/30 p-3 space-y-2">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
            <input
              type="text"
              value={pathDraft}
              onChange={(event) => setPathDraft(event.target.value)}
              placeholder="Caminho opcional (ex.: home/hero)"
              className="w-full rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
            />
            <button
              type="button"
              onClick={handleApplyPath}
              className="px-3 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
            >
              Aplicar
            </button>
            <button
              type="button"
              onClick={handleResetPath}
              className="px-3 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
            >
              Limpar
            </button>
            <button
              type="button"
              onClick={() => void refreshFiles()}
              className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Atualizar
            </button>
          </div>
          <p className="text-xs text-brand-dark/60">
            Caminho atual: <span className="font-semibold text-brand-dark">{activePath || '/'}</span>
          </p>
        </div>

        {folders.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Pastas</p>
            <div className="flex flex-wrap gap-2">
              {activePath && (
                <button
                  type="button"
                  onClick={() => {
                    const parentPath = getParentPath(activePath);
                    setActivePath(parentPath);
                    setPathDraft(parentPath);
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
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                >
                  <FolderOpen className="w-4 h-4" />
                  {folder.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && <AdminLoadingState label="Carregando arquivos da biblioteca..." />}
        {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshFiles()} />}

        {isEmpty && (
          <AdminEmptyState
            title="Nenhum arquivo encontrado"
            description="Envie arquivos na Biblioteca de Midia ou ajuste filtros e caminho."
          />
        )}

        {!isLoading && !error && !isEmpty && (
          <div className="space-y-6">
            {imageFiles.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-brand-dark">Imagens</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                  {imageFiles.map((file) => {
                    const publicUrl = getPublicUrl(bucket, file.fullPath);
                    return (
                      <article key={file.fullPath} className="rounded-xl border border-brand-dark/10 bg-white overflow-hidden">
                        <div className="aspect-[4/3] bg-brand-paper/60">
                          {publicUrl ? (
                            <ImageWithFallback
                              src={publicUrl}
                              alt={file.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              width={640}
                              height={480}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-brand-dark/45">
                              <FileImage className="w-7 h-7" />
                            </div>
                          )}
                        </div>
                        <div className="p-3 space-y-2">
                          <p className="text-sm font-semibold text-brand-dark break-all">{file.name}</p>
                          <button
                            type="button"
                            onClick={() => handleSelectFile(file)}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-red text-white text-xs font-semibold hover:bg-brand-red-dark transition-colors"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Selecionar
                          </button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            )}

            {nonImageFiles.length > 0 && (
              <section className="space-y-3">
                <h3 className="text-sm font-semibold text-brand-dark">Documentos e outros arquivos</h3>
                <div className="space-y-2">
                  {nonImageFiles.map((file) => {
                    const itemType = getMediaItemType(file);
                    return (
                      <div
                        key={file.fullPath}
                        className="rounded-xl border border-brand-dark/10 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                      >
                        <div className="flex items-start gap-3 min-w-0">
                          {itemType === 'pdf' ? (
                            <FileText className="w-5 h-5 text-brand-red mt-0.5 shrink-0" />
                          ) : itemType === 'document' ? (
                            <UploadCloud className="w-5 h-5 text-brand-dark/60 mt-0.5 shrink-0" />
                          ) : (
                            <FileIcon className="w-5 h-5 text-brand-dark/60 mt-0.5 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-brand-dark break-all">{file.name}</p>
                            <p className="text-xs text-brand-dark/60 uppercase tracking-brand">{itemType}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleSelectFile(file)}
                          className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand-red text-white text-xs font-semibold hover:bg-brand-red-dark transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Selecionar
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </div>
        )}
      </div>
    </AdminFormModal>
  );
}
