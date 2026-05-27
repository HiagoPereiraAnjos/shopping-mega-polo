import type { AdminRole } from '../lib/permissions';
import {
  CMS_ROLES,
  CONTENT_EDITOR_ROLES,
  LEADS_MANAGER_ROLES,
  LOG_MANAGER_ROLES,
  NEWSLETTER_MANAGER_ROLES,
  SETTINGS_EDITOR_ROLES,
  USER_MANAGER_ROLES,
} from '../lib/permissions';

export const ADMIN_ROUTE_PATHS = {
  dashboard: '/admin',
  siteSettings: '/admin/site-settings',
  navigation: '/admin/navigation',
  footer: '/admin/footer',
  home: '/admin/home',
  contentBlocks: '/admin/content-blocks',
  pages: '/admin/pages',
  stores: '/admin/stores',
  products: '/admin/products',
  categories: '/admin/categories',
  launches: '/admin/launches',
  catalogs: '/admin/catalogs',
  leads: '/admin/leads',
  newsletter: '/admin/newsletter',
  media: '/admin/media',
  seo: '/admin/seo',
  users: '/admin/users',
  activityLogs: '/admin/activity-logs',
} as const;

export type AdminRouteKey = keyof typeof ADMIN_ROUTE_PATHS;

export const ADMIN_ROUTE_SEGMENTS: Record<AdminRouteKey, string> = {
  dashboard: '',
  siteSettings: 'site-settings',
  navigation: 'navigation',
  footer: 'footer',
  home: 'home',
  contentBlocks: 'content-blocks',
  pages: 'pages',
  stores: 'stores',
  products: 'products',
  categories: 'categories',
  launches: 'launches',
  catalogs: 'catalogs',
  leads: 'leads',
  newsletter: 'newsletter',
  media: 'media',
  seo: 'seo',
  users: 'users',
  activityLogs: 'activity-logs',
};

export const ADMIN_ROUTE_ALLOWED_ROLES: Record<AdminRouteKey, readonly AdminRole[]> = {
  dashboard: CMS_ROLES,
  siteSettings: SETTINGS_EDITOR_ROLES,
  navigation: CMS_ROLES,
  footer: CMS_ROLES,
  home: CONTENT_EDITOR_ROLES,
  contentBlocks: CMS_ROLES,
  pages: CMS_ROLES,
  stores: CMS_ROLES,
  products: CMS_ROLES,
  categories: CONTENT_EDITOR_ROLES,
  launches: CONTENT_EDITOR_ROLES,
  catalogs: CONTENT_EDITOR_ROLES,
  leads: LEADS_MANAGER_ROLES,
  newsletter: NEWSLETTER_MANAGER_ROLES,
  media: CONTENT_EDITOR_ROLES,
  seo: CONTENT_EDITOR_ROLES,
  users: USER_MANAGER_ROLES,
  activityLogs: LOG_MANAGER_ROLES,
};

export const ADMIN_HOME_PATH = ADMIN_ROUTE_PATHS.dashboard;
