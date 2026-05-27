# Migrations Supabase - Mega Polo Moda

Este documento organiza o historico de migrations sem remover arquivos que podem ja estar aplicados em ambientes remotos.

## Diagnostico da pasta `supabase/migrations`

Arquivos atuais:

1. `001_initial_schema.sql`
2. `20260523130000_init_cms.sql`
3. `20260523170000_schema_alignment.sql`
4. `20260524143400_refine_rls_permissions.sql`
5. `20260524153100_schema_cleanup.sql`
6. `20260525120000_content_blocks_cms.sql`
7. `20260525133000_navigation_items.sql`
8. `20260525221000_footer_cms.sql`

Achados principais:

1. `001_initial_schema.sql` e `20260523170000_schema_alignment.sql` possuem o mesmo conteudo (duplicidade logica).
2. `20260523130000_init_cms.sql` representa uma base mais antiga, com divergencias de defaults, campos e regras.
3. `20260524143400_refine_rls_permissions.sql` ajusta o modelo de permissoes por papel (super_admin/admin/editor/viewer).
4. `20260524153100_schema_cleanup.sql` consolida o estado final esperado de schema/defaults/indices/triggers sem recriar tabelas.
5. `20260525120000_content_blocks_cms.sql` adiciona blocos de conteudo granulares para CMS.
6. `20260525133000_navigation_items.sql` adiciona menus dinamicos da Navbar.
7. `20260525221000_footer_cms.sql` adiciona colunas/links de rodape e campos globais no `site_settings`.

## Ordem de execucao

Em um ambiente novo usando Supabase CLI, a ordem segue os nomes dos arquivos:

1. `001_initial_schema.sql`
2. `20260523130000_init_cms.sql`
3. `20260523170000_schema_alignment.sql`
4. `20260524143400_refine_rls_permissions.sql`
5. `20260524153100_schema_cleanup.sql`
6. `20260525120000_content_blocks_cms.sql`
7. `20260525133000_navigation_items.sql`
8. `20260525221000_footer_cms.sql`

Observacao: existe duplicidade entre `001` e `20260523170000`, mas os scripts sao idempotentes e o cleanup final garante consistencia.

## Qual migration representa o schema final

O estado final deve ser considerado como:

1. base estrutural de `001_initial_schema.sql`
2. regras RLS refinadas de `20260524143400_refine_rls_permissions.sql`
3. normalizacao final de `20260524153100_schema_cleanup.sql`
4. camada CMS de blocos/menus/rodape das migrations de 25/05/2026

## Como criar banco novo do zero

1. Configure o projeto Supabase local/remoto.
2. Execute:

```bash
npx supabase db push --linked
```

3. Aplique seed:

```bash
npx supabase db push --linked --include-seed
```

4. Valide politicas com `supabase/rls-validation.sql`.

## Como atualizar banco existente com seguranca

1. Nao delete nem renomeie migrations historicas que ja podem estar aplicadas.
2. Faca backup/snapshot antes de aplicar mudancas estruturais.
3. Aplique migrations pendentes:

```bash
npx supabase db push --linked
```

4. Verifique:
   - defaults (`leads.status`, `admin_profiles.role`, `newsletter_subscribers.status`);
   - indice parcial unico de catalogos ativos por loja;
   - triggers de `updated_at`;
   - RLS das tabelas sensiveis.

## Cuidados antes de resetar banco

Antes de `db reset`:

1. confirme que nao e ambiente de producao;
2. exporte dados necessarios (stores, leads, catalogs, admin_profiles);
3. valide que as variaveis `.env` apontam para o ambiente correto;
4. garanta que seed nao sobrescreve dados de producao.

Comandos locais (destrutivos):

```bash
npx supabase db reset
```

## Divergencias conhecidas entre schema e seed

1. `supabase/seed.sql` ainda possui trechos com encoding quebrado (ex.: `Bras`, `Lancamentos`).
2. O cleanup nao altera conteudo textual do seed; ele corrige apenas o estado estrutural e de integridade do schema.
