import React from 'react';
import { Search, X } from 'lucide-react';

interface AdminFiltersProps {
  searchValue?: string;
  onSearchValueChange?: (value: string) => void;
  searchPlaceholder?: string;
  searchLabel?: string;
  filters?: React.ReactNode;
  actions?: React.ReactNode;
  onClearFilters?: () => void;
  disableClearFilters?: boolean;
  className?: string;
}

export default function AdminFilters({
  searchValue = '',
  onSearchValueChange,
  searchPlaceholder = 'Buscar...',
  searchLabel = 'Buscar registros',
  filters,
  actions,
  onClearFilters,
  disableClearFilters = false,
  className,
}: AdminFiltersProps) {
  const canShowSearch = typeof onSearchValueChange === 'function';
  const canClear = typeof onClearFilters === 'function';

  return (
    <section className={`rounded-2xl border border-brand-dark/10 bg-white p-4 md:p-5 ${className ?? ''}`}>
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-3 md:gap-4">
        {canShowSearch && (
          <div className="space-y-1.5">
            <label htmlFor="admin-filters-search" className="text-xs uppercase tracking-brand font-semibold text-brand-dark/60">
              {searchLabel}
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-brand-dark/40 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="admin-filters-search"
                type="search"
                value={searchValue}
                onChange={(event) => onSearchValueChange?.(event.target.value)}
                placeholder={searchPlaceholder}
                className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
              />
            </div>
          </div>
        )}

        {(filters || actions || canClear) && (
          <div className="flex items-end justify-end gap-2 flex-wrap">
            {filters}
            {actions}
            {canClear && (
              <button
                type="button"
                onClick={onClearFilters}
                disabled={disableClearFilters}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-brand-dark/15 text-xs font-semibold text-brand-dark/70 hover:text-brand-dark hover:bg-brand-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <X className="w-3.5 h-3.5" />
                Limpar filtros
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
