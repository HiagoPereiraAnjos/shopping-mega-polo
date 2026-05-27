import type { NavigationLocation } from '../services/navigation.service';

export interface NavigationRuntimeItem {
  id: string;
  label: string;
  url: string;
  location: NavigationLocation;
  icon: string | null;
  style: string | null;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
  requires_auth: boolean;
}

export const FALLBACK_NAVIGATION_ITEMS: NavigationRuntimeItem[] = [
  { id: 'nav-main-1', label: 'Lojas', url: '/lojas', location: 'main_nav', icon: null, style: 'default', sort_order: 1, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-main-2', label: 'Lancamentos', url: '/lancamentos', location: 'main_nav', icon: null, style: 'default', sort_order: 2, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-main-3', label: 'Planeje sua visita', url: '/planeje-sua-visita', location: 'main_nav', icon: null, style: 'default', sort_order: 3, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-main-4', label: 'Abra sua loja', url: '/abra-sua-loja', location: 'main_nav', icon: null, style: 'default', sort_order: 4, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-cta-1', label: 'Lojas', url: '/lojas', location: 'header_cta', icon: null, style: 'primary', sort_order: 1, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-secondary-1', label: 'WhatsApp', url: '#whatsapp', location: 'header_secondary', icon: 'message-circle', style: 'whatsapp', sort_order: 1, is_active: true, open_in_new_tab: true, requires_auth: false },
  { id: 'nav-secondary-2', label: 'Meu roteiro', url: '/meu-roteiro', location: 'header_secondary', icon: 'shopping-bag', style: 'route', sort_order: 2, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-account-1', label: 'Area do Lojista', url: '/login', location: 'account_area', icon: 'user', style: 'account', sort_order: 1, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-mobile-1', label: 'Lojas', url: '/lojas', location: 'mobile_nav', icon: null, style: 'primary', sort_order: 1, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-mobile-2', label: 'Lancamentos', url: '/lancamentos', location: 'mobile_nav', icon: null, style: 'default', sort_order: 2, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-mobile-3', label: 'Planeje sua visita', url: '/planeje-sua-visita', location: 'mobile_nav', icon: null, style: 'default', sort_order: 3, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-mobile-4', label: 'Abra sua loja', url: '/abra-sua-loja', location: 'mobile_nav', icon: null, style: 'default', sort_order: 4, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-mobile-5', label: 'Meu roteiro', url: '/meu-roteiro', location: 'mobile_nav', icon: 'shopping-bag', style: 'route', sort_order: 5, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-mobile-6', label: 'Area do Lojista', url: '/login', location: 'mobile_nav', icon: 'user', style: 'account', sort_order: 6, is_active: true, open_in_new_tab: false, requires_auth: false },
  { id: 'nav-mobile-7', label: 'WhatsApp', url: '#whatsapp', location: 'mobile_nav', icon: 'message-circle', style: 'whatsapp', sort_order: 7, is_active: true, open_in_new_tab: true, requires_auth: false },
];
