# Supabase CMS - Shopping Mega Polo Moda

Este diretorio concentra schema, politicas RLS, storage e seed do CMS.

## 1) Variaveis de ambiente no front-end

No `.env` da raiz:

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON
VITE_SITE_URL=http://localhost:5173
```

Nunca exponha `service_role` no front-end.

## 2) Login e link com projeto

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
```

## 3) Rodar migrations (remoto/local linkado)

```bash
npx supabase db push --linked
```

Resumo de ordem e historico: veja `supabase/MIGRATIONS.md`.

## 4) Rodar seed

```bash
npx supabase db push --linked --include-seed
```

Opcional: executar `supabase/seed.sql` manualmente no SQL Editor.

## 5) Reset local (somente desenvolvimento)

Comando destrutivo:

```bash
npx supabase db reset
```

Antes do reset:

1. confirme que nao e ambiente de producao;
2. exporte dados importantes;
3. confira se `.env` aponta para ambiente correto.

## 6) Aplicar em ambiente remoto com seguranca

1. Faca backup/snapshot no Supabase.
2. Revise migrations pendentes.
3. Execute `npx supabase db push --linked`.
4. Valide RLS e integridade:
   - `leads.status = 'novo'`
   - `admin_profiles.role = 'viewer'`
   - `admin_profiles.is_active = true`
   - `newsletter_subscribers.status = 'active'`
   - indice unico parcial de catalogo ativo por loja
   - triggers `updated_at`

## 7) Buckets esperados

- `logos`
- `banners`
- `stores`
- `products`
- `catalogs`
- `pages`
- `institutional`

Quando necessario, consulte `supabase/storage-setup.md`.

## 8) RLS e permissao por papel

Funcoes auxiliares principais:

- `public.current_admin_role()`
- `public.has_admin_role(text[])`
- `public.can_manage_settings()`
- `public.can_manage_users()`
- `public.can_manage_leads()`
- `public.can_manage_logs()`
- `public.can_edit_content()`
- `public.can_view_admin()`

Validacao manual:

- execute `supabase/rls-validation.sql` no SQL Editor.

## 9) Criar primeiro super admin

1. Crie usuario no Supabase Auth.
2. Copie o UUID de `auth.users.id`.
3. Execute:

```sql
insert into public.admin_profiles (user_id, name, role, is_active)
values ('<auth_user_uuid>', 'Administrador Mega Polo', 'super_admin', true)
on conflict (user_id) do update
set
  name = excluded.name,
  role = excluded.role,
  is_active = excluded.is_active,
  updated_at = now();
```

## 10) Convite seguro de usuarios admin

Para convite por e-mail com Supabase Auth sem expor `service_role` no front-end:

- implemente Edge Functions server-side;
- contrato recomendado em `supabase/functions/README-admin-users.md`.

## 11) Teste rapido de conexao

```bash
npx tsx scripts/test-supabase-connection.ts
```
