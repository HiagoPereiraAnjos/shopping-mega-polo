import type { TableInsert, TableRow, TableUpdate } from './database';

export type SiteSettings = TableRow<'site_settings'>;
export type Page = TableRow<'pages'>;
export type HomeSection = TableRow<'home_sections'>;
export type ContentBlock = TableRow<'content_blocks'>;
export type ContentBlockItem = TableRow<'content_block_items'>;
export type NavigationItem = TableRow<'navigation_items'>;
export type FooterSection = TableRow<'footer_sections'>;
export type FooterLink = TableRow<'footer_links'>;
export type Category = TableRow<'categories'>;
export type Store = TableRow<'stores'>;
export type StoreProduct = TableRow<'store_products'>;
export type StoreMedia = TableRow<'store_media'>;
export type Catalog = TableRow<'catalogs'>;
export type Launch = TableRow<'launches'>;
export type Lead = TableRow<'leads'>;
export type NewsletterSubscriber = TableRow<'newsletter_subscribers'>;
export type AdminProfile = TableRow<'admin_profiles'>;
export type ActivityLog = TableRow<'activity_logs'>;

export type SiteSettingsUpsert = TableUpdate<'site_settings'>;
export type PageInsert = TableInsert<'pages'>;
export type PageUpdate = TableUpdate<'pages'>;
export type HomeSectionInsert = TableInsert<'home_sections'>;
export type HomeSectionUpdate = TableUpdate<'home_sections'>;
export type ContentBlockInsert = TableInsert<'content_blocks'>;
export type ContentBlockUpdate = TableUpdate<'content_blocks'>;
export type ContentBlockItemInsert = TableInsert<'content_block_items'>;
export type ContentBlockItemUpdate = TableUpdate<'content_block_items'>;
export type NavigationItemInsert = TableInsert<'navigation_items'>;
export type NavigationItemUpdate = TableUpdate<'navigation_items'>;
export type FooterSectionInsert = TableInsert<'footer_sections'>;
export type FooterSectionUpdate = TableUpdate<'footer_sections'>;
export type FooterLinkInsert = TableInsert<'footer_links'>;
export type FooterLinkUpdate = TableUpdate<'footer_links'>;
export type StoreInsert = TableInsert<'stores'>;
export type StoreUpdate = TableUpdate<'stores'>;
export type StoreProductInsert = TableInsert<'store_products'>;
export type StoreProductUpdate = TableUpdate<'store_products'>;
export type LaunchInsert = TableInsert<'launches'>;
export type LaunchUpdate = TableUpdate<'launches'>;
export type CategoryInsert = TableInsert<'categories'>;
export type CategoryUpdate = TableUpdate<'categories'>;
export type CatalogInsert = TableInsert<'catalogs'>;
export type CatalogUpdate = TableUpdate<'catalogs'>;
export type NewsletterInsert = TableInsert<'newsletter_subscribers'>;
export type LeadInsert = TableInsert<'leads'>;

export interface CmsServiceResult<T> {
  data: T | null;
  error: string | null;
}

export interface StoreQueryFilters {
  categoryId?: string;
  featuredOnly?: boolean;
  publishedOnly?: boolean;
  status?: 'all' | 'published' | 'unpublished';
  query?: string;
  segment?: string;
  floor?: string;
  hasCatalogDigital?: boolean;
  limit?: number;
}

export interface LaunchQueryFilters {
  categoryId?: string;
  featuredOnly?: boolean;
  publishedOnly?: boolean;
  storeId?: string;
  status?: 'all' | 'published' | 'unpublished';
  query?: string;
  includeExpired?: boolean;
  limit?: number;
}

export interface CategoryQueryFilters {
  activeOnly?: boolean;
  query?: string;
}

export interface CatalogQueryFilters {
  storeId?: string;
  activeOnly?: boolean;
}

export interface LeadFormPayload {
  type: string;
  name: string;
  email?: string;
  phone?: string;
  message?: string;
  company?: string;
  cnpj?: string;
  segment?: string;
  source_page?: string;
}

export interface NewsletterPayload {
  email: string;
  name?: string;
  consent?: boolean;
}
