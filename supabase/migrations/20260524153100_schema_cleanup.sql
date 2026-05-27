-- 20260524153100_schema_cleanup.sql
-- Normaliza o estado final do schema sem recriar tabelas.
-- Esta migration e idempotente e segura para bancos que ja possuem migrations historicas aplicadas.

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
-- Colunas de compatibilidade que divergiram entre migrations antigas.
alter table if exists public.site_settings add column if not exists short_description text;
alter table if exists public.site_settings add column if not exists institutional_image_url text;
alter table if exists public.stores add column if not exists seo_title text;
alter table if exists public.stores add column if not exists seo_description text;
alter table if exists public.stores add column if not exists og_image_url text;
alter table if exists public.launches add column if not exists seo_title text;
alter table if exists public.launches add column if not exists seo_description text;
alter table if exists public.launches add column if not exists og_image_url text;
alter table if exists public.launches alter column store_id drop not null;
alter table if exists public.home_sections alter column title drop not null;
alter table if exists public.admin_profiles add column if not exists is_active boolean;
update public.admin_profiles set is_active = true where is_active is null;
alter table if exists public.admin_profiles alter column is_active set default true;
alter table if exists public.admin_profiles alter column is_active set not null;
-- Garante id uuid + primary key em todas as tabelas principais.
do $$
declare
  t text;
begin
  foreach t in array array[
    'site_settings',
    'pages',
    'home_sections',
    'categories',
    'stores',
    'store_products',
    'store_media',
    'catalogs',
    'launches',
    'leads',
    'newsletter_subscribers',
    'admin_profiles',
    'activity_logs'
  ]
  loop
    execute format('alter table public.%I add column if not exists id uuid', t);
    execute format('update public.%I set id = gen_random_uuid() where id is null', t);
    execute format('alter table public.%I alter column id set default gen_random_uuid()', t);
    execute format('alter table public.%I alter column id set not null', t);

    if not exists (
      select 1
      from pg_constraint c
      where c.conrelid = format('public.%I', t)::regclass
        and c.contype = 'p'
    ) then
      execute format('alter table public.%I add constraint %I primary key (id)', t, t || '_pkey');
    end if;
  end loop;
end $$;
-- created_at em todas as tabelas principais.
do $$
declare
  t text;
begin
  foreach t in array array[
    'site_settings',
    'pages',
    'home_sections',
    'categories',
    'stores',
    'store_products',
    'store_media',
    'catalogs',
    'launches',
    'leads',
    'newsletter_subscribers',
    'admin_profiles',
    'activity_logs'
  ]
  loop
    execute format('alter table public.%I add column if not exists created_at timestamptz', t);
    execute format('update public.%I set created_at = now() where created_at is null', t);
    execute format('alter table public.%I alter column created_at set default now()', t);
    execute format('alter table public.%I alter column created_at set not null', t);
  end loop;
end $$;
-- updated_at para tabelas que suportam atualizacao.
do $$
declare
  t text;
begin
  foreach t in array array[
    'site_settings',
    'pages',
    'home_sections',
    'categories',
    'stores',
    'store_products',
    'store_media',
    'catalogs',
    'launches',
    'leads',
    'newsletter_subscribers',
    'admin_profiles'
  ]
  loop
    execute format('alter table public.%I add column if not exists updated_at timestamptz', t);
    execute format('update public.%I set updated_at = now() where updated_at is null', t);
    execute format('alter table public.%I alter column updated_at set default now()', t);
    execute format('alter table public.%I alter column updated_at set not null', t);
  end loop;
end $$;
-- Defaults finais esperados.
alter table if exists public.leads alter column status set default 'novo';
alter table if exists public.newsletter_subscribers alter column status set default 'active';
alter table if exists public.newsletter_subscribers alter column consent set default false;
alter table if exists public.admin_profiles alter column role set default 'viewer';
alter table if exists public.admin_profiles alter column is_active set default true;
update public.leads
set status = lower(status)
where status is not null;
update public.leads
set status = 'novo'
where status is null
   or btrim(status) = ''
   or lower(status) not in ('novo', 'em_atendimento', 'proposta_enviada', 'visita_agendada', 'fechado', 'perdido');
update public.newsletter_subscribers
set status = lower(status)
where status is not null;
update public.newsletter_subscribers
set status = 'active'
where status is null
   or btrim(status) = ''
   or lower(status) not in ('active', 'inactive');
update public.admin_profiles
set role = lower(role)
where role is not null;
update public.admin_profiles
set role = 'viewer'
where role is null
   or btrim(role) = ''
   or role not in ('super_admin', 'admin', 'editor', 'viewer');
-- Constraints finais.
alter table if exists public.leads drop constraint if exists leads_status_check;
alter table if exists public.leads
  add constraint leads_status_check
  check (status in ('novo', 'em_atendimento', 'proposta_enviada', 'visita_agendada', 'fechado', 'perdido'));
alter table if exists public.admin_profiles drop constraint if exists admin_profiles_role_check;
alter table if exists public.admin_profiles
  add constraint admin_profiles_role_check
  check (role in ('super_admin', 'admin', 'editor', 'viewer'));
alter table if exists public.newsletter_subscribers drop constraint if exists newsletter_subscribers_status_check;
alter table if exists public.newsletter_subscribers
  add constraint newsletter_subscribers_status_check
  check (status in ('active', 'inactive'));
alter table if exists public.leads alter column email drop not null;
alter table if exists public.leads alter column phone drop not null;
alter table if exists public.leads alter column message drop not null;
-- Evita mais de um catalogo ativo por loja.
with ranked_active_catalogs as (
  select
    id,
    row_number() over (
      partition by store_id
      order by updated_at desc nulls last, created_at desc nulls last, id desc
    ) as rn
  from public.catalogs
  where is_active = true
)
update public.catalogs c
set is_active = false,
    updated_at = now()
where c.id in (
  select id
  from ranked_active_catalogs
  where rn > 1
);
create unique index if not exists idx_catalogs_unique_active_per_store
on public.catalogs (store_id)
where is_active = true;
-- Indices essenciais.
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
create index if not exists idx_leads_status on public.leads(status);
create index if not exists idx_leads_type on public.leads(type);
create index if not exists idx_newsletter_email on public.newsletter_subscribers(email);
create index if not exists idx_admin_profiles_user_id on public.admin_profiles(user_id);
create index if not exists idx_admin_profiles_role on public.admin_profiles(role);
create index if not exists idx_activity_logs_user_id on public.activity_logs(user_id);
create index if not exists idx_activity_logs_entity on public.activity_logs(entity);
create index if not exists idx_activity_logs_created_at on public.activity_logs(created_at);
-- Triggers de updated_at.
drop trigger if exists trg_site_settings_updated_at on public.site_settings;
create trigger trg_site_settings_updated_at
before update on public.site_settings
for each row execute function public.set_updated_at();
drop trigger if exists trg_pages_updated_at on public.pages;
create trigger trg_pages_updated_at
before update on public.pages
for each row execute function public.set_updated_at();
drop trigger if exists trg_home_sections_updated_at on public.home_sections;
create trigger trg_home_sections_updated_at
before update on public.home_sections
for each row execute function public.set_updated_at();
drop trigger if exists trg_categories_updated_at on public.categories;
create trigger trg_categories_updated_at
before update on public.categories
for each row execute function public.set_updated_at();
drop trigger if exists trg_stores_updated_at on public.stores;
create trigger trg_stores_updated_at
before update on public.stores
for each row execute function public.set_updated_at();
drop trigger if exists trg_store_products_updated_at on public.store_products;
create trigger trg_store_products_updated_at
before update on public.store_products
for each row execute function public.set_updated_at();
drop trigger if exists trg_store_media_updated_at on public.store_media;
create trigger trg_store_media_updated_at
before update on public.store_media
for each row execute function public.set_updated_at();
drop trigger if exists trg_catalogs_updated_at on public.catalogs;
create trigger trg_catalogs_updated_at
before update on public.catalogs
for each row execute function public.set_updated_at();
drop trigger if exists trg_launches_updated_at on public.launches;
create trigger trg_launches_updated_at
before update on public.launches
for each row execute function public.set_updated_at();
drop trigger if exists trg_leads_updated_at on public.leads;
create trigger trg_leads_updated_at
before update on public.leads
for each row execute function public.set_updated_at();
drop trigger if exists trg_newsletter_subscribers_updated_at on public.newsletter_subscribers;
create trigger trg_newsletter_subscribers_updated_at
before update on public.newsletter_subscribers
for each row execute function public.set_updated_at();
drop trigger if exists trg_admin_profiles_updated_at on public.admin_profiles;
create trigger trg_admin_profiles_updated_at
before update on public.admin_profiles
for each row execute function public.set_updated_at();
-- Mantem RLS ativo em todas as tabelas principais.
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
commit;
