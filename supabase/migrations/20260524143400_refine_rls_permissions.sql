-- Refina as permissoes RLS por papel (super_admin, admin, editor, viewer)
-- e remove dependencias amplas de is_admin().

begin;
alter table public.admin_profiles
  add column if not exists is_active boolean;
update public.admin_profiles
set is_active = true
where is_active is null;
alter table public.admin_profiles
  alter column is_active set default true;
alter table public.admin_profiles
  alter column is_active set not null;
create or replace function public.current_admin_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select ap.role
  from public.admin_profiles ap
  where ap.user_id = auth.uid()
    and ap.is_active = true
  limit 1;
$$;
create or replace function public.has_admin_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    public.current_admin_role() = any(coalesce(allowed_roles, array[]::text[])),
    false
  );
$$;
create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_admin_role(array['super_admin']);
$$;
create or replace function public.can_manage_settings()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_admin_role(array['super_admin', 'admin']);
$$;
create or replace function public.can_manage_users()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_admin_role(array['super_admin']);
$$;
create or replace function public.can_manage_leads()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_admin_role(array['super_admin', 'admin']);
$$;
create or replace function public.can_manage_logs()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_admin_role(array['super_admin', 'admin']);
$$;
create or replace function public.can_edit_content()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_admin_role(array['super_admin', 'admin', 'editor']);
$$;
create or replace function public.can_view_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.has_admin_role(array['super_admin', 'admin', 'editor', 'viewer']);
$$;
-- Compatibilidade com regras legadas que ainda referenciam is_admin().
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.can_edit_content();
$$;
create or replace function public.prevent_last_super_admin_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  active_super_admin_count integer;
begin
  if tg_op = 'UPDATE' then
    if old.role = 'super_admin'
      and coalesce(old.is_active, true) = true
      and (new.role <> 'super_admin' or coalesce(new.is_active, true) = false)
    then
      select count(*)
      into active_super_admin_count
      from public.admin_profiles
      where role = 'super_admin'
        and is_active = true;

      if active_super_admin_count <= 1 then
        raise exception 'Nao e permitido rebaixar ou desativar o ultimo super_admin.';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.role = 'super_admin'
      and coalesce(old.is_active, true) = true
    then
      select count(*)
      into active_super_admin_count
      from public.admin_profiles
      where role = 'super_admin'
        and is_active = true;

      if active_super_admin_count <= 1 then
        raise exception 'Nao e permitido remover o ultimo super_admin.';
      end if;
    end if;

    return old;
  end if;

  return coalesce(new, old);
end;
$$;
drop trigger if exists trg_admin_profiles_last_super_admin_guard on public.admin_profiles;
create trigger trg_admin_profiles_last_super_admin_guard
before update or delete on public.admin_profiles
for each row execute function public.prevent_last_super_admin_change();
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
do $$
begin
  begin
    alter table storage.objects enable row level security;
  exception
    when insufficient_privilege then
      raise notice 'Sem permissao para alterar RLS em storage.objects. Continuando migration.';
  end;
end $$;
do $$
declare
  policy_record record;
begin
  for policy_record in
    select schemaname, tablename, policyname
    from pg_policies
    where (schemaname = 'public' and tablename in (
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
    ))
    or (schemaname = 'storage' and tablename = 'objects')
  loop
    begin
      execute format(
        'drop policy if exists %I on %I.%I',
        policy_record.policyname,
        policy_record.schemaname,
        policy_record.tablename
      );
    exception
      when insufficient_privilege then
        raise notice 'Sem permissao para remover policy %.%.%, ignorando.',
          policy_record.schemaname,
          policy_record.tablename,
          policy_record.policyname;
    end;
  end loop;
end $$;
-- site_settings
create policy "site_settings_public_read"
on public.site_settings
for select
to anon, authenticated
using (true);
create policy "site_settings_admin_manage"
on public.site_settings
for insert
to authenticated
with check ((select public.can_manage_settings()));
create policy "site_settings_admin_update"
on public.site_settings
for update
to authenticated
using ((select public.can_manage_settings()))
with check ((select public.can_manage_settings()));
create policy "site_settings_admin_delete"
on public.site_settings
for delete
to authenticated
using ((select public.can_manage_settings()));
-- pages
create policy "pages_public_read_published"
on public.pages
for select
to anon, authenticated
using (is_published = true);
create policy "pages_admin_read_all"
on public.pages
for select
to authenticated
using ((select public.can_view_admin()));
create policy "pages_content_insert"
on public.pages
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "pages_content_update"
on public.pages
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "pages_content_delete"
on public.pages
for delete
to authenticated
using ((select public.can_edit_content()));
-- home_sections
create policy "home_sections_public_read_active"
on public.home_sections
for select
to anon, authenticated
using (is_active = true);
create policy "home_sections_admin_read_all"
on public.home_sections
for select
to authenticated
using ((select public.can_view_admin()));
create policy "home_sections_content_insert"
on public.home_sections
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "home_sections_content_update"
on public.home_sections
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "home_sections_content_delete"
on public.home_sections
for delete
to authenticated
using ((select public.can_edit_content()));
-- categories
create policy "categories_public_read_active"
on public.categories
for select
to anon, authenticated
using (is_active = true);
create policy "categories_admin_read_all"
on public.categories
for select
to authenticated
using ((select public.can_view_admin()));
create policy "categories_content_insert"
on public.categories
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "categories_content_update"
on public.categories
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "categories_content_delete"
on public.categories
for delete
to authenticated
using ((select public.can_edit_content()));
-- stores
create policy "stores_public_read_published"
on public.stores
for select
to anon, authenticated
using (is_published = true);
create policy "stores_admin_read_all"
on public.stores
for select
to authenticated
using ((select public.can_view_admin()));
create policy "stores_content_insert"
on public.stores
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "stores_content_update"
on public.stores
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "stores_content_delete"
on public.stores
for delete
to authenticated
using ((select public.can_edit_content()));
-- store_products
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
create policy "store_products_admin_read_all"
on public.store_products
for select
to authenticated
using ((select public.can_view_admin()));
create policy "store_products_content_insert"
on public.store_products
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "store_products_content_update"
on public.store_products
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "store_products_content_delete"
on public.store_products
for delete
to authenticated
using ((select public.can_edit_content()));
-- store_media
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
create policy "store_media_admin_read_all"
on public.store_media
for select
to authenticated
using ((select public.can_view_admin()));
create policy "store_media_content_insert"
on public.store_media
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "store_media_content_update"
on public.store_media
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "store_media_content_delete"
on public.store_media
for delete
to authenticated
using ((select public.can_edit_content()));
-- catalogs
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
create policy "catalogs_admin_read_all"
on public.catalogs
for select
to authenticated
using ((select public.can_view_admin()));
create policy "catalogs_content_insert"
on public.catalogs
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "catalogs_content_update"
on public.catalogs
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "catalogs_admin_delete"
on public.catalogs
for delete
to authenticated
using ((select public.can_manage_settings()));
-- launches
create policy "launches_public_read_published"
on public.launches
for select
to anon, authenticated
using (
  is_published = true
  and (publish_date is null or publish_date <= now())
  and (expiration_date is null or expiration_date > now())
);
create policy "launches_admin_read_all"
on public.launches
for select
to authenticated
using ((select public.can_view_admin()));
create policy "launches_content_insert"
on public.launches
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "launches_content_update"
on public.launches
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "launches_content_delete"
on public.launches
for delete
to authenticated
using ((select public.can_edit_content()));
-- leads
create policy "leads_public_insert"
on public.leads
for insert
to anon, authenticated
with check (
  char_length(trim(coalesce(type, ''))) > 0
  and char_length(trim(coalesce(name, ''))) > 0
);
create policy "leads_admin_read"
on public.leads
for select
to authenticated
using ((select public.can_manage_leads()));
create policy "leads_admin_update"
on public.leads
for update
to authenticated
using ((select public.can_manage_leads()))
with check ((select public.can_manage_leads()));
create policy "leads_admin_delete"
on public.leads
for delete
to authenticated
using ((select public.can_manage_leads()));
-- newsletter_subscribers
create policy "newsletter_public_insert"
on public.newsletter_subscribers
for insert
to anon, authenticated
with check (char_length(trim(coalesce(email, ''))) > 3);
create policy "newsletter_admin_read"
on public.newsletter_subscribers
for select
to authenticated
using ((select public.can_manage_leads()));
create policy "newsletter_admin_update"
on public.newsletter_subscribers
for update
to authenticated
using ((select public.can_manage_leads()))
with check ((select public.can_manage_leads()));
create policy "newsletter_admin_delete"
on public.newsletter_subscribers
for delete
to authenticated
using ((select public.can_manage_leads()));
-- admin_profiles
create policy "admin_profiles_self_read"
on public.admin_profiles
for select
to authenticated
using (auth.uid() = user_id);
create policy "admin_profiles_super_admin_read_all"
on public.admin_profiles
for select
to authenticated
using ((select public.can_manage_users()));
create policy "admin_profiles_super_admin_insert"
on public.admin_profiles
for insert
to authenticated
with check ((select public.can_manage_users()));
create policy "admin_profiles_super_admin_update"
on public.admin_profiles
for update
to authenticated
using ((select public.can_manage_users()))
with check ((select public.can_manage_users()));
create policy "admin_profiles_super_admin_delete"
on public.admin_profiles
for delete
to authenticated
using ((select public.can_manage_users()));
-- activity_logs
create policy "activity_logs_admin_read"
on public.activity_logs
for select
to authenticated
using ((select public.can_manage_logs()));
create policy "activity_logs_system_insert"
on public.activity_logs
for insert
to authenticated
with check (
  (select public.can_manage_logs())
  or (select public.can_edit_content())
);
create policy "activity_logs_super_admin_delete"
on public.activity_logs
for delete
to authenticated
using ((select public.is_super_admin()));
do $$
begin
  begin
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

    create policy "storage_public_read_assets"
    on storage.objects
    for select
    to public
    using (
      bucket_id in ('logos', 'banners', 'stores', 'products', 'catalogs', 'pages', 'institutional')
    );

    create policy "storage_content_upload_assets"
    on storage.objects
    for insert
    to authenticated
    with check (
      bucket_id in ('logos', 'banners', 'stores', 'products', 'catalogs', 'pages', 'institutional')
      and (select public.can_edit_content())
    );

    create policy "storage_content_update_assets"
    on storage.objects
    for update
    to authenticated
    using (
      bucket_id in ('logos', 'banners', 'stores', 'products', 'catalogs', 'pages', 'institutional')
      and (select public.can_edit_content())
    )
    with check (
      bucket_id in ('logos', 'banners', 'stores', 'products', 'catalogs', 'pages', 'institutional')
      and (select public.can_edit_content())
    );

    create policy "storage_admin_delete_assets"
    on storage.objects
    for delete
    to authenticated
    using (
      bucket_id in ('logos', 'banners', 'stores', 'products', 'catalogs', 'pages', 'institutional')
      and (select public.can_manage_settings())
    );
  exception
    when insufficient_privilege then
      raise notice 'Sem permissao para configurar Storage (buckets/policies). Configure no painel Supabase.';
  end;
end $$;
commit;
