import React from 'react';
import { Menu } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { getAdminPageTitle } from './adminNavigation';
import { useAuth } from '../../hooks/useAuth';

interface AdminHeaderProps {
  onOpenSidebar: () => void;
}

function formatDate(value: Date): string {
  return value.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

export default function AdminHeader({ onOpenSidebar }: AdminHeaderProps) {
  const location = useLocation();
  const { profile, user } = useAuth();
  const title = getAdminPageTitle(location.pathname);

  return (
    <header className="sticky top-0 z-30 bg-brand-paper/95 backdrop-blur border-b border-brand-dark/10">
      <div className="h-16 md:h-[74px] px-4 md:px-6 lg:px-8 flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onOpenSidebar}
              className="lg:hidden rounded-xl border border-brand-dark/15 p-2 text-brand-dark hover:bg-white"
              aria-label="Abrir menu administrativo"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-brand text-brand-dark/60 font-semibold">
                Painel Administrativo
              </p>
              <h1 className="text-lg md:text-xl font-serif font-semibold truncate">{title}</h1>
            </div>
          </div>
        </div>

        <div className="text-right shrink-0">
          <p className="text-sm font-semibold text-brand-dark truncate max-w-[180px] md:max-w-none">
            {profile?.name ?? user?.email ?? 'Administrador'}
          </p>
          <p className="text-xs text-brand-dark/60 uppercase tracking-brand">{formatDate(new Date())}</p>
        </div>
      </div>
    </header>
  );
}
