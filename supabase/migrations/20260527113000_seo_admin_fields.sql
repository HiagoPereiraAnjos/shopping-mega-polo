-- SEO global settings and page-level SEO controls
alter table if exists public.site_settings
  add column if not exists seo_base_url text,
  add column if not exists seo_default_robots text default 'index,follow',
  add column if not exists seo_default_language text default 'pt-BR',
  add column if not exists seo_keywords text;

update public.site_settings
set
  seo_default_robots = coalesce(nullif(seo_default_robots, ''), 'index,follow'),
  seo_default_language = coalesce(nullif(seo_default_language, ''), 'pt-BR')
where true;

alter table if exists public.pages
  add column if not exists og_title text,
  add column if not exists og_description text,
  add column if not exists canonical_url text,
  add column if not exists robots_index boolean default true,
  add column if not exists robots_follow boolean default true;

update public.pages
set
  robots_index = coalesce(robots_index, true),
  robots_follow = coalesce(robots_follow, true)
where true;
