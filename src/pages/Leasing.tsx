import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageCircle, 
  Send, 
  Loader2,
  Building2, 
  Users, 
  Hotel, 
  Utensils, 
  Calendar, 
  MapPin, 
  TrendingUp, 
  Layers, 
  Store, 
  ShoppingBag, 
  Layout, 
  ArrowRight,
  ShieldCheck,
  Check
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { SEO } from '../components/ui/SEO';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { maskCNPJ, maskPhone } from '../utils/masks';
import { createWhatsAppLink } from '../utils/whatsapp';
import { hasValidCnpj, hasValidEmail, hasValidPhone } from '../utils/validation';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { usePublicContentBlocks } from '../hooks/usePublicContentBlocks';
import { isSupabaseConfigured } from '../lib/supabase';
import { getPageBySlug } from '../services/pages.service';
import { createLead } from '../services/leads.service';
import type { Page } from '../types/cms';
import { LEASING_PUBLIC_BLOCKS_FALLBACK } from '../config/publicContentBlocksFallback';
import {
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
  buildShoppingCenterStructuredData,
} from '../utils/seo';

const SUBMIT_DEBOUNCE_MS = 1500;

const ICON_MAP: Record<string, LucideIcon> = {
  'map-pin': MapPin,
  map_pin: MapPin,
  map: MapPin,
  users: Users,
  hotel: Hotel,
  utensils: Utensils,
  calendar: Calendar,
  'trending-up': TrendingUp,
  trending_up: TrendingUp,
  layers: Layers,
  store: Store,
  'shopping-bag': ShoppingBag,
  shopping_bag: ShoppingBag,
  layout: Layout,
  'building-2': Building2,
  building_2: Building2,
  'shield-check': ShieldCheck,
  shield_check: ShieldCheck,
  check: Check,
};

function normalizeText(value: string | null | undefined, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeIconKey(value: string | null | undefined): string {
  return normalizeText(value).toLowerCase().replace(/\s+/g, '_');
}

function resolveIcon(value: string | null | undefined, fallback: LucideIcon): LucideIcon {
  const key = normalizeIconKey(value);
  return ICON_MAP[key] ?? ICON_MAP[key.replace(/_/g, '-')] ?? fallback;
}

export default function Leasing() {
  const { settings } = useSiteSettings();
  const { blocksByKey: leasingBlocks } = usePublicContentBlocks({
    pageKey: 'leasing',
    fallbackBlocks: LEASING_PUBLIC_BLOCKS_FALLBACK,
  });
  const [cmsPage, setCmsPage] = useState<Page | null>(null);
  const [form, setForm] = useState({
    name: '',
    brand: '',
    cnpj: '',
    whatsapp: '',
    email: '',
    segment: 'Moda Feminina',
    interest: 'Loja',
    message: '',
    consent: false,
    honeypot: '',
  });
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [submittedBrand, setSubmittedBrand] = useState('');
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    brand?: string;
    email?: string;
    whatsapp?: string;
    cnpj?: string;
    consent?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastSubmitAt, setLastSubmitAt] = useState(0);
  const formErrorId = 'leasing-form-error';
  const fieldErrorIds = {
    name: 'leasing-name-error',
    brand: 'leasing-brand-error',
    cnpj: 'leasing-cnpj-error',
    whatsapp: 'leasing-whatsapp-error',
    email: 'leasing-email-error',
    consent: 'leasing-consent-error',
  } as const;

  React.useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      if (!isSupabaseConfigured) {
        if (mounted) {
          setCmsPage(null);
        }
        return;
      }

      const result = await getPageBySlug('abra-sua-loja', false);

      if (!mounted) {
        return;
      }

      if (result.error) {
        if (import.meta.env.DEV) {
          console.warn('Falha ao carregar pagina CMS abra-sua-loja:', result.error);
        }
        setCmsPage(null);
        return;
      }

      setCmsPage(result.data ?? null);
    };

    void loadPage();

    return () => {
      mounted = false;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) {
      return;
    }

    setSubmitError(null);
    setFieldErrors({});

    if (form.honeypot.trim()) {
      setSubmitError('Nao foi possivel enviar o formulario. Tente novamente.');
      return;
    }

    if (Date.now() - lastSubmitAt < SUBMIT_DEBOUNCE_MS) {
      setSubmitError('Aguarde alguns segundos antes de enviar novamente.');
      return;
    }

    if (!form.name.trim()) {
      setFieldErrors({ name: 'Informe seu nome.' });
      setSubmitError('Informe seu nome.');
      return;
    }

    if (!form.brand.trim()) {
      setFieldErrors({ brand: 'Informe o nome da marca.' });
      setSubmitError('Informe o nome da marca.');
      return;
    }

    if (!hasValidEmail(form.email)) {
      setFieldErrors({ email: 'Informe um e-mail valido.' });
      setSubmitError('Informe um e-mail valido.');
      return;
    }

    if (!hasValidPhone(form.whatsapp)) {
      setFieldErrors({ whatsapp: 'Informe um WhatsApp valido com DDD.' });
      setSubmitError('Informe um WhatsApp valido com DDD.');
      return;
    }

    if (!hasValidCnpj(form.cnpj)) {
      setFieldErrors({ cnpj: 'Informe um CNPJ valido.' });
      setSubmitError('Informe um CNPJ valido.');
      return;
    }

    if (!form.consent) {
      setFieldErrors({ consent: 'Confirme o consentimento LGPD para enviar a solicitacao.' });
      setSubmitError('Confirme o consentimento LGPD para enviar a solicitacao.');
      return;
    }

    setIsSubmitting(true);

    const leadMessage = [
      `Interesse: ${form.interest}`,
      form.message.trim() ? `Mensagem: ${form.message.trim()}` : '',
    ]
      .filter(Boolean)
      .join('\n');

    const result = await createLead({
      type: 'leasing',
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.whatsapp.trim(),
      company: form.brand.trim(),
      cnpj: form.cnpj.trim() || undefined,
      segment: form.segment.trim(),
      message: leadMessage || undefined,
      source_page: 'abra-sua-loja',
      status: 'novo',
      consent: form.consent,
    });

    setIsSubmitting(false);
    setLastSubmitAt(Date.now());

    if (result.error) {
      setSubmitError(result.error);
      return;
    }

    setSubmittedBrand(form.brand.trim());
    setIsSubmitted(true);
  };

  const leasingIntroBlock = leasingBlocks.leasing_intro;
  const authorityHighlightsBlock = leasingBlocks.authority_highlights;
  const benefitsBlock = leasingBlocks.benefits_grid;
  const spacesBlock = leasingBlocks.spaces_grid;
  const proposalIntroBlock = leasingBlocks.proposal_intro;
  const proposalSupportBlock = leasingBlocks.proposal_support_items;
  const proposalStatsBlock = leasingBlocks.proposal_stats;
  const finalWhatsAppCtaBlock = leasingBlocks.final_whatsapp_cta;

  const authorityHighlights = (authorityHighlightsBlock?.items ?? [])
    .filter((item) => item.is_active)
    .map((item) => ({
      id: item.id,
      title: normalizeText(item.title),
      desc: normalizeText(item.content),
    }))
    .filter((item) => item.title && item.desc);

  const benefits = (benefitsBlock?.items ?? [])
    .filter((item) => item.is_active)
    .map((item) => ({
      id: item.id,
      icon: resolveIcon(item.icon, MapPin),
      title: normalizeText(item.title),
      desc: normalizeText(item.content),
    }))
    .filter((item) => item.title && item.desc);

  const spaces = (spacesBlock?.items ?? [])
    .filter((item) => item.is_active)
    .map((item) => ({
      id: item.id,
      icon: resolveIcon(item.icon, Store),
      title: normalizeText(item.title),
      desc: normalizeText(item.content),
    }))
    .filter((item) => item.title && item.desc);

  const proposalSupportItems = (proposalSupportBlock?.items ?? [])
    .filter((item) => item.is_active)
    .map((item) => ({
      id: item.id,
      icon: resolveIcon(item.icon, ShieldCheck),
      title: normalizeText(item.title),
      desc: normalizeText(item.content),
    }))
    .filter((item) => item.title && item.desc);

  const proposalStats = (proposalStatsBlock?.items ?? [])
    .filter((item) => item.is_active)
    .map((item) => ({
      id: item.id,
      value: normalizeText(item.title),
      label: normalizeText(item.content),
    }))
    .filter((item) => item.value && item.label);

  const leasingSeoTitle = cmsPage?.seo_title?.trim() || normalizeText(leasingIntroBlock?.title, 'Abra sua loja');
  const leasingSeoDescription =
    cmsPage?.seo_description?.trim() ||
    normalizeText(
      leasingIntroBlock?.content,
      'Conheca oportunidades comerciais para abrir sua loja no Mega Polo Moda.',
    );
  const leasingOgTitle = cmsPage?.og_title?.trim() || leasingSeoTitle;
  const leasingOgDescription = cmsPage?.og_description?.trim() || leasingSeoDescription;
  const leasingCanonical = cmsPage?.canonical_url?.trim() || '/abra-sua-loja';
  const leasingRobots = `${cmsPage?.robots_index === false ? 'noindex' : 'index'},${cmsPage?.robots_follow === false ? 'nofollow' : 'follow'}`;
  const leasingHeroImage =
    cmsPage?.hero_image_url?.trim() ||
    settings.institutional_image_url ||
    'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&q=80&w=2000';
  const leasingHeroLabel =
    normalizeText(leasingIntroBlock?.subtitle) || cmsPage?.subtitle?.trim() || 'Oportunidade Comercial';
  const leasingHeroTitle =
    normalizeText(leasingIntroBlock?.title) ||
    cmsPage?.title?.trim() ||
    'Abra sua loja em uma estrutura comercial de referencia no Bras';
  const leasingHeroDescription =
    normalizeText(leasingIntroBlock?.content) ||
    cmsPage?.content?.trim() ||
    'Conecte sua marca a compradores de diferentes regioes em uma estrutura completa e estrategica no coracao do Bras.';
  const leasingPrimaryButtonLabel = normalizeText(
    leasingIntroBlock?.button_label,
    'Quero receber uma proposta',
  );
  const leasingPrimaryButtonUrl = normalizeText(leasingIntroBlock?.button_url, '#proposta');
  const leasingSecondaryButtonLabel = normalizeText(
    leasingIntroBlock?.secondary_button_label,
    'Falar com o comercial',
  );
  const leasingStructuredData = [
    buildOrganizationStructuredData(settings),
    buildShoppingCenterStructuredData(settings),
    buildBreadcrumbStructuredData([
      { name: 'Home', path: '/' },
      { name: 'Abra sua loja', path: '/abra-sua-loja' },
    ]),
  ];

  return (
    <div className="bg-brand-paper min-h-screen">
      <SEO 
        title={leasingSeoTitle} 
        description={leasingSeoDescription} 
        canonical={leasingCanonical}
        ogTitle={leasingOgTitle}
        ogDescription={leasingOgDescription}
        ogImage={leasingHeroImage}
        robots={leasingRobots}
        structuredData={leasingStructuredData}
      />

      {/* Hero */}
      <section className="relative min-h-[90vh] flex items-center pt-24 overflow-hidden">
        <div className="absolute inset-0 z-0">
           <ImageWithFallback
             src={leasingHeroImage}
             alt="Fachada Mega Polo Moda"
             className="w-full h-full object-cover"
             loading="eager"
             width={1600}
             height={900}
             sizes="100vw"
           />
           <div className="absolute inset-0 bg-brand-dark/70 lg:bg-gradient-to-r lg:from-brand-dark/90 lg:to-transparent" />
        </div>
        
        <div className="container mx-auto px-6 relative z-10 pt-20">
           <div className="max-w-3xl space-y-8 md:space-y-10">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                 <span className="inline-block px-5 py-2 bg-brand-red text-white text-[10px] tracking-premium font-bold rounded-full shadow-lg uppercase">
                   {leasingHeroLabel}
                 </span>
                 <h1 className="text-3xl md:text-8xl text-white font-serif font-bold leading-tight">
                   {leasingHeroTitle}
                 </h1>
                 <p className="text-lg md:text-2xl text-white/70 font-sans leading-relaxed max-w-2xl font-light">
                   {leasingHeroDescription}
                 </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <a href={leasingPrimaryButtonUrl} className="w-full sm:w-auto px-10 py-5 bg-brand-red text-white text-[11px] font-bold tracking-brand rounded-md hover:bg-white hover:text-brand-red transition-all shadow-2xl uppercase text-center">
                  {leasingPrimaryButtonLabel}
                </a>
                <a 
                  href={createWhatsAppLink(settings.whatsapp, settings.leasing_whatsapp_message)} 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto px-10 py-5 bg-white/10 backdrop-blur-md text-white text-[11px] font-bold tracking-brand rounded-md hover:bg-white/20 transition-all border border-white/20 flex items-center justify-center gap-3 uppercase text-center"
                >
                  <MessageCircle className="w-5 h-5" />
                  {leasingSecondaryButtonLabel}
                </a>
              </motion.div>
           </div>
        </div>
      </section>

      {/* Authority Numbers */}
      <section className="bg-brand-dark py-20">
         <div className="container mx-auto px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12 text-center">
               {authorityHighlights.map((item) => (
                 <div key={item.id} className="space-y-4">
                    <p className="text-4xl text-white font-serif italic">{item.title}</p>
                    <p className="text-brand-dark/40 text-[10px] tracking-widest font-bold uppercase text-white/50">{item.desc}</p>
                 </div>
               ))}
            </div>
         </div>
      </section>

      {/* Benefits Grid */}
      <section className="py-32 bg-white">
        <div className="container mx-auto px-6">
           <div className="text-center max-w-3xl mx-auto space-y-4 mb-24">
              <h4 className="text-[10px] tracking-premium font-bold text-brand-gold uppercase">
                {normalizeText(benefitsBlock?.subtitle, 'Vantagens Competitivas')}
              </h4>
              <h2 className="text-4xl md:text-5xl font-serif font-bold">
                {normalizeText(benefitsBlock?.title, 'Por que escolher o Mega Polo Moda?')}
              </h2>
              <div className="w-20 h-1 bg-brand-red mx-auto mt-6" />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-x-12 gap-y-20">
             {benefits.map((benefit, idx) => (
               <motion.div 
                 key={benefit.id}
                 initial={{ opacity: 0, y: 20 }}
                 whileInView={{ opacity: 1, y: 0 }}
                 viewport={{ once: true }}
                 transition={{ delay: idx * 0.05 }}
                 className="space-y-6"
               >
                  <div className="w-14 h-14 bg-brand-paper rounded-xl flex items-center justify-center border border-brand-dark/5 shadow-sm">
                     <benefit.icon className="w-6 h-6 text-brand-red" />
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-xl font-serif font-bold">{benefit.title}</h3>
                     <p className="text-brand-dark/60 font-sans text-sm leading-relaxed">{benefit.desc}</p>
                  </div>
               </motion.div>
             ))}
           </div>
        </div>
      </section>

      {/* Space Types */}
      <section className="py-32 bg-brand-paper">
         <div className="container mx-auto px-6">
            <div className="text-center max-w-3xl mx-auto space-y-4 mb-24">
               <h4 className="text-[10px] tracking-premium font-bold text-brand-gold uppercase">
                 {normalizeText(spacesBlock?.subtitle, 'Espacos Disponiveis')}
               </h4>
               <h2 className="text-4xl md:text-5xl font-serif font-bold">
                 {normalizeText(spacesBlock?.title, 'O lugar ideal para sua marca')}
               </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
               {spaces.map((space) => (
                  <motion.div 
                    key={space.id}
                    whileHover={{ y: -10 }}
                    className="bg-white p-10 rounded-2xl shadow-soft border border-brand-dark/5 space-y-8 flex flex-col h-full"
                  >
                     <div className="w-16 h-16 bg-brand-paper rounded-full flex items-center justify-center">
                        <space.icon className="w-8 h-8 text-brand-dark" />
                     </div>
                     <div className="space-y-3 flex-grow">
                        <h3 className="text-2xl font-serif font-bold italic">{space.title}</h3>
                        <p className="text-brand-dark/50 font-sans text-sm leading-relaxed">{space.desc}</p>
                     </div>
                     <a 
                       href="#proposta" 
                       onClick={() => setForm({...form, interest: space.title})}
                       className="text-[10px] tracking-premium font-bold text-brand-red hover:text-brand-dark transition-all flex items-center gap-2 group"
                     >
                       TENHO INTERESSE <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
                     </a>
                  </motion.div>
               ))}
            </div>
         </div>
      </section>

      {/* Form Section */}
      <section id="proposta" className="py-32 bg-white relative">
         <div className="container mx-auto px-6">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
               {/* Left Info */}
               <div className="space-y-12">
                  <div className="space-y-6">
                     <h2 className="text-4xl md:text-7xl font-serif font-bold italic leading-tight">
                       {normalizeText(proposalIntroBlock?.title, 'Receba uma proposta exclusiva')}
                     </h2>
                     <p className="text-xl text-brand-dark/60 font-sans max-w-lg leading-relaxed">
                       {normalizeText(
                         proposalIntroBlock?.content,
                         'Cadastre sua marca para receber uma analise comercial completa e as opcoes disponiveis para o seu segmento.',
                       )}
                     </p>
                  </div>

                  <div className="space-y-8">
                     {proposalSupportItems.map((item, index) => {
                        const Icon = item.icon;
                        const iconWrapClass =
                          index === 0
                            ? 'w-10 h-10 bg-green-50 rounded-full flex items-center justify-center shrink-0'
                            : 'w-10 h-10 bg-brand-paper rounded-full flex items-center justify-center shrink-0';
                        const iconClass = index === 0 ? 'w-6 h-6 text-green-600' : 'w-6 h-6 text-brand-red';

                        return (
                          <div key={item.id} className="flex items-start gap-5">
                             <div className={iconWrapClass}>
                                <Icon className={iconClass} />
                             </div>
                             <div>
                                <p className="text-brand-dark font-serif font-bold text-lg">{item.title}</p>
                                <p className="text-brand-dark/50 text-sm font-sans">{item.desc}</p>
                             </div>
                          </div>
                        );
                     })}
                  </div>

                  <div className="pt-12 border-t border-brand-dark/5">
                     <div className="flex items-center gap-6">
                        {proposalStats.map((item, index) => (
                          <React.Fragment key={item.id}>
                            <div className="text-center">
                               <p className="text-2xl font-serif font-bold">{item.value}</p>
                               <p className="text-[10px] text-brand-dark/40 font-bold uppercase tracking-widest">{item.label}</p>
                            </div>
                            {index < proposalStats.length - 1 && <div className="w-px h-10 bg-brand-dark/10" />}
                          </React.Fragment>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Right Form */}
               <div className="bg-brand-paper p-10 md:p-12 rounded-3xl shadow-soft border border-brand-dark/5">
                  <AnimatePresence mode="wait">
                    {isSubmitted ? (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="py-20 text-center space-y-8"
                      >
                         <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                            <Check className="w-10 h-10 text-green-600" />
                         </div>
                         <div className="space-y-4">
                            <h3 className="text-3xl font-serif font-bold italic">Mensagem enviada!</h3>
                            <p className="text-brand-dark/50 font-sans leading-relaxed">
                               Solicitacao enviada com sucesso. Nossa equipe comercial entrara em contato em breve para apresentar uma proposta personalizada para a {submittedBrand || 'sua marca'}.
                            </p>
                         </div>
                         <button 
                           onClick={() => {
                             setIsSubmitted(false);
                             setSubmitError(null);
                             setFieldErrors({});
                             setForm((prev) => ({
                               ...prev,
                               name: '',
                               brand: '',
                               cnpj: '',
                               whatsapp: '',
                               email: '',
                               message: '',
                               consent: false,
                               honeypot: '',
                             }));
                           }}
                           className="px-10 py-4 bg-brand-dark text-white rounded-md text-[10px] tracking-brand font-bold uppercase hover:bg-brand-red transition-all"
                         >
                            Voltar para o formulário
                         </button>
                      </motion.div>
                    ) : (
                      <motion.form
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        onSubmit={handleSubmit}
                        className="space-y-6"
                        aria-label="Formulário para abrir sua loja"
                      >
                        <input
                          type="text"
                          tabIndex={-1}
                          autoComplete="off"
                          value={form.honeypot}
                          onChange={(e) => setForm({ ...form, honeypot: e.target.value })}
                          className="hidden"
                          aria-hidden="true"
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="leasing-name" className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest pl-1">
                              Seu Nome *
                            </label>
                            <input
                              id="leasing-name"
                              required
                              aria-required="true"
                              type="text"
                              placeholder="Nome completo"
                              className={`w-full bg-white p-4 rounded-xl border ${fieldErrors.name ? 'border-red-400' : 'border-brand-dark/5'} text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-red/20 font-sans`}
                              value={form.name}
                              onChange={(e) => {
                                setForm({ ...form, name: e.target.value });
                                if (fieldErrors.name) {
                                  setFieldErrors((prev) => ({ ...prev, name: undefined }));
                                }
                                if (submitError) {
                                  setSubmitError(null);
                                }
                              }}
                              aria-invalid={!!fieldErrors.name}
                              aria-describedby={fieldErrors.name ? fieldErrorIds.name : undefined}
                            />
                            {fieldErrors.name && (
                              <p id={fieldErrorIds.name} className="text-xs text-red-700 font-semibold" role="alert">
                                {fieldErrors.name}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="leasing-brand" className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest pl-1">
                              Nome da Marca *
                            </label>
                            <input
                              id="leasing-brand"
                              required
                              aria-required="true"
                              type="text"
                              placeholder="Sua marca"
                              className={`w-full bg-white p-4 rounded-xl border ${fieldErrors.brand ? 'border-red-400' : 'border-brand-dark/5'} text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-red/20 font-sans`}
                              value={form.brand}
                              onChange={(e) => {
                                setForm({ ...form, brand: e.target.value });
                                if (fieldErrors.brand) {
                                  setFieldErrors((prev) => ({ ...prev, brand: undefined }));
                                }
                                if (submitError) {
                                  setSubmitError(null);
                                }
                              }}
                              aria-invalid={!!fieldErrors.brand}
                              aria-describedby={fieldErrors.brand ? fieldErrorIds.brand : undefined}
                            />
                            {fieldErrors.brand && (
                              <p id={fieldErrorIds.brand} className="text-xs text-red-700 font-semibold" role="alert">
                                {fieldErrors.brand}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="leasing-cnpj" className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest pl-1">
                              CNPJ (Opcional)
                            </label>
                            <input
                              id="leasing-cnpj"
                              type="text"
                              placeholder="00.000.000/0000-00"
                              className={`w-full bg-white p-4 rounded-xl border ${fieldErrors.cnpj ? 'border-red-400' : 'border-brand-dark/5'} text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-red/20 font-sans`}
                              value={form.cnpj}
                              onChange={(e) => {
                                setForm({ ...form, cnpj: maskCNPJ(e.target.value) });
                                if (fieldErrors.cnpj) {
                                  setFieldErrors((prev) => ({ ...prev, cnpj: undefined }));
                                }
                                if (submitError) {
                                  setSubmitError(null);
                                }
                              }}
                              aria-invalid={!!fieldErrors.cnpj}
                              aria-describedby={fieldErrors.cnpj ? fieldErrorIds.cnpj : undefined}
                            />
                            {fieldErrors.cnpj && (
                              <p id={fieldErrorIds.cnpj} className="text-xs text-red-700 font-semibold" role="alert">
                                {fieldErrors.cnpj}
                              </p>
                            )}
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="leasing-whatsapp" className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest pl-1">
                              WhatsApp *
                            </label>
                            <input
                              id="leasing-whatsapp"
                              required
                              aria-required="true"
                              type="tel"
                              placeholder="(00) 00000-0000"
                              className={`w-full bg-white p-4 rounded-xl border ${fieldErrors.whatsapp ? 'border-red-400' : 'border-brand-dark/5'} text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-red/20 font-sans`}
                              value={form.whatsapp}
                              onChange={(e) => {
                                setForm({ ...form, whatsapp: maskPhone(e.target.value) });
                                if (fieldErrors.whatsapp) {
                                  setFieldErrors((prev) => ({ ...prev, whatsapp: undefined }));
                                }
                                if (submitError) {
                                  setSubmitError(null);
                                }
                              }}
                              aria-invalid={!!fieldErrors.whatsapp}
                              aria-describedby={fieldErrors.whatsapp ? fieldErrorIds.whatsapp : undefined}
                            />
                            {fieldErrors.whatsapp && (
                              <p id={fieldErrorIds.whatsapp} className="text-xs text-red-700 font-semibold" role="alert">
                                {fieldErrors.whatsapp}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="leasing-email" className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest pl-1">
                            E-mail Corporativo *
                          </label>
                          <input
                            id="leasing-email"
                            required
                            aria-required="true"
                            type="email"
                            placeholder="exemplo@marca.com.br"
                            className={`w-full bg-white p-4 rounded-xl border ${fieldErrors.email ? 'border-red-400' : 'border-brand-dark/5'} text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-red/20 font-sans`}
                            value={form.email}
                            onChange={(e) => {
                              setForm({ ...form, email: e.target.value });
                              if (fieldErrors.email) {
                                setFieldErrors((prev) => ({ ...prev, email: undefined }));
                              }
                              if (submitError) {
                                setSubmitError(null);
                              }
                            }}
                            aria-invalid={!!fieldErrors.email}
                            aria-describedby={fieldErrors.email ? fieldErrorIds.email : undefined}
                          />
                          {fieldErrors.email && (
                            <p id={fieldErrorIds.email} className="text-xs text-red-700 font-semibold" role="alert">
                              {fieldErrors.email}
                            </p>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label htmlFor="leasing-segment" className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest pl-1">
                              Segmento
                            </label>
                            <select
                              id="leasing-segment"
                              className="w-full bg-white p-4 rounded-xl border border-brand-dark/5 text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-red/20 font-sans"
                              value={form.segment}
                              onChange={(e) => setForm({ ...form, segment: e.target.value })}
                            >
                              <option>Moda Feminina</option>
                              <option>Moda Masculina</option>
                              <option>Jeans / Denim</option>
                              <option>Moda Infantil</option>
                              <option>Acessórios / Outros</option>
                            </select>
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="leasing-interest" className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest pl-1">
                              Interesse
                            </label>
                            <select
                              id="leasing-interest"
                              className="w-full bg-white p-4 rounded-xl border border-brand-dark/5 text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-red/20 font-sans"
                              value={form.interest}
                              onChange={(e) => setForm({ ...form, interest: e.target.value })}
                            >
                              <option value="Loja">Loja</option>
                              <option value="Showroom">Showroom</option>
                              <option value="Quiosque">Quiosque</option>
                              <option value="Espaço comercial">Espaço Comercial</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="leasing-message" className="text-xs font-bold text-brand-dark/60 uppercase tracking-widest pl-1">
                            Mensagem
                          </label>
                          <textarea
                            id="leasing-message"
                            rows={3}
                            placeholder="Conte um pouco sobre sua marca e objetivo no Mega Polo Moda"
                            className="w-full bg-white p-4 rounded-xl border border-brand-dark/5 text-brand-dark focus:outline-none focus:ring-1 focus:ring-brand-red/20 font-sans"
                            value={form.message}
                            onChange={(e) => setForm({ ...form, message: e.target.value })}
                          />
                        </div>

                        <label htmlFor="leasing-consent" className="inline-flex items-start gap-3 text-sm text-brand-dark/80">
                          <input
                            id="leasing-consent"
                            type="checkbox"
                            checked={form.consent}
                            onChange={(e) => {
                              setForm({ ...form, consent: e.target.checked });
                              if (fieldErrors.consent) {
                                setFieldErrors((prev) => ({ ...prev, consent: undefined }));
                              }
                              if (submitError) {
                                setSubmitError(null);
                              }
                            }}
                            className="mt-0.5 h-4 w-4 rounded border-brand-dark/20 text-brand-red focus:ring-brand-red"
                            required
                            aria-required="true"
                            aria-invalid={!!fieldErrors.consent}
                            aria-describedby={fieldErrors.consent ? fieldErrorIds.consent : undefined}
                          />
                          <span>
                            Concordo com o uso dos meus dados para contato comercial do Mega Polo Moda (LGPD). *
                          </span>
                        </label>
                        {fieldErrors.consent && (
                          <p id={fieldErrorIds.consent} className="text-xs text-red-700 font-semibold" role="alert">
                            {fieldErrors.consent}
                          </p>
                        )}

                        {submitError && (
                          <p id={formErrorId} className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                            {submitError}
                          </p>
                        )}

                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full py-6 bg-brand-red text-white text-[11px] tracking-brand font-bold rounded-xl hover:bg-brand-dark transition-all shadow-xl flex items-center justify-center gap-3 uppercase disabled:opacity-70 disabled:cursor-not-allowed"
                        >
                          {isSubmitting ? (
                            <>
                              Enviando... <Loader2 className="w-4 h-4 animate-spin" />
                            </>
                          ) : (
                            <>
                              Enviar Solicitacao <Send className="w-4 h-4" />
                            </>
                          )}
                        </button>
                      </motion.form>
                    )}
                  </AnimatePresence>
               </div>
            </div>
         </div>
      </section>

      {/* Final WhatsApp CTA */}
      <section className="py-20 bg-brand-dark text-white text-center">
         <div className="container mx-auto px-6 space-y-8">
            <h3 className="text-3xl font-serif italic">
              {normalizeText(finalWhatsAppCtaBlock?.title, 'Prefere um atendimento imediato?')}
            </h3>
            <a 
              href={createWhatsAppLink(settings.whatsapp, settings.leasing_whatsapp_message)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-12 py-6 bg-brand-red hover:bg-brand-red-dark transition-all rounded-full text-[12px] tracking-brand font-bold shadow-2xl uppercase"
            >
              <MessageCircle className="w-5 h-5" />
              {normalizeText(finalWhatsAppCtaBlock?.button_label, 'Falar no WhatsApp agora')}
            </a>
         </div>
      </section>
    </div>
  );
}

