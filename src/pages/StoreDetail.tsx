import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  MessageCircle,
  Instagram,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Plus,
  Search,
  AlertCircle,
  ChevronRight,
  Phone,
  Mail,
  Globe,
} from 'lucide-react';
import { SEO } from '../components/ui/SEO';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { createWhatsAppLink } from '../utils/whatsapp';
import { usePlanning } from '../hooks/usePlanning';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { useStores } from '../hooks/useStores';
import { allowMockFallback } from '../config/environment';
import type { Store as PublicStore } from '../types';
import {
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
  buildStoreStructuredData,
} from '../utils/seo';

function normalizePhone(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 13) {
    return null;
  }

  return digits;
}

function normalizeInstagramHandle(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  const handle = value
    .trim()
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/^@+/, '')
    .replace(/\/+$/, '');

  return handle || null;
}

function normalizeEmail(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  const email = value.trim();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) ? email : null;
}

function normalizeWebsiteUrl(value: string | null | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  const trimmed = value.trim();
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  try {
    const parsed = new URL(withProtocol);
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return null;
    }

    return parsed.toString();
  } catch {
    return null;
  }
}

export default function StoreDetail() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { publicStores, getStoreBySlugItem } = useStores({
    publishedOnly: true,
    fallbackToMock: allowMockFallback,
    includeProducts: true,
  });
  const [store, setStore] = useState<PublicStore | null>(null);
  const [isStoreLoading, setIsStoreLoading] = useState(true);
  const [storeError, setStoreError] = useState<string | null>(null);
  const { addItem, isInRoute } = usePlanning();
  const { settings } = useSiteSettings();
  const [catalogFeedback, setCatalogFeedback] = useState<string | null>(null);
  const [isCheckingCatalog, setIsCheckingCatalog] = useState(false);

  const formatPrice = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return null;
    }

    return value.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
    });
  };

  const showCatalogUnavailableFeedback = () => {
    setCatalogFeedback('Catálogo demonstrativo será disponibilizado em breve.');
    setTimeout(() => setCatalogFeedback(null), 3000);
  };

  const isMockCatalogUrl = (catalogUrl: string) => {
    const normalized = catalogUrl.trim().toLowerCase();
    return normalized === '' || normalized === '#' || normalized === 'mock' || normalized.includes('exemplo');
  };

  const catalogUrlExists = async (catalogUrl: string) => {
    try {
      const resolvedUrl = new URL(catalogUrl, window.location.origin);

      // External URLs are treated as valid to avoid CORS false negatives.
      if (resolvedUrl.origin !== window.location.origin) {
        return true;
      }

      const headResponse = await fetch(resolvedUrl.toString(), { method: 'HEAD' });
      if (headResponse.ok) {
        return true;
      }

      const getResponse = await fetch(resolvedUrl.toString(), { method: 'GET' });
      return getResponse.ok;
    } catch {
      return false;
    }
  };

  // Scroll to top on slug change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  useEffect(() => {
    const loadStore = async () => {
      if (!slug) {
        setStore(null);
        setStoreError('Loja nao encontrada.');
        setIsStoreLoading(false);
        return;
      }

      setIsStoreLoading(true);
      const result = await getStoreBySlugItem(slug, {
        fallbackToMockBySlug: allowMockFallback,
      });

      if (result.error || !result.data) {
        setStore(null);
        setStoreError(result.error ?? 'Loja nao encontrada.');
        setIsStoreLoading(false);
        return;
      }

      setStore(result.data);
      setStoreError(null);
      setIsStoreLoading(false);
    };

    const timerId = window.setTimeout(() => {
      void loadStore();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [getStoreBySlugItem, slug]);

  if (isStoreLoading) {
    return (
      <div className="py-32 text-center bg-brand-paper min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-8 shadow-soft"
        >
          <Search className="w-8 h-8 text-brand-dark/20 animate-pulse" />
        </motion.div>
        <h1 className="text-4xl font-serif mb-4">Carregando loja</h1>
        <p className="text-brand-dark/40 max-w-sm mx-auto font-sans mb-12">
          Buscando os dados da loja no portal.
        </p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="py-32 text-center bg-brand-paper min-h-screen flex flex-col items-center justify-center px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-20 h-20 bg-white rounded-full flex items-center justify-center mb-8 shadow-soft"
        >
           <Search className="w-8 h-8 text-brand-dark/10" />
        </motion.div>
        <h1 className="text-4xl font-serif mb-4">Loja não encontrada</h1>
        <p className="text-brand-dark/40 max-w-sm mx-auto font-sans mb-12">
          {storeError ?? 'A loja que você procura não está disponível ou foi removida.'}
        </p>
        <button 
          onClick={() => navigate('/lojas')}
          className="px-10 py-5 bg-brand-dark text-white text-[11px] tracking-brand font-bold rounded-md hover:bg-brand-red transition-all shadow-xl uppercase"
        >
          Voltar para lojas
        </button>
      </div>
    );
  }

  const relatedStores = publicStores
    .filter((item) => item.category === store.category && item.id !== store.id)
    .slice(0, 3);
  const alreadyInRoute = isInRoute(store.id);
  const hasActiveCatalog =
    !!store.hasCatalog &&
    !!store.catalogUrl &&
    !isMockCatalogUrl(store.catalogUrl);
  const normalizedInstagram = normalizeInstagramHandle(store.instagram);
  const instagramUrl = normalizedInstagram
    ? `https://www.instagram.com/${normalizedInstagram}/`
    : null;
  const normalizedWhatsApp = normalizePhone(store.whatsapp) || normalizePhone(settings.whatsapp);
  const normalizedPhone = normalizePhone(store.phone);
  const normalizedEmail = normalizeEmail(store.email);
  const normalizedWebsite = normalizeWebsiteUrl(store.website);
  const displayWhatsApp =
    normalizePhone(store.whatsapp) ? store.whatsapp : settings.whatsapp;
  const hasAnyContactInfo =
    !!instagramUrl ||
    !!normalizedWhatsApp ||
    !!normalizedPhone ||
    !!normalizedEmail ||
    !!normalizedWebsite;

  const handleCatalog = async () => {
    if (isCheckingCatalog || !hasActiveCatalog || !store.catalogUrl) {
      return;
    }

    setIsCheckingCatalog(true);
    const exists = await catalogUrlExists(store.catalogUrl);
    setIsCheckingCatalog(false);

    if (exists) {
      window.open(store.catalogUrl, '_blank', 'noopener,noreferrer');
      return;
    }

    showCatalogUnavailableFeedback();
  };

  const whatsappMessage = `Olá, encontrei a loja ${store.name} no site do Mega Polo Moda e gostaria de falar com um vendedor sobre atacado.`;
  const storeSeoTitle = store.seoTitle?.trim() || `${store.name} | Mega Polo Moda`;
  const storeSeoDescription =
    store.seoDescription?.trim() ||
    `Conheça a loja ${store.name}, veja produtos, localização e formas de contato no Mega Polo Moda.`;
  const storeOgImage = store.ogImageUrl?.trim() || store.banner || store.image;
  const storeStructuredData = buildStoreStructuredData(store, settings);
  const storeBreadcrumb = buildBreadcrumbStructuredData([
    { name: 'Home', path: '/' },
    { name: 'Lojas', path: '/lojas' },
    { name: store.name, path: `/lojas/${store.slug}` },
  ]);
  const storeOrganization = buildOrganizationStructuredData(settings);

  return (
    <div className="bg-white min-h-screen">
      <SEO 
        title={storeSeoTitle}
        description={storeSeoDescription}
        canonical={`/lojas/${store.slug}`}
        ogImage={storeOgImage}
        structuredData={[storeOrganization, storeStructuredData, storeBreadcrumb]}
      />

      <AnimatePresence>
        {catalogFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-50 bg-brand-dark text-white px-8 py-4 rounded-full text-[10px] tracking-premium font-bold shadow-2xl flex items-center gap-3 border border-white/10"
            role="status"
            aria-live="polite"
          >
            <AlertCircle className="w-4 h-4 text-brand-red" />
            {catalogFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero / Banner Side by Side */}
      <section className="relative flex flex-col lg:flex-row min-h-[70vh] lg:h-[80vh] bg-brand-dark overflow-hidden">
        {/* Left/Top: Image */}
        <div className="w-full lg:w-1/2 relative h-[40vh] lg:h-full overflow-hidden">
          <motion.div
            initial={{ scale: 1.1, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.5 }}
            className="w-full h-full"
          >
            <ImageWithFallback
              src={store.banner || store.image}
              alt={store.name}
              className="w-full h-full object-cover grayscale-[20%] hover:grayscale-0 transition-all duration-700"
              loading="eager"
              width={1200}
              height={1200}
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
          <div className="absolute inset-0 bg-brand-dark/20" />
        </div>

        {/* Right/Bottom: Title & Essential Info */}
        <div className="w-full lg:w-1/2 flex items-center p-8 lg:p-20 relative bg-brand-dark">
           <div className="max-w-xl space-y-8 lg:space-y-12">
              <motion.div
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="space-y-6"
              >
                 <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white rounded-2xl flex items-center justify-center text-3xl font-serif shadow-2xl overflow-hidden border-2 border-white/10 shrink-0">
                      {store.logo && store.logo.length < 5 ? (
                        <span className="text-brand-dark font-bold">{store.logo}</span>
                      ) : (
                        <ImageWithFallback
                          src={store.image}
                          alt={store.name}
                          className="w-full h-full object-cover"
                          width={320}
                          height={320}
                          sizes="80px"
                        />
                      )}
                    </div>
                    <div className="space-y-1 text-center sm:text-left">
                       <p className="text-brand-gold text-[10px] tracking-[0.3em] font-bold uppercase">{store.category}</p>
                       <h1 className="text-4xl md:text-7xl text-white font-serif font-bold italic leading-none">{store.name}</h1>
                    </div>
                 </div>

                 <div className="flex flex-wrap gap-2">
                    <span className="px-4 py-1.5 bg-white/5 backdrop-blur-md text-white text-[9px] tracking-premium font-bold rounded-full border border-white/10 uppercase">
                       Segmento: {store.segment}
                    </span>
                    {store.tags?.map(tag => (
                      <span key={tag} className="px-4 py-1.5 bg-brand-red/10 text-brand-red text-[9px] tracking-premium font-bold rounded-full border border-brand-red/20 uppercase">
                        #{tag}
                      </span>
                    ))}
                 </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="grid grid-cols-2 gap-8 pt-8 border-t border-white/10"
              >
                 <div className="space-y-1">
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Localização</p>
                    <p className="text-white text-sm font-sans font-medium">{store.floor} • {store.unit}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Tipo de Venda</p>
                    <p className="text-white text-sm font-sans font-medium">{store.saleType}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Catálogo</p>
                    <p className="text-white text-sm font-sans font-medium">{hasActiveCatalog ? 'Disponível' : 'Indisponível'}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] text-white/30 font-bold uppercase tracking-widest">Horário</p>
                    <p className="text-white text-sm font-sans font-medium italic">08h as 18h (Seg-Sex)</p>
                 </div>
              </motion.div>

              {(normalizedWhatsApp || hasActiveCatalog) && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 }}
                  className="flex flex-col sm:flex-row gap-4 pt-4"
                >
                  {normalizedWhatsApp && (
                    <a
                      href={createWhatsAppLink(
                        normalizedWhatsApp,
                        whatsappMessage,
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-grow py-5 bg-green-600 text-white rounded-xl flex items-center justify-center gap-3 text-[11px] tracking-brand font-bold hover:bg-green-700 transition-all shadow-xl uppercase"
                    >
                      <MessageCircle className="w-5 h-5" />
                      Falar no WhatsApp
                    </a>
                  )}
                  {hasActiveCatalog && (
                    <button
                      onClick={handleCatalog}
                      disabled={isCheckingCatalog}
                      className="flex-grow py-5 bg-white text-brand-dark rounded-xl flex items-center justify-center gap-3 text-[11px] tracking-brand font-bold hover:bg-brand-paper transition-all shadow-xl uppercase"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {isCheckingCatalog ? 'Verificando catálogo' : 'Ver Catálogo'}
                    </button>
                  )}
                </motion.div>
              )}
           </div>
        </div>
      </section>

      {/* Main Content Sections */}
      <div className="max-w-7xl mx-auto px-6 py-24 space-y-32">
        
        {/* About Box - Floating Style */}
        <div className="bg-brand-paper p-8 md:p-12 lg:p-20 rounded-[32px] md:rounded-[48px] border border-brand-dark/5 relative overflow-hidden group">
           <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/5 rounded-full blur-3xl -mr-32 -mt-32" />
           <div className="relative space-y-8 md:space-y-10 max-w-4xl mx-auto text-center">
              <div className="flex flex-col items-center gap-4">
                 <span className="text-[10px] tracking-[0.4em] font-bold text-brand-gold uppercase">Sobre a Loja</span>
                 <h2 className="text-2xl md:text-5xl font-serif font-bold italic leading-tight">
                   {store.name}
                 </h2>
                 <p className="text-brand-dark/70 font-sans leading-relaxed max-w-3xl text-base md:text-lg">
                   {store.description || `A ${store.name} oferece moda atacadista com peças selecionadas para revenda.`}
                 </p>
              </div>
              {hasAnyContactInfo && (
                <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-8 md:gap-12 pt-10 border-t border-brand-dark/5">
                  {instagramUrl && (
                    <div className="text-center">
                      <p className="text-[9px] text-brand-dark/30 font-bold uppercase tracking-widest mb-1 font-sans">Instagram</p>
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base md:text-lg font-serif font-bold hover:text-brand-red transition-colors flex items-center justify-center gap-2"
                      >
                        <Instagram className="w-5 h-5" /> @{normalizedInstagram}
                      </a>
                    </div>
                  )}
                  {normalizedWhatsApp && (
                    <div className="text-center">
                      <p className="text-[9px] text-brand-dark/30 font-bold uppercase tracking-widest mb-1 font-sans">WhatsApp</p>
                      <a
                        href={createWhatsAppLink(normalizedWhatsApp, whatsappMessage)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base md:text-lg font-serif font-bold hover:text-brand-red transition-colors flex items-center justify-center gap-2"
                      >
                        <MessageCircle className="w-5 h-5" /> {displayWhatsApp}
                      </a>
                    </div>
                  )}
                  {normalizedPhone && (
                    <div className="text-center">
                      <p className="text-[9px] text-brand-dark/30 font-bold uppercase tracking-widest mb-1 font-sans">Telefone</p>
                      <p className="text-base md:text-lg font-serif font-bold flex items-center justify-center gap-2">
                        <Phone className="w-5 h-5" /> {store.phone}
                      </p>
                    </div>
                  )}
                  {normalizedEmail && (
                    <div className="text-center">
                      <p className="text-[9px] text-brand-dark/30 font-bold uppercase tracking-widest mb-1 font-sans">E-mail</p>
                      <a
                        href={`mailto:${normalizedEmail}`}
                        className="text-base md:text-lg font-serif font-bold hover:text-brand-red transition-colors flex items-center justify-center gap-2"
                      >
                        <Mail className="w-5 h-5" /> {normalizedEmail}
                      </a>
                    </div>
                  )}
                  {normalizedWebsite && (
                    <div className="text-center">
                      <p className="text-[9px] text-brand-dark/30 font-bold uppercase tracking-widest mb-1 font-sans">Site</p>
                      <a
                        href={normalizedWebsite}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-base md:text-lg font-serif font-bold hover:text-brand-red transition-colors flex items-center justify-center gap-2"
                      >
                        <Globe className="w-5 h-5" /> Acessar site
                      </a>
                    </div>
                  )}
                </div>
              )}
           </div>
        </div>

        {/* Dynamic Shop the Look / Products */}
        <section className="space-y-16">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-brand-dark/10 pb-8">
               <div className="space-y-2">
                 <h3 className="text-[11px] tracking-[0.3em] font-bold text-brand-gold uppercase">Produtos em Destaque</h3>
                 <h2 className="text-4xl md:text-6xl font-serif font-bold italic">Seleção em Destaque</h2>
               </div>
               {hasActiveCatalog && (
                 <button 
                   onClick={handleCatalog}
                   disabled={isCheckingCatalog}
                   className="text-[11px] tracking-brand font-bold text-brand-red uppercase flex items-center gap-3 group"
                 >
                   Ver catálogo completo <ArrowUpRight className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                 </button>
               )}
            </div>

            {store.products && store.products.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-12 lg:gap-16">
                {store.products.map((product, idx) => (
                 <motion.div 
                   key={idx}
                   initial={{ opacity: 0, y: 30 }}
                   whileInView={{ opacity: 1, y: 0 }}
                   viewport={{ once: true }}
                   transition={{ delay: idx * 0.1 }}
                   className="group space-y-8"
                 >
                    <div className="aspect-[4/5] bg-brand-paper rounded-2xl overflow-hidden relative shadow-soft border border-brand-dark/5">
                       <ImageWithFallback
                         src={product.image} 
                         alt={product.name} 
                         className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-1000"
                         width={640}
                         height={800}
                         sizes="(max-width: 768px) 100vw, 33vw"
                       />
                        <div className="absolute inset-0 bg-brand-dark/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center p-8 text-center">
                          {normalizedWhatsApp ? (
                            <a
                              href={createWhatsAppLink(normalizedWhatsApp, `Olá, encontrei a peça ${product.name} da loja ${store.name} no site do Mega Polo Moda e gostaria de mais informações.`)}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-white text-brand-dark text-[10px] font-bold tracking-brand px-8 py-4 rounded-full uppercase hover:bg-brand-red hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0"
                            >
                              Cotar via WhatsApp
                            </a>
                          ) : (
                            <span className="bg-white text-brand-dark text-[10px] font-bold tracking-brand px-8 py-4 rounded-full uppercase">
                              Contato indisponivel
                            </span>
                          )}
                        </div>
                    </div>
                    <div className="text-center space-y-2">
                       <p className="text-[9px] font-bold text-brand-gold uppercase tracking-widest">{product.category}</p>
                       <h4 className="text-2xl font-serif font-bold">{product.name}</h4>
                       {formatPrice(product.price) && (
                         <p className="text-sm font-semibold text-brand-dark">{formatPrice(product.price)}</p>
                       )}
                       <p className="text-brand-dark/40 text-sm font-sans italic max-w-[200px] mx-auto">{product.description}</p>
                    </div>
                 </motion.div>
                ))}
              </div>
            ) : (
              <div className="bg-brand-paper border border-brand-dark/10 rounded-2xl p-8 md:p-10 text-center space-y-2">
                <p className="text-[11px] tracking-brand font-bold uppercase text-brand-dark/50">Sem produtos publicados</p>
                <p className="text-brand-dark/70 font-sans">
                  Esta loja ainda nao publicou produtos de vitrine.
                </p>
              </div>
            )}
          </section>

        {/* Interaction / CTA */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8">
           <div className="bg-brand-dark p-8 md:p-12 lg:p-20 rounded-[32px] md:rounded-[48px] text-white space-y-8 md:space-y-10 flex flex-col justify-between">
              <div className="space-y-6">
                <h3 className="text-3xl md:text-4xl font-serif font-bold italic leading-tight">Visite a loja física <br /> hoje mesmo.</h3>
                <p className="text-white/50 font-sans leading-relaxed text-base md:text-lg max-w-sm">
                  Estamos localizados no {store.floor}, prontos para te receber com café e as melhores coleções do Brás.
                </p>
              </div>
              <button 
                onClick={() => addItem(store)}
                disabled={alreadyInRoute}
                className={`w-full sm:w-fit px-12 py-5 sm:py-6 rounded-full text-[10px] md:text-[11px] tracking-brand font-bold transition-all uppercase flex items-center justify-center gap-4 ${
                  alreadyInRoute ? 'bg-green-600/20 text-green-500 border border-green-500/30' : 'bg-brand-red text-white hover:bg-white hover:text-brand-dark shadow-2xl shadow-brand-red/20 active:scale-95'
                }`}
              >
                {alreadyInRoute ? <><CheckCircle2 className="w-5 h-5" /> Adicionada ao Roteiro</> : <><Plus className="w-5 h-5" /> Adicionar ao meu Roteiro</>}
              </button>
           </div>

           <div className="bg-brand-paper p-8 md:p-12 lg:p-20 rounded-[32px] md:rounded-[48px] border border-brand-dark/5 space-y-12">
              <div className="space-y-8">
                <h3 className="text-2xl md:text-3xl font-serif font-bold italic">Lojas relacionadas</h3>
                <div className="space-y-4">
                   {relatedStores.map((rs) => (
                     <Link 
                        key={rs.id} 
                        to={`/lojas/${rs.slug}`}
                        className="flex items-center gap-4 md:gap-6 p-4 md:p-6 bg-white rounded-2xl md:rounded-3xl border border-brand-dark/5 hover:border-brand-red transition-all group shadow-sm hover:shadow-md"
                     >
                        <div className="w-16 h-16 md:w-20 md:h-20 bg-brand-paper rounded-xl md:rounded-2xl overflow-hidden shrink-0">
                           <ImageWithFallback
                             src={rs.image}
                             alt={rs.name}
                             className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                             width={320}
                             height={320}
                             sizes="80px"
                           />
                        </div>
                        <div className="flex-grow">
                           <p className="text-[9px] text-brand-gold font-bold uppercase tracking-widest mb-1">{rs.category}</p>
                           <h5 className="text-xl font-serif font-bold group-hover:text-brand-red transition-colors">{rs.name}</h5>
                           <p className="text-[10px] text-brand-dark/40 font-bold uppercase font-sans tracking-tight">{rs.floor} • {rs.unit}</p>
                        </div>
                        <div className="w-10 h-10 bg-brand-paper rounded-full flex items-center justify-center text-brand-dark/20 group-hover:text-brand-red group-hover:bg-brand-red/5 transition-all">
                           <ChevronRight className="w-5 h-5" />
                        </div>
                     </Link>
                   ))}
                </div>
              </div>
           </div>
        </section>
      </div>
    </div>
  );
}









