import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, ArrowRight, Search, Filter, Send } from 'lucide-react';
import { SEO } from '../components/ui/SEO';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { createWhatsAppLink } from '../utils/whatsapp';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useCategories } from '../hooks/useCategories';
import { useStores } from '../hooks/useStores';
import { useLaunches } from '../hooks/useLaunches';
import { allowMockFallback } from '../config/environment';
import { normalizeSearchText } from '../utils/storeMappers';
import {
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
  getCanonicalUrl,
} from '../utils/seo';

import NewsletterForm from '../components/NewsletterForm';

function getLaunchTimestamp(launch: {
  publishDate?: string | null;
  createdAt: string;
}): number {
  const source = launch.publishDate ?? launch.createdAt;
  const parsed = new Date(source).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

export default function Launches() {
  const { settings } = useSiteSettings();
  const {
    categories: availableCategories,
    isLoading: isCategoriesLoading,
    error: categoriesError,
    refreshCategories,
  } = useCategories({
    activeOnly: true,
    fallbackToMock: allowMockFallback,
  });
  const {
    publicStores: availableStores,
    isLoading: isStoresLoading,
    error: storesError,
    refreshStores,
  } = useStores({
    publishedOnly: true,
    fallbackToMock: allowMockFallback,
  });
  const {
    publicLaunches: launchesFromCms,
    isLoading: isLaunchesLoading,
    error: launchesError,
    refreshLaunches,
  } = useLaunches({
    publishedOnly: true,
    fallbackToMock: allowMockFallback,
    includeExpired: false,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [selectedStore, setSelectedStore] = useState<string>('Todos');
  const [selectedSegment, setSelectedSegment] = useState<string>('Todos');
  const [showFilters, setShowFilters] = useState(false);

  const orderedLaunches = useMemo(
    () =>
      [...launchesFromCms].sort((a, b) => {
        const featuredDelta = Number(b.isFeatured ?? false) - Number(a.isFeatured ?? false);
        if (featuredDelta !== 0) {
          return featuredDelta;
        }
        return getLaunchTimestamp(b) - getLaunchTimestamp(a);
      }),
    [launchesFromCms],
  );

  const featuredLaunch = orderedLaunches[0] ?? null;
  const launchesSeoTitle = featuredLaunch?.seoTitle?.trim() || 'Mega Lancamentos';
  const launchesSeoDescription =
    featuredLaunch?.seoDescription?.trim() ||
    'Veja novidades e lancamentos das marcas do Mega Polo Moda.';
  const launchesOgImage =
    featuredLaunch?.ogImageUrl?.trim() || featuredLaunch?.image || settings.institutional_image_url;

  const segments = useMemo(() => {
    const segmentSet = new Set<string>(
      orderedLaunches
        .map((launch) => launch.segment)
        .filter((segment): segment is string => Boolean(segment)),
    );
    const segmentOptions: string[] = ['Todos', ...Array.from(segmentSet)];
    return segmentOptions.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [orderedLaunches]);

  const launchStoreNames = useMemo(() => {
    const storeSet = new Set<string>(
      orderedLaunches
        .map((launch) => launch.storeName)
        .filter((storeName): storeName is string => Boolean(storeName)),
    );
    const storeOptions: string[] = ['Todos', ...Array.from(storeSet)];
    return storeOptions.sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [orderedLaunches]);

  const storesBySlug = useMemo(
    () => new Map(availableStores.map((store) => [store.slug, store])),
    [availableStores],
  );

  const filteredLaunches = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    const normalizedCategory = normalizeSearchText(selectedCategory);
    const normalizedStore = normalizeSearchText(selectedStore);
    const normalizedSegment = normalizeSearchText(selectedSegment);

    return orderedLaunches.filter((launch) => {
      const searchableBlob = normalizeSearchText(
        `${launch.title} ${launch.storeName} ${launch.description} ${launch.category} ${launch.segment}`,
      );

      const matchesSearch = !normalizedSearch || searchableBlob.includes(normalizedSearch);
      const matchesCategory =
        selectedCategory === 'Todos' || normalizeSearchText(launch.category) === normalizedCategory;
      const matchesStore =
        selectedStore === 'Todos' || normalizeSearchText(launch.storeName) === normalizedStore;
      const matchesSegment =
        selectedSegment === 'Todos' || normalizeSearchText(launch.segment) === normalizedSegment;

      return matchesSearch && matchesCategory && matchesStore && matchesSegment;
    });
  }, [orderedLaunches, searchTerm, selectedCategory, selectedStore, selectedSegment]);

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Todos');
    setSelectedStore('Todos');
    setSelectedSegment('Todos');
  };

  const getStoreBySlug = (slug: string) => {
    return storesBySlug.get(slug);
  };

  const launchesStructuredData = useMemo(
    () => [
      buildOrganizationStructuredData(settings),
      buildBreadcrumbStructuredData([
        { name: 'Home', path: '/' },
        { name: 'Lancamentos', path: '/lancamentos' },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Mega Lancamentos',
        description: 'Lancamentos e novidades das lojas do Mega Polo Moda.',
        url: getCanonicalUrl('/lancamentos'),
      },
    ],
    [settings],
  );

  const isInitialLoading = isCategoriesLoading || isStoresLoading || isLaunchesLoading;
  const loadingError = launchesError || storesError || categoriesError;
  const hasActiveFilters =
    Boolean(searchTerm.trim()) ||
    selectedCategory !== 'Todos' ||
    selectedStore !== 'Todos' ||
    selectedSegment !== 'Todos';
  const hasNoPublishedContent = launchesFromCms.length === 0 && !loadingError;

  const handleRetryLoad = () => {
    void refreshLaunches();
    void refreshStores();
    void refreshCategories();
  };

  if (isInitialLoading) {
    return (
      <div className="bg-brand-paper min-h-screen pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-2xl border border-brand-dark/10 p-8 md:p-10 text-center space-y-3">
            <p className="text-[11px] tracking-brand font-bold uppercase text-brand-dark/50">Carregando lancamentos</p>
            <p className="text-brand-dark/70">Atualizando novidades das lojas.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingError && launchesFromCms.length === 0) {
    return (
      <div className="bg-brand-paper min-h-screen pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-2xl border border-red-200 p-8 md:p-10 text-center space-y-5">
            <p className="text-[11px] tracking-brand font-bold uppercase text-red-700">Nao foi possivel carregar os dados</p>
            <p className="text-brand-dark/70">Tente novamente em instantes.</p>
            <p className="text-brand-dark/60 text-sm">{loadingError}</p>
            <button
              type="button"
              onClick={handleRetryLoad}
              className="px-6 py-3 rounded-lg bg-brand-dark text-white text-[10px] tracking-brand font-bold uppercase hover:bg-brand-red transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-brand-paper min-h-screen pt-32 pb-24">
      <SEO
        title={launchesSeoTitle}
        description={launchesSeoDescription}
        canonical="/lancamentos"
        ogImage={launchesOgImage}
        structuredData={launchesStructuredData}
      />

      <section className="max-w-7xl mx-auto px-6 mb-12 md:mb-20 text-center space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <span className="text-[10px] tracking-premium font-bold text-brand-red border border-brand-red/20 px-4 py-1.5 rounded-full uppercase">Atualizacao diaria</span>
          <h1 className="text-4xl md:text-8xl font-serif leading-tight">Mega Lancamentos</h1>
          <p className="text-brand-dark/50 text-base md:text-xl font-light font-sans max-w-2xl mx-auto italic">
            "Acompanhe lancamentos e novidades das lojas do Mega Polo Moda."
          </p>
        </motion.div>
      </section>

      {featuredLaunch && (
        <section className="max-w-7xl mx-auto px-6 mb-20 md:32">
          <div className="group relative bg-white rounded-3xl overflow-hidden shadow-2xl border border-brand-dark/5 grid grid-cols-1 lg:grid-cols-2">
            <div className="aspect-[4/5] sm:aspect-square lg:aspect-auto h-full overflow-hidden relative">
              <ImageWithFallback
                src={featuredLaunch.image}
                alt={featuredLaunch.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                loading="eager"
                width={1200}
                height={1200}
                sizes="(max-width: 1024px) 100vw, 50vw"
              />
              <div className="absolute top-6 left-6 md:top-8 md:left-8">
                 <span className="px-4 md:px-6 py-2 bg-brand-red text-white text-[9px] md:text-[10px] tracking-premium font-bold rounded-full shadow-xl">DESTAQUE DA SEMANA</span>
              </div>
            </div>
            <div className="p-8 md:p-12 lg:p-20 flex flex-col justify-center space-y-6 md:space-y-8">
              <div className="space-y-4">
                <Link
                  to={`/lojas/${featuredLaunch.storeSlug}`}
                  className="text-[10px] md:text-[11px] tracking-premium font-bold text-brand-gold hover:text-brand-red transition-all flex items-center gap-2"
                >
                  {featuredLaunch.storeName.toUpperCase()} <ArrowRight className="w-3 h-3" />
                </Link>
                <h2 className="text-3xl md:text-6xl font-serif font-bold italic leading-tight">{featuredLaunch.title}</h2>
                <p className="text-brand-dark/60 font-sans text-base md:text-xl leading-relaxed font-light line-clamp-3 md:line-clamp-none">
                  {featuredLaunch.description}
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4 md:pt-6">
                <Link
                  to={`/lojas/${featuredLaunch.storeSlug}`}
                  className="w-full sm:w-auto px-10 py-5 bg-brand-dark text-white text-[10px] md:text-[11px] tracking-brand font-bold rounded-md hover:bg-brand-red transition-all shadow-xl uppercase flex items-center justify-center gap-3"
                >
                  Ver Lancamento
                </Link>
                <a
                  href={createWhatsAppLink(
                    getStoreBySlug(featuredLaunch.storeSlug)?.whatsapp || settings.whatsapp,
                    `Ola, vi o lancamento ${featuredLaunch.title} no site do Mega Polo Moda e gostaria de mais informacoes.`,
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-10 py-5 bg-white border border-brand-dark/10 text-brand-dark text-[10px] md:text-[11px] tracking-brand font-bold rounded-md hover:border-brand-red hover:text-brand-red transition-all uppercase flex items-center justify-center gap-3"
                >
                  <MessageCircle className="w-5 h-5" />
                  Falar com a Loja
                </a>
              </div>

              <div className="flex items-center gap-6 pt-12 border-t border-brand-dark/5">
                 <div className="flex flex-col">
                    <span className="text-[9px] text-brand-dark/30 font-bold uppercase tracking-widest">Categoria</span>
                    <span className="text-sm font-bold font-sans">{featuredLaunch.category}</span>
                 </div>
                 <div className="w-px h-8 bg-brand-dark/5" />
                 <div className="flex flex-col">
                    <span className="text-[9px] text-brand-dark/30 font-bold uppercase tracking-widest">Segmento</span>
                    <span className="text-sm font-bold font-sans">{featuredLaunch.segment}</span>
                 </div>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="max-w-7xl mx-auto px-6 mb-16 space-y-8">
        <div className="flex flex-col md:flex-row gap-6 items-center justify-between bg-white p-8 rounded-2xl shadow-soft border border-brand-dark/5">
          <div className="relative w-full md:max-w-md">
            <label htmlFor="launches-search" className="sr-only">Buscar lancamento, loja ou categoria</label>
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/30" />
            <input
              id="launches-search"
              type="text"
              placeholder="Buscar lancamento, loja ou categoria..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-brand-paper rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-brand-red/20 transition-all font-sans"
            />
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto">
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              aria-controls="launches-filters-panel"
              className={`flex items-center gap-2 px-6 py-4 rounded-xl text-[10px] tracking-brand font-bold border transition-all ${
                showFilters ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white border-brand-dark/10 text-brand-dark hover:border-brand-red'
              }`}
            >
              <Filter className="w-4 h-4" />
              {showFilters ? 'OCULTAR FILTROS' : 'FILTRAR RESULTADOS'}
            </button>
            {(selectedCategory !== 'Todos' || selectedStore !== 'Todos' || selectedSegment !== 'Todos' || searchTerm) && (
              <button
                type="button"
                onClick={clearFilters}
                className="text-brand-red text-xs tracking-brand font-bold hover:underline"
              >
                LIMPAR TUDO
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              id="launches-filters-panel"
              className="overflow-hidden"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white p-8 rounded-2xl shadow-soft border border-brand-dark/5">
                <div className="space-y-3">
                  <label htmlFor="launches-filter-category" className="text-xs tracking-widest font-bold text-brand-dark/60 uppercase pl-1">Categoria</label>
                  <select
                    id="launches-filter-category"
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full p-4 bg-brand-paper rounded-xl text-sm font-sans focus:outline-none"
                  >
                    <option value="Todos">Todas as Categorias</option>
                    {availableCategories.map((cat) => (
                      <option key={cat.id} value={cat.name}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label htmlFor="launches-filter-store" className="text-xs tracking-widest font-bold text-brand-dark/60 uppercase pl-1">Loja / Marca</label>
                  <select
                    id="launches-filter-store"
                    value={selectedStore}
                    onChange={(e) => setSelectedStore(e.target.value)}
                    className="w-full p-4 bg-brand-paper rounded-xl text-sm font-sans focus:outline-none"
                  >
                    {launchStoreNames.map((storeName) => (
                      <option key={storeName} value={storeName}>
                        {storeName === 'Todos' ? 'Todas as Marcas' : storeName}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-3">
                  <label htmlFor="launches-filter-segment" className="text-xs tracking-widest font-bold text-brand-dark/60 uppercase pl-1">Segmento</label>
                  <select
                    id="launches-filter-segment"
                    value={selectedSegment}
                    onChange={(e) => setSelectedSegment(e.target.value)}
                    className="w-full p-4 bg-brand-paper rounded-xl text-sm font-sans focus:outline-none"
                  >
                    {segments.map((segment) => (
                      <option key={segment} value={segment}>
                        {segment === 'Todos' ? 'Todos os Segmentos' : segment}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </section>

      <section className="max-w-7xl mx-auto px-6">
        {filteredLaunches.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12">
            {filteredLaunches.map((launch, index) => {
              const store = getStoreBySlug(launch.storeSlug);

              return (
                <motion.div
                  key={launch.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: (index % 3) * 0.1 }}
                  className="group"
                >
                  <div className="relative aspect-[4/5] rounded-2xl overflow-hidden shadow-soft mb-8">
                     <ImageWithFallback
                       src={launch.image}
                       alt={launch.title}
                       className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000"
                       width={800}
                       height={1000}
                       sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                     />
                     <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-brand-dark/90 to-transparent">
                        <span className="px-4 py-1.5 bg-white/20 backdrop-blur-md text-white text-[9px] tracking-premium font-bold rounded-full border border-white/20 uppercase">
                          {launch.segment}
                        </span>
                     </div>
                  </div>

                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <Link
                          to={`/lojas/${launch.storeSlug}`}
                          className="text-[10px] tracking-premium font-bold text-brand-gold hover:text-brand-red transition-all"
                        >
                          {launch.storeName.toUpperCase()}
                        </Link>
                        <span className="text-[9px] font-bold text-brand-dark/20 uppercase font-sans">
                          {new Date(launch.createdAt).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
                        </span>
                     </div>
                     <h3 className="text-2xl font-serif font-bold group-hover:text-brand-red transition-colors italic">{launch.title}</h3>
                     <p className="text-brand-dark/50 text-sm leading-relaxed line-clamp-2 font-sans">
                       {launch.description}
                     </p>

                     <div className="flex flex-col gap-3 pt-6">
                        <div className="flex items-center justify-between">
                           <Link
                              to={`/lojas/${launch.storeSlug}`}
                              className="text-[10px] tracking-brand font-bold border-b border-brand-dark/10 pb-1 hover:border-brand-red hover:text-brand-red transition-all"
                           >
                              VER LOJA
                           </Link>
                           <a
                            href={createWhatsAppLink(
                              store?.whatsapp || settings.whatsapp,
                              `Ola, vi o lancamento ${launch.title} no site do Mega Polo Moda e gostaria de mais informacoes.`,
                            )}
                             target="_blank"
                             rel="noopener noreferrer"
                             className="text-[10px] tracking-brand font-bold text-green-600 flex items-center gap-2"
                           >
                             <MessageCircle className="w-4 h-4" />
                             FALAR COM A LOJA
                           </a>
                        </div>
                     </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-32 text-center bg-white rounded-3xl border border-brand-dark/5 shadow-soft space-y-8"
          >
            <div className="w-24 h-24 bg-brand-paper rounded-full flex items-center justify-center mx-auto">
               <Search className="w-8 h-8 text-brand-dark/10" />
            </div>
            <div className="space-y-4">
               <h3 className="text-4xl font-serif">
                 {hasNoPublishedContent && !hasActiveFilters
                   ? 'Nenhum conteudo publicado no momento'
                   : 'Nenhum lancamento encontrado'}
               </h3>
               <p className="text-brand-dark/40 max-w-sm mx-auto font-sans">
                 {hasNoPublishedContent && !hasActiveFilters
                   ? 'Tente novamente em instantes.'
                   : 'Tente ajustar os filtros ou buscar por outra categoria para encontrar novidades.'}
               </p>
            </div>
            <button
              onClick={clearFilters}
              className="px-10 py-5 bg-brand-dark text-white text-[11px] tracking-brand font-bold rounded-md hover:bg-brand-red transition-all uppercase"
            >
              Limpar Filtros
            </button>
          </motion.div>
        )}
      </section>

      <section className="max-w-7xl mx-auto px-6 mt-20 md:mt-40">
         <div className="relative overflow-hidden rounded-[32px] md:rounded-[40px] bg-brand-dark text-white">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-brand-red/10 skew-x-12 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-1/4 h-1/2 bg-white/5 -skew-x-12 -translate-x-1/2" />

            <div className="relative p-8 md:p-12 lg:p-24 grid grid-cols-1 lg:grid-cols-2 gap-12 md:gap-20 items-center">
               <div className="space-y-6 md:space-y-8 text-center lg:text-left">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-brand-red/20 rounded-2xl flex items-center justify-center mx-auto lg:mx-0">
                     <Send className="w-6 h-6 md:w-8 md:h-8 text-brand-red" />
                  </div>
                  <div className="space-y-4">
                     <h2 className="text-3xl md:text-6xl font-serif font-bold italic leading-tight">Receba lancamentos no WhatsApp</h2>
                     <p className="text-white/50 text-base md:text-xl font-sans font-light leading-relaxed max-w-xl">
                        Cadastre-se para acompanhar lancamentos e novidades das lojas do Mega Polo Moda.
                     </p>
                  </div>
               </div>

               <div className="bg-white p-6 md:p-10 lg:p-12 rounded-[32px] shadow-2xl relative">
                  <NewsletterForm
                    variant="compact"
                    buttonLabel="Quero receber novidades"
                    showCategory={true}
                  />
               </div>
            </div>
         </div>
      </section>
    </div>
  );
}


