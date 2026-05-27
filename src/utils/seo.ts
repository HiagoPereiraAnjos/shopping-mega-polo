import type { Store as PublicStore } from '../types';
import type { ResolvedSiteSettings } from '../hooks/useSiteSettings';

export type StructuredDataObject = Record<string, unknown>;

export interface BreadcrumbItem {
  name: string;
  path: string;
}

const DEFAULT_SITE_URL = 'http://localhost:5173';

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '');
}

function normalizeUrlCandidate(value: string): string | null {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  try {
    return trimTrailingSlash(new URL(normalized).toString());
  } catch {
    return null;
  }
}

export function getSiteBaseUrl(): string {
  if (typeof document !== 'undefined') {
    const settingsCandidate = normalizeUrlCandidate(
      document.documentElement.getAttribute('data-seo-base-url') ?? '',
    );
    if (settingsCandidate) {
      return settingsCandidate;
    }
  }

  const envCandidate = normalizeUrlCandidate(import.meta.env.VITE_SITE_URL ?? '');
  if (envCandidate) {
    return envCandidate;
  }

  if (typeof window !== 'undefined' && window.location?.origin) {
    return trimTrailingSlash(window.location.origin);
  }

  return DEFAULT_SITE_URL;
}

export function toAbsoluteUrl(pathOrUrl?: string | null): string | undefined {
  if (!pathOrUrl?.trim()) {
    return undefined;
  }

  const rawValue = pathOrUrl.trim();

  try {
    return new URL(rawValue).toString();
  } catch {
    const normalizedPath = rawValue.startsWith('/') ? rawValue : `/${rawValue}`;
    return `${getSiteBaseUrl()}${normalizedPath}`;
  }
}

export function getCanonicalUrl(pathOrUrl?: string | null): string {
  if (pathOrUrl?.trim()) {
    return toAbsoluteUrl(pathOrUrl) ?? `${getSiteBaseUrl()}/`;
  }

  if (typeof window !== 'undefined') {
    return `${getSiteBaseUrl()}${window.location.pathname}`;
  }

  return `${getSiteBaseUrl()}/`;
}

export function buildOrganizationStructuredData(
  settings: ResolvedSiteSettings,
): StructuredDataObject {
  const sameAs = [
    settings.instagram_url,
    settings.facebook_url,
    settings.linkedin_url,
  ].filter((value) => !!value?.trim());

  const contactPhone = settings.phone?.trim() || settings.whatsapp?.trim() || '';

  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: settings.site_name,
    url: getCanonicalUrl('/'),
    logo: toAbsoluteUrl(settings.logo_url),
    description: settings.short_description,
    ...(sameAs.length ? { sameAs } : {}),
    ...(contactPhone
      ? {
          contactPoint: [
            {
              '@type': 'ContactPoint',
              telephone: contactPhone,
              contactType: 'customer support',
              areaServed: 'BR',
              availableLanguage: 'pt-BR',
            },
          ],
        }
      : {}),
  };
}

export function buildShoppingCenterStructuredData(
  settings: ResolvedSiteSettings,
): StructuredDataObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'ShoppingCenter',
    name: settings.site_name,
    description: settings.short_description,
    url: getCanonicalUrl('/'),
    image: toAbsoluteUrl(
      settings.default_og_image_url || settings.institutional_image_url || settings.logo_url,
    ),
    telephone: settings.phone || settings.whatsapp,
    email: settings.email,
    openingHours: settings.opening_hours,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.address,
      addressLocality: 'Sao Paulo',
      addressRegion: 'SP',
      addressCountry: 'BR',
    },
  };
}

export function buildStoreStructuredData(
  store: PublicStore,
  settings: ResolvedSiteSettings,
): StructuredDataObject {
  const instagramValue = store.instagram?.replace(/^@+/, '').trim();
  const sameAs = instagramValue ? [`https://www.instagram.com/${instagramValue}`] : undefined;

  return {
    '@context': 'https://schema.org',
    '@type': 'Store',
    name: store.name,
    description:
      store.description ?? `Conheca a loja ${store.name} no Shopping Mega Polo Moda.`,
    url: getCanonicalUrl(`/lojas/${store.slug}`),
    image: toAbsoluteUrl(store.banner || store.image || settings.default_og_image_url),
    telephone: store.whatsapp || settings.whatsapp || settings.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: settings.address,
      addressLocality: 'Sao Paulo',
      addressRegion: 'SP',
      addressCountry: 'BR',
    },
    ...(sameAs ? { sameAs } : {}),
  };
}

export function buildBreadcrumbStructuredData(
  items: BreadcrumbItem[],
): StructuredDataObject {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: getCanonicalUrl(item.path),
    })),
  };
}
