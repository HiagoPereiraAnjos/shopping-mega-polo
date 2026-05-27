import React from 'react';
import { FALLBACK_SITE_SETTINGS } from '../../config/siteSettingsFallback';
import { getCanonicalUrl, toAbsoluteUrl, type StructuredDataObject } from '../../utils/seo';

/**
 * SEO component to update title, meta tags and JSON-LD structured data.
 */
interface SEOProps {
  title: string;
  description?: string;
  canonical?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogType?: string;
  twitterCard?: string;
  robots?: string;
  keywords?: string;
  language?: string;
  structuredData?: StructuredDataObject | StructuredDataObject[];
}

const NOINDEX_ROUTE_PREFIXES = ['/admin', '/dashboard', '/login'] as const;

function shouldForceNoindex(pathname: string): boolean {
  const normalizedPath = pathname.toLowerCase();
  return NOINDEX_ROUTE_PREFIXES.some((prefix) => (
    normalizedPath === prefix || normalizedPath.startsWith(`${prefix}/`)
  ));
}

function appendMeta(
  key: 'name' | 'property',
  value: string,
  content: string,
): void {
  const meta = document.createElement('meta');
  meta.setAttribute('data-seo-managed', 'true');
  meta.setAttribute(key, value);
  meta.setAttribute('content', content);
  document.head.appendChild(meta);
}

function appendCanonical(canonicalUrl: string): void {
  const link = document.createElement('link');
  link.setAttribute('data-seo-managed', 'true');
  link.setAttribute('rel', 'canonical');
  link.setAttribute('href', canonicalUrl);
  document.head.appendChild(link);
}

function appendStructuredData(payload: StructuredDataObject): void {
  const script = document.createElement('script');
  script.setAttribute('data-seo-managed', 'true');
  script.setAttribute('type', 'application/ld+json');
  script.text = JSON.stringify(payload);
  document.head.appendChild(script);
}

function getGlobalSeoFallbacks() {
  if (typeof document === 'undefined') {
    return {
      siteName: FALLBACK_SITE_SETTINGS.site_name,
      description: FALLBACK_SITE_SETTINGS.short_description,
      defaultOgImage: FALLBACK_SITE_SETTINGS.default_og_image_url,
      defaultRobots: FALLBACK_SITE_SETTINGS.seo_default_robots,
      defaultLanguage: FALLBACK_SITE_SETTINGS.seo_default_language,
      defaultKeywords: FALLBACK_SITE_SETTINGS.seo_keywords,
    };
  }

  const siteName =
    document.documentElement.getAttribute('data-seo-site-name')?.trim() ||
    FALLBACK_SITE_SETTINGS.site_name;
  const description =
    document.documentElement.getAttribute('data-seo-site-description')?.trim() ||
    FALLBACK_SITE_SETTINGS.short_description;
  const defaultOgImage =
    document.documentElement.getAttribute('data-seo-default-og-image')?.trim() ||
    FALLBACK_SITE_SETTINGS.default_og_image_url;
  const defaultRobots =
    document.documentElement.getAttribute('data-seo-default-robots')?.trim() ||
    FALLBACK_SITE_SETTINGS.seo_default_robots;
  const defaultLanguage =
    document.documentElement.getAttribute('data-seo-default-language')?.trim() ||
    FALLBACK_SITE_SETTINGS.seo_default_language;
  const defaultKeywords =
    document.documentElement.getAttribute('data-seo-default-keywords')?.trim() ||
    FALLBACK_SITE_SETTINGS.seo_keywords;

  return { siteName, description, defaultOgImage, defaultRobots, defaultLanguage, defaultKeywords };
}

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  canonical,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  twitterCard,
  robots,
  keywords,
  language,
  structuredData,
}) => {
  React.useEffect(() => {
    const globalSeoFallbacks = getGlobalSeoFallbacks();
    const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
    const resolvedRobots = shouldForceNoindex(pathname)
      ? 'noindex,nofollow'
      : (robots?.trim() || globalSeoFallbacks.defaultRobots);
    const resolvedLanguage = language?.trim() || globalSeoFallbacks.defaultLanguage || 'pt-BR';
    const resolvedKeywords = keywords?.trim() || globalSeoFallbacks.defaultKeywords;
    const fullTitle = title.includes(globalSeoFallbacks.siteName)
      ? title
      : `${title} | ${globalSeoFallbacks.siteName}`;
    const descriptionValue = description?.trim() || globalSeoFallbacks.description;
    const canonicalUrl = getCanonicalUrl(canonical);
    const ogTitleValue = ogTitle?.trim() || fullTitle;
    const ogDescriptionValue = ogDescription?.trim() || descriptionValue;
    const ogImageValue = toAbsoluteUrl(ogImage?.trim() || globalSeoFallbacks.defaultOgImage);
    const twitterCardValue = twitterCard ?? (ogImageValue ? 'summary_large_image' : 'summary');
    const structuredDataList = Array.isArray(structuredData)
      ? structuredData
      : structuredData
        ? [structuredData]
        : [];

    document.title = fullTitle;
    document.documentElement.lang = resolvedLanguage;

    document
      .querySelectorAll('[data-seo-managed="true"]')
      .forEach((node) => node.remove());

    if (descriptionValue) {
      appendMeta('name', 'description', descriptionValue);
    }
    if (resolvedKeywords) {
      appendMeta('name', 'keywords', resolvedKeywords);
    }

    appendCanonical(canonicalUrl);
    appendMeta('name', 'robots', resolvedRobots);
    appendMeta('property', 'og:title', ogTitleValue);
    appendMeta('property', 'og:type', ogType);
    appendMeta('property', 'og:locale', resolvedLanguage.replace('-', '_'));

    if (ogDescriptionValue) {
      appendMeta('property', 'og:description', ogDescriptionValue);
    }

    appendMeta('property', 'og:url', canonicalUrl);

    if (ogImageValue) {
      appendMeta('property', 'og:image', ogImageValue);
    }

    appendMeta('name', 'twitter:card', twitterCardValue);

    if (ogTitleValue) {
      appendMeta('name', 'twitter:title', ogTitleValue);
    }

    if (ogDescriptionValue) {
      appendMeta('name', 'twitter:description', ogDescriptionValue);
    }

    if (ogImageValue) {
      appendMeta('name', 'twitter:image', ogImageValue);
    }

    structuredDataList.forEach((entry) => {
      appendStructuredData(entry);
    });
  }, [
    canonical,
    description,
    ogDescription,
    ogImage,
    ogTitle,
    ogType,
    keywords,
    language,
    robots,
    structuredData,
    title,
    twitterCard,
  ]);

  return null;
};
