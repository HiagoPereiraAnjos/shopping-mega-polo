import React, { useEffect, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, X } from 'lucide-react';
import {
  ADMIN_BRAND_SUBTITLE,
  ADMIN_BRAND_TITLE,
  ADMIN_MENU_ITEMS,
  getAdminMenuItemsByGroup,
} from './adminNavigation';
import { ADMIN_HOME_PATH } from '../../config/adminRoutes';
import { useAuth } from '../../hooks/useAuth';
import { getRoleLabel, hasRole } from '../../lib/permissions';
import { ImageWithFallback } from '../ui/ImageWithFallback';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AdminSidebar({ isOpen, onClose }: AdminSidebarProps) {
  const { profile, user, signOut } = useAuth();
  const navigate = useNavigate();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [signOutError, setSignOutError] = useState<string | null>(null);
  const visibleMenuItems = ADMIN_MENU_ITEMS.filter((item) =>
    hasRole(profile, item.allowedRoles),
  );
  const visibleMenuGroups = getAdminMenuItemsByGroup(visibleMenuItems);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const handleSignOut = async () => {
    setSignOutError(null);
    setIsSigningOut(true);

    const result = await signOut();

    setIsSigningOut(false);

    if (result.error) {
      setSignOutError(result.error);
      return;
    }

    onClose();
    navigate('/login', { replace: true });
  };

  return (
    <>
      <div
        className={`fixed inset-0 bg-brand-dark/50 z-40 lg:hidden transition-opacity ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-brand-dark text-white border-r border-white/10 transition-transform duration-300 lg:translate-x-0 lg:static lg:flex lg:flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Menu administrativo"
      >
        <div className="h-full flex flex-col">
          <div className="px-6 pt-6 pb-5 border-b border-white/10">
            <div className="flex items-start justify-between gap-3">
              <Link to="/admin" onClick={onClose} className="space-y-3">
                <ImageWithFallback
                  src="/images/logo-mega-polo.png"
                  alt="Mega Polo Moda"
                  className="h-12 w-auto object-contain brightness-0 invert"
                  width={180}
                  height={48}
                  loading="eager"
                />
                <div>
                  <p className="text-[11px] uppercase tracking-brand text-white/70 font-semibold">
                    {ADMIN_BRAND_SUBTITLE}
                  </p>
                  <p className="text-sm font-semibold">{ADMIN_BRAND_TITLE}</p>
                </div>
              </Link>
              <button
                type="button"
                onClick={onClose}
                className="lg:hidden rounded-lg p-2 text-white/80 hover:bg-white/10"
                aria-label="Fechar menu administrativo"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <nav className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
            {visibleMenuGroups.map(({ group, items }) => (
              <section key={group.key} className="space-y-1.5">
                <p className="px-3.5 pb-1 text-[10px] uppercase tracking-brand text-white/45 font-semibold">
                  {group.label}
                </p>
                {items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === ADMIN_HOME_PATH}
                      onClick={onClose}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-brand-red text-white shadow-lg shadow-brand-red/20'
                            : 'text-white/75 hover:text-white hover:bg-white/10'
                        }`
                      }
                    >
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </NavLink>
                  );
                })}
              </section>
            ))}
          </nav>

          <div className="px-4 py-5 border-t border-white/10 space-y-4">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3.5">
              <p className="text-[11px] uppercase tracking-brand text-white/60 font-semibold">Sessão</p>
              <p className="mt-1 text-sm font-semibold truncate">{profile?.name ?? user?.email ?? 'Admin'}</p>
              <p className="text-xs uppercase tracking-brand text-white/60 mt-1">
                {profile ? getRoleLabel(profile.role) : 'Administrador'}
              </p>
            </div>

            {signOutError && (
              <p className="text-xs text-red-300 font-semibold" role="alert">
                {signOutError}
              </p>
            )}

            <button
              type="button"
              onClick={handleSignOut}
              disabled={isSigningOut}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 text-white px-4 py-2.5 text-sm font-semibold hover:bg-white/10 transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              <LogOut className="w-4 h-4" />
              {isSigningOut ? 'Saindo...' : 'Sair'}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
