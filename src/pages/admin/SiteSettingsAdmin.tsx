import React, { useMemo, useState } from 'react';
import { CheckCircle2, ImagePlus, Loader2, Save, Upload } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminFormSection from '../../components/admin/AdminFormSection';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { SEO } from '../../components/ui/SEO';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { useSiteSettings } from '../../hooks/useSiteSettings';

interface SiteSettingsFormState {
  site_name: string;
  short_description: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  whatsapp: string;
  email: string;
  phone: string;
  address: string;
  instagram_url: string;
  facebook_url: string;
  linkedin_url: string;
  opening_hours: string;
  institutional_image_url: string;
  footer_newsletter_title: string;
  footer_newsletter_text: string;
  footer_newsletter_button_label: string;
  footer_copyright_text: string;
  footer_institutional_phrase: string;
  youtube_url: string;
  footer_legal_text: string;
  copyright_text: string;
  copyright_year: string;
  default_whatsapp_message: string;
  leasing_whatsapp_message: string;
  planning_whatsapp_message: string;
  hotel_whatsapp_message: string;
  business_center_whatsapp_message: string;
  login_title: string;
  login_subtitle: string;
  login_image_url: string;
  default_og_image_url: string;
  google_analytics_id: string;
  google_tag_manager_id: string;
  meta_pixel_id: string;
  custom_head_scripts: string;
  custom_body_scripts: string;
}

type SettingsTabKey =
  | 'identidade'
  | 'contatos'
  | 'redes'
  | 'whatsapp'
  | 'seo'
  | 'login'
  | 'scripts'
  | 'legal';

const SETTINGS_TABS: Array<{ key: SettingsTabKey; label: string }> = [
  { key: 'identidade', label: 'Identidade' },
  { key: 'contatos', label: 'Contatos' },
  { key: 'redes', label: 'Redes sociais' },
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'seo', label: 'SEO global' },
  { key: 'login', label: 'Login' },
  { key: 'scripts', label: 'Scripts e integracoes' },
  { key: 'legal', label: 'Legal/Copyright' },
];

const inputClassName =
  'w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15';
const textareaClassName =
  'w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y';
const labelClassName =
  'text-xs font-bold tracking-brand text-brand-dark/70 uppercase';

function toFormState(settings: SiteSettingsFormState): SiteSettingsFormState {
  return { ...settings };
}

export default function SiteSettingsAdmin() {
  const {
    settings,
    isLoading,
    isSaving,
    error,
    successMessage,
    hasRemoteData,
    isSupabaseEnabled,
    refreshSettings,
    saveSettings,
    uploadLogoFile,
    uploadFaviconFile,
    uploadInstitutionalFile,
    uploadLoginImageFile,
    clearStatus,
  } = useSiteSettings();

  const [activeTab, setActiveTab] = useState<SettingsTabKey>('identidade');
  const [draft, setDraft] = useState<Partial<SiteSettingsFormState>>({});
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingFavicon, setUploadingFavicon] = useState(false);
  const [uploadingInstitutional, setUploadingInstitutional] = useState(false);
  const [uploadingLoginImage, setUploadingLoginImage] = useState(false);

  const hasAnyUploadRunning =
    uploadingLogo || uploadingFavicon || uploadingInstitutional || uploadingLoginImage;

  const saveDisabled = isSaving || isLoading || hasAnyUploadRunning;

  const form = useMemo<SiteSettingsFormState>(
    () => ({
      ...toFormState(settings),
      ...draft,
    }),
    [settings, draft],
  );

  const statusMessage = useMemo(() => {
    if (!isSupabaseEnabled) {
      return 'Supabase nao esta configurado neste ambiente. O formulario usa fallback local.';
    }

    if (!hasRemoteData) {
      return 'Nenhum registro remoto encontrado. Ao salvar, o primeiro registro de site_settings sera criado.';
    }

    return null;
  }, [hasRemoteData, isSupabaseEnabled]);

  const handleFieldChange = (field: keyof SiteSettingsFormState, value: string) => {
    clearStatus();
    setDraft((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (
    file: File,
    uploadType: 'logo' | 'favicon' | 'institutional' | 'login',
  ) => {
    if (uploadType === 'logo') setUploadingLogo(true);
    if (uploadType === 'favicon') setUploadingFavicon(true);
    if (uploadType === 'institutional') setUploadingInstitutional(true);
    if (uploadType === 'login') setUploadingLoginImage(true);

    clearStatus();

    const uploadResult =
      uploadType === 'logo'
        ? await uploadLogoFile(file)
        : uploadType === 'favicon'
          ? await uploadFaviconFile(file)
          : uploadType === 'institutional'
            ? await uploadInstitutionalFile(file)
            : await uploadLoginImageFile(file);

    if (uploadType === 'logo') setUploadingLogo(false);
    if (uploadType === 'favicon') setUploadingFavicon(false);
    if (uploadType === 'institutional') setUploadingInstitutional(false);
    if (uploadType === 'login') setUploadingLoginImage(false);

    if (uploadResult.error || !uploadResult.data) {
      return;
    }

    if (uploadType === 'logo') {
      handleFieldChange('logo_url', uploadResult.data.publicUrl);
      return;
    }

    if (uploadType === 'favicon') {
      handleFieldChange('favicon_url', uploadResult.data.publicUrl);
      return;
    }

    if (uploadType === 'institutional') {
      handleFieldChange('institutional_image_url', uploadResult.data.publicUrl);
      return;
    }

    handleFieldChange('login_image_url', uploadResult.data.publicUrl);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const result = await saveSettings({
      site_name: form.site_name.trim(),
      short_description: form.short_description.trim() || null,
      logo_url: form.logo_url.trim() || null,
      favicon_url: form.favicon_url.trim() || null,
      primary_color: form.primary_color.trim() || null,
      secondary_color: form.secondary_color.trim() || null,
      accent_color: form.accent_color.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      address: form.address.trim() || null,
      instagram_url: form.instagram_url.trim() || null,
      facebook_url: form.facebook_url.trim() || null,
      linkedin_url: form.linkedin_url.trim() || null,
      opening_hours: form.opening_hours.trim() || null,
      institutional_image_url: form.institutional_image_url.trim() || null,
      footer_newsletter_title: form.footer_newsletter_title.trim() || null,
      footer_newsletter_text: form.footer_newsletter_text.trim() || null,
      footer_newsletter_button_label: form.footer_newsletter_button_label.trim() || null,
      footer_copyright_text: form.footer_copyright_text.trim() || null,
      footer_institutional_phrase: form.footer_institutional_phrase.trim() || null,
      youtube_url: form.youtube_url.trim() || null,
      footer_legal_text: form.footer_legal_text.trim() || null,
      copyright_text: form.copyright_text.trim() || null,
      copyright_year: form.copyright_year.trim() || null,
      default_whatsapp_message: form.default_whatsapp_message.trim() || null,
      leasing_whatsapp_message: form.leasing_whatsapp_message.trim() || null,
      planning_whatsapp_message: form.planning_whatsapp_message.trim() || null,
      hotel_whatsapp_message: form.hotel_whatsapp_message.trim() || null,
      business_center_whatsapp_message: form.business_center_whatsapp_message.trim() || null,
      login_title: form.login_title.trim() || null,
      login_subtitle: form.login_subtitle.trim() || null,
      login_image_url: form.login_image_url.trim() || null,
      default_og_image_url: form.default_og_image_url.trim() || null,
      google_analytics_id: form.google_analytics_id.trim() || null,
      google_tag_manager_id: form.google_tag_manager_id.trim() || null,
      meta_pixel_id: form.meta_pixel_id.trim() || null,
      custom_head_scripts: form.custom_head_scripts.trim() || null,
      custom_body_scripts: form.custom_body_scripts.trim() || null,
    });

    if (!result.error) {
      setDraft({});
    }
  };

  return (
    <>
      <SEO
        title="Configuracoes do Site | CMS Mega Polo Moda"
        description="Gerencie identidade visual, contatos, WhatsApp, SEO e configuracoes globais do portal Mega Polo Moda."
      />

      <AdminPageHeader
        title="Configuracoes do Site"
        description="Edite os dados globais do portal sem alterar codigo."
        actions={
          <button
            type="button"
            onClick={() => {
              clearStatus();
              setDraft({});
              void refreshSettings();
            }}
            className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
          >
            Recarregar
          </button>
        }
      />

      {isLoading && <AdminLoadingState label="Carregando configuracoes do site..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshSettings()} />}

      {!isLoading && !error && (
        <div className="space-y-6">
          {!isSupabaseEnabled && (
            <AdminEmptyState
              title="Supabase nao configurado"
              description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para persistir as configuracoes no banco."
            />
          )}

          {statusMessage && (
            <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/70 p-4 text-sm text-brand-dark/80">
              {statusMessage}
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" />
              {successMessage}
            </div>
          )}

          <div className="rounded-2xl border border-brand-dark/10 bg-white p-2 overflow-x-auto">
            <div className="flex items-center gap-2 min-w-max">
              {SETTINGS_TABS.map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-brand transition-colors ${
                      isActive
                        ? 'bg-brand-red text-white'
                        : 'text-brand-dark/70 hover:bg-brand-paper'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {activeTab === 'identidade' && (
              <AdminCard
                title="Identidade"
                description="Nome do site, cores e ativos visuais institucionais."
              >
                <AdminFormSection title="Dados institucionais">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="site-name" className={labelClassName}>
                        Nome do site
                      </label>
                      <input
                        id="site-name"
                        type="text"
                        value={form.site_name}
                        onChange={(e) => handleFieldChange('site_name', e.target.value)}
                        className={inputClassName}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="opening-hours" className={labelClassName}>
                        Horario de funcionamento
                      </label>
                      <input
                        id="opening-hours"
                        type="text"
                        value={form.opening_hours}
                        onChange={(e) => handleFieldChange('opening_hours', e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="short-description" className={labelClassName}>
                      Texto curto institucional
                    </label>
                    <textarea
                      id="short-description"
                      rows={3}
                      value={form.short_description}
                      onChange={(e) => handleFieldChange('short_description', e.target.value)}
                      className={textareaClassName}
                    />
                  </div>
                </AdminFormSection>

                <AdminFormSection title="Cores" className="mt-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="primary-color" className={labelClassName}>
                        Cor primaria
                      </label>
                      <input
                        id="primary-color"
                        type="color"
                        value={form.primary_color || '#E30613'}
                        onChange={(e) => handleFieldChange('primary_color', e.target.value)}
                        className="w-full h-12 rounded-xl border border-brand-dark/15 bg-white p-1 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="secondary-color" className={labelClassName}>
                        Cor secundaria
                      </label>
                      <input
                        id="secondary-color"
                        type="color"
                        value={form.secondary_color || '#1A1A1A'}
                        onChange={(e) => handleFieldChange('secondary_color', e.target.value)}
                        className="w-full h-12 rounded-xl border border-brand-dark/15 bg-white p-1 cursor-pointer"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="accent-color" className={labelClassName}>
                        Cor de destaque
                      </label>
                      <input
                        id="accent-color"
                        type="color"
                        value={form.accent_color || '#D4AF37'}
                        onChange={(e) => handleFieldChange('accent_color', e.target.value)}
                        className="w-full h-12 rounded-xl border border-brand-dark/15 bg-white p-1 cursor-pointer"
                      />
                    </div>
                  </div>
                </AdminFormSection>

                <AdminFormSection title="Logo, favicon e imagem institucional" className="mt-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div className="space-y-3">
                      <p className={labelClassName}>Logo</p>
                      <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/60 p-3">
                        <ImageWithFallback
                          src={form.logo_url || ''}
                          alt={`${form.site_name} - Logo`}
                          className="w-full h-28 object-contain"
                        />
                      </div>
                      <input
                        type="text"
                        value={form.logo_url}
                        onChange={(e) => handleFieldChange('logo_url', e.target.value)}
                        placeholder="URL da logo"
                        className={inputClassName}
                      />
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
                        {uploadingLogo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload logo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              void handleFileUpload(file, 'logo');
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="space-y-3">
                      <p className={labelClassName}>Favicon</p>
                      <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/60 p-3 h-[140px] flex items-center justify-center">
                        {form.favicon_url ? (
                          <ImageWithFallback
                            src={form.favicon_url}
                            alt="Favicon do site"
                            className="w-14 h-14 object-contain"
                            loading="lazy"
                            width={56}
                            height={56}
                          />
                        ) : (
                          <ImagePlus className="w-7 h-7 text-brand-dark/40" />
                        )}
                      </div>
                      <input
                        type="text"
                        value={form.favicon_url}
                        onChange={(e) => handleFieldChange('favicon_url', e.target.value)}
                        placeholder="URL do favicon"
                        className={inputClassName}
                      />
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
                        {uploadingFavicon ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload favicon
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              void handleFileUpload(file, 'favicon');
                            }
                          }}
                        />
                      </label>
                    </div>

                    <div className="space-y-3">
                      <p className={labelClassName}>Imagem institucional</p>
                      <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/60 p-3">
                        <ImageWithFallback
                          src={form.institutional_image_url || ''}
                          alt={`${form.site_name} - Imagem institucional`}
                          className="w-full h-28 object-cover rounded-lg"
                        />
                      </div>
                      <input
                        type="text"
                        value={form.institutional_image_url}
                        onChange={(e) => handleFieldChange('institutional_image_url', e.target.value)}
                        placeholder="URL da imagem institucional"
                        className={inputClassName}
                      />
                      <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
                        {uploadingInstitutional ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                        Upload imagem
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              void handleFileUpload(file, 'institutional');
                            }
                          }}
                        />
                      </label>
                    </div>
                  </div>
                </AdminFormSection>
              </AdminCard>
            )}

            {activeTab === 'contatos' && (
              <AdminCard title="Contatos" description="Canais de contato principais exibidos no site.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="site-whatsapp" className={labelClassName}>
                      WhatsApp principal
                    </label>
                    <input
                      id="site-whatsapp"
                      type="text"
                      value={form.whatsapp}
                      onChange={(e) => handleFieldChange('whatsapp', e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="site-phone" className={labelClassName}>
                      Telefone
                    </label>
                    <input
                      id="site-phone"
                      type="text"
                      value={form.phone}
                      onChange={(e) => handleFieldChange('phone', e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="site-email" className={labelClassName}>
                      E-mail
                    </label>
                    <input
                      id="site-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleFieldChange('email', e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="site-address" className={labelClassName}>
                      Endereco
                    </label>
                    <input
                      id="site-address"
                      type="text"
                      value={form.address}
                      onChange={(e) => handleFieldChange('address', e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>
              </AdminCard>
            )}

            {activeTab === 'redes' && (
              <AdminCard title="Redes sociais" description="Links institucionais de redes sociais.">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="site-instagram" className={labelClassName}>
                      Instagram
                    </label>
                    <input
                      id="site-instagram"
                      type="url"
                      value={form.instagram_url}
                      onChange={(e) => handleFieldChange('instagram_url', e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="site-facebook" className={labelClassName}>
                      Facebook
                    </label>
                    <input
                      id="site-facebook"
                      type="url"
                      value={form.facebook_url}
                      onChange={(e) => handleFieldChange('facebook_url', e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="site-linkedin" className={labelClassName}>
                      LinkedIn
                    </label>
                    <input
                      id="site-linkedin"
                      type="url"
                      value={form.linkedin_url}
                      onChange={(e) => handleFieldChange('linkedin_url', e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="site-youtube" className={labelClassName}>
                      YouTube
                    </label>
                    <input
                      id="site-youtube"
                      type="url"
                      value={form.youtube_url}
                      onChange={(e) => handleFieldChange('youtube_url', e.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>
              </AdminCard>
            )}

            {activeTab === 'whatsapp' && (
              <AdminCard
                title="Mensagens de WhatsApp"
                description="Mensagens padrao utilizadas em botoes e links de contato do site."
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="default-whatsapp-message" className={labelClassName}>
                      Mensagem padrao
                    </label>
                    <textarea
                      id="default-whatsapp-message"
                      rows={2}
                      value={form.default_whatsapp_message}
                      onChange={(e) => handleFieldChange('default_whatsapp_message', e.target.value)}
                      className={textareaClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="leasing-whatsapp-message" className={labelClassName}>
                      Mensagem de locacao
                    </label>
                    <textarea
                      id="leasing-whatsapp-message"
                      rows={2}
                      value={form.leasing_whatsapp_message}
                      onChange={(e) => handleFieldChange('leasing_whatsapp_message', e.target.value)}
                      className={textareaClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="planning-whatsapp-message" className={labelClassName}>
                      Mensagem de planejamento
                    </label>
                    <textarea
                      id="planning-whatsapp-message"
                      rows={2}
                      value={form.planning_whatsapp_message}
                      onChange={(e) => handleFieldChange('planning_whatsapp_message', e.target.value)}
                      className={textareaClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="hotel-whatsapp-message" className={labelClassName}>
                      Mensagem do hotel
                    </label>
                    <textarea
                      id="hotel-whatsapp-message"
                      rows={2}
                      value={form.hotel_whatsapp_message}
                      onChange={(e) => handleFieldChange('hotel_whatsapp_message', e.target.value)}
                      className={textareaClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="business-center-whatsapp-message" className={labelClassName}>
                      Mensagem do centro empresarial
                    </label>
                    <textarea
                      id="business-center-whatsapp-message"
                      rows={2}
                      value={form.business_center_whatsapp_message}
                      onChange={(e) =>
                        handleFieldChange('business_center_whatsapp_message', e.target.value)
                      }
                      className={textareaClassName}
                    />
                  </div>
                </div>
              </AdminCard>
            )}

            {activeTab === 'seo' && (
              <AdminCard title="SEO global" description="Padrao global para title, description e Open Graph.">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="default-og-image-url" className={labelClassName}>
                      Imagem OG padrao
                    </label>
                    <input
                      id="default-og-image-url"
                      type="url"
                      value={form.default_og_image_url}
                      onChange={(e) => handleFieldChange('default_og_image_url', e.target.value)}
                      className={inputClassName}
                      placeholder="https://..."
                    />
                  </div>

                  <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/60 p-4 space-y-2">
                    <p className="text-[11px] tracking-brand font-bold uppercase text-brand-dark/60">
                      Preview base do Google
                    </p>
                    <p className="text-blue-700 text-lg leading-snug">{form.site_name}</p>
                    <p className="text-xs text-emerald-700 truncate">https://www.seudominio.com.br/</p>
                    <p className="text-sm text-brand-dark/70 line-clamp-2">{form.short_description}</p>
                  </div>
                </div>
              </AdminCard>
            )}

            {activeTab === 'login' && (
              <AdminCard title="Login" description="Textos e imagem exibidos na tela de login administrativo.">
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="login-title" className={labelClassName}>
                        Titulo do login
                      </label>
                      <input
                        id="login-title"
                        type="text"
                        value={form.login_title}
                        onChange={(e) => handleFieldChange('login_title', e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="login-subtitle" className={labelClassName}>
                        Subtitulo do login
                      </label>
                      <input
                        id="login-subtitle"
                        type="text"
                        value={form.login_subtitle}
                        onChange={(e) => handleFieldChange('login_subtitle', e.target.value)}
                        className={inputClassName}
                      />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className={labelClassName}>Imagem da tela de login</p>
                    <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/60 p-3">
                      <ImageWithFallback
                        src={form.login_image_url || ''}
                        alt="Imagem da tela de login"
                        className="w-full h-28 object-contain"
                      />
                    </div>
                    <input
                      type="text"
                      value={form.login_image_url}
                      onChange={(e) => handleFieldChange('login_image_url', e.target.value)}
                      placeholder="URL da imagem"
                      className={inputClassName}
                    />
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
                      {uploadingLoginImage ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      Upload imagem de login
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            void handleFileUpload(file, 'login');
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              </AdminCard>
            )}

            {activeTab === 'scripts' && (
              <AdminCard
                title="Scripts e integracoes"
                description="IDs oficiais para analytics e campos reservados para scripts customizados."
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="google-analytics-id" className={labelClassName}>
                        Google Analytics ID
                      </label>
                      <input
                        id="google-analytics-id"
                        type="text"
                        value={form.google_analytics_id}
                        onChange={(e) => handleFieldChange('google_analytics_id', e.target.value)}
                        className={inputClassName}
                        placeholder="G-XXXXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="google-tag-manager-id" className={labelClassName}>
                        Google Tag Manager ID
                      </label>
                      <input
                        id="google-tag-manager-id"
                        type="text"
                        value={form.google_tag_manager_id}
                        onChange={(e) => handleFieldChange('google_tag_manager_id', e.target.value)}
                        className={inputClassName}
                        placeholder="GTM-XXXXXXX"
                      />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="meta-pixel-id" className={labelClassName}>
                        Meta Pixel ID
                      </label>
                      <input
                        id="meta-pixel-id"
                        type="text"
                        value={form.meta_pixel_id}
                        onChange={(e) => handleFieldChange('meta_pixel_id', e.target.value)}
                        className={inputClassName}
                        placeholder="1234567890"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="custom-head-scripts" className={labelClassName}>
                      Script customizado (head)
                    </label>
                    <textarea
                      id="custom-head-scripts"
                      rows={4}
                      value={form.custom_head_scripts}
                      onChange={(e) => handleFieldChange('custom_head_scripts', e.target.value)}
                      className={textareaClassName}
                      placeholder="Campo reservado para uso futuro controlado."
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="custom-body-scripts" className={labelClassName}>
                      Script customizado (body)
                    </label>
                    <textarea
                      id="custom-body-scripts"
                      rows={4}
                      value={form.custom_body_scripts}
                      onChange={(e) => handleFieldChange('custom_body_scripts', e.target.value)}
                      className={textareaClassName}
                      placeholder="Campo reservado para uso futuro controlado."
                    />
                  </div>

                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    Scripts livres nao sao injetados automaticamente no front nesta etapa por seguranca.
                    Use os campos de IDs (GA, GTM e Pixel). A injecao controlada pode ser habilitada em uma
                    etapa futura com whitelist e sanitizacao.
                  </div>
                </div>
              </AdminCard>
            )}

            {activeTab === 'legal' && (
              <AdminCard
                title="Legal e Copyright"
                description="Textos institucionais finais e configuracoes legais do rodape."
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="copyright-text" className={labelClassName}>
                      Copyright (texto principal)
                    </label>
                    <input
                      id="copyright-text"
                      type="text"
                      value={form.copyright_text}
                      onChange={(e) => handleFieldChange('copyright_text', e.target.value)}
                      className={inputClassName}
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="copyright-year" className={labelClassName}>
                      Ano do copyright
                    </label>
                    <input
                      id="copyright-year"
                      type="text"
                      value={form.copyright_year}
                      onChange={(e) => handleFieldChange('copyright_year', e.target.value)}
                      className={inputClassName}
                      placeholder="2026"
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="footer-newsletter-title" className={labelClassName}>
                      Titulo da newsletter do rodape
                    </label>
                    <input
                      id="footer-newsletter-title"
                      type="text"
                      value={form.footer_newsletter_title}
                      onChange={(e) => handleFieldChange('footer_newsletter_title', e.target.value)}
                      className={inputClassName}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="footer-newsletter-button-label" className={labelClassName}>
                      Texto do botao da newsletter
                    </label>
                    <input
                      id="footer-newsletter-button-label"
                      type="text"
                      value={form.footer_newsletter_button_label}
                      onChange={(e) =>
                        handleFieldChange('footer_newsletter_button_label', e.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="footer-newsletter-text" className={labelClassName}>
                      Texto da newsletter do rodape
                    </label>
                    <textarea
                      id="footer-newsletter-text"
                      rows={3}
                      value={form.footer_newsletter_text}
                      onChange={(e) => handleFieldChange('footer_newsletter_text', e.target.value)}
                      className={textareaClassName}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="footer-copyright-text" className={labelClassName}>
                      Copyright legado do rodape
                    </label>
                    <input
                      id="footer-copyright-text"
                      type="text"
                      value={form.footer_copyright_text}
                      onChange={(e) => handleFieldChange('footer_copyright_text', e.target.value)}
                      className={inputClassName}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="footer-institutional-phrase" className={labelClassName}>
                      Frase institucional final
                    </label>
                    <input
                      id="footer-institutional-phrase"
                      type="text"
                      value={form.footer_institutional_phrase}
                      onChange={(e) =>
                        handleFieldChange('footer_institutional_phrase', e.target.value)
                      }
                      className={inputClassName}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <label htmlFor="footer-legal-text" className={labelClassName}>
                      Texto legal curto
                    </label>
                    <textarea
                      id="footer-legal-text"
                      rows={2}
                      value={form.footer_legal_text}
                      onChange={(e) => handleFieldChange('footer_legal_text', e.target.value)}
                      className={textareaClassName}
                    />
                  </div>
                </div>
              </AdminCard>
            )}

            <div className="flex items-center justify-end">
              <button
                type="submit"
                disabled={saveDisabled}
                className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {isSaving ? 'Salvando...' : 'Salvar configuracoes'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
