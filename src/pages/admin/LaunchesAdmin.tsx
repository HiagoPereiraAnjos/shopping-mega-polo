import React, { useMemo, useState } from 'react';
import {
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Search,
  Star,
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
import MediaPickerField from '../../components/admin/media/MediaPickerField';
import { useCategories } from '../../hooks/useCategories';
import { useLaunches } from '../../hooks/useLaunches';
import { useStores } from '../../hooks/useStores';
import type { Launch } from '../../types/cms';
import { getSiteBaseUrl } from '../../utils/seo';
import { normalizeSearchText } from '../../utils/storeMappers';

interface LaunchFormState {
  store_id: string;
  title: string;
  description: string;
  image_url: string;
  category_id: string;
  price: string;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  publish_date: string;
  expiration_date: string;
  is_featured: boolean;
  is_published: boolean;
}

const DEFAULT_FORM: LaunchFormState = {
  store_id: '',
  title: '',
  description: '',
  image_url: '',
  category_id: '',
  price: '',
  seo_title: '',
  seo_description: '',
  og_image_url: '',
  publish_date: '',
  expiration_date: '',
  is_featured: false,
  is_published: false,
};

function toInputDateValue(value: string | null): string {
  if (!value) {
    return '';
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '';
  }

  return parsed.toISOString().slice(0, 10);
}

function parsePrice(value: string): number | null | 'invalid' {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 'invalid';
  }

  return parsed;
}

function mapLaunchToForm(launch: Launch): LaunchFormState {
  return {
    store_id: launch.store_id ?? '',
    title: launch.title,
    description: launch.description ?? '',
    image_url: launch.image_url ?? '',
    category_id: launch.category_id ?? '',
    price: launch.price !== null ? String(launch.price) : '',
    seo_title: launch.seo_title ?? '',
    seo_description: launch.seo_description ?? '',
    og_image_url: launch.og_image_url ?? '',
    publish_date: toInputDateValue(launch.publish_date),
    expiration_date: toInputDateValue(launch.expiration_date),
    is_featured: launch.is_featured,
    is_published: launch.is_published,
  };
}

export default function LaunchesAdmin() {
  const {
    launches,
    isLoading,
    isMutating,
    error,
    successMessage,
    isSupabaseEnabled,
    refreshLaunches,
    createLaunchItem,
    updateLaunchItem,
    deleteLaunchItem,
    publishLaunchItem,
    unpublishLaunchItem,
    uploadLaunchImageFile,
    clearMessages,
  } = useLaunches({ autoLoad: true, publishedOnly: false });

  const { stores } = useStores({ autoLoad: true, publishedOnly: false, fallbackToMock: false });
  const { categories } = useCategories({ activeOnly: false, autoLoad: true, fallbackToMock: false });

  const [searchTerm, setSearchTerm] = useState('');
  const [storeFilter, setStoreFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'published' | 'unpublished'>('all');

  const [editingLaunchId, setEditingLaunchId] = useState<string | null>(null);
  const [form, setForm] = useState<LaunchFormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Launch | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const storesById = useMemo(
    () => new Map(stores.map((store) => [store.id, store])),
    [stores],
  );
  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const filteredLaunches = useMemo(() => {
    const query = normalizeSearchText(searchTerm);

    return launches.filter((launch) => {
      const storeName = storesById.get(launch.store_id ?? '')?.name ?? '';
      const categoryName = categoriesById.get(launch.category_id ?? '')?.name ?? '';
      const blob = normalizeSearchText(`${launch.title} ${launch.description ?? ''} ${storeName} ${categoryName}`);

      const matchesQuery = !query || blob.includes(query);
      const matchesStore = storeFilter === 'all' || (launch.store_id ?? '') === storeFilter;
      const matchesCategory = categoryFilter === 'all' || (launch.category_id ?? '') === categoryFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' ? launch.is_published : !launch.is_published);

      return matchesQuery && matchesStore && matchesCategory && matchesStatus;
    });
  }, [launches, searchTerm, storeFilter, categoryFilter, statusFilter, storesById, categoriesById]);

  const seoPreviewTitle = useMemo(
    () => form.seo_title.trim() || form.title.trim() || 'Titulo do lancamento',
    [form.seo_title, form.title],
  );

  const seoPreviewDescription = useMemo(
    () =>
      form.seo_description.trim() ||
      form.description.trim() ||
      'Novidade da vitrine atacadista do Mega Polo Moda.',
    [form.description, form.seo_description],
  );

  const seoPreviewUrl = useMemo(() => `${getSiteBaseUrl()}/lancamentos`, []);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingLaunchId(null);
    setFormError(null);
  };

  const startCreate = () => {
    clearMessages();
    resetForm();
  };

  const startEdit = (launch: Launch) => {
    clearMessages();
    setForm(mapLaunchToForm(launch));
    setEditingLaunchId(launch.id);
    setFormError(null);
  };

  const validateForm = () => {
    if (!form.store_id) {
      return 'Loja vinculada e obrigatoria.';
    }

    if (!form.title.trim()) {
      return 'Titulo do lancamento e obrigatorio.';
    }

    if (!form.category_id) {
      return 'Categoria do lancamento e obrigatoria.';
    }

    const parsedPrice = parsePrice(form.price);
    if (parsedPrice === 'invalid') {
      return 'Preco invalido. Informe um valor numerico positivo.';
    }

    if (form.publish_date && form.expiration_date) {
      const publishTs = new Date(form.publish_date).getTime();
      const expirationTs = new Date(form.expiration_date).getTime();
      if (expirationTs < publishTs) {
        return 'A data de expiracao nao pode ser anterior a publicacao.';
      }
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);

    const parsedPrice = parsePrice(form.price);

    const payload = {
      store_id: form.store_id,
      title: form.title.trim(),
      description: form.description.trim() || null,
      image_url: form.image_url.trim() || null,
      category_id: form.category_id || null,
      price: parsedPrice === null ? null : parsedPrice,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      og_image_url: form.og_image_url.trim() || null,
      publish_date: form.publish_date || null,
      expiration_date: form.expiration_date || null,
      is_featured: form.is_featured,
      is_published: form.is_published,
    };

    const result = editingLaunchId
      ? await updateLaunchItem(editingLaunchId, payload)
      : await createLaunchItem(payload);

    if (!result.error) {
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    const result = await deleteLaunchItem(pendingDelete.id);
    if (!result.error) {
      setPendingDelete(null);
      if (editingLaunchId === pendingDelete.id) {
        resetForm();
      }
    }
  };

  const handleUploadImage = async (file: File) => {
    setIsUploadingImage(true);
    const result = await uploadLaunchImageFile(file);
    setIsUploadingImage(false);

    if (result.error || !result.data) {
      setFormError(result.error ?? 'Falha no upload da imagem.');
      return;
    }

    setForm((prev) => ({ ...prev, image_url: result.data.publicUrl }));
  };

  const columns: Array<AdminTableColumn<Launch>> = [
    {
      key: 'title',
      label: 'Lancamento',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.title}</p>
          <p className="text-xs text-brand-dark/60">
            {storesById.get(row.store_id ?? '')?.name ?? 'Loja nao vinculada'}
          </p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (row) => (
        <span>
          {row.category_id ? categoriesById.get(row.category_id)?.name ?? 'Sem categoria' : 'Sem categoria'}
        </span>
      ),
    },
    {
      key: 'dates',
      label: 'Periodo',
      render: (row) => (
        <div className="text-xs text-brand-dark/70 space-y-1">
          <p>Pub: {row.publish_date ? new Date(row.publish_date).toLocaleDateString('pt-BR') : '-'}</p>
          <p>Exp: {row.expiration_date ? new Date(row.expiration_date).toLocaleDateString('pt-BR') : '-'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge
            label={row.is_published ? 'Publicado' : 'Rascunho'}
            tone={row.is_published ? 'published' : 'draft'}
          />
          {row.is_featured && <StatusBadge label="Destaque" tone="warning" />}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startEdit(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>

          <button
            type="button"
            onClick={() => (
              row.is_published
                ? void unpublishLaunchItem(row.id)
                : void publishLaunchItem(row.id)
            )}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            {row.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {row.is_published ? 'Despublicar' : 'Publicar'}
          </button>

          <button
            type="button"
            onClick={() => void updateLaunchItem(row.id, { is_featured: !row.is_featured })}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <Star className={`w-3.5 h-3.5 ${row.is_featured ? 'fill-current text-amber-500' : ''}`} />
            {row.is_featured ? 'Remover destaque' : 'Destacar'}
          </button>

          <button
            type="button"
            onClick={() => setPendingDelete(row)}
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
        title="Lancamentos | CMS Mega Polo Moda"
        description="Cadastre e publique lancamentos das lojas no portal Mega Polo Moda."
      />

      <AdminPageHeader
        title="Lancamentos"
        description="Gerencie novidades das lojas com datas, publicacao e destaque."
        actions={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo lancamento
            </button>
            <button
              type="button"
              onClick={() => void refreshLaunches()}
              className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              Atualizar
            </button>
          </div>
        )}
      />

      {!isSupabaseEnabled && (
        <div className="mb-6">
          <AdminEmptyState
            title="Supabase nao configurado"
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o CRUD real de lancamentos."
          />
        </div>
      )}

      {isLoading && <AdminLoadingState label="Carregando lancamentos..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshLaunches()} />}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-[460px_1fr] gap-6">
          <AdminCard
            title={editingLaunchId ? 'Editar lancamento' : 'Novo lancamento'}
            description="Preencha os dados para publicar novidades das lojas no portal."
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <AdminFormSection title="Dados principais">
                <div className="space-y-2">
                  <label htmlFor="launch-store" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Loja *
                  </label>
                  <select
                    id="launch-store"
                    value={form.store_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, store_id: event.target.value }))}
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
                  <label htmlFor="launch-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Titulo *
                  </label>
                  <input
                    id="launch-title"
                    type="text"
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="launch-description" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Descricao
                  </label>
                  <textarea
                    id="launch-description"
                    rows={3}
                    value={form.description}
                    onChange={(event) => setForm((prev) => ({ ...prev, description: event.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="launch-category" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Categoria *
                  </label>
                  <select
                    id="launch-category"
                    value={form.category_id}
                    onChange={(event) => setForm((prev) => ({ ...prev, category_id: event.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    required
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label htmlFor="launch-price" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Preco (opcional)
                  </label>
                  <input
                    id="launch-price"
                    type="text"
                    value={form.price}
                    onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    placeholder="Ex: 199.90"
                  />
                </div>
              </AdminFormSection>

              <AdminFormSection title="Imagem">
                <MediaPickerField
                  id="launch-image-url"
                  label="URL da imagem"
                  value={form.image_url}
                  onChange={(value) => setForm((prev) => ({ ...prev, image_url: value }))}
                  placeholder="https://..."
                  allowedBuckets={['banners', 'pages', 'products', 'stores', 'institutional']}
                  initialBucket="banners"
                  typeFilter="image"
                  showPreview
                  previewAlt={`Imagem do lancamento ${form.title || ''}`}
                  pickerTitle="Selecionar imagem do lancamento"
                  pickerDescription="Escolha uma imagem da biblioteca para este lancamento."
                />
                <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
                  <Upload className="w-4 h-4" />
                  {isUploadingImage ? 'Enviando imagem...' : 'Upload imagem'}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) {
                        void handleUploadImage(file);
                      }
                    }}
                  />
                </label>
              </AdminFormSection>

              <AdminFormSection title="SEO">
                <div className="space-y-2">
                  <label htmlFor="launch-seo-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    SEO title
                  </label>
                  <input
                    id="launch-seo-title"
                    type="text"
                    value={form.seo_title}
                    onChange={(event) => setForm((prev) => ({ ...prev, seo_title: event.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    placeholder="Titulo otimizado para busca"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="launch-seo-description" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    SEO description
                  </label>
                  <textarea
                    id="launch-seo-description"
                    rows={2}
                    value={form.seo_description}
                    onChange={(event) => setForm((prev) => ({ ...prev, seo_description: event.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    placeholder="Descricao curta para resultado no Google"
                  />
                </div>

                <MediaPickerField
                  id="launch-og-image-url"
                  label="OG image URL"
                  value={form.og_image_url}
                  onChange={(value) => setForm((prev) => ({ ...prev, og_image_url: value }))}
                  placeholder="https://..."
                  allowedBuckets={['banners', 'pages', 'institutional']}
                  initialBucket="banners"
                  typeFilter="image"
                  showPreview
                  previewAlt={`Imagem OG do lancamento ${form.title || ''}`}
                  pickerTitle="Selecionar imagem OG do lancamento"
                  pickerDescription="Escolha uma imagem para compartilhamento do lancamento."
                />

                <div className="rounded-xl border border-brand-dark/10 bg-white p-4 space-y-1">
                  <p className="text-[11px] font-semibold text-brand-dark/60 uppercase tracking-brand">Preview Google</p>
                  <p className="text-base text-[#1a0dab] leading-snug">{seoPreviewTitle}</p>
                  <p className="text-xs text-[#006621] break-all">{seoPreviewUrl}</p>
                  <p className="text-sm text-brand-dark/70 leading-snug">{seoPreviewDescription}</p>
                </div>
              </AdminFormSection>

              <AdminFormSection title="Publicacao">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="launch-publish-date" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Data de publicacao
                    </label>
                    <input
                      id="launch-publish-date"
                      type="date"
                      value={form.publish_date}
                      onChange={(event) => setForm((prev) => ({ ...prev, publish_date: event.target.value }))}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="launch-expiration-date" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Data de expiracao
                    </label>
                    <input
                      id="launch-expiration-date"
                      type="date"
                      value={form.expiration_date}
                      onChange={(event) => setForm((prev) => ({ ...prev, expiration_date: event.target.value }))}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-3">
                  <label className="inline-flex items-center gap-3 text-sm font-medium text-brand-dark/80">
                    <input
                      type="checkbox"
                      checked={form.is_published}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, is_published: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-brand-dark/20 text-brand-red focus:ring-brand-red"
                    />
                    Publicado
                  </label>

                  <label className="inline-flex items-center gap-3 text-sm font-medium text-brand-dark/80">
                    <input
                      type="checkbox"
                      checked={form.is_featured}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, is_featured: event.target.checked }))
                      }
                      className="h-4 w-4 rounded border-brand-dark/20 text-brand-red focus:ring-brand-red"
                    />
                    Em destaque
                  </label>
                </div>
              </AdminFormSection>

              {formError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                  {formError}
                </p>
              )}

              {successMessage && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                  {successMessage}
                </p>
              )}

              <div className="flex items-center gap-2 justify-end">
                {(editingLaunchId || form.title || form.store_id) && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isMutating || isUploadingImage}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {editingLaunchId ? 'Salvar alteracoes' : 'Criar lancamento'}
                </button>
              </div>
            </form>
          </AdminCard>

          <AdminCard
            title="Lista de lancamentos"
            description="Filtre por titulo, loja, categoria e status para gerenciar os lancamentos."
          >
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                <div className="relative md:col-span-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Buscar por titulo"
                    className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <select
                  value={storeFilter}
                  onChange={(event) => setStoreFilter(event.target.value)}
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todas lojas</option>
                  {stores.map((store) => (
                    <option key={store.id} value={store.id}>
                      {store.name}
                    </option>
                  ))}
                </select>

                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todas categorias</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(event) => setStatusFilter(event.target.value as 'all' | 'published' | 'unpublished')}
                  className="rounded-xl border border-brand-dark/15 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                >
                  <option value="all">Todos status</option>
                  <option value="published">Publicados</option>
                  <option value="unpublished">Rascunho</option>
                </select>
              </div>

              {filteredLaunches.length === 0 ? (
                <AdminEmptyState
                  title="Nenhum lancamento encontrado"
                  description={
                    launches.length
                      ? 'Ajuste os filtros para localizar lancamentos.'
                      : 'Cadastre o primeiro lancamento para iniciar.'
                  }
                />
              ) : (
                <AdminTable
                  columns={columns}
                  rows={filteredLaunches}
                  rowKey={(row) => row.id}
                  emptyMessage="Nenhum lancamento cadastrado."
                />
              )}
            </div>
          </AdminCard>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir lancamento"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir o lancamento "${pendingDelete.title}"?`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
