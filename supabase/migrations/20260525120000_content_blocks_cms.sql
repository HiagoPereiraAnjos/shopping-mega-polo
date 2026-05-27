-- 20260525120000_content_blocks_cms.sql
-- Base CMS granular para blocos e itens de conteudo editaveis via painel administrativo.

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
create table if not exists public.content_blocks (
  id uuid primary key default gen_random_uuid(),
  page_key text not null,
  block_key text not null,
  block_type text not null,
  title text,
  subtitle text,
  content text,
  image_url text,
  icon text,
  button_label text,
  button_url text,
  secondary_button_label text,
  secondary_button_url text,
  settings jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.content_block_items (
  id uuid primary key default gen_random_uuid(),
  block_id uuid not null references public.content_blocks(id) on delete cascade,
  title text,
  subtitle text,
  content text,
  image_url text,
  icon text,
  button_label text,
  button_url text,
  metadata jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.content_blocks'::regclass
      and conname = 'content_blocks_page_key_block_key_key'
  ) then
    alter table public.content_blocks
      add constraint content_blocks_page_key_block_key_key unique (page_key, block_key);
  end if;
end $$;
create index if not exists idx_content_blocks_page_key
  on public.content_blocks(page_key);
create index if not exists idx_content_blocks_block_key
  on public.content_blocks(block_key);
create index if not exists idx_content_blocks_block_type
  on public.content_blocks(block_type);
create index if not exists idx_content_blocks_is_active
  on public.content_blocks(is_active);
create index if not exists idx_content_block_items_block_id
  on public.content_block_items(block_id);
create index if not exists idx_content_block_items_is_active
  on public.content_block_items(is_active);
drop trigger if exists trg_content_blocks_updated_at on public.content_blocks;
create trigger trg_content_blocks_updated_at
before update on public.content_blocks
for each row execute function public.set_updated_at();
drop trigger if exists trg_content_block_items_updated_at on public.content_block_items;
create trigger trg_content_block_items_updated_at
before update on public.content_block_items
for each row execute function public.set_updated_at();
alter table public.content_blocks enable row level security;
alter table public.content_block_items enable row level security;
drop policy if exists "content_blocks_public_read_active" on public.content_blocks;
drop policy if exists "content_blocks_admin_read_all" on public.content_blocks;
drop policy if exists "content_blocks_content_insert" on public.content_blocks;
drop policy if exists "content_blocks_content_update" on public.content_blocks;
drop policy if exists "content_blocks_content_delete" on public.content_blocks;
drop policy if exists "content_block_items_public_read_active" on public.content_block_items;
drop policy if exists "content_block_items_admin_read_all" on public.content_block_items;
drop policy if exists "content_block_items_content_insert" on public.content_block_items;
drop policy if exists "content_block_items_content_update" on public.content_block_items;
drop policy if exists "content_block_items_content_delete" on public.content_block_items;
create policy "content_blocks_public_read_active"
on public.content_blocks
for select
to anon, authenticated
using (is_active = true);
create policy "content_blocks_admin_read_all"
on public.content_blocks
for select
to authenticated
using ((select public.can_view_admin()));
create policy "content_blocks_content_insert"
on public.content_blocks
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "content_blocks_content_update"
on public.content_blocks
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "content_blocks_content_delete"
on public.content_blocks
for delete
to authenticated
using ((select public.can_edit_content()));
create policy "content_block_items_public_read_active"
on public.content_block_items
for select
to anon, authenticated
using (
  is_active = true
  and exists (
    select 1
    from public.content_blocks cb
    where cb.id = content_block_items.block_id
      and cb.is_active = true
  )
);
create policy "content_block_items_admin_read_all"
on public.content_block_items
for select
to authenticated
using ((select public.can_view_admin()));
create policy "content_block_items_content_insert"
on public.content_block_items
for insert
to authenticated
with check ((select public.can_edit_content()));
create policy "content_block_items_content_update"
on public.content_block_items
for update
to authenticated
using ((select public.can_edit_content()))
with check ((select public.can_edit_content()));
create policy "content_block_items_content_delete"
on public.content_block_items
for delete
to authenticated
using ((select public.can_edit_content()));
commit;
