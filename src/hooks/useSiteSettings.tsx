import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FALLBACK_SITE_SETTINGS } from '../config/siteSettingsFallback';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  getSiteSettings,
  updateSiteSettings,
  uploadFavicon,
  uploadInstitutionalImage,
  uploadLoginImage,
  uploadLogo,
  type SiteAssetUploadResult,
  type SiteSettingsUpdatePayload,
} from '../services/siteSettings.service';
import type { SiteSettings } from '../types/cms';

export interface ResolvedSiteSettings {
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
  seo_base_url: string;
  seo_default_robots: string;
  seo_default_language: string;
  seo_keywords: string;
}

interface SiteSettingsContextValue {
  settings: ResolvedSiteSettings;
  rawSettings: SiteSettings | null;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  successMessage: string | null;
  hasRemoteData: boolean;
  isSupabaseEnabled: boolean;
  refreshSettings: () => Promise<void>;
  saveSettings: (payload: SiteSettingsUpdatePayload) => Promise<{ error: string | null }>;
  uploadLogoFile: (file: File) => Promise<{ data: SiteAssetUploadResult | null; error: string | null }>;
  uploadFaviconFile: (file: File) => Promise<{ data: SiteAssetUploadResult | null; error: string | null }>;
  uploadInstitutionalFile: (file: File) => Promise<{ data: SiteAssetUploadResult | null; error: string | null }>;
  uploadLoginImageFile: (file: File) => Promise<{ data: SiteAssetUploadResult | null; error: string | null }>;
  clearStatus: () => void;
}

const SiteSettingsContext = createContext<SiteSettingsContextValue | undefined>(undefined);

function mergeWithFallback(data: SiteSettings | null): ResolvedSiteSettings {
  return {
    site_name: data?.site_name?.trim() || FALLBACK_SITE_SETTINGS.site_name,
    short_description: data?.short_description?.trim() || FALLBACK_SITE_SETTINGS.short_description,
    logo_url: data?.logo_url?.trim() || FALLBACK_SITE_SETTINGS.logo_url,
    favicon_url: data?.favicon_url?.trim() || FALLBACK_SITE_SETTINGS.favicon_url,
    primary_color: data?.primary_color?.trim() || FALLBACK_SITE_SETTINGS.primary_color,
    secondary_color: data?.secondary_color?.trim() || FALLBACK_SITE_SETTINGS.secondary_color,
    accent_color: data?.accent_color?.trim() || FALLBACK_SITE_SETTINGS.accent_color,
    whatsapp: data?.whatsapp?.trim() || FALLBACK_SITE_SETTINGS.whatsapp,
    email: data?.email?.trim() || FALLBACK_SITE_SETTINGS.email,
    phone: data?.phone?.trim() || FALLBACK_SITE_SETTINGS.phone,
    address: data?.address?.trim() || FALLBACK_SITE_SETTINGS.address,
    instagram_url: data?.instagram_url?.trim() || FALLBACK_SITE_SETTINGS.instagram_url,
    facebook_url: data?.facebook_url?.trim() || FALLBACK_SITE_SETTINGS.facebook_url,
    linkedin_url: data?.linkedin_url?.trim() || FALLBACK_SITE_SETTINGS.linkedin_url,
    opening_hours: data?.opening_hours?.trim() || FALLBACK_SITE_SETTINGS.opening_hours,
    institutional_image_url:
      data?.institutional_image_url?.trim() || FALLBACK_SITE_SETTINGS.institutional_image_url,
    footer_newsletter_title:
      data?.footer_newsletter_title?.trim() || FALLBACK_SITE_SETTINGS.footer_newsletter_title,
    footer_newsletter_text:
      data?.footer_newsletter_text?.trim() || FALLBACK_SITE_SETTINGS.footer_newsletter_text,
    footer_newsletter_button_label:
      data?.footer_newsletter_button_label?.trim() || FALLBACK_SITE_SETTINGS.footer_newsletter_button_label,
    footer_copyright_text:
      data?.footer_copyright_text?.trim() || FALLBACK_SITE_SETTINGS.footer_copyright_text,
    footer_institutional_phrase:
      data?.footer_institutional_phrase?.trim() || FALLBACK_SITE_SETTINGS.footer_institutional_phrase,
    youtube_url: data?.youtube_url?.trim() || FALLBACK_SITE_SETTINGS.youtube_url,
    footer_legal_text:
      data?.footer_legal_text?.trim() || FALLBACK_SITE_SETTINGS.footer_legal_text,
    copyright_text:
      data?.copyright_text?.trim() || data?.footer_copyright_text?.trim() || FALLBACK_SITE_SETTINGS.copyright_text,
    copyright_year: data?.copyright_year?.trim() || FALLBACK_SITE_SETTINGS.copyright_year,
    default_whatsapp_message:
      data?.default_whatsapp_message?.trim() || FALLBACK_SITE_SETTINGS.default_whatsapp_message,
    leasing_whatsapp_message:
      data?.leasing_whatsapp_message?.trim() || FALLBACK_SITE_SETTINGS.leasing_whatsapp_message,
    planning_whatsapp_message:
      data?.planning_whatsapp_message?.trim() || FALLBACK_SITE_SETTINGS.planning_whatsapp_message,
    hotel_whatsapp_message:
      data?.hotel_whatsapp_message?.trim() || FALLBACK_SITE_SETTINGS.hotel_whatsapp_message,
    business_center_whatsapp_message:
      data?.business_center_whatsapp_message?.trim() || FALLBACK_SITE_SETTINGS.business_center_whatsapp_message,
    login_title: data?.login_title?.trim() || FALLBACK_SITE_SETTINGS.login_title,
    login_subtitle: data?.login_subtitle?.trim() || FALLBACK_SITE_SETTINGS.login_subtitle,
    login_image_url:
      data?.login_image_url?.trim() ||
      data?.logo_url?.trim() ||
      FALLBACK_SITE_SETTINGS.login_image_url,
    default_og_image_url:
      data?.default_og_image_url?.trim() ||
      data?.institutional_image_url?.trim() ||
      data?.logo_url?.trim() ||
      FALLBACK_SITE_SETTINGS.default_og_image_url,
    google_analytics_id:
      data?.google_analytics_id?.trim() || FALLBACK_SITE_SETTINGS.google_analytics_id,
    google_tag_manager_id:
      data?.google_tag_manager_id?.trim() || FALLBACK_SITE_SETTINGS.google_tag_manager_id,
    meta_pixel_id: data?.meta_pixel_id?.trim() || FALLBACK_SITE_SETTINGS.meta_pixel_id,
    custom_head_scripts:
      data?.custom_head_scripts?.trim() || FALLBACK_SITE_SETTINGS.custom_head_scripts,
    custom_body_scripts:
      data?.custom_body_scripts?.trim() || FALLBACK_SITE_SETTINGS.custom_body_scripts,
    seo_base_url: data?.seo_base_url?.trim() || FALLBACK_SITE_SETTINGS.seo_base_url,
    seo_default_robots:
      data?.seo_default_robots?.trim() || FALLBACK_SITE_SETTINGS.seo_default_robots,
    seo_default_language:
      data?.seo_default_language?.trim() || FALLBACK_SITE_SETTINGS.seo_default_language,
    seo_keywords: data?.seo_keywords?.trim() || FALLBACK_SITE_SETTINGS.seo_keywords,
  };
}

export function SiteSettingsProvider({ children }: { children: React.ReactNode }) {
  const [rawSettings, setRawSettings] = useState<SiteSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshSettings = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setRawSettings(null);
      setError(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const result = await getSiteSettings();

    if (result.error) {
      setError(result.error);
      setRawSettings(null);
      setIsLoading(false);
      return;
    }

    setError(null);
    setRawSettings(result.data);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refreshSettings();
  }, [refreshSettings]);

  const settings = useMemo(() => mergeWithFallback(rawSettings), [rawSettings]);

  useEffect(() => {
    document.documentElement.style.setProperty('--color-brand-red', settings.primary_color);
    document.documentElement.style.setProperty('--color-brand-dark', settings.secondary_color);
    document.documentElement.style.setProperty('--color-brand-gold', settings.accent_color);
  }, [settings.accent_color, settings.primary_color, settings.secondary_color]);

  useEffect(() => {
    document.documentElement.setAttribute('data-seo-site-name', settings.site_name);
    document.documentElement.setAttribute('data-seo-site-description', settings.short_description);
    document.documentElement.setAttribute('data-seo-default-og-image', settings.default_og_image_url);
    document.documentElement.setAttribute('data-seo-default-robots', settings.seo_default_robots);
    document.documentElement.setAttribute('data-seo-default-language', settings.seo_default_language);
    document.documentElement.setAttribute('data-seo-default-keywords', settings.seo_keywords);
    document.documentElement.setAttribute('data-seo-base-url', settings.seo_base_url);
    document.documentElement.lang = settings.seo_default_language || 'pt-BR';
  }, [
    settings.default_og_image_url,
    settings.seo_base_url,
    settings.seo_default_language,
    settings.seo_default_robots,
    settings.seo_keywords,
    settings.short_description,
    settings.site_name,
  ]);

  useEffect(() => {
    if (!settings.favicon_url) {
      return;
    }

    const existing = document.querySelector('link[rel="icon"]') as HTMLLinkElement | null;
    if (existing) {
      existing.href = settings.favicon_url;
      return;
    }

    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = settings.favicon_url;
    document.head.appendChild(link);
  }, [settings.favicon_url]);

  const saveSettings = useCallback(
    async (payload: SiteSettingsUpdatePayload) => {
      setIsSaving(true);
      setError(null);
      setSuccessMessage(null);

      const result = await updateSiteSettings(payload);

      setIsSaving(false);

      if (result.error) {
        setError(result.error);
        return { error: result.error };
      }

      setRawSettings(result.data);
      setSuccessMessage('Configurações salvas com sucesso.');
      return { error: null };
    },
    [],
  );

  const uploadLogoFile = useCallback(async (file: File) => {
    const result = await uploadLogo(file);
    return { data: result.data, error: result.error };
  }, []);

  const uploadFaviconFile = useCallback(async (file: File) => {
    const result = await uploadFavicon(file);
    return { data: result.data, error: result.error };
  }, []);

  const uploadInstitutionalFile = useCallback(async (file: File) => {
    const result = await uploadInstitutionalImage(file);
    return { data: result.data, error: result.error };
  }, []);

  const uploadLoginImageFile = useCallback(async (file: File) => {
    const result = await uploadLoginImage(file);
    return { data: result.data, error: result.error };
  }, []);

  const clearStatus = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const value = useMemo<SiteSettingsContextValue>(
    () => ({
      settings,
      rawSettings,
      isLoading,
      isSaving,
      error,
      successMessage,
      hasRemoteData: !!rawSettings,
      isSupabaseEnabled: isSupabaseConfigured,
      refreshSettings,
      saveSettings,
      uploadLogoFile,
      uploadFaviconFile,
      uploadInstitutionalFile,
      uploadLoginImageFile,
      clearStatus,
    }),
    [
      settings,
      rawSettings,
      isLoading,
      isSaving,
      error,
      successMessage,
      refreshSettings,
      saveSettings,
      uploadLogoFile,
      uploadFaviconFile,
      uploadInstitutionalFile,
      uploadLoginImageFile,
      clearStatus,
    ],
  );

  return <SiteSettingsContext.Provider value={value}>{children}</SiteSettingsContext.Provider>;
}

export function useSiteSettings() {
  const context = useContext(SiteSettingsContext);

  if (!context) {
    throw new Error('useSiteSettings deve ser usado dentro de SiteSettingsProvider.');
  }

  return context;
}
