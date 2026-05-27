# Storage Setup (Supabase)

Use os buckets abaixo para assets do CMS Mega Polo Moda:

- `logos`
- `banners`
- `stores`
- `products`
- `catalogs`
- `pages`
- `institutional`

## Via migration

A migration `supabase/migrations/001_initial_schema.sql` já tenta criar estes buckets e as políticas de `storage.objects`.

## Via painel (fallback)

Se sua conta/plano bloquear criação automática por SQL:

1. Abra Supabase Dashboard > Storage.
2. Crie os 7 buckets acima.
3. Marque como `Public` os buckets de assets públicos.
4. Em `Policies` de `storage.objects`, use:

### Leitura pública
- Permitir `SELECT` quando `bucket_id` estiver na lista de buckets CMS.

### Escrita apenas admin
- Permitir `INSERT`, `UPDATE` e `DELETE` somente para usuários autenticados que atendam `public.is_admin()`.

## Validação

- Faça upload de imagem com usuário admin autenticado.
- Acesse URL pública do arquivo.
- Tente upload com usuário não admin: deve falhar.
