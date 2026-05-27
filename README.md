# Mega Polo Moda Portal

Portal React/Vite/TypeScript do Shopping Mega Polo Moda (Bras).

## Stack

- React 19
- React Router (SPA com `BrowserRouter`)
- TypeScript
- Vite
- Tailwind CSS
- Supabase (Auth, Database, Storage)

## Estrutura principal

- `src/App.tsx`: roteamento
- `src/pages`: paginas publicas e administrativas
- `src/components`: componentes reutilizaveis
- `src/services`: servicos de acesso ao Supabase
- `src/types`: tipos TypeScript do CMS
- `supabase/migrations`: schema e politicas RLS
- `supabase/seed.sql`: dados iniciais

## Requisitos

- Node.js 20+
- npm 10+

## Instalacao

```bash
npm ci
```

## Desenvolvimento

```bash
npm run dev
```

## Qualidade, testes e build

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

## Testes automatizados

### Unitarios e integracao (Vitest + React Testing Library)

```bash
npm run test
```

Modo watch:

```bash
npm run test:watch
```

### E2E (Playwright)

Primeira execucao local (instalar navegadores):

```bash
npx playwright install
```

Executar:

```bash
npm run test:e2e
```

Rodar contra ambiente publicado:

```bash
E2E_BASE_URL=https://seu-dominio.vercel.app npm run test:e2e
```

Fluxo admin autenticado opcional:

```bash
E2E_ADMIN_STORAGE_STATE=./tests/e2e/.auth/admin.json npm run test:e2e
```

## Supabase

1. Configure `.env` com as variaveis de `.env.example`.
2. Rode migrations e seed conforme `supabase/README.md`.
3. Crie o primeiro admin em `public.admin_profiles`.

### Variaveis esperadas

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON
VITE_SITE_URL=http://localhost:5173
# Opcional para fallback explicito em deploy (sitemap/robots):
SITEMAP_FALLBACK_SITE_URL=https://seu-dominio.com.br
```

### Configuracoes globais (Site Settings)

- O modulo `Configuracoes do Site` permite editar mensagens globais de WhatsApp, SEO default, textos de login e copyright.
- Campos `google_analytics_id`, `google_tag_manager_id` e `meta_pixel_id` sao os pontos oficiais para integracoes de tracking.
- Campos `custom_head_scripts` e `custom_body_scripts` sao apenas reservados nesta etapa e **nao** sao injetados automaticamente no front por seguranca.

## Deploy na Vercel

Este projeto usa React Router em SPA com `BrowserRouter`.

### Configuracao recomendada

O arquivo `vercel.json` esta configurado com:

1. Rewrite global para SPA:

```json
{
  "source": "/(.*)",
  "destination": "/index.html"
}
```

2. Headers de seguranca:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=()`
- `X-DNS-Prefetch-Control: on`
- `Content-Security-Policy` basica compativel com Supabase, Storage, Google Fonts e imagens externas temporarias.

3. Bloqueio de indexacao da area administrativa:
- `public/robots.txt` com `Disallow: /admin`, `Disallow: /login` e `Disallow: /dashboard`.
- componente `SEO` forca `robots=noindex,nofollow` em rotas sensiveis (`/admin`, `/login`, `/dashboard`).

4. Geração de sitemap e robots no build:
- `npm run build` executa `npm run generate:sitemap` antes do `vite build`.
- o script grava `public/sitemap.xml` e `public/robots.txt`.
- em desenvolvimento, sem `VITE_SITE_URL`, usa `http://localhost:5173`.
- em ambiente de deploy (production/CI/Vercel), sem `VITE_SITE_URL`, a geracao falha com erro claro, a menos que `SITEMAP_FALLBACK_SITE_URL` esteja configurada.

### Observacao sobre CSP

A CSP atual foi mantida basica para nao quebrar SPA, Supabase, fontes e uploads.
Se incluir novos provedores externos (scripts, imagens, iframes), ajuste `script-src`, `img-src`, `connect-src` e/ou `frame-src` no `vercel.json`.

### Variaveis de ambiente na Vercel

Configure no projeto da Vercel (Development, Preview e Production):

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA_ANON
VITE_SITE_URL=https://seu-dominio.com.br
# Opcional, apenas se quiser fallback explicito para sitemap/robots:
SITEMAP_FALLBACK_SITE_URL=https://seu-dominio.com.br
```

## CI

Existe um workflow em `.github/workflows/ci.yml` que executa:

1. `npm ci`
2. `npm run typecheck`
3. `npm run lint`
4. `npm run test`
5. `npm run build`

## Observacoes

- Nao use `service_role_key` no front-end.
- `dist/` e artefato de build, nao fonte de verdade.
- `node_modules/` nao deve ser versionado.
