import type { LucideIcon } from 'lucide-react';
import {
  Activity,
  Blocks,
  BriefcaseBusiness,
  FileText,
  FolderKanban,
  House,
  Image,
  LayoutDashboard,
  ListTree,
  Mail,
  Menu,
  Megaphone,
  Package,
  PanelBottom,
  Search,
  Settings,
  Store,
  Users,
} from 'lucide-react';
import type { AdminRole } from '../../lib/permissions';
import {
  ADMIN_ROUTE_ALLOWED_ROLES,
  ADMIN_ROUTE_PATHS,
  ADMIN_ROUTE_SEGMENTS,
  type AdminRouteKey,
} from '../../config/adminRoutes';

export interface AdminMenuItem {
  key: AdminRouteKey;
  icon: LucideIcon;
  label: string;
  path: string;
  segment: string;
  groupKey: AdminMenuGroupKey;
  allowedRoles: readonly AdminRole[];
}

export type AdminMenuGroupKey =
  | 'overview'
  | 'siteContent'
  | 'storeGuide'
  | 'commercial'
  | 'media'
  | 'system';

export interface AdminMenuGroup {
  key: AdminMenuGroupKey;
  label: string;
}

export const ADMIN_MENU_GROUPS: AdminMenuGroup[] = [
  { key: 'overview', label: 'Visao Geral' },
  { key: 'siteContent', label: 'Conteudo do Site' },
  { key: 'storeGuide', label: 'Guia de Lojas' },
  { key: 'commercial', label: 'Comercial' },
  { key: 'media', label: 'Midia' },
  { key: 'system', label: 'Sistema' },
];

export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  {
    key: 'dashboard',
    icon: LayoutDashboard,
    label: 'Dashboard',
    path: ADMIN_ROUTE_PATHS.dashboard,
    segment: ADMIN_ROUTE_SEGMENTS.dashboard,
    groupKey: 'overview',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.dashboard,
  },
  {
    key: 'home',
    icon: House,
    label: 'Home',
    path: ADMIN_ROUTE_PATHS.home,
    segment: ADMIN_ROUTE_SEGMENTS.home,
    groupKey: 'siteContent',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.home,
  },
  {
    key: 'pages',
    icon: FileText,
    label: 'Paginas',
    path: ADMIN_ROUTE_PATHS.pages,
    segment: ADMIN_ROUTE_SEGMENTS.pages,
    groupKey: 'siteContent',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.pages,
  },
  {
    key: 'contentBlocks',
    icon: Blocks,
    label: 'Blocos do Site',
    path: ADMIN_ROUTE_PATHS.contentBlocks,
    segment: ADMIN_ROUTE_SEGMENTS.contentBlocks,
    groupKey: 'siteContent',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.contentBlocks,
  },
  {
    key: 'navigation',
    icon: Menu,
    label: 'Menus',
    path: ADMIN_ROUTE_PATHS.navigation,
    segment: ADMIN_ROUTE_SEGMENTS.navigation,
    groupKey: 'siteContent',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.navigation,
  },
  {
    key: 'footer',
    icon: PanelBottom,
    label: 'Rodape',
    path: ADMIN_ROUTE_PATHS.footer,
    segment: ADMIN_ROUTE_SEGMENTS.footer,
    groupKey: 'siteContent',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.footer,
  },
  {
    key: 'seo',
    icon: Search,
    label: 'SEO',
    path: ADMIN_ROUTE_PATHS.seo,
    segment: ADMIN_ROUTE_SEGMENTS.seo,
    groupKey: 'siteContent',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.seo,
  },
  {
    key: 'stores',
    icon: Store,
    label: 'Lojas',
    path: ADMIN_ROUTE_PATHS.stores,
    segment: ADMIN_ROUTE_SEGMENTS.stores,
    groupKey: 'storeGuide',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.stores,
  },
  {
    key: 'categories',
    icon: ListTree,
    label: 'Categorias',
    path: ADMIN_ROUTE_PATHS.categories,
    segment: ADMIN_ROUTE_SEGMENTS.categories,
    groupKey: 'storeGuide',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.categories,
  },
  {
    key: 'products',
    icon: Package,
    label: 'Produtos',
    path: ADMIN_ROUTE_PATHS.products,
    segment: ADMIN_ROUTE_SEGMENTS.products,
    groupKey: 'storeGuide',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.products,
  },
  {
    key: 'launches',
    icon: Megaphone,
    label: 'Lancamentos',
    path: ADMIN_ROUTE_PATHS.launches,
    segment: ADMIN_ROUTE_SEGMENTS.launches,
    groupKey: 'storeGuide',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.launches,
  },
  {
    key: 'catalogs',
    icon: FolderKanban,
    label: 'Catalogos',
    path: ADMIN_ROUTE_PATHS.catalogs,
    segment: ADMIN_ROUTE_SEGMENTS.catalogs,
    groupKey: 'storeGuide',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.catalogs,
  },
  {
    key: 'leads',
    icon: BriefcaseBusiness,
    label: 'Leads',
    path: ADMIN_ROUTE_PATHS.leads,
    segment: ADMIN_ROUTE_SEGMENTS.leads,
    groupKey: 'commercial',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.leads,
  },
  {
    key: 'newsletter',
    icon: Mail,
    label: 'Newsletter',
    path: ADMIN_ROUTE_PATHS.newsletter,
    segment: ADMIN_ROUTE_SEGMENTS.newsletter,
    groupKey: 'commercial',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.newsletter,
  },
  {
    key: 'media',
    icon: Image,
    label: 'Biblioteca de Midia',
    path: ADMIN_ROUTE_PATHS.media,
    segment: ADMIN_ROUTE_SEGMENTS.media,
    groupKey: 'media',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.media,
  },
  {
    key: 'siteSettings',
    icon: Settings,
    label: 'Configuracoes',
    path: ADMIN_ROUTE_PATHS.siteSettings,
    segment: ADMIN_ROUTE_SEGMENTS.siteSettings,
    groupKey: 'system',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.siteSettings,
  },
  {
    key: 'users',
    icon: Users,
    label: 'Usuarios',
    path: ADMIN_ROUTE_PATHS.users,
    segment: ADMIN_ROUTE_SEGMENTS.users,
    groupKey: 'system',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.users,
  },
  {
    key: 'activityLogs',
    icon: Activity,
    label: 'Logs',
    path: ADMIN_ROUTE_PATHS.activityLogs,
    segment: ADMIN_ROUTE_SEGMENTS.activityLogs,
    groupKey: 'system',
    allowedRoles: ADMIN_ROUTE_ALLOWED_ROLES.activityLogs,
  },
];

export function getAdminMenuItemsByGroup(
  items: AdminMenuItem[],
): Array<{ group: AdminMenuGroup; items: AdminMenuItem[] }> {
  return ADMIN_MENU_GROUPS.map((group) => ({
    group,
    items: items.filter((item) => item.groupKey === group.key),
  })).filter((entry) => entry.items.length > 0);
}

export function getAdminPageTitle(pathname: string): string {
  const exactMatch = ADMIN_MENU_ITEMS.find((item) => item.path === pathname);
  if (exactMatch) {
    return exactMatch.label;
  }

  const partialMatch = ADMIN_MENU_ITEMS.find((item) => pathname.startsWith(`${item.path}/`));
  return partialMatch?.label ?? 'Admin';
}
export const ADMIN_BRAND_TITLE = 'CMS Mega Polo Moda';
export const ADMIN_BRAND_SUBTITLE = 'Painel Administrativo';
