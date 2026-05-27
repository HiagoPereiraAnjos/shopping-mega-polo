import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, RefreshCcw, Save } from 'lucide-react';
import {
  AdminCard,
  AdminEmptyState,
  AdminErrorState,
  AdminFormSection,
  AdminLoadingState,
  AdminPageShell,
} from '../../components/admin';
import MediaPickerField from '../../components/admin/media/MediaPickerField';
import { SEO } from '../../components/ui/SEO';
import { useAuth } from '../../hooks/useAuth';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { canEditContent, canEditSettings, getRoleLabel } from '../../lib/permissions';
import { listPages, updatePage } from '../../services/pages.service';
import { listStores, updateStore } from '../../services/stores.service';
import type { Page, Store } from '../../types/cms';
import { getSiteBaseUrl } from '../../utils/seo';
import { slugify } from '../../utils/slug';

interface PageSeoDraft {
  id: string;
  title: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  og_title: string;
  og_description: string;
  og_image_url: string;
  canonical_url: string;
  robots_index: boolean;
  robots_follow: boolean;
  is_published: boolean;
}

interface StoreSeoDraft {
  id: string;
  name: string;
  slug: string;
  seo_title: string;
  seo_description: string;
  og_image_url: string;
  is_published: boolean;
}

interface GlobalSeoDraft {
  site_name: string;
  short_description: string;
  default_og_image_url: string;
  favicon_url: string;
  seo_base_url: string;
  seo_default_robots: string;
  seo_default_language: string;
  seo_keywords: string;
}

const inputClassName =
  'w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15';
const textareaClassName =
  'w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y';
const labelClassName = 'text-xs font-bold tracking-brand text-brand-dark/70 uppercase';

function toPageDraft(page: Page): PageSeoDraft {
  return {
    id: page.id,
    title: page.title,
    slug: page.slug,
    seo_title: page.seo_title ?? '',
    seo_description: page.seo_description ?? '',
    og_title: page.og_title ?? '',
    og_description: page.og_description ?? '',
    og_image_url: page.og_image_url ?? '',
    canonical_url: page.canonical_url ?? '',
    robots_index: page.robots_index ?? true,
    robots_follow: page.robots_follow ?? true,
    is_published: page.is_published,
  };
}

function toStoreDraft(store: Store): StoreSeoDraft {
  return {
    id: store.id,
    name: store.name,
    slug: store.slug,
    seo_title: store.seo_title ?? '',
    seo_description: store.seo_description ?? '',
    og_image_url: store.og_image_url ?? '',
    is_published: store.is_published,
  };
}

function toGlobalDraftFromSettings(settings: {
  site_name: string;
  short_description: string;
  default_og_image_url: string;
  favicon_url: string;
  seo_base_url: string;
  seo_default_robots: string;
  seo_default_language: string;
  seo_keywords: string;
}): GlobalSeoDraft {
  return {
    site_name: settings.site_name,
    short_description: settings.short_description,
    default_og_image_url: settings.default_og_image_url,
    favicon_url: settings.favicon_url,
    seo_base_url: settings.seo_base_url,
    seo_default_robots: settings.seo_default_robots,
    seo_default_language: settings.seo_default_language,
    seo_keywords: settings.seo_keywords,
  };
}

function normalizeCanonical(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) {
    return '';
  }

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const normalizedPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return normalizedPath;
}

function buildRobotsDirective(index: boolean, follow: boolean): string {
  return `${index ? 'index' : 'noindex'},${follow ? 'follow' : 'nofollow'}`;
}

function GooglePreview({
  title,
  description,
  url,
}: {
  title: string;
  description: string;
  url: string;
}) {
  return (
    <div className="rounded-xl border border-brand-dark/10 bg-white p-4 space-y-1.5">
      <p className="text-[11px] font-semibold text-brand-dark/60 uppercase tracking-brand">
        Preview Google
      </p>
      <p className="text-base leading-snug text-[#1a0dab] line-clamp-2">{title}</p>
      <p className="text-xs text-[#006621] break-all">{url}</p>
      <p className="text-sm text-brand-dark/70 leading-snug line-clamp-2">{description}</p>
    </div>
  );
}

function SocialPreview({
  title,
  description,
  imageUrl,
  siteName,
}: {
  title: string;
  description: string;
  imageUrl: string;
  siteName: string;
}) {
  return (
    <div className="rounded-xl border border-brand-dark/10 bg-white overflow-hidden">
      <div className="h-36 bg-gradient-to-br from-brand-paper to-brand-paper-dark/70 border-b border-brand-dark/10">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Preview social de ${title}`}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="h-full w-full flex items-center justify-center text-sm text-brand-dark/50">
            Imagem OG nao definida
          </div>
        )}
      </div>
      <div className="p-4 space-y-1.5">
        <p className="text-[11px] uppercase tracking-brand text-brand-dark/55">
          {siteName || 'Mega Polo Moda'}
        </p>
        <p className="text-sm font-semibold text-brand-dark line-clamp-2">{title}</p>
        <p className="text-xs text-brand-dark/70 line-clamp-2">{description}</p>
      </div>
    </div>
  );
}

export default function SeoAdmin() {
  const { profile } = useAuth();
  const {
    settings,
    isSaving: isSavingGlobal,
    saveSettings,
    refreshSettings,
    error: globalError,
    successMessage: globalSuccessMessage,
    clearStatus,
  } = useSiteSettings();

  const canEditGlobal = canEditSettings(profile);
  const canEditSeoItems = canEditContent(profile);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [stores, setStores] = useState<Store[]>([]);

  const [pageId, setPageId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [globalDraftOverrides, setGlobalDraftOverrides] = useState<Partial<GlobalSeoDraft>>({});
  const [pageDraftOverrides, setPageDraftOverrides] = useState<Partial<PageSeoDraft>>({});
  const [storeDraftOverrides, setStoreDraftOverrides] = useState<Partial<StoreSeoDraft>>({});

  const [isSavingPage, setIsSavingPage] = useState(false);
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [storeMessage, setStoreMessage] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [storeError, setStoreError] = useState<string | null>(null);

  const sortedPages = useMemo(
    () => [...pages].sort((a, b) => a.title.localeCompare(b.title, 'pt-BR')),
    [pages],
  );
  const sortedStores = useMemo(
    () => [...stores].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')),
    [stores],
  );
  const selectedPage = useMemo(
    () => pages.find((item) => item.id === pageId) ?? null,
    [pages, pageId],
  );
  const selectedStore = useMemo(
    () => stores.find((item) => item.id === storeId) ?? null,
    [stores, storeId],
  );
  const globalDraft = useMemo<GlobalSeoDraft>(
    () => ({ ...toGlobalDraftFromSettings(settings), ...globalDraftOverrides }),
    [settings, globalDraftOverrides],
  );
  const pageDraft = useMemo<PageSeoDraft | null>(() => {
    if (!selectedPage) {
      return null;
    }

    const baseDraft = toPageDraft(selectedPage);
    return {
      ...baseDraft,
      ...pageDraftOverrides,
      id: baseDraft.id,
      title: baseDraft.title,
      is_published: baseDraft.is_published,
    };
  }, [pageDraftOverrides, selectedPage]);
  const storeDraft = useMemo<StoreSeoDraft | null>(() => {
    if (!selectedStore) {
      return null;
    }

    const baseDraft = toStoreDraft(selectedStore);
    return {
      ...baseDraft,
      ...storeDraftOverrides,
      id: baseDraft.id,
      name: baseDraft.name,
      is_published: baseDraft.is_published,
    };
  }, [selectedStore, storeDraftOverrides]);

  const loadSeoData = async () => {
    setLoadError(null);

    const [pagesResult, storesResult] = await Promise.all([
      listPages(),
      listStores({ status: 'all' }),
    ]);

    const errors = [pagesResult.error, storesResult.error].filter(Boolean).join(' | ');
    if (errors) {
      setLoadError(errors);
    }

    const nextPages = pagesResult.data ?? [];
    const nextStores = storesResult.data ?? [];
    setPages(nextPages);
    setStores(nextStores);

    setPageId((prev) => {
      if (!nextPages.length) {
        return '';
      }
      if (prev && nextPages.some((item) => item.id === prev)) {
        return prev;
      }
      return nextPages[0].id;
    });

    setStoreId((prev) => {
      if (!nextStores.length) {
        return '';
      }
      if (prev && nextStores.some((item) => item.id === prev)) {
        return prev;
      }
      return nextStores[0].id;
    });
  };

  useEffect(() => {
    let active = true;

    const run = async () => {
      setIsLoading(true);
      await loadSeoData();
      if (active) {
        setIsLoading(false);
      }
    };

    void run();

    return () => {
      active = false;
    };
  }, []);

  const roleLabel = getRoleLabel(profile?.role);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    clearStatus();
    setPageMessage(null);
    setStoreMessage(null);
    setPageError(null);
    setStoreError(null);
    setGlobalDraftOverrides({});
    setPageDraftOverrides({});
    setStoreDraftOverrides({});
    await Promise.all([refreshSettings(), loadSeoData()]);
    setIsRefreshing(false);
  };

  const handleSaveGlobal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canEditGlobal) {
      return;
    }

    clearStatus();
    const result = await saveSettings({
      site_name: globalDraft.site_name.trim() || settings.site_name,
      short_description: globalDraft.short_description.trim() || null,
      default_og_image_url: globalDraft.default_og_image_url.trim() || null,
      favicon_url: globalDraft.favicon_url.trim() || null,
      seo_base_url: globalDraft.seo_base_url.trim() || null,
      seo_default_robots: globalDraft.seo_default_robots.trim() || null,
      seo_default_language: globalDraft.seo_default_language.trim() || null,
      seo_keywords: globalDraft.seo_keywords.trim() || null,
    });

    if (!result.error) {
      setGlobalDraftOverrides({});
      await refreshSettings();
    }
  };

  const handleSavePageSeo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!pageDraft || !canEditSeoItems) {
      return;
    }

    setPageError(null);
    setPageMessage(null);
    setIsSavingPage(true);

    const normalizedSlug = slugify(pageDraft.slug);
    if (!normalizedSlug) {
      setIsSavingPage(false);
      setPageError('Slug da pagina e obrigatorio.');
      return;
    }

    const result = await updatePage(pageDraft.id, {
      slug: normalizedSlug,
      seo_title: pageDraft.seo_title.trim() || null,
      seo_description: pageDraft.seo_description.trim() || null,
      og_title: pageDraft.og_title.trim() || null,
      og_description: pageDraft.og_description.trim() || null,
      og_image_url: pageDraft.og_image_url.trim() || null,
      canonical_url: normalizeCanonical(pageDraft.canonical_url) || null,
      robots_index: pageDraft.robots_index,
      robots_follow: pageDraft.robots_follow,
    });

    setIsSavingPage(false);

    if (result.error || !result.data) {
      setPageError(result.error ?? 'Nao foi possivel salvar o SEO da pagina.');
      return;
    }

    setPages((prev) => prev.map((item) => (item.id === result.data?.id ? result.data : item)));
    setPageDraftOverrides({});
    setPageMessage('SEO da pagina salvo com sucesso.');
  };

  const handleSaveStoreSeo = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!storeDraft || !canEditSeoItems) {
      return;
    }

    setStoreError(null);
    setStoreMessage(null);
    setIsSavingStore(true);

    const normalizedSlug = slugify(storeDraft.slug);
    if (!normalizedSlug) {
      setIsSavingStore(false);
      setStoreError('Slug da loja e obrigatorio.');
      return;
    }

    const result = await updateStore(storeDraft.id, {
      slug: normalizedSlug,
      seo_title: storeDraft.seo_title.trim() || null,
      seo_description: storeDraft.seo_description.trim() || null,
      og_image_url: storeDraft.og_image_url.trim() || null,
    });

    setIsSavingStore(false);

    if (result.error || !result.data) {
      setStoreError(result.error ?? 'Nao foi possivel salvar o SEO da loja.');
      return;
    }

    setStores((prev) => prev.map((item) => (item.id === result.data?.id ? result.data : item)));
    setStoreDraftOverrides({});
    setStoreMessage('SEO da loja salvo com sucesso.');
  };

  const pagePreview = useMemo(() => {
    if (!pageDraft) {
      return null;
    }

    const title = pageDraft.seo_title.trim() || pageDraft.title.trim() || 'Pagina institucional';
    const description =
      pageDraft.seo_description.trim() ||
      settings.short_description ||
      'Conteudo institucional do Shopping Mega Polo Moda.';
    const canonicalPath = pageDraft.canonical_url.trim() || `/pagina/${pageDraft.slug || ''}`;
    const canonical = normalizeCanonical(canonicalPath);
    const previewUrl =
      canonical.startsWith('http://') || canonical.startsWith('https://')
        ? canonical
        : `${getSiteBaseUrl()}${canonical || '/'}`;

    return {
      title,
      description,
      url: previewUrl,
      socialTitle: pageDraft.og_title.trim() || title,
      socialDescription: pageDraft.og_description.trim() || description,
      socialImage: pageDraft.og_image_url.trim() || settings.default_og_image_url,
    };
  }, [pageDraft, settings.default_og_image_url, settings.short_description]);

  const storePreview = useMemo(() => {
    if (!storeDraft) {
      return null;
    }

    const title = storeDraft.seo_title.trim() || storeDraft.name.trim() || 'Loja Mega Polo Moda';
    const description =
      storeDraft.seo_description.trim() ||
      settings.short_description ||
      'Conheca as lojas de moda atacadista no Bras.';
    const url = `${getSiteBaseUrl()}/lojas/${storeDraft.slug || ''}`;

    return {
      title,
      description,
      url,
      socialImage: storeDraft.og_image_url.trim() || settings.default_og_image_url,
    };
  }, [settings.default_og_image_url, settings.short_description, storeDraft]);

  return (
    <>
      <SEO
        title="SEO | CMS Mega Polo Moda"
        description="Configure metadados globais e por pagina do portal Mega Polo Moda."
        robots="noindex,nofollow"
      />

      <AdminPageShell
        title="SEO"
        description="Gerencie metadados globais, paginas institucionais e lojas com fallback seguro para o front publico."
        actions={(
          <button
            type="button"
            onClick={() => void handleRefresh()}
            disabled={isRefreshing || isLoading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
            Atualizar dados
          </button>
        )}
      >
        {!canEditSeoItems && (
          <AdminEmptyState
            title="Permissao limitada"
            description={`Seu perfil atual (${roleLabel}) pode visualizar os dados de SEO, mas nao pode salvar alteracoes.`}
          />
        )}

        {isLoading && <AdminLoadingState label="Carregando dados de SEO..." />}

        {!isLoading && loadError && (
          <AdminErrorState message={loadError} onRetry={() => void handleRefresh()} />
        )}

        {!isLoading && !loadError && (
          <div className="space-y-6">
            <AdminCard
              title="SEO global"
              description="Define os metadados padrao usados quando paginas ou lojas nao possuem configuracao propria."
            >
              {!canEditGlobal && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Apenas Admin e Super Admin podem salvar SEO global.
                </div>
              )}

              <form className="space-y-6" onSubmit={handleSaveGlobal}>
                <AdminFormSection
                  title="Metadados padrao"
                  description="Esses campos sao usados como fallback pelo componente SEO."
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="seo-site-name" className={labelClassName}>
                        Nome do site
                      </label>
                      <input
                        id="seo-site-name"
                        type="text"
                        value={globalDraft.site_name}
                        onChange={(event) => {
                          clearStatus();
                          setGlobalDraftOverrides((prev) => ({ ...prev, site_name: event.target.value }));
                        }}
                        className={inputClassName}
                        disabled={!canEditGlobal || isSavingGlobal}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="seo-base-url" className={labelClassName}>
                        URL base canonica
                      </label>
                      <input
                        id="seo-base-url"
                        type="url"
                        value={globalDraft.seo_base_url}
                        onChange={(event) => {
                          clearStatus();
                          setGlobalDraftOverrides((prev) => ({ ...prev, seo_base_url: event.target.value }));
                        }}
                        className={inputClassName}
                        placeholder="https://www.megapolomoda.com.br"
                        disabled={!canEditGlobal || isSavingGlobal}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="seo-site-description" className={labelClassName}>
                      Descricao padrao
                    </label>
                    <textarea
                      id="seo-site-description"
                      rows={3}
                      value={globalDraft.short_description}
                      onChange={(event) => {
                        clearStatus();
                        setGlobalDraftOverrides((prev) => ({ ...prev, short_description: event.target.value }));
                      }}
                      className={textareaClassName}
                      disabled={!canEditGlobal || isSavingGlobal}
                    />
                  </div>

                  <MediaPickerField
                    id="seo-default-og-image"
                    label="Imagem OG padrao"
                    value={globalDraft.default_og_image_url}
                    onChange={(value) => {
                      clearStatus();
                      setGlobalDraftOverrides((prev) => ({ ...prev, default_og_image_url: value }));
                    }}
                    placeholder="https://..."
                    disabled={!canEditGlobal || isSavingGlobal}
                    allowedBuckets={['institutional', 'pages', 'banners', 'logos']}
                    initialBucket="institutional"
                    typeFilter="image"
                    showPreview
                    previewAlt="Imagem OG padrao do site"
                    pickerTitle="Selecionar imagem OG global"
                    pickerDescription="Escolha a imagem padrao para compartilhamento."
                  />

                  <MediaPickerField
                    id="seo-favicon"
                    label="Favicon"
                    value={globalDraft.favicon_url}
                    onChange={(value) => {
                      clearStatus();
                      setGlobalDraftOverrides((prev) => ({ ...prev, favicon_url: value }));
                    }}
                    placeholder="https://..."
                    disabled={!canEditGlobal || isSavingGlobal}
                    allowedBuckets={['logos', 'institutional']}
                    initialBucket="logos"
                    typeFilter="image"
                    showPreview
                    previewAlt="Favicon do site"
                    pickerTitle="Selecionar favicon"
                    pickerDescription="Escolha o favicon principal do portal."
                  />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="seo-default-robots" className={labelClassName}>
                        Robots padrao
                      </label>
                      <select
                        id="seo-default-robots"
                        value={globalDraft.seo_default_robots || 'index,follow'}
                        onChange={(event) => {
                          clearStatus();
                          setGlobalDraftOverrides((prev) => ({
                            ...prev,
                            seo_default_robots: event.target.value,
                          }));
                        }}
                        className={inputClassName}
                        disabled={!canEditGlobal || isSavingGlobal}
                      >
                        <option value="index,follow">index,follow</option>
                        <option value="noindex,follow">noindex,follow</option>
                        <option value="index,nofollow">index,nofollow</option>
                        <option value="noindex,nofollow">noindex,nofollow</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="seo-default-language" className={labelClassName}>
                        Idioma padrao
                      </label>
                      <input
                        id="seo-default-language"
                        type="text"
                        value={globalDraft.seo_default_language}
                        onChange={(event) => {
                          clearStatus();
                          setGlobalDraftOverrides((prev) => ({
                            ...prev,
                            seo_default_language: event.target.value,
                          }));
                        }}
                        className={inputClassName}
                        placeholder="pt-BR"
                        disabled={!canEditGlobal || isSavingGlobal}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="seo-keywords" className={labelClassName}>
                        Keywords (opcional)
                      </label>
                      <input
                        id="seo-keywords"
                        type="text"
                        value={globalDraft.seo_keywords}
                        onChange={(event) => {
                          clearStatus();
                          setGlobalDraftOverrides((prev) => ({ ...prev, seo_keywords: event.target.value }));
                        }}
                        className={inputClassName}
                        placeholder="moda atacadista, bras, lojas"
                        disabled={!canEditGlobal || isSavingGlobal}
                      />
                    </div>
                  </div>
                </AdminFormSection>

                <GooglePreview
                  title={globalDraft.site_name}
                  description={globalDraft.short_description}
                  url={globalDraft.seo_base_url || getSiteBaseUrl()}
                />

                <SocialPreview
                  title={globalDraft.site_name}
                  description={globalDraft.short_description}
                  imageUrl={globalDraft.default_og_image_url}
                  siteName={globalDraft.site_name}
                />

                {globalError && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                    {globalError}
                  </p>
                )}

                {globalSuccessMessage && (
                  <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                    {globalSuccessMessage}
                  </p>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!canEditGlobal || isSavingGlobal}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                  >
                    {isSavingGlobal ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSavingGlobal ? 'Salvando...' : 'Salvar SEO global'}
                  </button>
                </div>
              </form>
            </AdminCard>

            <AdminCard
              title="SEO por pagina"
              description="Selecione uma pagina institucional para definir title, description, canonical e robots."
            >
              {sortedPages.length === 0 ? (
                <AdminEmptyState
                  title="Nenhuma pagina cadastrada"
                  description="Cadastre paginas no modulo de Paginas para gerenciar SEO individual."
                />
              ) : (
                <form className="space-y-6" onSubmit={handleSavePageSeo}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="seo-page-select" className={labelClassName}>
                        Pagina
                      </label>
                      <select
                        id="seo-page-select"
                        value={pageId}
                        onChange={(event) => {
                          setPageMessage(null);
                          setPageError(null);
                          setPageDraftOverrides({});
                          setPageId(event.target.value);
                        }}
                        className={inputClassName}
                      >
                        {sortedPages.map((page) => (
                          <option key={page.id} value={page.id}>
                            {page.title} ({page.slug}) {page.is_published ? '' : '[Rascunho]'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="seo-page-slug" className={labelClassName}>
                        Slug
                      </label>
                      <input
                        id="seo-page-slug"
                        type="text"
                        value={pageDraft?.slug ?? ''}
                        onChange={(event) =>
                          setPageDraftOverrides((prev) => ({ ...prev, slug: event.target.value }))
                        }
                        className={inputClassName}
                        disabled={!pageDraft || !canEditSeoItems || isSavingPage}
                      />
                    </div>
                  </div>

                  <AdminFormSection title="Meta tags">
                    <div className="space-y-2">
                      <label htmlFor="seo-page-title" className={labelClassName}>
                        Meta title
                      </label>
                      <input
                        id="seo-page-title"
                        type="text"
                        value={pageDraft?.seo_title ?? ''}
                        onChange={(event) =>
                          setPageDraftOverrides((prev) => ({ ...prev, seo_title: event.target.value }))
                        }
                        className={inputClassName}
                        disabled={!pageDraft || !canEditSeoItems || isSavingPage}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="seo-page-description" className={labelClassName}>
                        Meta description
                      </label>
                      <textarea
                        id="seo-page-description"
                        rows={3}
                        value={pageDraft?.seo_description ?? ''}
                        onChange={(event) =>
                          setPageDraftOverrides((prev) => ({
                            ...prev,
                            seo_description: event.target.value,
                          }))
                        }
                        className={textareaClassName}
                        disabled={!pageDraft || !canEditSeoItems || isSavingPage}
                      />
                    </div>
                  </AdminFormSection>

                  <AdminFormSection title="Open Graph e canonical">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="seo-page-og-title" className={labelClassName}>
                          OG title
                        </label>
                        <input
                          id="seo-page-og-title"
                          type="text"
                          value={pageDraft?.og_title ?? ''}
                          onChange={(event) =>
                            setPageDraftOverrides((prev) => ({ ...prev, og_title: event.target.value }))
                          }
                          className={inputClassName}
                          disabled={!pageDraft || !canEditSeoItems || isSavingPage}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="seo-page-canonical" className={labelClassName}>
                          Canonical URL
                        </label>
                        <input
                          id="seo-page-canonical"
                          type="text"
                          value={pageDraft?.canonical_url ?? ''}
                          onChange={(event) =>
                            setPageDraftOverrides((prev) => ({
                              ...prev,
                              canonical_url: event.target.value,
                            }))
                          }
                          className={inputClassName}
                          placeholder="/sobre ou https://www..."
                          disabled={!pageDraft || !canEditSeoItems || isSavingPage}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="seo-page-og-description" className={labelClassName}>
                        OG description
                      </label>
                      <textarea
                        id="seo-page-og-description"
                        rows={3}
                        value={pageDraft?.og_description ?? ''}
                        onChange={(event) =>
                          setPageDraftOverrides((prev) => ({
                            ...prev,
                            og_description: event.target.value,
                          }))
                        }
                        className={textareaClassName}
                        disabled={!pageDraft || !canEditSeoItems || isSavingPage}
                      />
                    </div>

                    <MediaPickerField
                      id="seo-page-og-image"
                      label="OG image"
                      value={pageDraft?.og_image_url ?? ''}
                      onChange={(value) =>
                        setPageDraftOverrides((prev) => ({ ...prev, og_image_url: value }))
                      }
                      placeholder="https://..."
                      allowedBuckets={['pages', 'institutional', 'banners']}
                      initialBucket="pages"
                      typeFilter="image"
                      showPreview
                      previewAlt={`Imagem OG da pagina ${pageDraft?.title ?? ''}`}
                      pickerTitle="Selecionar imagem OG da pagina"
                      pickerDescription="Escolha a imagem social desta pagina."
                      disabled={!pageDraft || !canEditSeoItems || isSavingPage}
                    />
                  </AdminFormSection>

                  <AdminFormSection title="Robots">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label className="inline-flex items-center gap-3 text-sm text-brand-dark/80">
                        <input
                          type="checkbox"
                          checked={pageDraft?.robots_index ?? true}
                          onChange={(event) =>
                            setPageDraftOverrides((prev) => ({
                              ...prev,
                              robots_index: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-brand-dark/20 text-brand-red focus:ring-brand-red"
                          disabled={!pageDraft || !canEditSeoItems || isSavingPage}
                        />
                        Indexar pagina
                      </label>

                      <label className="inline-flex items-center gap-3 text-sm text-brand-dark/80">
                        <input
                          type="checkbox"
                          checked={pageDraft?.robots_follow ?? true}
                          onChange={(event) =>
                            setPageDraftOverrides((prev) => ({
                              ...prev,
                              robots_follow: event.target.checked,
                            }))
                          }
                          className="h-4 w-4 rounded border-brand-dark/20 text-brand-red focus:ring-brand-red"
                          disabled={!pageDraft || !canEditSeoItems || isSavingPage}
                        />
                        Permitir follow
                      </label>
                    </div>

                    <p className="text-xs text-brand-dark/60">
                      Robots final: {buildRobotsDirective(pageDraft?.robots_index ?? true, pageDraft?.robots_follow ?? true)}
                    </p>
                  </AdminFormSection>

                  {pagePreview && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <GooglePreview
                        title={pagePreview.title}
                        description={pagePreview.description}
                        url={pagePreview.url}
                      />
                      <SocialPreview
                        title={pagePreview.socialTitle}
                        description={pagePreview.socialDescription}
                        imageUrl={pagePreview.socialImage}
                        siteName={settings.site_name}
                      />
                    </div>
                  )}

                  {pageError && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                      {pageError}
                    </p>
                  )}

                  {pageMessage && (
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                      {pageMessage}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!canEditSeoItems || !pageDraft || isSavingPage}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSavingPage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {isSavingPage ? 'Salvando...' : 'Salvar SEO da pagina'}
                    </button>
                  </div>
                </form>
              )}
            </AdminCard>

            <AdminCard
              title="SEO por loja"
              description="Gerencie titulo, descricao, imagem social e slug de cada loja publicada ou em rascunho."
            >
              {sortedStores.length === 0 ? (
                <AdminEmptyState
                  title="Nenhuma loja cadastrada"
                  description="Cadastre lojas no modulo de Lojas para configurar SEO individual."
                />
              ) : (
                <form className="space-y-6" onSubmit={handleSaveStoreSeo}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="seo-store-select" className={labelClassName}>
                        Loja
                      </label>
                      <select
                        id="seo-store-select"
                        value={storeId}
                        onChange={(event) => {
                          setStoreMessage(null);
                          setStoreError(null);
                          setStoreDraftOverrides({});
                          setStoreId(event.target.value);
                        }}
                        className={inputClassName}
                      >
                        {sortedStores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name} ({store.slug}) {store.is_published ? '' : '[Rascunho]'}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="seo-store-slug" className={labelClassName}>
                        Slug da loja
                      </label>
                      <input
                        id="seo-store-slug"
                        type="text"
                        value={storeDraft?.slug ?? ''}
                        onChange={(event) =>
                          setStoreDraftOverrides((prev) => ({ ...prev, slug: event.target.value }))
                        }
                        className={inputClassName}
                        disabled={!storeDraft || !canEditSeoItems || isSavingStore}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="seo-store-title" className={labelClassName}>
                      Meta title
                    </label>
                    <input
                      id="seo-store-title"
                      type="text"
                      value={storeDraft?.seo_title ?? ''}
                      onChange={(event) =>
                        setStoreDraftOverrides((prev) => ({ ...prev, seo_title: event.target.value }))
                      }
                      className={inputClassName}
                      disabled={!storeDraft || !canEditSeoItems || isSavingStore}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="seo-store-description" className={labelClassName}>
                      Meta description
                    </label>
                    <textarea
                      id="seo-store-description"
                      rows={3}
                      value={storeDraft?.seo_description ?? ''}
                      onChange={(event) =>
                        setStoreDraftOverrides((prev) => ({
                          ...prev,
                          seo_description: event.target.value,
                        }))
                      }
                      className={textareaClassName}
                      disabled={!storeDraft || !canEditSeoItems || isSavingStore}
                    />
                  </div>

                  <MediaPickerField
                    id="seo-store-og-image"
                    label="Imagem social (OG image)"
                    value={storeDraft?.og_image_url ?? ''}
                    onChange={(value) =>
                      setStoreDraftOverrides((prev) => ({ ...prev, og_image_url: value }))
                    }
                    placeholder="https://..."
                    allowedBuckets={['stores', 'banners', 'institutional', 'pages']}
                    initialBucket="stores"
                    typeFilter="image"
                    showPreview
                    previewAlt={`Imagem social da loja ${storeDraft?.name ?? ''}`}
                    pickerTitle="Selecionar imagem social da loja"
                    pickerDescription="Escolha a imagem de compartilhamento da loja."
                    disabled={!storeDraft || !canEditSeoItems || isSavingStore}
                  />

                  {storePreview && (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <GooglePreview
                        title={storePreview.title}
                        description={storePreview.description}
                        url={storePreview.url}
                      />
                      <SocialPreview
                        title={storePreview.title}
                        description={storePreview.description}
                        imageUrl={storePreview.socialImage}
                        siteName={settings.site_name}
                      />
                    </div>
                  )}

                  {storeError && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                      {storeError}
                    </p>
                  )}

                  {storeMessage && (
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                      {storeMessage}
                    </p>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={!canEditSeoItems || !storeDraft || isSavingStore}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {isSavingStore ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      {isSavingStore ? 'Salvando...' : 'Salvar SEO da loja'}
                    </button>
                  </div>
                </form>
              )}
            </AdminCard>
          </div>
        )}
      </AdminPageShell>
    </>
  );
}
