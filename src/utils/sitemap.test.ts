import { describe, expect, it } from 'vitest';
import {
  buildRobotsTxt,
  isStrictSitemapEnvironment,
  normalizeSiteUrl,
  resolveSitemapBaseUrl,
} from './sitemap';

describe('sitemap utils', () => {
  it('normaliza URL removendo barra final', () => {
    expect(normalizeSiteUrl('https://megapolomoda.com.br/')).toBe('https://megapolomoda.com.br');
  });

  it('retorna null para URL invalida', () => {
    expect(normalizeSiteUrl('nao-e-url')).toBeNull();
  });

  it('usa localhost em ambiente de desenvolvimento sem VITE_SITE_URL', () => {
    expect(resolveSitemapBaseUrl({ NODE_ENV: 'development' })).toBe('http://localhost:5173');
  });

  it('falha em ambiente estrito sem URL configurada', () => {
    expect(() => resolveSitemapBaseUrl({ NODE_ENV: 'production' })).toThrow(
      /VITE_SITE_URL nao configurada/i,
    );
  });

  it('aceita fallback explicito em ambiente estrito', () => {
    expect(
      resolveSitemapBaseUrl({
        NODE_ENV: 'production',
        SITEMAP_FALLBACK_SITE_URL: 'https://fallback.mega-polo.test',
      }),
    ).toBe('https://fallback.mega-polo.test');
  });

  it('identifica ambiente estrito em deploy da Vercel', () => {
    expect(isStrictSitemapEnvironment({ VERCEL: '1' })).toBe(true);
    expect(isStrictSitemapEnvironment({ VERCEL_ENV: 'preview' })).toBe(true);
  });

  it('gera robots com sitemap absoluto', () => {
    const robots = buildRobotsTxt('https://megapolomoda.com.br');
    expect(robots).toContain('Disallow: /admin');
    expect(robots).toContain('Sitemap: https://megapolomoda.com.br/sitemap.xml');
  });
});
