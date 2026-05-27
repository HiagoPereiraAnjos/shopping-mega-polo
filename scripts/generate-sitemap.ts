/* eslint-disable no-console */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { buildRobotsTxt, resolveSitemapBaseUrl } from '../src/utils/sitemap';

type RuntimeProcess = {
  cwd: () => string;
  env: Record<string, string | undefined>;
  exitCode?: number;
};

type SitemapEntry = {
  loc: string;
  lastmod?: string;
  changefreq?: 'daily' | 'weekly' | 'monthly';
  priority?: number;
};

type SupabaseStore = {
  slug: string | null;
  updated_at: string | null;
};

type SupabasePage = {
  slug: string | null;
  updated_at: string | null;
};

type SupabaseCategory = {
  slug: string | null;
  name: string | null;
  updated_at: string | null;
};

const runtimeProcess = globalThis.process as RuntimeProcess | undefined;
const DIRECT_PAGE_SLUGS = new Set([
  'privacidade',
  'termos',
  'sobre',
  'planeje-sua-visita',
  'abra-sua-loja',
]);
const BLOCKED_PATH_PREFIXES = ['/admin', '/login', '/dashboard'];

function loadEnvFile(filePath: string): void {
  if (!runtimeProcess || !fs.existsSync(filePath)) {
    return;
  }

  const rows = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const row of rows) {
    const line = row.trim();
    if (!line || line.startsWith('#')) {
      continue;
    }

    const separatorIndex = line.indexOf('=');
    if (separatorIndex < 1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^"|"$/g, '');

    if (!(key in runtimeProcess.env)) {
      runtimeProcess.env[key] = value;
    }
  }
}

function toIsoDate(value: string | null | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function toAbsoluteUrl(baseUrl: string, pathOrUrl: string): string {
  try {
    return new URL(pathOrUrl).toString();
  } catch {
    const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
    return `${baseUrl}${normalizedPath}`;
  }
}

function isBlockedPath(pathOrUrl: string): boolean {
  let pathname: string;

  try {
    pathname = new URL(pathOrUrl).pathname;
  } catch {
    pathname = pathOrUrl.split('?')[0] ?? pathOrUrl;
  }

  const normalized = pathname.toLowerCase();

  return BLOCKED_PATH_PREFIXES.some((prefix) => (
    normalized === prefix || normalized.startsWith(`${prefix}/`)
  ));
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function dedupeEntries(entries: SitemapEntry[]): SitemapEntry[] {
  const byLoc = new Map<string, SitemapEntry>();

  for (const entry of entries) {
    if (isBlockedPath(entry.loc)) {
      continue;
    }

    const current = byLoc.get(entry.loc);
    if (!current) {
      byLoc.set(entry.loc, entry);
      continue;
    }

    const currentLastmod = current.lastmod ? new Date(current.lastmod).getTime() : 0;
    const nextLastmod = entry.lastmod ? new Date(entry.lastmod).getTime() : 0;

    byLoc.set(entry.loc, {
      ...current,
      ...entry,
      lastmod: nextLastmod > currentLastmod ? entry.lastmod : current.lastmod,
      priority: Math.max(current.priority ?? 0, entry.priority ?? 0),
    });
  }

  return Array.from(byLoc.values());
}

function pageSlugToPath(slug: string): string {
  if (DIRECT_PAGE_SLUGS.has(slug)) {
    return `/${slug}`;
  }

  return `/pagina/${slug}`;
}

async function loadDynamicEntries(
  baseUrl: string,
  supabaseUrl: string | undefined,
  supabaseAnonKey: string | undefined,
): Promise<SitemapEntry[]> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return [];
  }

  const client = createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const dynamicEntries: SitemapEntry[] = [];

  const [storesResult, pagesResult, categoriesResult] = await Promise.all([
    client.from('stores').select('slug,updated_at').eq('is_published', true),
    client.from('pages').select('slug,updated_at').eq('is_published', true),
    client.from('categories').select('slug,name,updated_at').eq('is_active', true),
  ]);

  if (!storesResult.error) {
    for (const store of (storesResult.data ?? []) as SupabaseStore[]) {
      if (!store.slug?.trim()) {
        continue;
      }

      dynamicEntries.push({
        loc: toAbsoluteUrl(baseUrl, `/lojas/${store.slug}`),
        lastmod: toIsoDate(store.updated_at),
        changefreq: 'weekly',
        priority: 0.8,
      });
    }
  }

  // A rota publica atual nao possui detalhe individual de lancamento
  // (ex.: /lancamentos/:slug), entao o sitemap inclui apenas /lancamentos.
  // Se essa rota surgir no futuro, adicionar entradas somente para itens
  // publicados e com expiration_date ausente ou no futuro.

  if (!pagesResult.error) {
    for (const page of (pagesResult.data ?? []) as SupabasePage[]) {
      if (!page.slug?.trim()) {
        continue;
      }

      const targetPath = pageSlugToPath(page.slug);
      if (isBlockedPath(targetPath)) {
        continue;
      }

      dynamicEntries.push({
        loc: toAbsoluteUrl(baseUrl, targetPath),
        lastmod: toIsoDate(page.updated_at),
        changefreq: 'monthly',
        priority: 0.6,
      });
    }
  }

  if (!categoriesResult.error) {
    for (const category of (categoriesResult.data ?? []) as SupabaseCategory[]) {
      const categoryQueryValue = category.name?.trim() || category.slug?.trim();
      if (!categoryQueryValue) {
        continue;
      }

      dynamicEntries.push({
        loc: toAbsoluteUrl(baseUrl, `/lojas?cat=${encodeURIComponent(categoryQueryValue)}`),
        lastmod: toIsoDate(category.updated_at),
        changefreq: 'weekly',
        priority: 0.6,
      });
    }
  }

  return dynamicEntries;
}

function buildXml(entries: SitemapEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.loc.localeCompare(b.loc));

  const rows = sorted
    .map((entry) => {
      const lines = ['  <url>', `    <loc>${escapeXml(entry.loc)}</loc>`];

      if (entry.lastmod) {
        lines.push(`    <lastmod>${escapeXml(entry.lastmod)}</lastmod>`);
      }

      if (entry.changefreq) {
        lines.push(`    <changefreq>${entry.changefreq}</changefreq>`);
      }

      if (typeof entry.priority === 'number') {
        lines.push(`    <priority>${entry.priority.toFixed(1)}</priority>`);
      }

      lines.push('  </url>');
      return lines.join('\n');
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows}\n</urlset>\n`;
}

function writeFile(filePath: string, contents: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, contents, 'utf8');
}

async function main(): Promise<void> {
  if (!runtimeProcess) {
    throw new Error('Esse script deve rodar em ambiente Node.js.');
  }

  const root = runtimeProcess.cwd();
  loadEnvFile(path.join(root, '.env'));
  loadEnvFile(path.join(root, '.env.local'));

  const baseUrl = resolveSitemapBaseUrl({
    VITE_SITE_URL: runtimeProcess.env.VITE_SITE_URL,
    SITEMAP_FALLBACK_SITE_URL: runtimeProcess.env.SITEMAP_FALLBACK_SITE_URL,
    NODE_ENV: runtimeProcess.env.NODE_ENV,
    VERCEL: runtimeProcess.env.VERCEL,
    VERCEL_ENV: runtimeProcess.env.VERCEL_ENV,
    CI: runtimeProcess.env.CI,
  });

  const supabaseUrl = runtimeProcess.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = runtimeProcess.env.VITE_SUPABASE_ANON_KEY;

  const staticEntries: SitemapEntry[] = [
    { loc: toAbsoluteUrl(baseUrl, '/'), changefreq: 'daily', priority: 1.0 },
    { loc: toAbsoluteUrl(baseUrl, '/lojas'), changefreq: 'daily', priority: 0.9 },
    { loc: toAbsoluteUrl(baseUrl, '/lancamentos'), changefreq: 'daily', priority: 0.9 },
    { loc: toAbsoluteUrl(baseUrl, '/planeje-sua-visita'), changefreq: 'weekly', priority: 0.7 },
    { loc: toAbsoluteUrl(baseUrl, '/abra-sua-loja'), changefreq: 'weekly', priority: 0.7 },
  ];

  const dynamicEntries = await loadDynamicEntries(baseUrl, supabaseUrl, supabaseAnonKey);
  const entries = dedupeEntries([...staticEntries, ...dynamicEntries]);
  const xml = buildXml(entries);
  const robots = buildRobotsTxt(baseUrl);

  const sitemapPath = path.join(root, 'public', 'sitemap.xml');
  const robotsPath = path.join(root, 'public', 'robots.txt');

  writeFile(sitemapPath, xml);
  writeFile(robotsPath, robots);

  console.log(`Sitemap gerado com ${entries.length} URLs em ${sitemapPath}`);
  console.log(`Robots.txt atualizado em ${robotsPath}`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Erro desconhecido.';
  console.error(`Falha ao gerar sitemap: ${message}`);
  if (runtimeProcess) {
    runtimeProcess.exitCode = 1;
  }
});
