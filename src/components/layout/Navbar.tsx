import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { Menu, User, X, MessageCircle, ShoppingBag, type LucideIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FALLBACK_NAVIGATION_ITEMS, type NavigationRuntimeItem } from '../../config/navigationFallback';
import { shouldUseMockFallback } from '../../config/environment';
import { useSiteSettings } from '../../hooks/useSiteSettings';
import { usePlanning } from '../../hooks/usePlanning';
import { useAuth } from '../../hooks/useAuth';
import { isSupabaseConfigured } from '../../lib/supabase';
import { listActiveNavigationItems, type NavigationLocation } from '../../services/navigation.service';
import { createWhatsAppLink } from '../../utils/whatsapp';
import { ImageWithFallback } from '../ui/ImageWithFallback';

const ICON_MAP: Record<string, LucideIcon> = {
  user: User,
  'message-circle': MessageCircle,
  whatsapp: MessageCircle,
  'shopping-bag': ShoppingBag,
  roteiro: ShoppingBag,
};

function normalizeIconKey(value: string | null | undefined): string {
  if (!value) {
    return '';
  }

  return value.trim().toLowerCase();
}

function isExternalUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(url);
}

function mapToRuntimeItems(items: Awaited<ReturnType<typeof listActiveNavigationItems>>['data']): NavigationRuntimeItem[] {
  return (items ?? []).map((item) => ({
    id: item.id,
    label: item.label,
    url: item.url,
    location: item.location as NavigationLocation,
    icon: item.icon,
    style: item.style,
    sort_order: item.sort_order,
    is_active: item.is_active,
    open_in_new_tab: item.open_in_new_tab,
    requires_auth: item.requires_auth,
  }));
}

function groupByLocation(items: NavigationRuntimeItem[]): Record<NavigationLocation, NavigationRuntimeItem[]> {
  const grouped: Record<NavigationLocation, NavigationRuntimeItem[]> = {
    main_nav: [],
    mobile_nav: [],
    header_cta: [],
    header_secondary: [],
    account_area: [],
  };

  for (const item of items) {
    const location = item.location;
    if (!(location in grouped)) {
      continue;
    }
    grouped[location].push(item);
  }

  for (const key of Object.keys(grouped) as NavigationLocation[]) {
    grouped[key].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }

  return grouped;
}

export default function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const canUseFallback = shouldUseMockFallback(true);
  const [navigationItems, setNavigationItems] = useState<NavigationRuntimeItem[]>(
    canUseFallback ? FALLBACK_NAVIGATION_ITEMS : [],
  );
  const { pathname } = useLocation();
  const { settings } = useSiteSettings();
  const { items } = usePlanning();
  const { isAuthenticated } = useAuth();

  const refreshNavigationItems = useCallback(async () => {
    if (!isSupabaseConfigured) {
      if (canUseFallback) {
        setNavigationItems(FALLBACK_NAVIGATION_ITEMS);
      } else {
        setNavigationItems([]);
      }
      return;
    }

    const result = await listActiveNavigationItems();

    if (result.error || !result.data?.length) {
      if (canUseFallback) {
        setNavigationItems(FALLBACK_NAVIGATION_ITEMS);
      } else {
        setNavigationItems([]);
      }
      return;
    }

    setNavigationItems(mapToRuntimeItems(result.data));
  }, [canUseFallback]);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setIsMobileMenuOpen(false);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [pathname]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshNavigationItems();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshNavigationItems]);

  const visibleItems = useMemo(() => {
    return navigationItems.filter((item) => item.is_active && (!item.requires_auth || isAuthenticated));
  }, [navigationItems, isAuthenticated]);

  const groupedItems = useMemo(() => groupByLocation(visibleItems), [visibleItems]);

  const desktopMainItems = groupedItems.main_nav;
  const desktopCtaItems = groupedItems.header_cta;
  const desktopSecondaryItems = groupedItems.header_secondary;
  const desktopAccountItems = groupedItems.account_area;
  const mobileItems = groupedItems.mobile_nav;

  const resolveItemIcon = (item: NavigationRuntimeItem): LucideIcon | null => {
    const key = normalizeIconKey(item.icon || item.style);
    return ICON_MAP[key] ?? null;
  };

  const resolveItemUrl = (item: NavigationRuntimeItem): string => {
    const isWhatsAppStyle =
      normalizeIconKey(item.style) === 'whatsapp' ||
      normalizeIconKey(item.icon) === 'whatsapp' ||
      normalizeIconKey(item.label).includes('whatsapp');

    if (isWhatsAppStyle) {
      return createWhatsAppLink(settings.whatsapp, settings.default_whatsapp_message);
    }

    return item.url;
  };

  const shouldOpenInNewTab = (item: NavigationRuntimeItem, resolvedUrl: string): boolean => {
    return item.open_in_new_tab || isExternalUrl(resolvedUrl);
  };

  const renderDesktopMainItem = (item: NavigationRuntimeItem) => {
    const resolvedUrl = resolveItemUrl(item);
    const external = shouldOpenInNewTab(item, resolvedUrl);

    if (external) {
      return (
        <a
          key={item.id}
          href={resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] tracking-brand font-bold uppercase transition-all duration-300 text-brand-dark/70 hover:text-brand-red relative group py-2"
        >
          {item.label}
          <span className="absolute bottom-0 left-0 h-0.5 bg-brand-red transition-all duration-300 w-0 group-hover:w-full" />
        </a>
      );
    }

    return (
      <NavLink
        key={item.id}
        to={resolvedUrl}
        className={({ isActive }) =>
          `text-[11px] tracking-brand font-bold uppercase transition-all duration-300 relative group py-2 ${
            isActive ? 'text-brand-red' : 'text-brand-dark/70 hover:text-brand-red'
          }`
        }
      >
        {item.label}
        <span
          className={`absolute bottom-0 left-0 h-0.5 bg-brand-red transition-all duration-300 ${
            pathname === resolvedUrl ? 'w-full' : 'w-0 group-hover:w-full'
          }`}
        />
      </NavLink>
    );
  };

  const renderDesktopActionItem = (item: NavigationRuntimeItem) => {
    const resolvedUrl = resolveItemUrl(item);
    const external = shouldOpenInNewTab(item, resolvedUrl);
    const Icon = resolveItemIcon(item);
    const baseStyle = normalizeIconKey(item.style) || 'default';

    const className = (() => {
      if (baseStyle === 'primary') {
        return 'px-7 xl:px-8 py-3 bg-brand-red text-white text-[10px] tracking-brand font-bold rounded-lg hover:bg-brand-dark transition-all duration-300 shadow-lg shadow-brand-red/10 uppercase';
      }
      if (baseStyle === 'whatsapp') {
        return 'flex items-center gap-2 text-[10px] tracking-brand font-bold text-brand-dark/60 hover:text-green-600 transition-colors uppercase';
      }
      if (baseStyle === 'route') {
        return 'inline-flex items-center gap-2 text-[10px] tracking-brand font-bold text-brand-dark/60 hover:text-brand-red transition-colors uppercase';
      }
      if (baseStyle === 'account') {
        return 'flex items-center gap-2 text-[10px] tracking-brand font-bold text-brand-dark/40 hover:text-brand-red transition-colors uppercase group';
      }
      if (baseStyle === 'secondary') {
        return 'inline-flex items-center gap-2 px-4 py-2 border border-brand-dark/15 rounded-lg text-[10px] tracking-brand font-bold text-brand-dark/70 hover:text-brand-red hover:border-brand-red/40 transition-colors uppercase';
      }
      return 'inline-flex items-center gap-2 text-[10px] tracking-brand font-bold text-brand-dark/60 hover:text-brand-red transition-colors uppercase';
    })();

    const children = (
      <>
        {Icon && <Icon className={baseStyle === 'primary' ? 'w-4 h-4' : 'w-3.5 h-3.5'} />}
        <span>{item.label}</span>
        {baseStyle === 'route' && (
          <span className="inline-flex items-center justify-center min-w-5 h-5 px-1 rounded-full bg-brand-paper border border-brand-dark/10 text-[9px] text-brand-dark">
            {items.length}
          </span>
        )}
      </>
    );

    if (external) {
      return (
        <a key={item.id} href={resolvedUrl} target="_blank" rel="noopener noreferrer" className={className}>
          {children}
        </a>
      );
    }

    return (
      <Link key={item.id} to={resolvedUrl} className={className}>
        {children}
      </Link>
    );
  };

  const renderMobileItem = (item: NavigationRuntimeItem) => {
    const resolvedUrl = resolveItemUrl(item);
    const external = shouldOpenInNewTab(item, resolvedUrl);
    const Icon = resolveItemIcon(item);
    const baseStyle = normalizeIconKey(item.style) || 'default';

    const className = (() => {
      if (baseStyle === 'primary') {
        return 'w-full py-4 bg-brand-red text-white text-[11px] tracking-brand font-bold rounded-lg flex items-center justify-center gap-3 shadow-lg uppercase';
      }
      if (baseStyle === 'whatsapp') {
        return 'w-full py-4 bg-green-50 text-green-600 text-[11px] tracking-brand font-bold rounded-lg flex items-center justify-center gap-3 border border-green-200 uppercase';
      }
      if (baseStyle === 'account') {
        return 'w-full py-4 bg-brand-paper text-brand-dark/70 text-[11px] tracking-brand font-bold rounded-lg flex items-center justify-center gap-3 border border-brand-dark/10 uppercase';
      }
      if (baseStyle === 'route') {
        return 'w-full py-4 bg-brand-paper text-brand-dark text-[11px] tracking-brand font-bold rounded-lg flex items-center justify-center gap-3 border border-brand-dark/10 uppercase';
      }
      return 'block w-full rounded-lg px-2 py-3 text-xl font-serif italic text-brand-dark hover:text-brand-red hover:bg-brand-paper transition-colors';
    })();

    const children = (
      <>
        {Icon && <Icon className="w-4 h-4" />}
        <span>
          {baseStyle === 'route' ? `${item.label} (${items.length})` : item.label}
        </span>
      </>
    );

    if (external) {
      return (
        <a
          key={item.id}
          href={resolvedUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => setIsMobileMenuOpen(false)}
          className={className}
        >
          {children}
        </a>
      );
    }

    return (
      <Link
        key={item.id}
        to={resolvedUrl}
        onClick={() => setIsMobileMenuOpen(false)}
        className={className}
      >
        {children}
      </Link>
    );
  };

  return (
    <nav
      aria-label="Navegação principal"
      className={`fixed top-0 left-0 right-0 z-50 bg-white border-b border-brand-dark/10 transition-shadow duration-300 ${
        isScrolled ? 'shadow-[0_4px_18px_rgba(0,0,0,0.05)]' : 'shadow-none'
      }`}
    >
      <div className="container-custom h-[80px] md:h-[86px] grid grid-cols-[auto_1fr_auto] items-center gap-4 md:gap-8">
        <Link
          to="/"
          onClick={() => setIsMobileMenuOpen(false)}
          className="flex items-center"
          aria-label={`Ir para a página inicial ${settings.site_name}`}
        >
          <ImageWithFallback
            src={settings.logo_url}
            alt={settings.site_name}
            className="h-12 md:h-[68px] w-auto object-contain"
            loading="eager"
            width={240}
            height={80}
            sizes="(max-width: 768px) 160px, 240px"
          />
        </Link>

        <div className="hidden lg:flex items-center justify-center gap-8 xl:gap-10">
          {desktopMainItems.map(renderDesktopMainItem)}
        </div>

        <div className="flex items-center justify-end">
          <div className="hidden lg:flex items-center gap-6 xl:gap-8">
            {desktopCtaItems.map(renderDesktopActionItem)}
            {desktopSecondaryItems.map(renderDesktopActionItem)}
            {desktopAccountItems.map(renderDesktopActionItem)}
          </div>

          <button
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            className="p-2 hover:bg-brand-dark/5 rounded-md transition-colors lg:hidden"
            aria-label={isMobileMenuOpen ? 'Fechar menu' : 'Abrir menu'}
            aria-expanded={isMobileMenuOpen}
            aria-controls="mobile-main-menu"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5 text-brand-red" /> : <Menu className="w-5 h-5 text-brand-dark" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            id="mobile-main-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="lg:hidden absolute top-full left-0 right-0 z-[60] bg-white border-t border-brand-dark/5 shadow-2xl overflow-y-auto overflow-x-hidden max-h-[calc(100vh-80px)]"
          >
            <div className="px-5 py-6 space-y-6">
              {mobileItems.length > 0 ? (
                <div className="space-y-3">
                  {mobileItems.map(renderMobileItem)}
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-sm text-brand-dark/60">
                    Nenhum item de menu mobile publicado no momento.
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
