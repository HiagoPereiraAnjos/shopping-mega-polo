-- Validacao manual de RLS - Mega Polo Moda
-- Execute no SQL Editor do Supabase apos aplicar a migration
-- 20260524143400_refine_rls_permissions.sql.
--
-- Recomenda-se usar:
--   1) sessao anonima (sem login),
--   2) sessao com editor,
--   3) sessao com viewer,
--   4) sessao com admin,
--   5) sessao com super_admin.

-- ------------------------------------------------------------
-- ANON
-- ------------------------------------------------------------
-- 1) anon NAO deve ler leads
select * from public.leads limit 1;

-- 2) anon deve conseguir inserir lead
insert into public.leads (type, name, email, phone, source_page, status)
values ('leasing', 'Teste Lead Anon', 'anon@example.com', '(11)99999-9999', 'abra-sua-loja', 'novo');

-- 3) anon NAO deve ler newsletter_subscribers
select * from public.newsletter_subscribers limit 1;

-- 4) publico so deve ver lojas publicadas
select id, name, is_published
from public.stores;

-- 5) publico so deve ver lancamentos publicados e nao expirados
select id, title, is_published, publish_date, expiration_date
from public.launches;

-- ------------------------------------------------------------
-- EDITOR
-- ------------------------------------------------------------
-- 6) editor NAO deve atualizar site_settings
update public.site_settings
set site_name = 'Teste editor sem permissao'
where true;

-- 7) editor NAO deve ler leads
select * from public.leads limit 1;

-- 8) editor deve conseguir criar/editar loja (ajuste category_id para um id valido)
-- insert into public.stores (name, slug, category_id, is_published)
-- values ('Loja Teste Editor', 'loja-teste-editor', '<category_uuid>', false);

-- ------------------------------------------------------------
-- VIEWER
-- ------------------------------------------------------------
-- 9) viewer NAO deve criar loja
-- insert into public.stores (name, slug, category_id, is_published)
-- values ('Loja Viewer', 'loja-viewer', '<category_uuid>', false);

-- 10) viewer pode ler tabelas administrativas permitidas de conteudo
select id, title, is_published from public.pages limit 5;
select id, name, is_published from public.stores limit 5;

-- ------------------------------------------------------------
-- ADMIN
-- ------------------------------------------------------------
-- 11) admin deve alterar site_settings
update public.site_settings
set site_name = site_name
where true;

-- ------------------------------------------------------------
-- SUPER ADMIN
-- ------------------------------------------------------------
-- 12) super_admin deve alterar admin_profiles
-- update public.admin_profiles
-- set role = 'editor'
-- where user_id = '<uuid-alvo>';

-- 13) ninguem deve rebaixar/remover o ultimo super_admin
-- (deve falhar se houver somente um super_admin ativo)
-- update public.admin_profiles
-- set role = 'admin'
-- where user_id = '<uuid-do-unico-super-admin>';

-- delete from public.admin_profiles
-- where user_id = '<uuid-do-unico-super-admin>';
