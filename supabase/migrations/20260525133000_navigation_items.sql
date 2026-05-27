-- 20260525133000_navigation_items.sql
-- Menu/Navegacao editavel via CMS (Navbar + Mobile + Areas de conta/CTA)

begin;
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
create table if not exists public.navigation_items (
  id uuid primary key default gen_random_uuid(),
  label text not null,
  url text not null,
  location text not null,
  icon text,
  style text,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  open_in_new_tab boolean not null default false,
  requires_auth boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.navigation_items
  drop constraint if exists navigation_items_location_check;
alter table public.navigation_items
  add constraint navigation_items_location_check check (
    location in ('main_nav', 'mobile_nav', 'header_cta', 'header_secondary', 'account_area')
  );
create index if not exists idx_navigation_items_location
  on public.navigation_items(location);
create index if not exists idx_navigation_items_sort_order
  on public.navigation_items(sort_order);
create index if not exists idx_navigation_items_is_active
  on public.navigation_items(is_active);
drop trigger if exists trg_navigation_items_updated_at on public.navigation_items;
create trigger trg_navigation_items_updated_at
before update on public.navigation_items
for each row execute function public.set_updated_at();
alter table public.navigation_items enable row level security;
drop policy if exists "navigation_items_public_read_active" on public.navigation_items;
drop policy if exists "navigation_items_admin_read_all" on public.navigation_items;
drop policy if exists "navigation_items_content_insert" on public.navigation_items;
drop policy if exists "navigation_items_content_update" on public.navigation_items;
drop policy if exists "navigation_items_content_delete" on public.navigation_items;
create policy "navigation_items_public_read_active"
on public.navigation_items
for select
to anon, authenticated
using (is_active = true);
create policy "navigation_items_admin_read_all"
on public.navigation_items
for select
to authenticated
using ((select public.can_view_admin()));
create policy "navigation_items_content_insert"
on public.navigation_items
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "navigation_items_content_update"
on public.navigation_items
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "navigation_items_content_delete"
on public.navigation_items
for delete
to authenticated
using ((select public.can_edit_content()));
commit;
