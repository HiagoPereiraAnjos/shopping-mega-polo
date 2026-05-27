import React, { useState, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, X, MessageCircle, Grid, List as ListIcon, Star, Check, Plus, MapPin } from 'lucide-react';

import { SEO } from '../components/ui/SEO';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { createWhatsAppLink } from '../utils/whatsapp';
import { normalizeSearchText } from '../utils/storeMappers';
import { usePlanning } from '../hooks/usePlanning';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useCategories } from '../hooks/useCategories';
import { useStores } from '../hooks/useStores';
import { usePublicContentBlocks } from '../hooks/usePublicContentBlocks';
import { allowMockFallback } from '../config/environment';
import { STORES_PUBLIC_BLOCKS_FALLBACK } from '../config/publicContentBlocksFallback';
import type { Store as PublicStore } from '../types';
import {
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
  getCanonicalUrl,
} from '../utils/seo';

function hasActiveCatalogPdf(store: PublicStore): boolean {
  if (!store.hasCatalog || !store.catalogUrl) {
    return false;
  }

  const normalized = store.catalogUrl.trim().toLowerCase();
  if (!normalized || normalized === '#' || normalized === 'mock' || normalized.includes('exemplo')) {
    return false;
  }

  return true;
}

function normalizeText(value: string | null | undefined, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

export default function Stores() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const { addItem, isInRoute } = usePlanning();
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
  const { blocksByKey: storesCmsBlocks } = usePublicContentBlocks({
    pageKey: 'stores',
    fallbackBlocks: STORES_PUBLIC_BLOCKS_FALLBACK,
  });
  const storesIntroBlock = storesCmsBlocks.stores_intro;
  
  const query = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('cat') || 'Todos';
  const segmentFilter = searchParams.get('seg') || 'Todos';
  const floorFilter = searchParams.get('piso') || 'Todos';
  const saleTypeFilter = searchParams.get('venda') || 'Todos';
  const hasWhatsappFilter = searchParams.get('wpp') === 'true';
  const hasCatalogFilter = searchParams.get('cat_digital') === 'true';

  const segments = useMemo(() => {
    const allSegments = availableStores.map((store) => store.segment);
    return Array.from(new Set(allSegments)).sort();
  }, [availableStores]);

  const floors = useMemo(() => {
    const allFloors = availableStores.map((store) => store.floor);
    return Array.from(new Set(allFloors)).sort();
  }, [availableStores]);

  const filteredStores = useMemo(() => {
    const normalizedQuery = normalizeSearchText(query);
    const normalizedCategory = normalizeSearchText(categoryFilter);
    const normalizedSegment = normalizeSearchText(segmentFilter);
    const normalizedFloor = normalizeSearchText(floorFilter);

    return availableStores.filter((store) => {
      const searchableFields = [
        store.name,
        store.category,
        store.segment,
        store.description ?? '',
        ...(store.tags ?? []),
        ...(store.products?.map((product) => product.name) ?? []),
      ]
        .map((value) => normalizeSearchText(value))
        .join(' ');

      const matchesSearch = !normalizedQuery || searchableFields.includes(normalizedQuery);

      const matchesCategory =
        categoryFilter === 'Todos' || normalizeSearchText(store.category) === normalizedCategory;
      const matchesSegment =
        segmentFilter === 'Todos' || normalizeSearchText(store.segment) === normalizedSegment;
      const matchesFloor =
        floorFilter === 'Todos' || normalizeSearchText(store.floor) === normalizedFloor;
      const matchesSaleType =
        saleTypeFilter === 'Todos' ||
        store.saleType === saleTypeFilter ||
        (saleTypeFilter === 'Atacado' && store.saleType === 'Ambos') ||
        (saleTypeFilter === 'Varejo' && store.saleType === 'Ambos');
      const matchesWhatsapp = !hasWhatsappFilter || !!store.whatsapp;
      const matchesCatalog = !hasCatalogFilter || hasActiveCatalogPdf(store);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesSegment &&
        matchesFloor &&
        matchesSaleType &&
        matchesWhatsapp &&
        matchesCatalog
      );
    });
  }, [
    availableStores,
    query,
    categoryFilter,
    segmentFilter,
    floorFilter,
    saleTypeFilter,
    hasWhatsappFilter,
    hasCatalogFilter,
  ]);

  const updateFilters = (updates: Record<string, string | boolean | undefined>) => {
    const newParams = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => {
      if (value === undefined || value === 'Todos' || value === false) {
        newParams.delete(key);
      } else {
        newParams.set(key, String(value));
      }
    });
    setSearchParams(newParams);
  };

  const clearFilters = () => {
    setSearchParams({});
  };

  const storesStructuredData = useMemo(
    () => [
      buildOrganizationStructuredData(settings),
      buildBreadcrumbStructuredData([
        { name: 'Home', path: '/' },
        { name: 'Guia de Lojas', path: '/lojas' },
      ]),
      {
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'Guia de Lojas',
        description: 'Lista de lojas e marcas de moda atacadista do Mega Polo Moda.',
        url: getCanonicalUrl('/lojas'),
      },
    ],
    [settings],
  );

  const isInitialLoading = isStoresLoading || isCategoriesLoading;
  const loadingError = storesError || categoriesError;
  const hasActiveFilters =
    Boolean(query.trim()) ||
    categoryFilter !== 'Todos' ||
    segmentFilter !== 'Todos' ||
    floorFilter !== 'Todos' ||
    saleTypeFilter !== 'Todos' ||
    hasWhatsappFilter ||
    hasCatalogFilter;
  const hasNoPublishedContent = availableStores.length === 0 && !loadingError;

  const handleRetryLoad = () => {
    void refreshStores();
    void refreshCategories();
  };

  if (isInitialLoading) {
    return (
      <div className="bg-brand-paper min-h-screen pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-white rounded-2xl border border-brand-dark/10 p-8 md:p-10 text-center space-y-3">
            <p className="text-[11px] tracking-brand font-bold uppercase text-brand-dark/50">Carregando lojas</p>
            <p className="text-brand-dark/70">Atualizando dados do guia comercial.</p>
          </div>
        </div>
      </div>
    );
  }

  if (loadingError && availableStores.length === 0) {
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
        title="Guia de Lojas"
        description="Busque lojas, categorias e segmentos de moda atacadista no Mega Polo Moda."
        canonical="/lojas"
        ogImage={availableStores[0]?.image || settings.institutional_image_url || settings.logo_url}
        structuredData={storesStructuredData}
      />

      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <header className="mb-8 md:mb-12 space-y-6 md:space-y-8">
           <div className="space-y-4 text-center md:text-left">
              <h4 className="text-brand-gold text-[10px] tracking-premium font-bold uppercase">
                {normalizeText(storesIntroBlock?.subtitle, 'Guia Comercial')}
              </h4>
              <h1 className="text-4xl md:text-7xl font-serif">
                {normalizeText(storesIntroBlock?.title, 'Diretorio de Lojas')}
              </h1>
              {normalizeText(storesIntroBlock?.content) && (
                <p className="text-brand-dark/60 max-w-2xl">
                  {storesIntroBlock?.content}
                </p>
              )}
           </div>

           <div className="flex flex-col gap-6 md:gap-8 pt-8 border-t border-brand-dark/5">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="relative w-full lg:max-w-2xl group order-2 lg:order-1">
                   <label htmlFor="stores-search" className="sr-only">Buscar loja, categoria, produto ou tag</label>
                   <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/20 group-focus-within:text-brand-red transition-colors" />
                   <input 
                     id="stores-search"
                     type="text" 
                     placeholder="Busque por loja, categoria, produto ou tag..."
                     className="w-full bg-white border border-brand-dark/5 py-4 pl-14 pr-6 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-red/5 font-sans transition-all text-sm md:text-base"
                     value={query}
                     onChange={(e) => updateFilters({ q: e.target.value })}
                   />
                   {query && (
                     <button type="button" onClick={() => updateFilters({ q: '' })} className="absolute right-4 top-1/2 -translate-y-1/2 text-brand-dark/20 hover:text-brand-red transition-colors" aria-label="Limpar busca">
                       <X className="w-4 h-4" />
                     </button>
                   )}
                </div>

                <div className="flex items-center gap-4 w-full lg:w-auto">
                   <button 
                     type="button"
                      onClick={() => setShowFilters(!showFilters)}
                     aria-expanded={showFilters}
                     aria-controls="stores-filters-panel"
                      className={`flex-grow lg:flex-grow-0 flex items-center justify-center gap-2 px-6 py-4 rounded-md text-[10px] tracking-brand font-bold transition-all border ${
                        showFilters ? 'bg-brand-dark text-white border-brand-dark' : 'bg-white border-brand-dark/5 text-brand-dark/60 hover:border-brand-red'
                      }`}
                    >
                     <Filter className="w-4 h-4" />
                     {showFilters ? 'FECHAR FILTROS' : 'FILTROS AVANÇADOS'}
                   </button>
                   
                    <div className="hidden md:flex items-center gap-2 p-1 bg-white border border-brand-dark/5 rounded-md">
                       <button 
                         type="button"
                         onClick={() => setViewMode('grid')}
                         aria-label="Visualizar em grade"
                         aria-pressed={viewMode === 'grid'}
                         className={`p-3 rounded-md transition-all ${viewMode === 'grid' ? 'bg-brand-dark text-white shadow-soft' : 'text-brand-dark/20 hover:text-brand-dark/60'}`}
                       >
                         <Grid className="w-4 h-4" />
                       </button>
                       <button 
                         type="button"
                         onClick={() => setViewMode('list')}
                         aria-label="Visualizar em lista"
                         aria-pressed={viewMode === 'list'}
                         className={`p-3 rounded-md transition-all ${viewMode === 'list' ? 'bg-brand-dark text-white shadow-soft' : 'text-brand-dark/20 hover:text-brand-dark/60'}`}
                       >
                         <ListIcon className="w-4 h-4" />
                      </button>
                   </div>
                </div>
              </div>

              {/* Advanced Filters Panel */}
              <AnimatePresence>
                {showFilters && (
                  <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    id="stores-filters-panel"
                    className="overflow-hidden bg-white rounded-xl border border-brand-dark/5 shadow-soft"
                  >
                    <div className="p-6 md:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
                       <div className="space-y-3">
                         <label htmlFor="stores-filter-category" className="text-xs tracking-widest font-bold text-brand-dark/60 uppercase">Categoria</label>
                         <select 
                           id="stores-filter-category"
                           value={categoryFilter}
                           onChange={(e) => updateFilters({ cat: e.target.value })}
                           className="w-full bg-brand-paper border border-brand-dark/5 rounded-md p-4 md:p-3 text-xs font-bold font-sans focus:outline-none appearance-none"
                         >
                           <option value="Todos">Todas as Categorias</option>
                           {availableCategories.map(cat => <option key={cat.id} value={cat.name}>{cat.name}</option>)}
                         </select>
                       </div>

                       <div className="space-y-3">
                         <label htmlFor="stores-filter-segment" className="text-xs tracking-widest font-bold text-brand-dark/60 uppercase">Segmento</label>
                         <select 
                           id="stores-filter-segment"
                           value={segmentFilter}
                           onChange={(e) => updateFilters({ seg: e.target.value })}
                           className="w-full bg-brand-paper border border-brand-dark/5 rounded-md p-4 md:p-3 text-xs font-bold font-sans focus:outline-none appearance-none"
                         >
                           <option value="Todos">Todos os Segmentos</option>
                           {segments.map(seg => <option key={seg} value={seg}>{seg}</option>)}
                         </select>
                       </div>

                       <div className="space-y-3">
                         <label htmlFor="stores-filter-floor" className="text-xs tracking-widest font-bold text-brand-dark/60 uppercase">Piso</label>
                         <select 
                           id="stores-filter-floor"
                           value={floorFilter}
                           onChange={(e) => updateFilters({ piso: e.target.value })}
                           className="w-full bg-brand-paper border border-brand-dark/5 rounded-md p-4 md:p-3 text-xs font-bold font-sans focus:outline-none appearance-none"
                         >
                           <option value="Todos">Todos os Pisos</option>
                           {floors.map(floor => <option key={floor} value={floor}>{floor}</option>)}
                         </select>
                       </div>

                       <div className="space-y-3">
                         <label htmlFor="stores-filter-sale-type" className="text-xs tracking-widest font-bold text-brand-dark/60 uppercase">Tipo de Venda</label>
                         <select 
                           id="stores-filter-sale-type"
                           value={saleTypeFilter}
                           onChange={(e) => updateFilters({ venda: e.target.value })}
                           className="w-full bg-brand-paper border border-brand-dark/5 rounded-md p-4 md:p-3 text-xs font-bold font-sans focus:outline-none appearance-none"
                         >
                           <option value="Todos">Desejo comprar...</option>
                           <option value="Atacado">Atacado</option>
                           <option value="Varejo">Varejo</option>
                           <option value="Ambos">Ambos</option>
                         </select>
                       </div>

                       <div className="sm:col-span-2 lg:col-span-4 flex flex-col sm:flex-row flex-wrap gap-6 pt-4 border-t border-brand-dark/5">
                         <label className="flex items-center gap-3 cursor-pointer group">
                           <div className={`w-10 h-6 rounded-full transition-all relative ${hasWhatsappFilter ? 'bg-green-500' : 'bg-brand-dark/10 group-hover:bg-brand-dark/20'}`}>
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${hasWhatsappFilter ? 'left-5' : 'left-1'}`} />
                           </div>
                            <input 
                              type="checkbox" 
                              className="sr-only" 
                              checked={hasWhatsappFilter} 
                              onChange={(e) => updateFilters({ wpp: e.target.checked })} 
                              aria-label="Filtrar lojas com WhatsApp"
                            />
                            <span className="text-[10px] tracking-brand font-bold text-brand-dark/60 uppercase">Loja com WhatsApp</span>
                          </label>

                         <label className="flex items-center gap-3 cursor-pointer group">
                           <div className={`w-10 h-6 rounded-full transition-all relative ${hasCatalogFilter ? 'bg-brand-red' : 'bg-brand-dark/10 group-hover:bg-brand-dark/20'}`}>
                             <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-all ${hasCatalogFilter ? 'left-5' : 'left-1'}`} />
                           </div>
                            <input 
                              type="checkbox" 
                              className="sr-only" 
                              checked={hasCatalogFilter} 
                              onChange={(e) => updateFilters({ cat_digital: e.target.checked })} 
                              aria-label="Filtrar lojas com catálogo digital"
                            />
                            <span className="text-[10px] tracking-brand font-bold text-brand-dark/60 uppercase">Com Catálogo Digital</span>
                          </label>

                          <button 
                            type="button"
                            onClick={clearFilters}
                            className="ml-auto text-xs tracking-brand font-bold text-brand-red hover:underline uppercase"
                          >
                            Limpar todos os filtros
                          </button>
                       </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
           </div>
        </header>

        {/* Results */}
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8' : 'space-y-6'}>
           <AnimatePresence mode="popLayout">
             {filteredStores.map((store, index) => {
               const alreadyInRoute = isInRoute(store.id);
               
               return (
                <motion.div 
                  key={store.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.4, delay: index * 0.05 }}
                  className={`group bg-white rounded-xl overflow-hidden border border-brand-dark/5 hover:border-brand-red transition-all duration-500 shadow-soft flex flex-col ${
                    viewMode === 'list' ? 'md:flex-row md:h-64' : ''
                  }`}
                >
                   <div className={`${viewMode === 'list' ? 'md:w-64 h-48 md:h-full' : 'aspect-square'} overflow-hidden relative shrink-0`}>
                      <ImageWithFallback
                        src={store.image}
                        alt={store.name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        width={640}
                        height={640}
                        sizes="(max-width: 768px) 100vw, (max-width: 1280px) 50vw, 25vw"
                      />
                      <div className="absolute inset-0 bg-brand-dark/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute top-4 left-4 flex flex-col gap-2">
                        {store.featured && (
                             <span className="px-3 py-1 bg-brand-gold text-white text-[8px] tracking-brand font-bold rounded-full flex items-center gap-1.5 shadow-lg">
                                <Star className="w-3 h-3 fill-white" />
                                DESTAQUE
                             </span>
                        )}
                        <span className="px-3 py-1 bg-white/90 backdrop-blur-md text-brand-dark text-[8px] tracking-brand font-bold rounded-full shadow-lg">
                          {store.saleType.toUpperCase()}
                        </span>
                      </div>
                   </div>
                   
                   <div className={`p-6 md:p-8 flex flex-col flex-grow ${viewMode === 'list' ? 'h-full' : ''}`}>
                     <div className="space-y-3">
                        <div className="flex items-center justify-between">
                           <span className="text-brand-gold text-[9px] tracking-premium font-bold uppercase">{store.category}</span>
                           <div className="flex items-center gap-1.5 text-brand-dark/40 text-[9px] font-bold uppercase font-sans">
                             <MapPin className="w-3 h-3 text-brand-red" />
                             {store.floor} • {store.unit}
                           </div>
                        </div>
                        <h3 className="text-2xl font-serif font-bold group-hover:text-brand-red transition-colors leading-tight">{store.name}</h3>
                        <div className="flex flex-wrap gap-2">
                          <span className="text-brand-dark/40 text-[10px] font-sans italic">{store.segment}</span>
                          {store.tags?.slice(0, 2).map(tag => (
                            <span key={tag} className="text-[9px] font-sans font-medium text-brand-dark/30">#{tag}</span>
                          ))}
                        </div>
                     </div>

                     <div className="pt-6 mt-auto border-t border-brand-dark/5 space-y-3 md:space-y-4">
                        <div className="flex flex-col sm:flex-row gap-3">
                           <a 
                             href={createWhatsAppLink(store.whatsapp || settings.whatsapp, `Olá, encontrei a loja ${store.name} no site do Mega Polo Moda e gostaria de mais informações.`)} 
                             target="_blank"
                             rel="noopener noreferrer"
                             className="flex-1 flex items-center justify-center gap-2 py-4 sm:py-3 bg-green-50 text-green-600 border border-green-600/10 rounded-md text-[9px] tracking-brand font-bold uppercase hover:bg-green-600 hover:text-white transition-all shadow-sm"
                           >
                              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                           </a>
                           <Link 
                             to={`/lojas/${store.slug}`} 
                             className="flex-1 flex items-center justify-center gap-2 py-4 sm:py-3 bg-brand-paper hover:bg-brand-dark hover:text-white rounded-md text-[9px] tracking-brand font-bold uppercase transition-all shadow-sm"
                           >
                              Ver Loja
                           </Link>
                        </div>
                        
                        <button 
                          onClick={() => addItem(store)}
                          disabled={alreadyInRoute}
                          className={`w-full py-4 sm:py-3 rounded-md text-[9px] tracking-brand font-bold uppercase flex items-center justify-center gap-2 transition-all ${
                            alreadyInRoute 
                              ? 'bg-green-50 text-green-600 border border-green-600/20' 
                              : 'bg-brand-red text-white hover:bg-brand-dark shadow-md active:scale-95'
                          }`}
                        >
                          {alreadyInRoute ? (
                            <><Check className="w-3.5 h-3.5" /> NO ROTEIRO</>
                          ) : (
                            <><Plus className="w-3.5 h-3.5" /> ADICIONAR ROTEIRO</>
                          )}
                        </button>
                     </div>
                   </div>
                </motion.div>
               );
             })}
           </AnimatePresence>
        </div>

        {filteredStores.length === 0 && (
          <div className="py-32 text-center space-y-8 bg-white rounded-2xl border border-dashed border-brand-dark/10">
            <div className="w-20 h-20 bg-brand-paper rounded-full flex items-center justify-center mx-auto">
              <Search className="w-10 h-10 text-brand-dark/10" />
            </div>
            <div className="space-y-2 px-6">
              <h2 className="text-3xl font-serif">
                {hasNoPublishedContent && !hasActiveFilters
                  ? 'Nenhum conteudo publicado no momento'
                  : 'Nenhuma loja encontrada'}
              </h2>
              <p className="text-brand-dark/40 max-w-sm mx-auto font-sans">
                {hasNoPublishedContent && !hasActiveFilters
                  ? 'Tente novamente em instantes.'
                  : 'Tente ajustar os filtros ou buscar por outro segmento.'}
              </p>
            </div>
            <button 
              onClick={clearFilters}
              className="px-10 py-5 bg-brand-dark text-white text-[11px] tracking-brand font-bold rounded-md hover:bg-brand-red transition-all shadow-xl"
            >
              LIMPAR FILTROS
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

