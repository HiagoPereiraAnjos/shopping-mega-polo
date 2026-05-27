import { supabase, supabaseConfigMessage } from '../lib/supabase';
import { logActivity } from '../lib/logActivity';
import {
  FALLBACK_SITE_SETTINGS,
  SITE_SETTINGS_INSTITUTIONAL_BUCKET,
  SITE_SETTINGS_STORAGE_BUCKET,
} from '../config/siteSettingsFallback';
import type { CmsServiceResult, SiteSettings, SiteSettingsUpsert } from '../types/cms';
import type { Database } from '../types/database';

export interface SiteAssetUploadResult {
  path: string;
  publicUrl: string;
}

export interface SiteSettingsUpdatePayload extends SiteSettingsUpsert {
  institutional_image_url?: string | null;
}

type SiteSettingsInsert = Database['public']['Tables']['site_settings']['Insert'];

const SCRIPT_SETTING_FIELDS = new Set<keyof SiteSettingsUpdatePayload>([
  'google_analytics_id',
  'google_tag_manager_id',
  'meta_pixel_id',
  'custom_head_scripts',
  'custom_body_scripts',
]);

const LOGIN_SETTING_FIELDS = new Set<keyof SiteSettingsUpdatePayload>([
  'login_title',
  'login_subtitle',
  'login_image_url',
  'copyright_text',
  'copyright_year',
]);

const WHATSAPP_SETTING_FIELDS = new Set<keyof SiteSettingsUpdatePayload>([
  'default_whatsapp_message',
  'leasing_whatsapp_message',
  'planning_whatsapp_message',
  'hotel_whatsapp_message',
  'business_center_whatsapp_message',
]);

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase não configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function sanitizeFileName(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-')
    .toLowerCase();
}

async function uploadSiteAsset(
  file: File,
  options: { bucket: string; prefix: string },
): Promise<CmsServiceResult<SiteAssetUploadResult>> {
  if (!supabase) {
    return missingConfigResult<SiteAssetUploadResult>();
  }

  const extension = file.name.includes('.')
    ? file.name.split('.').pop()?.toLowerCase() || 'png'
    : 'png';
  const safeName = sanitizeFileName(file.name.replace(/\.[^.]+$/, ''));
  const filePath = `${options.prefix}/${Date.now()}-${safeName}.${extension}`;

  const { error: uploadError } = await supabase.storage.from(options.bucket).upload(filePath, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || undefined,
  });

  if (uploadError) {
    return { data: null, error: uploadError.message };
  }

  const { data } = supabase.storage.from(options.bucket).getPublicUrl(filePath);

  return {
    data: {
      path: filePath,
      publicUrl: data.publicUrl,
    },
    error: null,
  };
}

export async function getSiteSettings(): Promise<CmsServiceResult<SiteSettings>> {
  if (!supabase) {
    return missingConfigResult<SiteSettings>();
  }

  const { data, error } = await supabase
    .from('site_settings')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { data: null, error: error.message };
  }

  return { data: data ?? null, error: null };
}

export async function updateSiteSettings(
  payload: SiteSettingsUpdatePayload,
): Promise<CmsServiceResult<SiteSettings>> {
  if (!supabase) {
    return missingConfigResult<SiteSettings>();
  }

  const { data: existing, error: existingError } = await supabase
    .from('site_settings')
    .select('id, site_name')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: existingError.message };
  }

  const normalizedPayload: SiteSettingsInsert = {
    ...payload,
    id: existing?.id ?? payload.id,
    site_name: payload.site_name?.trim() || existing?.site_name || FALLBACK_SITE_SETTINGS.site_name,
  };

  const { data, error } = await supabase
    .from('site_settings')
    .upsert(normalizedPayload, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    return { data: null, error: error.message };
  }

  const updatedFields = Object.keys(payload) as Array<keyof SiteSettingsUpdatePayload>;

  await logActivity({
    action: 'update_site_settings',
    entity: 'site_settings',
    entity_id: data.id,
    metadata: {
      updated_fields: updatedFields,
      updated_at: new Date().toISOString(),
    },
  });

  if (updatedFields.some((field) => SCRIPT_SETTING_FIELDS.has(field))) {
    await logActivity({
      action: 'update_global_scripts',
      entity: 'site_settings',
      entity_id: data.id,
      metadata: {
        updated_fields: updatedFields.filter((field) => SCRIPT_SETTING_FIELDS.has(field)),
      },
    });
  }

  if (updatedFields.some((field) => LOGIN_SETTING_FIELDS.has(field))) {
    await logActivity({
      action: 'update_login_settings',
      entity: 'site_settings',
      entity_id: data.id,
      metadata: {
        updated_fields: updatedFields.filter((field) => LOGIN_SETTING_FIELDS.has(field)),
      },
    });
  }

  if (updatedFields.some((field) => WHATSAPP_SETTING_FIELDS.has(field))) {
    await logActivity({
      action: 'update_whatsapp_messages',
      entity: 'site_settings',
      entity_id: data.id,
      metadata: {
        updated_fields: updatedFields.filter((field) => WHATSAPP_SETTING_FIELDS.has(field)),
      },
    });
  }

  return { data, error: null };
}

export async function uploadLogo(file: File): Promise<CmsServiceResult<SiteAssetUploadResult>> {
  return uploadSiteAsset(file, {
    bucket: SITE_SETTINGS_STORAGE_BUCKET,
    prefix: 'site-logo',
  });
}

export async function uploadFavicon(file: File): Promise<CmsServiceResult<SiteAssetUploadResult>> {
  return uploadSiteAsset(file, {
    bucket: SITE_SETTINGS_STORAGE_BUCKET,
    prefix: 'site-favicon',
  });
}

export async function uploadInstitutionalImage(
  file: File,
): Promise<CmsServiceResult<SiteAssetUploadResult>> {
  return uploadSiteAsset(file, {
    bucket: SITE_SETTINGS_INSTITUTIONAL_BUCKET,
    prefix: 'site-institutional',
  });
}

export async function uploadLoginImage(
  file: File,
): Promise<CmsServiceResult<SiteAssetUploadResult>> {
  return uploadSiteAsset(file, {
    bucket: SITE_SETTINGS_INSTITUTIONAL_BUCKET,
    prefix: 'site-login',
  });
}
