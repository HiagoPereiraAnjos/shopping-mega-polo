-- 20260525221000_footer_cms.sql
-- Footer administravel via CMS: secoes, links e textos complementares no site_settings.

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
alter table public.site_settings
  add column if not exists footer_newsletter_title text,
  add column if not exists footer_newsletter_text text,
  add column if not exists footer_newsletter_button_label text,
  add column if not exists footer_copyright_text text,
  add column if not exists footer_institutional_phrase text,
  add column if not exists youtube_url text,
  add column if not exists footer_legal_text text;
create table if not exists public.footer_sections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.footer_links (
  id uuid primary key default gen_random_uuid(),
  footer_section_id uuid not null references public.footer_sections(id) on delete cascade,
  label text not null,
  url text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  open_in_new_tab boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_footer_sections_sort_order
  on public.footer_sections(sort_order);
create index if not exists idx_footer_sections_is_active
  on public.footer_sections(is_active);
create index if not exists idx_footer_links_section_id
  on public.footer_links(footer_section_id);
create index if not exists idx_footer_links_sort_order
  on public.footer_links(sort_order);
create index if not exists idx_footer_links_is_active
  on public.footer_links(is_active);
drop trigger if exists trg_footer_sections_updated_at on public.footer_sections;
create trigger trg_footer_sections_updated_at
before update on public.footer_sections
for each row execute function public.set_updated_at();
drop trigger if exists trg_footer_links_updated_at on public.footer_links;
create trigger trg_footer_links_updated_at
before update on public.footer_links
for each row execute function public.set_updated_at();
alter table public.footer_sections enable row level security;
alter table public.footer_links enable row level security;
drop policy if exists "footer_sections_public_read_active" on public.footer_sections;
drop policy if exists "footer_sections_admin_read_all" on public.footer_sections;
drop policy if exists "footer_sections_content_insert" on public.footer_sections;
drop policy if exists "footer_sections_content_update" on public.footer_sections;
drop policy if exists "footer_sections_content_delete" on public.footer_sections;
drop policy if exists "footer_links_public_read_active" on public.footer_links;
drop policy if exists "footer_links_admin_read_all" on public.footer_links;
drop policy if exists "footer_links_content_insert" on public.footer_links;
drop policy if exists "footer_links_content_update" on public.footer_links;
drop policy if exists "footer_links_content_delete" on public.footer_links;
create policy "footer_sections_public_read_active"
on public.footer_sections
for select
to anon, authenticated
using (is_active = true);
create policy "footer_sections_admin_read_all"
on public.footer_sections
for select
to authenticated
using ((select public.can_view_admin()));
create policy "footer_sections_content_insert"
on public.footer_sections
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "footer_sections_content_update"
on public.footer_sections
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "footer_sections_content_delete"
on public.footer_sections
for delete
to authenticated
using ((select public.can_edit_content()));
create policy "footer_links_public_read_active"
on public.footer_links
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.footer_sections fs
    where fs.id = footer_links.footer_section_id
      and fs.is_active = true
  )
);
create policy "footer_links_admin_read_all"
on public.footer_links
for select
to authenticated
using ((select public.can_view_admin()));
create policy "footer_links_content_insert"
on public.footer_links
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "footer_links_content_update"
on public.footer_links
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "footer_links_content_delete"
on public.footer_links
for delete
to authenticated
using ((select public.can_edit_content()));
commit;
