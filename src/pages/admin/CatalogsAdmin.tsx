import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ExternalLink,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { SEO } from '../../components/ui/SEO';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminFormSection from '../../components/admin/AdminFormSection';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminTable, { type AdminTableColumn } from '../../components/admin/AdminTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { canEditSettings } from '../../lib/permissions';
import { useStores } from '../../hooks/useStores';
import {
  activateCatalog,
  createCatalog,
  deactivateCatalog,
  deleteCatalog,
  listCatalogs,
  updateCatalog,
  uploadCatalogPdf,
} from '../../services/catalogs.service';
import { normalizeSearchText } from '../../utils/storeMappers';
import type { Catalog, Store } from '../../types/cms';

function formatFileSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) {
    return 'Tamanho não informado';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function buildDefaultCatalogTitle(store: Store | undefined): string {
  if (!store) {
    return 'Catálogo digital';
  }

  return `Catálogo ${store.name}`;
}

export default function CatalogsAdmin() {
  const { profile } = useAuth();
  const canDeleteCatalogs = canEditSettings(profile);

  const {
    stores,
    isSupabaseEnabled,
    isLoading: isStoresLoading,
  } = useStores({ autoLoad: true, publishedOnly: false });

  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [catalogTitle, setCatalogTitle] = useState('');
  const [catalogFile, setCatalogFile] = useState<File | null>(null);
  const [createAsActive, setCreateAsActive] = useState(true);

  const [editingCatalogId, setEditingCatalogId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [pendingDelete, setPendingDelete] = useState<Catalog | null>(null);

  const storesById = useMemo(
    () => new Map(stores.map((store) => [store.id, store])),
    [stores],
  );

  const filteredCatalogs = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);

    return catalogs.filter((catalog) => {
      const matchesStore = storeFilter === 'all' || catalog.store_id === storeFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? catalog.is_active : !catalog.is_active);

      const storeName = storesById.get(catalog.store_id)?.name ?? '';
      const searchBlob = normalizeSearchText(`${catalog.title} ${storeName} ${catalog.file_url}`);
      const matchesSearch = !normalizedSearch || searchBlob.includes(normalizedSearch);

      return matchesStore && matchesStatus && matchesSearch;
    });
  }, [catalogs, searchTerm, storeFilter, statusFilter, storesById]);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const refreshCatalogs = useCallback(async () => {
    if (!isSupabaseEnabled) {
      setCatalogs([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await listCatalogs({ status: 'all' });
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setCatalogs(result.data ?? []);
  }, [isSupabaseEnabled]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshCatalogs();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshCatalogs]);

  const resetCreateForm = () => {
    setSelectedStoreId('');
    setCatalogTitle('');
    setCatalogFile(null);
    setCreateAsActive(true);
  };

  const handleCreateCatalog = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    const storeId = selectedStoreId.trim();
    if (!storeId) {
      setError('Selecione uma loja para cadastrar o catálogo.');
      return;
    }

    if (!catalogFile) {
      setError('Selecione um arquivo PDF para upload.');
      return;
    }

    setIsMutating(true);
    const uploadResult = await uploadCatalogPdf(catalogFile);
    if (uploadResult.error || !uploadResult.data) {
      setIsMutating(false);
      setError(uploadResult.error ?? 'Falha no upload do catálogo.');
      return;
    }

    const store = storesById.get(storeId);
    const title = catalogTitle.trim() || buildDefaultCatalogTitle(store);

    const createResult = await createCatalog({
      store_id: storeId,
      title,
      file_url: uploadResult.data.publicUrl,
      file_size: uploadResult.data.fileSize,
      is_active: createAsActive,
    });
    setIsMutating(false);

    if (createResult.error) {
      setError(createResult.error);
      return;
    }

    setSuccessMessage('Catálogo cadastrado com sucesso.');
    resetCreateForm();
    await refreshCatalogs();
  };

  const startEditCatalog = (catalog: Catalog) => {
    clearMessages();
    setEditingCatalogId(catalog.id);
    setEditingTitle(catalog.title);
  };

  const cancelEditCatalog = () => {
    setEditingCatalogId(null);
    setEditingTitle('');
  };

  const saveCatalogTitle = async () => {
    if (!editingCatalogId) {
      return;
    }

    const title = editingTitle.trim();
    if (!title) {
      setError('Título do catálogo é obrigatório.');
      return;
    }

    clearMessages();
    setIsMutating(true);
    const result = await updateCatalog(editingCatalogId, { title });
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccessMessage('Título do catálogo atualizado.');
    cancelEditCatalog();
    await refreshCatalogs();
  };

  const toggleCatalogStatus = async (catalog: Catalog) => {
    clearMessages();
    setIsMutating(true);
    const result = catalog.is_active
      ? await deactivateCatalog(catalog.id)
      : await activateCatalog(catalog.id);
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccessMessage(catalog.is_active ? 'Catálogo desativado.' : 'Catálogo ativado.');
    await refreshCatalogs();
  };

  const handleDeleteCatalog = async () => {
    if (!canDeleteCatalogs) {
      setError('Seu perfil nao possui permissao para excluir catálogos.');
      return;
    }

    if (!pendingDelete) {
      return;
    }

    clearMessages();
    setIsMutating(true);
    const result = await deleteCatalog(pendingDelete.id);
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setPendingDelete(null);
    setSuccessMessage('Catálogo removido com sucesso.');
    await refreshCatalogs();
  };

  const columns: Array<AdminTableColumn<Catalog>> = [
    {
      key: 'title',
      label: 'Catálogo',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.title}</p>
          <p className="text-xs text-brand-dark/60">{formatFileSize(row.file_size)}</p>
        </div>
      ),
    },
    {
      key: 'store',
      label: 'Loja',
      render: (row) => (
        <span className="text-sm text-brand-dark/80">
          {storesById.get(row.store_id)?.name ?? 'Loja não encontrada'}
        </span>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge
          label={row.is_active ? 'Ativo' : 'Inativo'}
          tone={row.is_active ? 'published' : 'draft'}
        />
      ),
    },
    {
      key: 'actions',
      label: 'Ações',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <a
            href={row.file_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Abrir PDF
          </a>

          <button
            type="button"
            onClick={() => startEditCatalog(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar título
          </button>

          <button
            type="button"
            onClick={() => void toggleCatalogStatus(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            {row.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {row.is_active ? 'Desativar' : 'Ativar'}
          </button>

          <button
            type="button"
            onClick={() => setPendingDelete(row)}
            disabled={!canDeleteCatalogs}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Catálogos | CMS Mega Polo Moda"
        description="Gerencie upload, ativação e disponibilidade dos catálogos digitais em PDF."
      />

      <AdminPageHeader
        title="Catálogos Digitais"
        description="Suba PDFs por loja, ative ou desative catálogos e mantenha o portal sem links quebrados."
        actions={(
          <button
            type="button"
            onClick={() => void refreshCatalogs()}
            className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
          >
            Atualizar
          </button>
        )}
      />

      {!isSupabaseEnabled && (
        <div className="mb-6">
          <AdminEmptyState
            title="Supabase não configurado"
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar catálogo digital real."
          />
        </div>
      )}

      {isSupabaseEnabled && (isLoading || isStoresLoading) && (
        <AdminLoadingState label="Carregando catálogos..." />
      )}

      {isSupabaseEnabled && !isLoading && !isStoresLoading && error && (
        <AdminErrorState message={error} onRetry={() => void refreshCatalogs()} />
      )}

      {isSupabaseEnabled && !isLoading && !isStoresLoading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-6">
          <AdminCard
            title="Novo catálogo"
            description="Envie um PDF por loja. Se ativo, o catálogo anterior da loja é desativado automaticamente."
          >
            <form className="space-y-6" onSubmit={handleCreateCatalog}>
              <AdminFormSection title="Dados do catálogo">
                <div className="space-y-2">
                  <label htmlFor="catalog-store" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Loja *
                  </label>
                  <select
                    id="catalog-store"
                    value={selectedStoreId}
                    onChange={(event) => {
                      const nextStoreId = event.target.value;
                      setSelectedStoreId(nextStoreId);
                      if (!catalogTitle.trim()) {
                        setCatalogTitle(buildDefaultCatalogTitle(storesById.get(nextStoreId)));
                      }
                    }}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    required
                  >
                    <option value="">Selecione uma loja</option>
                    {stores.map((store) => (
                      <option key={store.id} value={store.id}>
                        {store.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="catalog-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Título
                  </label>
                  <input
                    id="catalog-title"
                    type="text"
                    value={catalogTitle}
                    onChange={(event) => setCatalogTitle(event.target.value)}
                    placeholder="Catálogo digital da loja"
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <label className="inline-flex items-center gap-3 text-sm font-medium text-brand-dark/80">
                  <input
                    type="checkbox"
                    checked={createAsActive}
                    onChange={(event) => setCreateAsActive(event.target.checked)}
                    className="h-4 w-4 rounded border-brand-dark/20 text-brand-red focus:ring-brand-red"
                  />
                  Ativar catálogo após upload
                </label>
              </AdminFormSection>

              <AdminFormSection title="Arquivo PDF">
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
                  <Upload className="w-4 h-4" />
                  {catalogFile ? 'Trocar PDF' : 'Selecionar PDF'}
                  <input
                    type="file"
                    accept="application/pdf,.pdf"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setCatalogFile(file);
                    }}
                  />
                </label>
                {catalogFile && (
                  <p className="text-sm text-brand-dark/70">
                    {catalogFile.name} • {formatFileSize(catalogFile.size)}
                  </p>
                )}
                <p className="text-xs text-brand-dark/50">
                  Apenas PDF. Limite de 25MB por arquivo.
                </p>
              </AdminFormSection>

              {successMessage && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                  {successMessage}
                </p>
              )}

              <div className="flex items-center justify-end gap-2">
                {(selectedStoreId || catalogTitle || catalogFile) && (
                  <button
                    type="button"
                    onClick={resetCreateForm}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Limpar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isMutating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <Plus className="w-4 h-4" />
                  {isMutating ? 'Salvando...' : 'Cadastrar catálogo'}
                </button>
              </div>
            </form>
          </AdminCard>

          <AdminCard
            title="Lista de catálogos"
            description="Filtre por loja e status para gerenciar rapidamente os PDFs publicados."
          >
            <div className="space-y-4">
              {editingCatalogId && (
                <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/60 p-4 space-y-3">
                  <p className="text-sm font-semibold text-brand-dark">Editar título do catálogo</p>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(event) => setEditingTitle(event.target.value)}
                      className="flex-1 rounded-xl border border-brand-dark/15 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    />
                    <button
                      type="button"
                      onClick={() => void saveCatalogTitle()}
                      disabled={isMutating}
                      className="px-4 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      Salvar
                    </button>
                    <button
                      type="button"
                      onClick={cancelEditCatalog}
                      className="px-4 py-2.5 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por título ou loja"
                    className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <select
                  value={storeFilter}
                  onChange={(event) => setStoreFilter(event.target.value)}
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todas as lojas</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'inactive')}
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todos os status</option>
                  <option value="active">Ativos</option>
                  <option value="inactive">Inativos</option>
                </select>
              </div>

              {filteredCatalogs.length === 0 ? (
                <AdminEmptyState
                  title="Nenhum catálogo encontrado"
                  description={
                    catalogs.length
                      ? 'Ajuste os filtros para localizar catálogos.'
                      : 'Faça o primeiro upload de catálogo para iniciar.'
                  }
                />
              ) : (
                <AdminTable
                  columns={columns}
                  rows={filteredCatalogs}
                  rowKey={(row) => row.id}
                  emptyMessage="Nenhum catálogo cadastrado."
                />
              )}
            </div>
          </AdminCard>
        </div>
      )}

      <ConfirmDialog
        open={canDeleteCatalogs && !!pendingDelete}
        title="Excluir catálogo"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir o catálogo "${pendingDelete.title}"?`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDeleteCatalog()}
      />
    </>
  );
}
