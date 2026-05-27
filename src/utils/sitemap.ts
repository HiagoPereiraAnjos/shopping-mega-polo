export interface SitemapEnvironment {
  VITE_SITE_URL?: string;
  SITEMAP_FALLBACK_SITE_URL?: string;
  NODE_ENV?: string;
  VERCEL?: string;
  VERCEL_ENV?: string;
  CI?: string;
}

const LOCALHOST_SITE_URL = 'http://localhost:5173';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

export function normalizeSiteUrl(value: string | undefined): string | null {
  if (!value?.trim()) {
    return null;
  }

  try {
    return trimTrailingSlash(new URL(value.trim()).toString());
  } catch {
    return null;
  }
}

export function isStrictSitemapEnvironment(env: SitemapEnvironment): boolean {
  if (env.NODE_ENV === 'production') {
    return true;
  }

  if (env.VERCEL === '1') {
    return true;
  }

  if (env.VERCEL_ENV && env.VERCEL_ENV !== 'development') {
    return true;
  }

  if (env.CI === 'true') {
    return true;
  }

  return false;
}

export function resolveSitemapBaseUrl(env: SitemapEnvironment): string {
  const primaryUrl = normalizeSiteUrl(env.VITE_SITE_URL);
  if (primaryUrl) {
    return primaryUrl;
  }

  const fallbackUrl = normalizeSiteUrl(env.SITEMAP_FALLBACK_SITE_URL);
  if (fallbackUrl) {
    return fallbackUrl;
  }

  if (isStrictSitemapEnvironment(env)) {
    throw new Error(
      'VITE_SITE_URL nao configurada para gerar sitemap/robots em ambiente de deploy. ' +
        'Defina VITE_SITE_URL ou SITEMAP_FALLBACK_SITE_URL com uma URL absoluta.',
    );
  }

  return LOCALHOST_SITE_URL;
}

export function buildAbsoluteSitemapUrl(baseUrl: string): string {
  return `${trimTrailingSlash(baseUrl)}/sitemap.xml`;
}

export function buildRobotsTxt(baseUrl: string): string {
  const sitemapUrl = buildAbsoluteSitemapUrl(baseUrl);

  return [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /login',
    'Disallow: /dashboard',
    '',
    `Sitemap: ${sitemapUrl}`,
    '',
  ].join('\n');
}
