import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminFormSection from '../../components/admin/AdminFormSection';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminTable, { type AdminTableColumn } from '../../components/admin/AdminTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import StatusBadge from '../../components/admin/StatusBadge';
import PageBuilderSection from '../../components/admin/PageBuilderSection';
import MediaPickerField from '../../components/admin/media/MediaPickerField';
import { useAuth } from '../../hooks/useAuth';
import { canEditContent } from '../../lib/permissions';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  createPage,
  deletePage,
  listPages,
  publishPage,
  unpublishPage,
  updatePage,
  uploadPageImage,
} from '../../services/pages.service';
import type { Page } from '../../types/cms';
import { getSiteBaseUrl } from '../../utils/seo';
import { slugify } from '../../utils/slug';

interface PageFormState {
  slug: string;
  title: string;
  subtitle: string;
  content: string;
  hero_image_url: string;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  is_published: boolean;
}

const INITIAL_PAGE_SLUGS = [
  'planeje-sua-visita',
  'abra-sua-loja',
  'privacidade',
  'termos',
  'sobre',
] as const;

const DEFAULT_FORM: PageFormState = {
  slug: '',
  title: '',
  subtitle: '',
  content: '',
  hero_image_url: '',
  seo_title: '',
  seo_description: '',
  og_image_url: '',
  is_published: false,
};

function mapPageToForm(page: Page): PageFormState {
  return {
    slug: page.slug,
    title: page.title,
    subtitle: page.subtitle ?? '',
    content: page.content ?? '',
    hero_image_url: page.hero_image_url ?? '',
    seo_title: page.seo_title ?? '',
    seo_description: page.seo_description ?? '',
    og_image_url: page.og_image_url ?? '',
    is_published: page.is_published,
  };
}

function formatDateLabel(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }
  return parsed.toLocaleDateString('pt-BR');
}

function buildInitialPagePayload(slug: string) {
  const titleBySlug: Record<string, string> = {
    'planeje-sua-visita': 'Planeje sua visita',
    'abra-sua-loja': 'Abra sua loja',
    privacidade: 'Politica de Privacidade',
    termos: 'Termos de Uso',
    sobre: 'Sobre o Mega Polo Moda',
  };

  const title = titleBySlug[slug] ?? slug;

  return {
    slug,
    title,
    subtitle: '',
    content: '',
    hero_image_url: null,
    seo_title: title,
    seo_description: '',
    og_image_url: null,
    is_published: slug === 'planeje-sua-visita' || slug === 'abra-sua-loja',
  };
}

export default function PagesAdmin() {
  const { profile } = useAuth();
  const canEdit = canEditContent(profile);
  const [pages, setPages] = useState<Page[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingPageId, setEditingPageId] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [form, setForm] = useState<PageFormState>(DEFAULT_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Page | null>(null);
  const [selectedBuilderPageId, setSelectedBuilderPageId] = useState<string | null>(null);

  const refreshPages = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setPages([]);
      setIsLoading(false);
      setError('Supabase nao configurado para carregar paginas.');
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await listPages();
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      setPages([]);
      return;
    }

    setPages(result.data ?? []);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshPages();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshPages]);

  const filteredPages = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return pages;
    }

    return pages.filter((page) => {
      const blob = `${page.title} ${page.slug} ${page.subtitle ?? ''} ${page.seo_title ?? ''}`.toLowerCase();
      return blob.includes(query);
    });
  }, [pages, searchTerm]);

  const seoPreviewTitle = useMemo(
    () => form.seo_title.trim() || form.title.trim() || 'Titulo da pagina',
    [form.seo_title, form.title],
  );

  const seoPreviewDescription = useMemo(
    () =>
      form.seo_description.trim() ||
      form.subtitle.trim() ||
      form.content.trim().slice(0, 160) ||
      'Descricao da pagina para resultados de busca.',
    [form.content, form.seo_description, form.subtitle],
  );

  const seoPreviewUrl = useMemo(() => {
    const slug = slugify(form.slug || 'pagina-exemplo');
    const knownDirectRoutes = new Set(['privacidade', 'termos', 'sobre', 'planeje-sua-visita', 'abra-sua-loja']);
    const path = knownDirectRoutes.has(slug) ? `/${slug}` : `/pagina/${slug}`;
    return `${getSiteBaseUrl()}${path}`;
  }, [form.slug]);

  useEffect(() => {
    if (selectedBuilderPageId) {
      const stillExists = pages.some((page) => page.id === selectedBuilderPageId);
      if (stillExists) {
        return;
      }
    }

    const timerId = window.setTimeout(() => {
      if (pages.length > 0) {
        setSelectedBuilderPageId(pages[0].id);
      } else {
        setSelectedBuilderPageId(null);
      }
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [pages, selectedBuilderPageId]);

  const resetForm = () => {
    setForm(DEFAULT_FORM);
    setEditingPageId(null);
    setSlugManuallyEdited(false);
    setFormError(null);
    if (!selectedBuilderPageId && pages.length > 0) {
      setSelectedBuilderPageId(pages[0].id);
    }
  };

  const startCreate = () => {
    setError(null);
    setSuccessMessage(null);
    resetForm();
  };

  const startEdit = (page: Page) => {
    setError(null);
    setSuccessMessage(null);
    setEditingPageId(page.id);
    setForm(mapPageToForm(page));
    setSlugManuallyEdited(true);
    setFormError(null);
    setSelectedBuilderPageId(page.id);
  };

  const validateForm = (): string | null => {
    if (!form.slug.trim()) {
      return 'Slug da pagina e obrigatorio.';
    }

    if (!form.title.trim()) {
      return 'Titulo da pagina e obrigatorio.';
    }

    const normalizedSlug = slugify(form.slug);
    const duplicate = pages.find((page) => page.slug === normalizedSlug && page.id !== editingPageId);

    if (duplicate) {
      return 'Slug ja existe. Escolha outro slug.';
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!canEdit) {
      setFormError('Seu perfil possui acesso somente leitura para paginas.');
      return;
    }

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);
    setIsMutating(true);

    const payload = {
      slug: slugify(form.slug),
      title: form.title.trim(),
      subtitle: form.subtitle.trim() || null,
      content: form.content.trim() || null,
      hero_image_url: form.hero_image_url.trim() || null,
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      og_image_url: form.og_image_url.trim() || null,
      is_published: form.is_published,
    };

    const result = editingPageId ? await updatePage(editingPageId, payload) : await createPage(payload);

    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccessMessage(editingPageId ? 'Pagina atualizada com sucesso.' : 'Pagina criada com sucesso.');
    await refreshPages();
    resetForm();
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    if (!canEdit) {
      setPendingDelete(null);
      setError('Seu perfil possui acesso somente leitura para paginas.');
      return;
    }

    setIsMutating(true);
    const result = await deletePage(pendingDelete.id);
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccessMessage('Pagina removida com sucesso.');
    setPendingDelete(null);

    if (editingPageId === pendingDelete.id) {
      resetForm();
    }

    await refreshPages();
  };

  const handleTogglePublish = async (page: Page) => {
    setError(null);
    setSuccessMessage(null);

    if (!canEdit) {
      setError('Seu perfil possui acesso somente leitura para paginas.');
      return;
    }
    setIsMutating(true);

    const result = page.is_published ? await unpublishPage(page.id) : await publishPage(page.id);

    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccessMessage(page.is_published ? 'Pagina despublicada.' : 'Pagina publicada.');
    await refreshPages();
  };

  const handleUploadHeroImage = async (file: File) => {
    setFormError(null);
    setError(null);
    setSuccessMessage(null);
    setIsUploadingImage(true);

    const result = await uploadPageImage(file);

    setIsUploadingImage(false);

    if (result.error || !result.data) {
      setFormError(result.error ?? 'Falha no upload da imagem.');
      return;
    }

    setForm((prev) => ({
      ...prev,
      hero_image_url: result.data?.publicUrl ?? prev.hero_image_url,
    }));
  };

  const createInitialPages = async () => {
    if (!isSupabaseConfigured) {
      return;
    }

    if (!canEdit) {
      setError('Seu perfil possui acesso somente leitura para paginas.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsMutating(true);

    const existingSlugs = new Set(pages.map((page) => page.slug));
    const slugsToCreate = INITIAL_PAGE_SLUGS.filter((slug) => !existingSlugs.has(slug));

    if (!slugsToCreate.length) {
      setIsMutating(false);
      setSuccessMessage('Paginas iniciais ja existem.');
      return;
    }

    for (const slug of slugsToCreate) {
      const result = await createPage(buildInitialPagePayload(slug));
      if (result.error) {
        setIsMutating(false);
        setError(result.error);
        return;
      }
    }

    setIsMutating(false);
    setSuccessMessage('Paginas iniciais criadas.');
    await refreshPages();
  };

  const columns: Array<AdminTableColumn<Page>> = [
    {
      key: 'page',
      label: 'Pagina',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.title}</p>
          <p className="text-xs text-brand-dark/60">/{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'seo',
      label: 'SEO',
      render: (row) => (
        <div className="space-y-1">
          <p className="text-xs text-brand-dark/80">{row.seo_title ?? '-'}</p>
          <p className="text-[11px] text-brand-dark/50">Atualizada em {formatDateLabel(row.updated_at)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge label={row.is_published ? 'Publicada' : 'Rascunho'} tone={row.is_published ? 'published' : 'draft'} />
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
            disabled={!canEdit}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleTogglePublish(row)}
            disabled={!canEdit}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            {row.is_published ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {row.is_published ? 'Despublicar' : 'Publicar'}
          </button>
          <button
            type="button"
            onClick={() => setPendingDelete(row)}
            disabled={!canEdit}
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
        title="Paginas | CMS Mega Polo Moda"
        description="Gerencie paginas institucionais, SEO e publicacao do portal Mega Polo Moda."
      />

      <AdminPageHeader
        title="Paginas"
        description="Crie e edite paginas institucionais com controle de slug, SEO e publicacao."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startCreate}
              disabled={!canEdit}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova pagina
            </button>
            <button
              type="button"
              onClick={() => void createInitialPages()}
              disabled={!canEdit}
              className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              Criar iniciais
            </button>
            <button
              type="button"
              onClick={() => void refreshPages()}
              className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              Atualizar
            </button>
          </div>
        }
      />

      {!isSupabaseConfigured && (
        <div className="mb-6">
          <AdminEmptyState
            title="Supabase nao configurado"
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para habilitar o CRUD real de paginas."
          />
        </div>
      )}

      {isLoading && <AdminLoadingState label="Carregando paginas..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshPages()} />}

      {!isLoading && !error && (
        <div className="space-y-6">
          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
              {successMessage}
            </div>
          )}

          <AdminCard title={editingPageId ? 'Editar pagina' : 'Nova pagina'} description="Defina conteudo principal, SEO e status de publicacao.">
            <form onSubmit={handleSubmit} className="space-y-6">
              {!canEdit && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                  Perfil em modo leitura: voce pode visualizar as paginas e o page builder, mas nao pode salvar alteracoes.
                </div>
              )}

              <fieldset disabled={!canEdit} className="space-y-6">
              <AdminFormSection title="Conteudo">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="page-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Titulo
                    </label>
                    <input
                      id="page-title"
                      type="text"
                      value={form.title}
                      onChange={(event) => {
                        const title = event.target.value;
                        setForm((prev) => ({
                          ...prev,
                          title,
                          slug: slugManuallyEdited ? prev.slug : slugify(title),
                        }));
                      }}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="page-slug" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Slug
                    </label>
                    <input
                      id="page-slug"
                      type="text"
                      value={form.slug}
                      onChange={(event) => {
                        setSlugManuallyEdited(true);
                        setForm((prev) => ({ ...prev, slug: slugify(event.target.value) }));
                      }}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                      placeholder="minha-pagina"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label htmlFor="page-subtitle" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Subtitulo
                  </label>
                  <input
                    id="page-subtitle"
                    type="text"
                    value={form.subtitle}
                    onChange={(event) => setForm((prev) => ({ ...prev, subtitle: event.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="page-content" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Conteudo
                  </label>
                  <textarea
                    id="page-content"
                    rows={8}
                    value={form.content}
                    onChange={(event) => setForm((prev) => ({ ...prev, content: event.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y"
                  />
                </div>
              </AdminFormSection>

              <AdminFormSection title="Imagem hero">
                <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                  <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/60 p-3">
                    <ImageWithFallback src={form.hero_image_url} alt="Preview da imagem hero" className="h-44 object-cover rounded-lg" />
                  </div>

                  <div className="space-y-3">
                    <MediaPickerField
                      id="page-hero-image"
                      label="URL da imagem"
                      value={form.hero_image_url}
                      onChange={(value) => setForm((prev) => ({ ...prev, hero_image_url: value }))}
                      placeholder="https://..."
                      allowedBuckets={['pages', 'banners', 'institutional']}
                      initialBucket="pages"
                      typeFilter="image"
                      showPreview
                      previewAlt={`Imagem hero da pagina ${form.title || ''}`}
                      pickerTitle="Selecionar imagem hero"
                      pickerDescription="Escolha uma imagem da biblioteca para a capa da pagina."
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
                            void handleUploadHeroImage(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </AdminFormSection>

              <AdminFormSection title="SEO">
                <div className="space-y-2">
                  <label htmlFor="page-seo-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    SEO title
                  </label>
                  <input
                    id="page-seo-title"
                    type="text"
                    value={form.seo_title}
                    onChange={(event) => setForm((prev) => ({ ...prev, seo_title: event.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="page-seo-description" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    SEO description
                  </label>
                  <textarea
                    id="page-seo-description"
                    rows={3}
                    value={form.seo_description}
                    onChange={(event) => setForm((prev) => ({ ...prev, seo_description: event.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y"
                  />
                </div>

                <MediaPickerField
                  id="page-og-image"
                  label="OG image URL"
                  value={form.og_image_url}
                  onChange={(value) => setForm((prev) => ({ ...prev, og_image_url: value }))}
                  placeholder="https://..."
                  allowedBuckets={['pages', 'banners', 'institutional']}
                  initialBucket="pages"
                  typeFilter="image"
                  showPreview
                  previewAlt={`Imagem OG da pagina ${form.title || ''}`}
                  pickerTitle="Selecionar imagem OG"
                  pickerDescription="Escolha uma imagem para compartilhamento desta pagina."
                />

                <div className="rounded-xl border border-brand-dark/10 bg-white p-4 space-y-1">
                  <p className="text-[11px] font-semibold text-brand-dark/60 uppercase tracking-brand">Preview Google</p>
                  <p className="text-base text-[#1a0dab] leading-snug">{seoPreviewTitle}</p>
                  <p className="text-xs text-[#006621] break-all">{seoPreviewUrl}</p>
                  <p className="text-sm text-brand-dark/70 leading-snug">{seoPreviewDescription}</p>
                </div>

                <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark">
                  <input
                    type="checkbox"
                    checked={form.is_published}
                    onChange={(event) => setForm((prev) => ({ ...prev, is_published: event.target.checked }))}
                    className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30"
                  />
                  Publicar pagina
                </label>
              </AdminFormSection>

              {formError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                  {formError}
                </p>
              )}

              <div className="flex flex-wrap gap-2 justify-end">
                {editingPageId && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar edicao
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isMutating || isUploadingImage}
                  className="px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-70"
                >
                  {isMutating ? 'Salvando...' : editingPageId ? 'Salvar alteracoes' : 'Criar pagina'}
                </button>
              </div>
              </fieldset>
            </form>
          </AdminCard>

          <AdminCard title="Paginas cadastradas" description="Gerencie publicacao e acesse edicao rapida por pagina.">
            <div className="mb-4 relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-brand-dark/40" />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por titulo ou slug..."
                className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
              />
            </div>

            <AdminTable
              columns={columns}
              rows={filteredPages}
              rowKey={(row) => row.id}
              emptyMessage="Nenhuma pagina encontrada. Crie uma nova pagina institucional."
            />
          </AdminCard>

          <PageBuilderSection
            pages={pages}
            selectedPageId={selectedBuilderPageId}
            onSelectPageId={setSelectedBuilderPageId}
            canEdit={canEdit}
          />
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir pagina"
        description={`Tem certeza que deseja excluir "${pendingDelete?.title ?? ''}"? Essa acao nao pode ser desfeita.`}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDelete(null)}
      />
    </>
  );
}
