import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { SEO } from '../components/ui/SEO';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import NotFound from './NotFound';
import { isSupabaseConfigured } from '../lib/supabase';
import { getPageBySlug } from '../services/pages.service';
import type { Page } from '../types/cms';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { usePublicContentBlocks } from '../hooks/usePublicContentBlocks';
import { getFallbackCmsPage } from '../config/cmsPagesFallback';
import {
  blockTypeSupportsItems,
  buildPageContentKey,
  getPageBuilderBlockTypeLabel,
  isPageBuilderBlockType,
} from '../types/pageBuilder';
import type { PublicContentBlock, PublicContentBlockItem } from '../hooks/usePublicContentBlocks';
import {
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
} from '../utils/seo';

interface CmsPageProps {
  slug?: string;
}

function contentToParagraphs(value: string | null): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeText(value: string | null | undefined, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function buildRobotsDirective(indexValue: boolean | null | undefined, followValue: boolean | null | undefined): string {
  const indexDirective = indexValue === false ? 'noindex' : 'index';
  const followDirective = followValue === false ? 'nofollow' : 'follow';
  return `${indexDirective},${followDirective}`;
}

function buildFallbackBlocksFromPage(page: Page | null, slug: string): PublicContentBlock[] {
  if (!page) {
    return [];
  }

  return [
    {
      id: `fallback-${slug}-hero`,
      page_key: buildPageContentKey(slug),
      block_key: 'hero',
      block_type: 'hero',
      title: normalizeText(page.title),
      subtitle: normalizeText(page.subtitle),
      content: normalizeText(page.content),
      image_url: normalizeText(page.hero_image_url),
      icon: '',
      button_label: '',
      button_url: '',
      secondary_button_label: '',
      secondary_button_url: '',
      settings: {},
      sort_order: 1,
      is_active: true,
      items: [],
    },
    {
      id: `fallback-${slug}-content`,
      page_key: buildPageContentKey(slug),
      block_key: 'content',
      block_type: 'text',
      title: '',
      subtitle: '',
      content: normalizeText(page.content),
      image_url: '',
      icon: '',
      button_label: '',
      button_url: '',
      secondary_button_label: '',
      secondary_button_url: '',
      settings: {},
      sort_order: 2,
      is_active: true,
      items: [],
    },
  ];
}

function isExternalUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(url);
}

function renderBlockAction(label: string, url: string, isSecondary = false) {
  if (!label || !url) {
    return null;
  }

  const className = isSecondary
    ? 'inline-flex items-center px-5 py-3 rounded-lg border border-brand-dark/15 text-brand-dark text-[11px] tracking-brand font-bold uppercase hover:border-brand-red hover:text-brand-red transition-colors'
    : 'inline-flex items-center px-5 py-3 rounded-lg bg-brand-dark text-white text-[11px] tracking-brand font-bold uppercase hover:bg-brand-red transition-colors';

  if (isExternalUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
      </a>
    );
  }

  return (
    <Link to={url} className={className}>
      {label}
    </Link>
  );
}

function renderCardList(items: PublicContentBlockItem[]) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {items.map((item) => (
        <article key={item.id} className="rounded-2xl border border-brand-dark/10 bg-white p-5 space-y-2">
          {item.image_url && (
            <ImageWithFallback
              src={item.image_url}
              alt={item.title || 'Item'}
              className="w-full h-44 object-cover rounded-xl"
              width={640}
              height={400}
              sizes="(max-width: 768px) 100vw, 50vw"
            />
          )}
          {item.title && <h3 className="text-xl font-serif font-semibold text-brand-dark">{item.title}</h3>}
          {item.subtitle && <p className="text-[11px] uppercase tracking-brand text-brand-dark/60">{item.subtitle}</p>}
          {item.content && <p className="text-sm text-brand-dark/75 leading-relaxed">{item.content}</p>}
          {(item.button_label && item.button_url) && (
            <div className="pt-2">{renderBlockAction(item.button_label, item.button_url)}</div>
          )}
        </article>
      ))}
    </div>
  );
}

function renderFaqList(items: PublicContentBlockItem[]) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <details key={item.id} className="rounded-xl border border-brand-dark/10 bg-white p-4 group">
          <summary className="cursor-pointer font-semibold text-brand-dark list-none">
            {item.title || 'Pergunta'}
          </summary>
          {item.content && <p className="mt-3 text-sm text-brand-dark/75 leading-relaxed">{item.content}</p>}
        </details>
      ))}
    </div>
  );
}

function renderBenefitsList(items: PublicContentBlockItem[]) {
  if (!items.length) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-brand-dark/10 bg-white p-4">
          <p className="font-semibold text-brand-dark">{item.title || item.content}</p>
          {item.content && item.title && <p className="text-sm text-brand-dark/75 mt-1">{item.content}</p>}
        </li>
      ))}
    </ul>
  );
}

function renderGallery(items: PublicContentBlockItem[]) {
  if (!items.length) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {items.map((item) => (
        <figure key={item.id} className="rounded-2xl border border-brand-dark/10 bg-white p-3 space-y-2">
          <ImageWithFallback
            src={item.image_url}
            alt={item.title || 'Imagem da galeria'}
            className="w-full h-48 object-cover rounded-xl"
            width={640}
            height={400}
            sizes="(max-width: 768px) 100vw, 50vw"
          />
          {item.title && <figcaption className="text-sm text-brand-dark/80">{item.title}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

export default function CmsPage({ slug: propSlug }: CmsPageProps) {
  const params = useParams<{ slug?: string }>();
  const location = useLocation();
  const { settings } = useSiteSettings();
  const slug = propSlug ?? params.slug ?? '';

  const [page, setPage] = useState<Page | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      const fallbackPage = getFallbackCmsPage(slug);

      if (!slug) {
        if (mounted) {
          setPage(null);
          setHasError(false);
          setIsLoading(false);
        }
        return;
      }

      if (!isSupabaseConfigured) {
        if (mounted) {
          setPage(fallbackPage);
          setHasError(!fallbackPage);
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setHasError(false);

      const result = await getPageBySlug(slug, false);

      if (!mounted) {
        return;
      }

      if (result.error) {
        if (import.meta.env.DEV) {
          console.warn(`Falha ao carregar pagina CMS (${slug}):`, result.error);
        }
        setPage(fallbackPage);
        setHasError(!fallbackPage);
        setIsLoading(false);
        return;
      }

      setPage(result.data ?? fallbackPage);
      setHasError(!result.data && !fallbackPage);
      setIsLoading(false);
    };

    void loadPage();

    return () => {
      mounted = false;
    };
  }, [slug]);

  const contentParagraphs = useMemo(() => contentToParagraphs(page?.content ?? null), [page?.content]);
  const fallbackBlocks = useMemo(() => buildFallbackBlocksFromPage(page, slug), [page, slug]);
  const {
    blocks: pageBlocks,
    isLoading: isBlocksLoading,
  } = usePublicContentBlocks({
    pageKey: buildPageContentKey(slug),
    fallbackBlocks,
    fallbackMode: 'only-when-empty',
  });

  const activeBlocks = useMemo(
    () =>
      pageBlocks
        .filter((block) => block.is_active)
        .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [pageBlocks],
  );

  const heroBlock = useMemo(
    () => activeBlocks.find((block) => block.block_type === 'hero') ?? null,
    [activeBlocks],
  );

  const contentBlocks = useMemo(
    () =>
      activeBlocks.filter((block) => block.id !== heroBlock?.id),
    [activeBlocks, heroBlock?.id],
  );
  const pageSeoTitle = page?.seo_title?.trim() || page?.title || 'Mega Polo Moda';
  const pageSeoDescription =
    page?.seo_description?.trim() || page?.subtitle?.trim() || settings.short_description;
  const pageOgTitle =
    page?.og_title?.trim() || page?.seo_title?.trim() || page?.title || settings.site_name;
  const pageOgDescription =
    page?.og_description?.trim() || page?.seo_description?.trim() || page?.subtitle?.trim() || settings.short_description;
  const pageOgImage =
    page?.og_image_url?.trim() ||
    page?.hero_image_url?.trim() ||
    settings.institutional_image_url ||
    settings.logo_url;
  const pageCanonicalUrl = page?.canonical_url?.trim() || location.pathname;
  const pageRobots = buildRobotsDirective(page?.robots_index, page?.robots_follow);
  const pageStructuredData = useMemo(() => {
    if (!page) {
      return [buildOrganizationStructuredData(settings)];
    }

    return [
      buildOrganizationStructuredData(settings),
      buildBreadcrumbStructuredData([
        { name: 'Home', path: '/' },
        { name: page.title, path: location.pathname },
      ]),
    ];
  }, [location.pathname, page, settings]);

  if (isLoading) {
    return (
      <div className="bg-brand-paper min-h-[60vh] flex items-center justify-center px-6 py-20">
        <div className="max-w-xl w-full bg-white border border-brand-dark/5 rounded-[28px] shadow-soft p-8 text-center space-y-3">
          <p className="text-sm tracking-brand font-bold uppercase text-brand-dark/40">Carregando</p>
          <h1 className="text-2xl font-serif font-bold italic text-brand-dark">Buscando conteudo da pagina...</h1>
        </div>
      </div>
    );
  }

  if (!page || hasError || !page.is_published) {
    return <NotFound />;
  }

  const heroTitle = normalizeText(heroBlock?.title, page.title);
  const heroSubtitle = normalizeText(heroBlock?.subtitle, page.subtitle ?? '');
  const heroContent = normalizeText(heroBlock?.content, page.subtitle ?? '');
  const heroImage = normalizeText(heroBlock?.image_url, page.hero_image_url ?? '');
  const heroPrimaryLabel = normalizeText(heroBlock?.button_label);
  const heroPrimaryUrl = normalizeText(heroBlock?.button_url);
  const heroSecondaryLabel = normalizeText(heroBlock?.secondary_button_label);
  const heroSecondaryUrl = normalizeText(heroBlock?.secondary_button_url);

  const shouldRenderDefaultContent =
    !isBlocksLoading &&
    contentBlocks.length === 0 &&
    contentParagraphs.length > 0;

  return (
    <div className="bg-brand-paper min-h-screen">
      <SEO
        title={pageSeoTitle}
        description={pageSeoDescription}
        canonical={pageCanonicalUrl}
        ogTitle={pageOgTitle}
        ogDescription={pageOgDescription}
        ogImage={pageOgImage}
        robots={pageRobots}
        structuredData={pageStructuredData}
      />

      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28 overflow-hidden bg-brand-dark text-white">
        {heroImage && (
          <>
            <ImageWithFallback
              src={heroImage}
              alt={heroTitle}
              className="absolute inset-0 w-full h-full object-cover opacity-25"
              loading="eager"
              width={1600}
              height={900}
              sizes="100vw"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-brand-dark/90 via-brand-dark/80 to-brand-dark" />
          </>
        )}

        <div className="container-custom relative z-10 max-w-4xl space-y-5">
          <p className="text-[10px] tracking-brand font-bold uppercase text-brand-gold">Mega Polo Moda</p>
          <h1 className="text-4xl md:text-6xl font-serif font-bold italic leading-tight">{heroTitle}</h1>
          {heroSubtitle && <p className="text-lg md:text-xl text-white/80 font-sans leading-relaxed">{heroSubtitle}</p>}
          {heroContent && heroContent !== heroSubtitle && (
            <p className="text-base md:text-lg text-white/75 font-sans leading-relaxed max-w-3xl">{heroContent}</p>
          )}
          {(heroPrimaryLabel && heroPrimaryUrl) || (heroSecondaryLabel && heroSecondaryUrl) ? (
            <div className="flex flex-wrap gap-3 pt-2">
              {heroPrimaryLabel && heroPrimaryUrl && renderBlockAction(heroPrimaryLabel, heroPrimaryUrl)}
              {heroSecondaryLabel && heroSecondaryUrl && renderBlockAction(heroSecondaryLabel, heroSecondaryUrl, true)}
            </div>
          ) : null}
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-custom max-w-4xl">
          {isBlocksLoading ? (
            <article className="bg-white border border-brand-dark/5 rounded-3xl shadow-soft p-8 md:p-12">
              <p className="text-brand-dark/60 font-sans">Carregando conteudo da pagina...</p>
            </article>
          ) : (
            <div className="space-y-6">
              {contentBlocks.map((block) => {
                const type = isPageBuilderBlockType(block.block_type) ? block.block_type : 'text';
                const items = (block.items ?? [])
                  .filter((item) => item.is_active)
                  .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

                if (type === 'image') {
                  return (
                    <article key={block.id} className="bg-white border border-brand-dark/5 rounded-3xl shadow-soft p-4">
                      <ImageWithFallback
                        src={block.image_url}
                        alt={block.title || page.title}
                        className="w-full h-[320px] object-cover rounded-2xl"
                        width={1200}
                        height={700}
                        sizes="100vw"
                      />
                    </article>
                  );
                }

                if (type === 'text_image') {
                  return (
                    <article key={block.id} className="bg-white border border-brand-dark/5 rounded-3xl shadow-soft p-8 md:p-12">
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
                        <div className="space-y-4">
                          {block.title && <h2 className="text-3xl font-serif font-semibold text-brand-dark">{block.title}</h2>}
                          {block.subtitle && <p className="text-sm uppercase tracking-brand text-brand-dark/60">{block.subtitle}</p>}
                          {contentToParagraphs(block.content).map((paragraph, index) => (
                            <p key={`${block.id}-p-${index}`} className="text-brand-dark/80 font-sans leading-relaxed">
                              {paragraph}
                            </p>
                          ))}
                          {(block.button_label && block.button_url) && renderBlockAction(block.button_label, block.button_url)}
                        </div>
                        {block.image_url && (
                          <ImageWithFallback
                            src={block.image_url}
                            alt={block.title || page.title}
                            className="w-full h-80 object-cover rounded-2xl"
                            width={960}
                            height={720}
                            sizes="(max-width: 1024px) 100vw, 50vw"
                          />
                        )}
                      </div>
                    </article>
                  );
                }

                if (type === 'cards') {
                  return (
                    <article key={block.id} className="bg-white border border-brand-dark/5 rounded-3xl shadow-soft p-8 md:p-12 space-y-6">
                      {block.title && <h2 className="text-3xl font-serif font-semibold text-brand-dark">{block.title}</h2>}
                      {block.subtitle && <p className="text-sm uppercase tracking-brand text-brand-dark/60">{block.subtitle}</p>}
                      {block.content && <p className="text-brand-dark/80">{block.content}</p>}
                      {renderCardList(items)}
                    </article>
                  );
                }

                if (type === 'faq') {
                  return (
                    <article key={block.id} className="bg-white border border-brand-dark/5 rounded-3xl shadow-soft p-8 md:p-12 space-y-6">
                      {block.title && <h2 className="text-3xl font-serif font-semibold text-brand-dark">{block.title}</h2>}
                      {block.subtitle && <p className="text-sm uppercase tracking-brand text-brand-dark/60">{block.subtitle}</p>}
                      {renderFaqList(items)}
                    </article>
                  );
                }

                if (type === 'gallery') {
                  return (
                    <article key={block.id} className="bg-white border border-brand-dark/5 rounded-3xl shadow-soft p-8 md:p-12 space-y-6">
                      {block.title && <h2 className="text-3xl font-serif font-semibold text-brand-dark">{block.title}</h2>}
                      {block.subtitle && <p className="text-sm uppercase tracking-brand text-brand-dark/60">{block.subtitle}</p>}
                      {renderGallery(items)}
                    </article>
                  );
                }

                if (type === 'benefits_list') {
                  return (
                    <article key={block.id} className="bg-white border border-brand-dark/5 rounded-3xl shadow-soft p-8 md:p-12 space-y-6">
                      {block.title && <h2 className="text-3xl font-serif font-semibold text-brand-dark">{block.title}</h2>}
                      {block.subtitle && <p className="text-sm uppercase tracking-brand text-brand-dark/60">{block.subtitle}</p>}
                      {renderBenefitsList(items)}
                    </article>
                  );
                }

                if (type === 'cta') {
                  return (
                    <article key={block.id} className="bg-brand-dark text-white rounded-3xl shadow-soft p-8 md:p-12 space-y-5">
                      {block.title && <h2 className="text-3xl font-serif font-semibold">{block.title}</h2>}
                      {block.subtitle && <p className="text-sm uppercase tracking-brand text-white/70">{block.subtitle}</p>}
                      {block.content && <p className="text-white/85">{block.content}</p>}
                      <div className="flex flex-wrap gap-3">
                        {block.button_label && block.button_url && renderBlockAction(block.button_label, block.button_url)}
                        {block.secondary_button_label &&
                          block.secondary_button_url &&
                          renderBlockAction(block.secondary_button_label, block.secondary_button_url, true)}
                      </div>
                    </article>
                  );
                }

                return (
                  <article key={block.id} className="bg-white border border-brand-dark/5 rounded-3xl shadow-soft p-8 md:p-12 space-y-4">
                    {(block.title || block.subtitle) && (
                      <header className="space-y-2">
                        {block.subtitle && (
                          <p className="text-sm uppercase tracking-brand text-brand-dark/60">{block.subtitle}</p>
                        )}
                        {block.title && <h2 className="text-3xl font-serif font-semibold text-brand-dark">{block.title}</h2>}
                        {!isPageBuilderBlockType(block.block_type) && (
                          <p className="text-[11px] uppercase tracking-brand text-brand-dark/40">
                            Tipo: {getPageBuilderBlockTypeLabel(block.block_type)}
                          </p>
                        )}
                      </header>
                    )}
                    {contentToParagraphs(block.content).map((paragraph, index) => (
                      <p key={`${block.id}-${index}`} className="text-brand-dark/80 font-sans leading-relaxed">
                        {paragraph}
                      </p>
                    ))}
                    {blockTypeSupportsItems(block.block_type) && items.length > 0 && renderCardList(items)}
                    {(block.button_label && block.button_url) && (
                      <div>{renderBlockAction(block.button_label, block.button_url)}</div>
                    )}
                  </article>
                );
              })}

              {shouldRenderDefaultContent && (
                <article className="bg-white border border-brand-dark/5 rounded-3xl shadow-soft p-8 md:p-12">
                  <div className="space-y-5 text-brand-dark/80 font-sans leading-relaxed">
                    {contentParagraphs.map((paragraph, index) => (
                      <p key={`${page.id}-${index}`}>{paragraph}</p>
                    ))}
                  </div>
                </article>
              )}

              {!shouldRenderDefaultContent && contentBlocks.length === 0 && (
                <article className="bg-white border border-brand-dark/5 rounded-3xl shadow-soft p-8 md:p-12">
                  <p className="text-brand-dark/60 font-sans">Conteudo desta pagina sera disponibilizado em breve.</p>
                </article>
              )}
            </div>
          )}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/"
              className="px-6 py-3 rounded-lg bg-brand-dark text-white text-[11px] tracking-brand font-bold uppercase hover:bg-brand-red transition-colors"
            >
              Voltar para Home
            </Link>
            <Link
              to="/lojas"
              className="px-6 py-3 rounded-lg border border-brand-dark/15 text-brand-dark text-[11px] tracking-brand font-bold uppercase hover:border-brand-red hover:text-brand-red transition-colors"
            >
              Ver lojas
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
