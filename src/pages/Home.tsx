import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search, ArrowRight, MessageCircle, MapPin, Star, ChevronRight, Check, Plus } from 'lucide-react';
import { SEO } from '../components/ui/SEO';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { usePlanning } from '../hooks/usePlanning';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useCategories } from '../hooks/useCategories';
import { useStores } from '../hooks/useStores';
import { useLaunches } from '../hooks/useLaunches';
import { usePublicContentBlocks } from '../hooks/usePublicContentBlocks';
import { allowMockFallback } from '../config/environment';
import { type ResolvedHomeSectionMap, resolveHomeSectionsMap } from '../config/homeSectionsFallback';
import { HOME_PUBLIC_BLOCKS_FALLBACK } from '../config/publicContentBlocksFallback';
import { isSupabaseConfigured } from '../lib/supabase';
import { listHomeSections } from '../services/homeSections.service';
import { createWhatsAppLink } from '../utils/whatsapp';
import {
  buildOrganizationStructuredData,
  buildShoppingCenterStructuredData,
  getCanonicalUrl,
} from '../utils/seo';
import type { Json } from '../types/database';

import NewsletterForm from '../components/NewsletterForm';

const DEFAULT_CATEGORY_IMAGE = '/images/logo-mega-polo.png';

function isImageSource(value: string | null | undefined): boolean {
  if (!value) {
    return false;
  }

  const normalized = value.trim().toLowerCase();
  if (!normalized) {
    return false;
  }

  return normalized.startsWith('http://') || normalized.startsWith('https://') || normalized.startsWith('/');
}

function normalizeText(value: string | null | undefined, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function readSettingText(settings: Json, key: string, fallback = ''): string {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return fallback;
  }

  const value = (settings as Record<string, Json>)[key];
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function buildInactiveHomeSectionsMap(): ResolvedHomeSectionMap {
  const fallbackMap = resolveHomeSectionsMap([]);
  return Object.fromEntries(
    Object.entries(fallbackMap).map(([sectionKey, section]) => [
      sectionKey,
      { ...section, is_active: false },
    ]),
  ) as ResolvedHomeSectionMap;
}

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { addItem, isInRoute } = usePlanning();
  const { settings } = useSiteSettings();
  const {
    categories: activeCategories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refreshCategories,
  } = useCategories({
    activeOnly: true,
    fallbackToMock: allowMockFallback,
  });
  const {
    publicStores: featuredStoresFromCms,
    isLoading: isStoresLoading,
    error: storesError,
    refreshStores,
  } = useStores({
    publishedOnly: true,
    featuredOnly: true,
    fallbackToMock: allowMockFallback,
    limit: 4,
  });
  const {
    publicLaunches: featuredLaunchesFromCms,
    isLoading: isLaunchesLoading,
    error: launchesError,
    refreshLaunches,
  } = useLaunches({
    publishedOnly: true,
    featuredOnly: true,
    includeExpired: false,
    fallbackToMock: allowMockFallback,
    limit: 4,
  });
  const { blocksByKey: homeCmsBlocks } = usePublicContentBlocks({
    pageKey: 'home',
    fallbackBlocks: HOME_PUBLIC_BLOCKS_FALLBACK,
  });
  const [homeSections, setHomeSections] = useState<ResolvedHomeSectionMap>(() =>
    allowMockFallback ? resolveHomeSectionsMap([]) : buildInactiveHomeSectionsMap(),
  );
  const [homeSectionsError, setHomeSectionsError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadHomeSections = async () => {
      if (!isSupabaseConfigured) {
        if (isMounted) {
          setHomeSections(allowMockFallback ? resolveHomeSectionsMap([]) : buildInactiveHomeSectionsMap());
          setHomeSectionsError('Nao foi possivel carregar as secoes da Home.');
        }
        return;
      }

      const result = await listHomeSections();

      if (!isMounted) {
        return;
      }

      if (result.error) {
        if (import.meta.env.DEV) {
          console.warn('Falha ao carregar home_sections, fallback aplicado:', result.error);
        }
        setHomeSections(allowMockFallback ? resolveHomeSectionsMap([]) : buildInactiveHomeSectionsMap());
        setHomeSectionsError(result.error);
        return;
      }

      const rows = result.data ?? [];
      if (!rows.length) {
        setHomeSections(allowMockFallback ? resolveHomeSectionsMap([]) : buildInactiveHomeSectionsMap());
        setHomeSectionsError(null);
        return;
      }

      setHomeSections(resolveHomeSectionsMap(rows, { disableMissingSections: true }));
      setHomeSectionsError(null);
    };

    void loadHomeSections();

    return () => {
      isMounted = false;
    };
  }, []);

  const heroSection = homeSections.hero;
  const categoriesSection = homeSections.categories_highlight;
  const featuredStoresSection = homeSections.featured_stores;
  const launchesSection = homeSections.launches_highlight;
  const howToBuySection = homeSections.how_to_buy;
  const planningSection = homeSections.planning_visit;
  const leasingSection = homeSections.leasing_cta;
  const newsletterSection = homeSections.newsletter_cta;

  const heroBannerBlock = homeCmsBlocks.hero_banner;
  const heroQuickLinksBlock = homeCmsBlocks.hero_quick_links;
  const heroBadgesBlock = homeCmsBlocks.hero_badges;
  const commercialStepsBlock = homeCmsBlocks.commercial_steps;
  const planningCardsBlock = homeCmsBlocks.planning_visit_cards;
  const leasingHighlightsBlock = homeCmsBlocks.leasing_highlights;

  const heroSecondaryLabel = normalizeText(
    heroBannerBlock?.secondary_button_label,
    'Ver lancamentos',
  );
  const heroSecondaryUrl = normalizeText(heroBannerBlock?.secondary_button_url, '/lancamentos');
  const heroTertiaryLabel = readSettingText(
    heroBannerBlock?.settings ?? {},
    'tertiary_button_label',
    'Planejar visita',
  );
  const heroTertiaryUrl = readSettingText(
    heroBannerBlock?.settings ?? {},
    'tertiary_button_url',
    '/planeje-sua-visita',
  );

  const heroQuickLinks = React.useMemo(
    () =>
      (heroQuickLinksBlock?.items ?? [])
        .filter((item) => item.is_active)
        .map((item) => ({
          label: normalizeText(item.title),
          url: normalizeText(item.button_url),
        }))
        .filter((item) => item.label && item.url),
    [heroQuickLinksBlock?.items],
  );

  const heroBadges = React.useMemo(
    () =>
      (heroBadgesBlock?.items ?? [])
        .filter((item) => item.is_active)
        .map((item) => normalizeText(item.title))
        .filter(Boolean),
    [heroBadgesBlock?.items],
  );

  const howToBuySteps = React.useMemo(
    () =>
      (commercialStepsBlock?.items ?? [])
        .filter((item) => item.is_active)
        .map((item, index) => ({
          step: normalizeText(item.subtitle, String(index + 1).padStart(2, '0')),
          title: normalizeText(item.title),
          desc: normalizeText(item.content),
        }))
        .filter((item) => item.title && item.desc),
    [commercialStepsBlock?.items],
  );

  const planningInfoCards = React.useMemo(
    () =>
      (planningCardsBlock?.items ?? [])
        .filter((item) => item.is_active)
        .map((item) => ({
          title: normalizeText(item.title),
          desc: normalizeText(item.content),
        }))
        .filter((item) => item.title && item.desc),
    [planningCardsBlock?.items],
  );

  const leasingHighlights = React.useMemo(
    () =>
      (leasingHighlightsBlock?.items ?? [])
        .filter((item) => item.is_active)
        .map((item) => ({
          title: normalizeText(item.title),
          desc: normalizeText(item.content),
        }))
        .filter((item) => item.title && item.desc),
    [leasingHighlightsBlock?.items],
  );

  const categoriesForHome = React.useMemo(
    () =>
      activeCategories.slice(0, 6).map((category) => {
        const categoryImage = isImageSource(category.icon)
          ? category.icon
          : settings.institutional_image_url ?? DEFAULT_CATEGORY_IMAGE;

        return {
          id: category.id,
          name: category.name,
          slug: category.slug,
          image: categoryImage,
          count: 'Diversas',
        };
      }),
    [activeCategories, settings.institutional_image_url],
  );
  const featuredLaunches = React.useMemo(
    () =>
      [...featuredLaunchesFromCms]
        .sort((a, b) => {
          const featuredDelta = Number(b.isFeatured ?? false) - Number(a.isFeatured ?? false);
          if (featuredDelta !== 0) {
            return featuredDelta;
          }

          const aTs = new Date(a.publishDate ?? a.createdAt).getTime();
          const bTs = new Date(b.publishDate ?? b.createdAt).getTime();
          return bTs - aTs;
        })
        .slice(0, 4),
    [featuredLaunchesFromCms],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/lojas?q=${encodeURIComponent(searchQuery)}`);
    } else {
      navigate('/lojas');
    }
  };

  const featuredStores = React.useMemo(
    () => featuredStoresFromCms.slice(0, 4),
    [featuredStoresFromCms],
  );

  const homeStructuredData = React.useMemo(
    () => [
      buildOrganizationStructuredData(settings),
      buildShoppingCenterStructuredData(settings),
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: settings.site_name,
        url: getCanonicalUrl('/'),
      },
    ],
    [settings],
  );

  const isContentLoading = isCategoriesLoading || isStoresLoading || isLaunchesLoading;
  const contentError = categoriesError || storesError || launchesError || homeSectionsError;
  const hasAnyPrimaryContent =
    categoriesForHome.length > 0 || featuredStores.length > 0 || featuredLaunches.length > 0;
  const showDataErrorState =
    !allowMockFallback && !isContentLoading && Boolean(contentError) && !hasAnyPrimaryContent;
  const showEmptyContentState =
    !allowMockFallback && !isContentLoading && !contentError && !hasAnyPrimaryContent;

  const handleRetryContentLoad = () => {
    void refreshCategories();
    void refreshStores();
    void refreshLaunches();
  };

  return (
    <div className="bg-brand-paper">
      <SEO
        title="Mega Polo Moda | Encontre Lojas Atacadistas no Brás"
        description="Portal de moda atacadista no Brás. Localize lojas, confira lançamentos e organize seu roteiro de compras no Mega Polo Moda."
        canonical="/"
        ogImage={heroSection.image_url || settings.institutional_image_url || settings.logo_url}
        structuredData={homeStructuredData}
      />

      {showDataErrorState && (
        <section className="container-custom pt-32">
          <div className="bg-white border border-red-200 rounded-2xl p-6 md:p-8 text-center space-y-3">
            <p className="text-[11px] tracking-brand font-bold uppercase text-red-700">
              Nao foi possivel carregar os dados
            </p>
            <p className="text-brand-dark/70">Tente novamente em instantes.</p>
            <button
              type="button"
              onClick={handleRetryContentLoad}
              className="px-6 py-3 rounded-lg bg-brand-dark text-white text-[10px] tracking-brand font-bold uppercase hover:bg-brand-red transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </section>
      )}

      {showEmptyContentState && (
        <section className="container-custom pt-32">
          <div className="bg-white border border-brand-dark/10 rounded-2xl p-6 md:p-8 text-center space-y-3">
            <p className="text-[11px] tracking-brand font-bold uppercase text-brand-dark/70">
              Nenhum conteudo publicado no momento
            </p>
            <p className="text-brand-dark/60">Tente novamente em instantes.</p>
          </div>
        </section>
      )}

      {/* Hero Section */}
      {heroSection.is_active && (
      <section className="relative min-h-[560px] md:min-h-[650px] flex items-center pt-24 md:pt-32 pb-14 overflow-hidden">
        <div className="absolute inset-0">
          <ImageWithFallback
            src={heroSection.image_url}
            className="w-full h-full object-cover"
            alt="Shopping Mega Polo Moda"
            loading="eager"
            width={1600}
            height={900}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-brand-dark/40" />
        </div>
        
        <div className="container-custom relative z-10 w-full">
          <div className="max-w-3xl space-y-7 md:space-y-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="space-y-4 md:space-y-5"
            >
              <span className="inline-block px-4 py-1.5 bg-brand-red text-white text-[10px] tracking-brand font-bold uppercase rounded-sm">
                {heroSection.subtitle}
              </span>
              <h1 className="text-3xl sm:text-4xl md:text-7xl text-white font-serif font-bold leading-[1.1]">
                {heroSection.title}
              </h1>
              <p className="text-white/90 text-base md:text-xl font-sans leading-relaxed max-w-2xl">
                {heroSection.content}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="space-y-6"
            >
              <form 
                onSubmit={handleSearch}
                className="relative max-w-2xl group"
              >
                <label htmlFor="home-search-input" className="sr-only">Buscar loja, categoria ou produto</label>
                <div className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-dark/30 group-focus-within:text-brand-red transition-colors">
                  <Search className="w-5 h-5" />
                </div>
                <input 
                  id="home-search-input"
                  type="text"
                  placeholder="Busque por loja, categoria ou produto"
                  className="w-full bg-white py-4 md:py-6 pl-12 md:pl-16 pr-24 sm:pr-28 md:pr-32 rounded-xl text-brand-dark focus:outline-none shadow-2xl transition-all font-sans text-sm md:text-base border-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button 
                  type="submit"
                  aria-label="Buscar lojas"
                  className="absolute right-2 md:right-3 top-1/2 -translate-y-1/2 px-5 sm:px-6 md:px-8 py-2.5 md:py-3 bg-brand-red text-white text-[9px] md:text-[10px] tracking-brand font-bold rounded-lg hover:bg-brand-dark transition-all shadow-lg"
                >
                  BUSCAR
                </button>
              </form>

              <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 items-stretch sm:items-center">
                <Link 
                  to={heroSection.button_url}
                  className="w-full sm:w-auto text-center px-8 py-4 bg-white text-brand-dark text-[10px] tracking-brand font-bold rounded-lg hover:bg-brand-red hover:text-white transition-all shadow-xl uppercase"
                >
                  {heroSection.button_label}
                </Link>
                <Link 
                  to={heroSecondaryUrl}
                  className="w-full sm:w-auto text-center px-8 py-4 bg-brand-dark text-white text-[10px] tracking-brand font-bold rounded-lg hover:bg-brand-red transition-all shadow-xl uppercase"
                >
                  {heroSecondaryLabel}
                </Link>
                {heroTertiaryLabel && heroTertiaryUrl && (
                  <Link 
                    to={heroTertiaryUrl}
                    className="w-full sm:w-auto text-center px-8 py-4 bg-white/20 backdrop-blur-md text-white border border-white/30 text-[10px] tracking-brand font-bold rounded-lg hover:bg-white hover:text-brand-dark transition-all uppercase"
                  >
                    {heroTertiaryLabel}
                  </Link>
                )}
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="flex flex-wrap gap-6 pt-4 items-center"
            >
              <span className="text-[9px] text-white/50 uppercase tracking-widest font-bold">Sugestões:</span>
              {heroQuickLinks.map((item) => (
                <Link 
                  key={item.label}
                  to={item.url}
                  className="text-[10px] text-white/80 hover:text-brand-red transition-colors font-bold tracking-brand underline underline-offset-4 decoration-white/20 hover:decoration-brand-red"
                >
                  {item.label.toUpperCase()}
                </Link>
              ))}
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.65 }}
              className="flex flex-wrap gap-2 pt-1"
            >
              {heroBadges.map((item) => (
                <span
                  key={item}
                  className="px-3 py-1.5 bg-white/15 backdrop-blur-md border border-white/25 text-white text-[9px] tracking-brand font-bold rounded-full uppercase"
                >
                  {item}
                </span>
              ))}
            </motion.div>
          </div>
        </div>
      </section>
      )}

      {/* Categories Section */}
      {categoriesSection.is_active && categoriesForHome.length > 0 && (
      <section className="py-24 container-custom">
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
          <div className="space-y-4">
            <h4 className="text-brand-gold text-[10px] tracking-brand font-bold uppercase">{categoriesSection.subtitle}</h4>
            <h2 className="text-4xl md:text-5xl font-serif leading-tight">
              {categoriesSection.title}
            </h2>
          </div>
          <Link to={categoriesSection.button_url} className="flex items-center gap-2 text-[10px] tracking-brand font-bold text-brand-dark/40 hover:text-brand-red transition-all border-b border-brand-dark/10 pb-1">
            {categoriesSection.button_label.toUpperCase()} <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {categoriesForHome.map((cat) => (
            <Link 
              key={cat.id} 
              to={`/lojas?cat=${cat.name}`}
              className="group relative aspect-[4/5] overflow-hidden rounded-2xl shadow-soft"
            >
              <ImageWithFallback
                src={cat.image}
                alt={cat.name}
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                width={800}
                height={1000}
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-brand-dark/90 via-brand-dark/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity" />
              <div className="absolute bottom-0 left-0 p-8 space-y-2 text-white">
                 <span className="text-[9px] tracking-widest uppercase font-bold text-brand-gold">{cat.count} lojas</span>
                 <h3 className="text-3xl font-serif italic font-bold">{cat.name}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
      )}

      {/* Featured Stores */}
      {featuredStoresSection.is_active && featuredStores.length > 0 && (
      <section className="py-24 bg-white">
        <div className="container-custom">
          <div className="text-center space-y-4 mb-20">
            <h4 className="text-brand-gold text-[10px] tracking-brand font-bold uppercase">{featuredStoresSection.subtitle}</h4>
            <h2 className="text-4xl md:text-5xl font-serif font-bold">{featuredStoresSection.title}</h2>
            <div className="w-24 h-1 bg-brand-red mx-auto mt-6" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
             {featuredStores.map((store) => {
               const alreadyInRoute = isInRoute(store.id);
               
               return (
                <div 
                  key={store.id} 
                  className="group bg-brand-paper rounded-2xl overflow-hidden shadow-soft border border-brand-dark/5 hover:border-brand-red transition-all duration-500 flex flex-col"
                >
                   <Link to={`/lojas/${store.slug}`} className="aspect-square overflow-hidden relative block">
                      <ImageWithFallback
                        src={store.image}
                        alt={store.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        width={640}
                        height={640}
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-brand-dark/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-4 right-4 p-2 bg-white rounded-full shadow-lg">
                         <Star className="w-4 h-4 text-brand-gold fill-brand-gold" />
                      </div>
                   </Link>
                   <div className="p-8 space-y-6 flex flex-col flex-grow">
                     <Link to={`/lojas/${store.slug}`} className="space-y-1 block">
                       <h3 className="text-xl font-serif font-bold group-hover:text-brand-red transition-colors">{store.name}</h3>
                       <p className="text-[10px] tracking-brand font-bold text-brand-dark/30 uppercase">{store.category}</p>
                     </Link>
                     <div className="flex flex-col gap-4 pt-4 border-t border-brand-dark/5 mt-auto">
                       <div className="flex items-center justify-between">
                          <span className="text-[10px] flex items-center gap-1.5 font-bold font-sans text-brand-dark/40">
                             <MapPin className="w-3 h-3 text-brand-red" />
                             {store.floor}
                          </span>
                          <Link to={`/lojas/${store.slug}`} className="text-[9px] tracking-brand font-bold text-brand-dark/40 hover:text-brand-red transition-colors">VER DETALHES</Link>
                       </div>
                       <button 
                         onClick={() => addItem(store)}
                         disabled={alreadyInRoute}
                         className={`w-full py-3.5 rounded-lg text-[9px] tracking-brand font-bold uppercase transition-all flex items-center justify-center gap-2 ${
                           alreadyInRoute 
                             ? 'bg-green-50 text-green-600 border border-green-600/20' 
                             : 'bg-brand-dark text-white hover:bg-brand-red shadow-lg active:scale-95'
                         }`}
                       >
                         {alreadyInRoute ? (
                           <><Check className="w-3 h-3" /> NO ROTEIRO</>
                         ) : (
                           <><Plus className="w-3 h-3" /> ADICIONAR AO ROTEIRO</>
                         )}
                       </button>
                     </div>
                   </div>
                </div>
               );
             })}
          </div>
        </div>
      </section>
      )}

      {/* Featured Launches */}
      {launchesSection.is_active && featuredLaunches.length > 0 && (
      <section className="py-24 bg-brand-paper border-y border-brand-dark/5">
        <div className="container-custom mb-14 space-y-4 text-brand-dark">
          <h2 className="text-4xl md:text-5xl font-serif leading-tight italic font-bold">{launchesSection.title}</h2>
          <p className="text-brand-dark/60 text-sm max-w-2xl">{launchesSection.content}</p>
        </div>

        <div className="container-custom">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 overflow-x-hidden">
            {featuredLaunches.map((launch) => (
              <article
                key={launch.id}
                className="flex flex-col h-full rounded-2xl border border-brand-dark/5 bg-white shadow-soft overflow-hidden hover:border-brand-red/40 transition-all"
              >
                <Link to={`/lojas/${launch.storeSlug}`} className="group block">
                  <div className="relative aspect-[4/5] overflow-hidden bg-brand-dark/5">
                    <ImageWithFallback
                      src={launch.image}
                      alt={`Lançamento ${launch.title} da loja ${launch.storeName}`}
                      className="object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute top-4 left-4">
                      <span className="px-3.5 py-1.5 bg-brand-red text-white text-[9px] tracking-brand font-bold rounded-full shadow-lg uppercase">NOVIDADE</span>
                    </div>
                    <div className="absolute top-4 right-4">
                      <span className="px-3 py-1 bg-white/90 text-brand-dark text-[9px] tracking-brand font-bold rounded-full shadow-sm uppercase">
                        {launch.category}
                      </span>
                    </div>
                  </div>
                </Link>

                <div className="p-6 space-y-4 flex-grow flex flex-col">
                  <div className="space-y-2">
                    <p className="text-brand-gold text-[10px] tracking-brand font-bold uppercase">{launch.storeName}</p>
                    <h3 className="text-brand-dark text-xl font-serif font-bold leading-tight">{launch.title}</h3>
                    <p className="text-brand-dark/55 text-[11px] line-clamp-2 leading-relaxed font-sans">
                      {launch.description}
                    </p>
                  </div>

                  <Link
                    to={`/lojas/${launch.storeSlug}`}
                    className="mt-auto inline-flex items-center justify-center px-5 py-3 bg-brand-dark text-white text-[10px] tracking-brand font-bold rounded-lg hover:bg-brand-red transition-colors uppercase"
                  >
                    Ver lançamento
                  </Link>
                </div>
              </article>
            ))}
          </div>

          <div className="mt-14 text-center">
            <Link 
              to={launchesSection.button_url}
              className="inline-flex items-center gap-2 px-10 py-5 bg-brand-dark text-white text-[11px] tracking-brand font-bold rounded-lg hover:bg-brand-red transition-all uppercase border border-brand-dark/5"
            >
              {launchesSection.button_label}
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
      )}

      {/* How to Buy Section */}
      {howToBuySection.is_active && (
      <section className="py-24 bg-white">
        <div className="container-custom">
          <div className="text-center space-y-4 mb-20">
            <h4 className="text-brand-gold text-[10px] tracking-brand font-bold uppercase">{howToBuySection.subtitle}</h4>
            <h2 className="text-4xl md:text-5xl font-serif font-bold italic">{howToBuySection.title}</h2>
            <p className="text-brand-dark/60 text-sm max-w-2xl mx-auto">{howToBuySection.content}</p>
            <div className="w-24 h-1 bg-brand-red mx-auto mt-6" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-4 lg:gap-12">
            {howToBuySteps.map((item, idx) => (
              <div key={idx} className="space-y-6 group">
                <span className="text-6xl font-serif font-bold italic text-brand-dark/5 group-hover:text-brand-red/10 transition-colors block">{item.step}</span>
                <div className="space-y-4">
                  <h3 className="text-xl font-serif font-bold leading-tight">{item.title}</h3>
                  <p className="text-sm text-brand-dark/60 font-sans leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
      )}

      {/* Plan your visit Section */}
      {planningSection.is_active && (
      <section className="py-24 bg-brand-paper border-y border-brand-dark/5">
        <div className="container-custom flex flex-col lg:flex-row gap-16 items-center">
          <div className="lg:w-1/2 space-y-10">
            <div className="space-y-4">
              <h4 className="text-brand-gold text-[10px] tracking-brand font-bold uppercase">{planningSection.subtitle}</h4>
              <h2 className="text-4xl md:text-5xl font-serif font-bold italic">{planningSection.title}</h2>
              <p className="text-lg text-brand-dark/60 font-sans leading-relaxed">
                {planningSection.content}
              </p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {planningInfoCards.map((item) => (
                <div key={item.title} className="space-y-2 bg-white border border-brand-dark/5 rounded-xl p-5">
                  <h4 className="text-[10px] tracking-brand font-bold text-brand-dark uppercase">{item.title}</h4>
                  <p className="text-sm text-brand-dark/70">{item.desc}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-6 pt-4">
              <Link 
                to={planningSection.button_url}
                className="px-10 py-5 bg-brand-dark text-white text-[11px] tracking-brand font-bold rounded-lg hover:bg-brand-red transition-all shadow-xl uppercase"
              >
                {planningSection.button_label}
              </Link>
              <Link 
                to="/meu-roteiro"
                className="px-10 py-5 bg-white border border-brand-dark/10 text-brand-dark text-[11px] tracking-brand font-bold rounded-lg hover:border-brand-red hover:text-brand-red transition-all uppercase"
              >
                Meu Roteiro
              </Link>
            </div>
          </div>
          <div className="lg:w-1/2 relative aspect-video lg:aspect-square w-full rounded-2xl overflow-hidden shadow-2xl">
            <ImageWithFallback
              src={planningSection.image_url}
              className="w-full h-full object-cover"
              alt="Plataforma Mega Polo"
              width={1200}
              height={900}
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
            <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-brand-dark/80 to-transparent">
              <p className="text-white text-sm font-serif italic">Infraestrutura completa com alimentação e Centro Empresarial.</p>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* CTA: Leasing */}
      {leasingSection.is_active && (
      <section className="py-24 container-custom">
        <div className="relative rounded-3xl overflow-hidden bg-brand-dark min-h-[500px] flex items-center">
           <ImageWithFallback
             src={leasingSection.image_url}
             className="absolute inset-0 w-full h-full object-cover opacity-30 grayscale"
             alt="Abra sua loja"
             width={1600}
             height={900}
             sizes="100vw"
           />
           <div className="relative p-12 md:p-24 flex flex-col md:flex-row items-center justify-between gap-12 text-white w-full">
              <div className="max-w-xl space-y-8">
                 <h2 className="text-4xl md:text-6xl font-serif italic font-bold">{leasingSection.title}</h2>
                 <p className="text-lg text-white/60 font-sans leading-relaxed">{leasingSection.content}</p>
                 <Link 
                   to={leasingSection.button_url}
                   className="inline-flex items-center gap-4 px-10 py-5 bg-brand-red text-white text-[11px] tracking-brand font-bold rounded-lg hover:bg-white hover:text-brand-red transition-all shadow-2xl uppercase"
                 >
                   {leasingSection.button_label} <ArrowRight className="w-5 h-5" />
                 </Link>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 shrink-0">
                 {leasingHighlights.map((highlight) => (
                    <div key={highlight.title} className="space-y-3 bg-white/5 p-8 rounded-2xl border border-white/10 backdrop-blur-sm">
                       <p className="text-3xl font-serif italic text-brand-gold font-bold">{highlight.title}</p>
                       <p className="text-[10px] tracking-brand font-bold text-white/40 uppercase">{highlight.desc}</p>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </section>
      )}

      {/* Newsletter */}
      {newsletterSection.is_active && (
      <section className="py-24 max-w-4xl mx-auto px-6 text-center space-y-12">
        <NewsletterForm 
          title={newsletterSection.title}
          subtitle={newsletterSection.content}
          showCategory={true}
        />
        {newsletterSection.button_label && newsletterSection.button_url && (
          <Link
            to={newsletterSection.button_url}
            className="inline-flex items-center justify-center px-8 py-4 bg-brand-dark text-white text-[10px] tracking-brand font-bold rounded-lg hover:bg-brand-red transition-all uppercase"
          >
            {newsletterSection.button_label}
          </Link>
        )}
      </section>
      )}

      <a 
        href={createWhatsAppLink(settings.whatsapp, settings.default_whatsapp_message)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Falar com atendimento no WhatsApp"
        className="fixed bottom-6 right-6 md:bottom-8 md:right-8 w-14 h-14 md:w-16 md:h-16 bg-green-500 text-white rounded-full shadow-2xl flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-40 group"
      >
        <MessageCircle className="w-7 h-7 md:w-8 md:h-8" />
        <div className="hidden md:block absolute right-20 bg-white text-brand-dark px-4 py-2 rounded-lg text-[10px] tracking-brand font-bold uppercase shadow-xl opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Falar com Atendimento
        </div>
      </a>
    </div>
  );
}


