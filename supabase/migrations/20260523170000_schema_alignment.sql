-- 001_initial_schema.sql
-- Mega Polo Moda CMS: initial schema, RLS and storage policies

begin;
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
create table if not exists public.site_settings (
  id uuid primary key default gen_random_uuid(),
  site_name text not null,
  short_description text,
  logo_url text,
  favicon_url text,
  primary_color text,
  secondary_color text,
  accent_color text,
  whatsapp text,
  email text,
  phone text,
  address text,
  instagram_url text,
  facebook_url text,
  linkedin_url text,
  opening_hours text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.pages (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  title text not null,
  subtitle text,
  content text,
  hero_image_url text,
  seo_title text,
  seo_description text,
  og_image_url text,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.home_sections (
  id uuid primary key default gen_random_uuid(),
  section_key text unique not null,
  title text,
  subtitle text,
  content text,
  image_url text,
  button_label text,
  button_url text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  icon text,
  color text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  description text,
  category_id uuid references public.categories(id) on delete set null,
  segment text,
  floor text,
  store_number text,
  whatsapp text,
  phone text,
  email text,
  instagram text,
  website text,
  logo_url text,
  banner_url text,
  tags text[] default '{}'::text[],
  seo_title text,
  seo_description text,
  og_image_url text,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.store_products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  name text not null,
  description text,
  image_url text,
  category text,
  price numeric(10,2),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.store_media (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  media_url text not null,
  media_type text not null,
  title text,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.catalogs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  file_url text not null,
  file_size bigint,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.launches (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  title text not null,
  description text,
  image_url text,
  category_id uuid references public.categories(id) on delete set null,
  price numeric(10,2),
  publish_date timestamptz,
  expiration_date timestamptz,
  seo_title text,
  seo_description text,
  og_image_url text,
  is_featured boolean not null default false,
  is_published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  name text not null,
  email text,
  phone text,
  company text,
  cnpj text,
  segment text,
  message text,
  source_page text,
  status text not null default 'novo' check (status in ('novo', 'em_atendimento', 'proposta_enviada', 'visita_agendada', 'fechado', 'perdido')),
  internal_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  name text,
  status text not null default 'active',
  consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.admin_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique not null references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'viewer' check (role in ('super_admin', 'admin', 'editor', 'viewer')),
  avatar_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity text not null,
  entity_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
-- Compatibility adjustments for databases that already applied older migrations.
alter table public.site_settings add column if not exists short_description text;
alter table public.home_sections alter column title drop not null;
alter table public.stores add column if not exists seo_title text;
alter table public.stores add column if not exists seo_description text;
alter table public.stores add column if not exists og_image_url text;
alter table public.store_media add column if not exists updated_at timestamptz;
update public.store_media set updated_at = now() where updated_at is null;
alter table public.store_media alter column updated_at set default now();
alter table public.store_media alter column updated_at set not null;
alter table public.launches alter column store_id drop not null;
alter table public.launches add column if not exists seo_title text;
alter table public.launches add column if not exists seo_description text;
alter table public.launches add column if not exists og_image_url text;
alter table public.leads alter column email drop not null;
alter table public.leads alter column phone drop not null;
alter table public.leads alter column message drop not null;
alter table public.leads alter column status set default 'novo';
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'leads_status_check'
      and conrelid = 'public.leads'::regclass
  ) then
    alter table public.leads
      add constraint leads_status_check
      check (status in ('novo', 'em_atendimento', 'proposta_enviada', 'visita_agendada', 'fechado', 'perdido'));
  end if;
end $$;
alter table public.newsletter_subscribers add column if not exists updated_at timestamptz;
update public.newsletter_subscribers set updated_at = now() where updated_at is null;
alter table public.newsletter_subscribers alter column updated_at set default now();
alter table public.newsletter_subscribers alter column updated_at set not null;
alter table public.newsletter_subscribers alter column consent set default false;
alter table public.admin_profiles add column if not exists is_active boolean;
update public.admin_profiles set is_active = true where is_active is null;
alter table public.admin_profiles alter column is_active set default true;
alter table public.admin_profiles alter column is_active set not null;
alter table public.admin_profiles alter column role set default 'viewer';
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'admin_profiles_role_check'
      and conrelid = 'public.admin_profiles'::regclass
  ) then
    alter table public.admin_profiles
      add constraint admin_profiles_role_check
      check (role in ('super_admin', 'admin', 'editor', 'viewer'));
  end if;
end $$;
create index if not exists idx_stores_slug on public.stores(slug);
create index if not exists idx_stores_category_id on public.stores(category_id);
create index if not exists idx_stores_is_published on public.stores(is_published);
create index if not exists idx_stores_is_featured on public.stores(is_featured);
create index if not exists idx_categories_slug on public.categories(slug);
create index if not exists idx_categories_is_active on public.categories(is_active);
create index if not exists idx_launches_store_id on public.launches(store_id);
create index if not exists idx_launches_category_id on public.launches(category_id);
create index if not exists idx_launches_is_published on public.launches(is_published);
create index if not exists idx_launches_is_featured on public.launches(is_featured);
create index if not exists idx_catalogs_store_id on public.catalogs(store_id);
create index if not exists idx_catalogs_is_active on public.catalogs(is_active);
create unique index if not exists idx_catalogs_unique_active_per_store on public.catalogs(store_id) where is_active = true;
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_type on public.leads(type);
create index if not exists idx_newsletter_email on public.newsletter_subscribers(email);
create index if not exists idx_admin_profiles_user_id on public.admin_profiles(user_id);
create index if not exists idx_admin_profiles_role on public.admin_profiles(role);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_activity_logs_entity on public.activity_logs(entity);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at);
drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at before update on public.site_settings
for each row execute function public.set_updated_at();
drop trigger if exists trg_pages_updated_at on public.pages;
create trigger trg_pages_updated_at before update on public.pages
for each row execute function public.set_updated_at();
drop trigger if exists trg_home_sections_updated_at on public.home_sections;
create trigger trg_home_sections_updated_at before update on public.home_sections
for each row execute function public.set_updated_at();
drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at before update on public.categories
for each row execute function public.set_updated_at();
drop trigger if exists trg_stores_updated_at on public.stores;
create trigger trg_stores_updated_at before update on public.stores
for each row execute function public.set_updated_at();
drop trigger if exists trg_store_products_updated_at on public.store_products;
create trigger trg_store_products_updated_at before update on public.store_products
for each row execute function public.set_updated_at();
drop trigger if exists trg_store_media_updated_at on public.store_media;
create trigger trg_store_media_updated_at before update on public.store_media
for each row execute function public.set_updated_at();
drop trigger if exists trg_catalogs_updated_at on public.catalogs;
create trigger trg_catalogs_updated_at before update on public.catalogs
for each row execute function public.set_updated_at();
drop trigger if exists trg_launches_updated_at on public.launches;
create trigger trg_launches_updated_at before update on public.launches
for each row execute function public.set_updated_at();
drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at before update on public.leads
for each row execute function public.set_updated_at();
drop trigger if exists trg_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger trg_newsletter_subscribers_updated_at before update on public.newsletter_subscribers
for each row execute function public.set_updated_at();
drop trigger if exists trg_admin_profiles_updated_at on public.admin_profiles;
create trigger trg_admin_profiles_updated_at before update on public.admin_profiles
for each row execute function public.set_updated_at();
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role in ('super_admin', 'admin', 'editor')
  );
$$;
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_profiles ap
    where ap.user_id = auth.uid()
      and ap.is_active = true
      and ap.role = 'super_admin'
  );
$$;
alter table public.site_settings enable row level security;
alter table public.pages enable row level security;
alter table public.home_sections enable row level security;
alter table public.categories enable row level security;
alter table public.stores enable row level security;
alter table public.store_products enable row level security;
alter table public.store_media enable row level security;
alter table public.catalogs enable row level security;
alter table public.launches enable row level security;
alter table public.leads enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.admin_profiles enable row level security;
alter table public.activity_logs enable row level security;
-- site_settings
drop policy if exists "site_settings_public_read" on public.site_settings;
create policy "site_settings_public_read"
on public.site_settings
for select
to anon, authenticated
using (true);
drop policy if exists "site_settings_admin_all" on public.site_settings;
create policy "site_settings_admin_all"
on public.site_settings
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
-- pages
drop policy if exists "pages_public_read_published" on public.pages;
create policy "pages_public_read_published"
on public.pages
for select
to anon, authenticated
using (is_published = true);
drop policy if exists "pages_admin_all" on public.pages;
create policy "pages_admin_all"
on public.pages
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
-- home_sections
drop policy if exists "home_sections_public_read_active" on public.home_sections;
create policy "home_sections_public_read_active"
on public.home_sections
for select
to anon, authenticated
using (is_active = true);
drop policy if exists "home_sections_admin_all" on public.home_sections;
create policy "home_sections_admin_all"
on public.home_sections
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
-- categories
drop policy if exists "categories_public_read_active" on public.categories;
create policy "categories_public_read_active"
on public.categories
for select
to anon, authenticated
using (is_active = true);
drop policy if exists "categories_admin_all" on public.categories;
create policy "categories_admin_all"
on public.categories
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
-- stores
drop policy if exists "stores_public_read_published" on public.stores;
create policy "stores_public_read_published"
on public.stores
for select
to anon, authenticated
using (is_published = true);
drop policy if exists "stores_admin_all" on public.stores;
create policy "stores_admin_all"
on public.stores
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
-- store_products
drop policy if exists "store_products_public_read_active" on public.store_products;
create policy "store_products_public_read_active"
on public.store_products
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.stores s
    where s.id = store_products.store_id
      and s.is_published = true
  )
);
drop policy if exists "store_products_admin_all" on public.store_products;
create policy "store_products_admin_all"
on public.store_products
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
-- store_media
drop policy if exists "store_media_public_read_published_store" on public.store_media;
create policy "store_media_public_read_published_store"
on public.store_media
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.stores s
    where s.id = store_media.store_id
      and s.is_published = true
  )
);
drop policy if exists "store_media_admin_all" on public.store_media;
create policy "store_media_admin_all"
on public.store_media
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
-- catalogs
drop policy if exists "catalogs_public_read_active" on public.catalogs;
create policy "catalogs_public_read_active"
on public.catalogs
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.stores s
    where s.id = catalogs.store_id
      and s.is_published = true
  )
);
drop policy if exists "catalogs_admin_all" on public.catalogs;
create policy "catalogs_admin_all"
on public.catalogs
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
-- launches
drop policy if exists "launches_public_read_published" on public.launches;
create policy "launches_public_read_published"
on public.launches
for select
to anon, authenticated
using (
  is_published = true
  and (publish_date is null or publish_date <= now())
  and (expiration_date is null or expiration_date > now())
);
drop policy if exists "launches_admin_all" on public.launches;
create policy "launches_admin_all"
on public.launches
for all
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
-- leads
drop policy if exists "leads_public_insert" on public.leads;
create policy "leads_public_insert"
on public.leads
for insert
to anon, authenticated
with check (
  char_length(trim(type)) > 0
  and char_length(trim(name)) > 0
);
drop policy if exists "leads_admin_read" on public.leads;
create policy "leads_admin_read"
on public.leads
for select
to authenticated
using ((select public.is_admin()));
drop policy if exists "leads_admin_update" on public.leads;
create policy "leads_admin_update"
on public.leads
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
drop policy if exists "leads_admin_delete" on public.leads;
create policy "leads_admin_delete"
on public.leads
for delete
to authenticated
using ((select public.is_admin()));
-- newsletter_subscribers
drop policy if exists "newsletter_public_insert" on public.newsletter_subscribers;
create policy "newsletter_public_insert"
on public.newsletter_subscribers
for insert
to anon, authenticated
with check (char_length(trim(email)) > 3);
drop policy if exists "newsletter_admin_read" on public.newsletter_subscribers;
create policy "newsletter_admin_read"
on public.newsletter_subscribers
for select
to authenticated
using ((select public.is_admin()));
drop policy if exists "newsletter_admin_update" on public.newsletter_subscribers;
create policy "newsletter_admin_update"
on public.newsletter_subscribers
for update
to authenticated
using ((select public.is_admin()))
with check ((select public.is_admin()));
drop policy if exists "newsletter_admin_delete" on public.newsletter_subscribers;
create policy "newsletter_admin_delete"
on public.newsletter_subscribers
for delete
to authenticated
using ((select public.is_admin()));
-- admin_profiles
drop policy if exists "admin_profiles_self_read" on public.admin_profiles;
create policy "admin_profiles_self_read"
on public.admin_profiles
for select
to authenticated
using (auth.uid() = user_id);
drop policy if exists "admin_profiles_super_admin_read_all" on public.admin_profiles;
create policy "admin_profiles_super_admin_read_all"
on public.admin_profiles
for select
to authenticated
using ((select public.is_super_admin()));
drop policy if exists "admin_profiles_super_admin_manage_roles" on public.admin_profiles;
create policy "admin_profiles_super_admin_manage_roles"
on public.admin_profiles
for all
to authenticated
using ((select public.is_super_admin()))
with check ((select public.is_super_admin()));
-- activity_logs
drop policy if exists "activity_logs_admin_insert" on public.activity_logs;
create policy "activity_logs_admin_insert"
on public.activity_logs
for insert
to authenticated
with check ((select public.is_admin()));
drop policy if exists "activity_logs_admin_read" on public.activity_logs;
create policy "activity_logs_admin_read"
on public.activity_logs
for select
to authenticated
using ((select public.is_admin()) or (select public.is_super_admin()));
-- storage buckets and policies
insert into storage.buckets (id, name, public)
values
  ('logos', 'logos', true),
  ('banners', 'banners', true),
  ('stores', 'stores', true),
  ('products', 'products', true),
  ('catalogs', 'catalogs', true),
  ('pages', 'pages', true),
  ('institutional', 'institutional', true)
on conflict (id) do update set public = excluded.public;
drop policy if exists "storage_public_read_assets" on storage.objects;
create policy "storage_public_read_assets"
on storage.objects
for select
to public
using (bucket_id in ('logos', 'banners', 'stores', 'products', 'catalogs', 'pages', 'institutional'));
drop policy if exists "storage_admin_insert_assets" on storage.objects;
create policy "storage_admin_insert_assets"
on storage.objects
for insert
to authenticated
with check (
  bucket_id in ('logos', 'banners', 'stores', 'products', 'catalogs', 'pages', 'institutional')
  and (select public.is_admin())
);
drop policy if exists "storage_admin_update_assets" on storage.objects;
create policy "storage_admin_update_assets"
on storage.objects
for update
to authenticated
using (
  bucket_id in ('logos', 'banners', 'stores', 'products', 'catalogs', 'pages', 'institutional')
  and (select public.is_admin())
)
with check (
  bucket_id in ('logos', 'banners', 'stores', 'products', 'catalogs', 'pages', 'institutional')
  and (select public.is_admin())
);
drop policy if exists "storage_admin_delete_assets" on storage.objects;
create policy "storage_admin_delete_assets"
on storage.objects
for delete
to authenticated
using (
  bucket_id in ('logos', 'banners', 'stores', 'products', 'catalogs', 'pages', 'institutional')
  and (select public.is_admin())
);
commit;
