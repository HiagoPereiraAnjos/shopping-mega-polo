-- 20260526120000_site_settings_global_fields.sql
-- Expande site_settings com campos globais de SEO, login, WhatsApp e legal.

begin;

alter table public.site_settings
  add column if not exists youtube_url text,
  add column if not exists copyright_text text,
  add column if not exists copyright_year text,
  add column if not exists default_whatsapp_message text,
  add column if not exists leasing_whatsapp_message text,
  add column if not exists planning_whatsapp_message text,
  add column if not exists hotel_whatsapp_message text,
  add column if not exists business_center_whatsapp_message text,
  add column if not exists login_title text,
  add column if not exists login_subtitle text,
  add column if not exists login_image_url text,
  add column if not exists default_og_image_url text,
  add column if not exists google_analytics_id text,
  add column if not exists google_tag_manager_id text,
  add column if not exists meta_pixel_id text,
  add column if not exists custom_head_scripts text,
  add column if not exists custom_body_scripts text;

update public.site_settings
set
  copyright_text = coalesce(nullif(copyright_text, ''), nullif(footer_copyright_text, ''), site_name),
  copyright_year = coalesce(nullif(copyright_year, ''), to_char(now(), 'YYYY')),
  default_whatsapp_message = coalesce(
    nullif(default_whatsapp_message, ''),
    'Olá, gostaria de mais informações sobre o Mega Polo Moda.'
  ),
  leasing_whatsapp_message = coalesce(
    nullif(leasing_whatsapp_message, ''),
    'Olá, tenho interesse em abrir uma loja no Mega Polo Moda e gostaria de mais informações.'
  ),
  planning_whatsapp_message = coalesce(
    nullif(planning_whatsapp_message, ''),
    'Olá, gostaria de mais informações sobre o planejamento de visita ao Mega Polo Moda.'
  ),
  hotel_whatsapp_message = coalesce(
    nullif(hotel_whatsapp_message, ''),
    'Olá, gostaria de informações sobre hospedagem no Hotel Mega Polo.'
  ),
  business_center_whatsapp_message = coalesce(
    nullif(business_center_whatsapp_message, ''),
    'Olá, gostaria de informações sobre o Centro Empresarial do Mega Polo Moda.'
  ),
  login_title = coalesce(nullif(login_title, ''), 'Área do Lojista'),
  login_subtitle = coalesce(
    nullif(login_subtitle, ''),
    'Acesse para gerenciar sua loja, lançamentos e informações comerciais.'
  ),
  default_og_image_url = coalesce(
    nullif(default_og_image_url, ''),
    nullif(institutional_image_url, ''),
    nullif(logo_url, '')
  );

commit;
