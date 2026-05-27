import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
  Pencil,
  Plus,
  RefreshCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import { SEO } from '../../components/ui/SEO';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminFormSection from '../../components/admin/AdminFormSection';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import AdminTable, { type AdminTableColumn } from '../../components/admin/AdminTable';
import ConfirmDialog from '../../components/admin/ConfirmDialog';
import StatusBadge from '../../components/admin/StatusBadge';
import { useAuth } from '../../hooks/useAuth';
import { canEditContent, getRoleLabel } from '../../lib/permissions';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  createNavigationItem,
  deleteNavigationItem,
  listNavigationItems,
  NAVIGATION_LOCATIONS,
  reorderNavigationItems,
  updateNavigationItem,
  type NavigationLocation,
} from '../../services/navigation.service';
import type { NavigationItem } from '../../types/cms';
import { normalizeSearchText } from '../../utils/storeMappers';

interface NavigationFormState {
  label: string;
  url: string;
  location: NavigationLocation;
  icon: string;
  style: string;
  sort_order: string;
  is_active: boolean;
  open_in_new_tab: boolean;
  requires_auth: boolean;
}

const LOCATION_LABELS: Record<NavigationLocation, string> = {
  main_nav: 'Menu principal',
  mobile_nav: 'Menu mobile',
  header_cta: 'Header CTA',
  header_secondary: 'Header secundario',
  account_area: 'Area da conta',
};

const STYLE_SUGGESTIONS = [
  'default',
  'primary',
  'secondary',
  'whatsapp',
  'route',
  'account',
  'ghost',
];

function getNextSortOrder(items: NavigationItem[]): number {
  if (!items.length) {
    return 0;
  }

  return Math.max(...items.map((item) => item.sort_order ?? 0)) + 1;
}

function parseSortOrder(rawValue: string): { value: number | null; error: string | null } {
  const normalized = rawValue.trim();
  if (!normalized) {
    return { value: 0, error: null };
  }

  if (!/^-?[0-9]+$/.test(normalized)) {
    return { value: null, error: 'sort_order deve ser numerico.' };
  }

  return { value: Number.parseInt(normalized, 10), error: null };
}

function normalizeInput(value: string): string {
  return value.trim();
}

function isExternalUrl(value: string): boolean {
  return /^(https?:\/\/|mailto:|tel:)/i.test(value.trim());
}

function getLocationDescription(location: NavigationLocation): string {
  if (location === 'main_nav') {
    return 'Itens exibidos no menu principal do desktop.';
  }
  if (location === 'mobile_nav') {
    return 'Itens exibidos no menu mobile em coluna.';
  }
  if (location === 'header_cta') {
    return 'Acoes de destaque no canto direito do header.';
  }
  if (location === 'header_secondary') {
    return 'Acoes secundarias como WhatsApp e roteiro.';
  }
  return 'Atalhos da area de conta.';
}

function createInitialForm(location: NavigationLocation, sortOrder = 0): NavigationFormState {
  return {
    label: '',
    url: '',
    location,
    icon: '',
    style: 'default',
    sort_order: String(sortOrder),
    is_active: true,
    open_in_new_tab: false,
    requires_auth: false,
  };
}

function mapItemToForm(item: NavigationItem): NavigationFormState {
  return {
    label: item.label,
    url: item.url,
    location: item.location as NavigationLocation,
    icon: item.icon ?? '',
    style: item.style ?? 'default',
    sort_order: String(item.sort_order ?? 0),
    is_active: item.is_active,
    open_in_new_tab: item.open_in_new_tab,
    requires_auth: item.requires_auth,
  };
}

export default function NavigationAdmin() {
  const { profile } = useAuth();
  const canEdit = canEditContent(profile);

  const [locationFilter, setLocationFilter] = useState<NavigationLocation>('main_nav');
  const [items, setItems] = useState<NavigationItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<NavigationFormState>(() => createInitialForm('main_nav'));
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<NavigationItem | null>(null);

  const orderedItems = useMemo(
    () => [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [items],
  );

  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    if (!normalizedSearch) {
      return orderedItems;
    }

    return orderedItems.filter((item) => {
      const blob = normalizeSearchText(
        `${item.label} ${item.url} ${item.location} ${item.style ?? ''} ${item.icon ?? ''}`,
      );
      return blob.includes(normalizedSearch);
    });
  }, [orderedItems, searchTerm]);

  const nextSortOrder = useMemo(() => getNextSortOrder(orderedItems), [orderedItems]);
  const locationDescription = useMemo(
    () => getLocationDescription(locationFilter),
    [locationFilter],
  );
  const activeCount = useMemo(
    () => orderedItems.filter((item) => item.is_active).length,
    [orderedItems],
  );
  const inactiveCount = useMemo(
    () => orderedItems.filter((item) => !item.is_active).length,
    [orderedItems],
  );
  const normalizedUrlPreview = normalizeInput(form.url);
  const isExternalUrlPreview = isExternalUrl(normalizedUrlPreview);

  const resetForm = useCallback(
    (location: NavigationLocation, sortOrder: number) => {
      setForm(createInitialForm(location, sortOrder));
      setEditingId(null);
      setFormError(null);
    },
    [],
  );

  const refreshItems = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await listNavigationItems(locationFilter);
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      setItems([]);
      return;
    }

    setItems(result.data ?? []);
  }, [locationFilter]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshItems();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshItems]);

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
    setFormError(null);
  };

  const handleChangeLocationFilter = (nextLocation: NavigationLocation) => {
    clearMessages();
    setLocationFilter(nextLocation);
    setSearchTerm('');
    resetForm(nextLocation, 0);
  };

  const handleStartCreate = () => {
    clearMessages();
    resetForm(locationFilter, nextSortOrder);
  };

  const handleStartEdit = (item: NavigationItem) => {
    clearMessages();
    setEditingId(item.id);
    setForm(mapItemToForm(item));
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!canEdit) {
      setFormError('Seu perfil possui acesso somente leitura para menus.');
      return;
    }

    if (!normalizeInput(form.label)) {
      setFormError('label e obrigatorio.');
      return;
    }

    if (!normalizeInput(form.url)) {
      setFormError('url e obrigatorio.');
      return;
    }

    const sortOrder = parseSortOrder(form.sort_order);
    if (sortOrder.error || sortOrder.value === null) {
      setFormError(sortOrder.error ?? 'sort_order invalido.');
      return;
    }

    setIsMutating(true);

    const payload = {
      label: normalizeInput(form.label),
      url: normalizeInput(form.url),
      location: form.location,
      icon: normalizeInput(form.icon) || null,
      style: normalizeInput(form.style) || null,
      sort_order: sortOrder.value,
      is_active: form.is_active,
      open_in_new_tab: form.open_in_new_tab,
      requires_auth: form.requires_auth,
    };

    const result = editingId
      ? await updateNavigationItem(editingId, payload)
      : await createNavigationItem(payload);

    setIsMutating(false);

    if (result.error) {
      setFormError(result.error);
      return;
    }

    await refreshItems();
    setSuccessMessage(editingId ? 'Item de menu atualizado com sucesso.' : 'Item de menu criado com sucesso.');
    resetForm(locationFilter, getNextSortOrder(items));
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    if (!canEdit) {
      setPendingDelete(null);
      setSuccessMessage('Seu perfil possui acesso somente leitura para menus.');
      return;
    }

    setIsMutating(true);
    const result = await deleteNavigationItem(pendingDelete.id);
    setIsMutating(false);

    if (!result.error) {
      await refreshItems();
      setSuccessMessage('Item de menu removido com sucesso.');
      if (editingId === pendingDelete.id) {
        resetForm(locationFilter, getNextSortOrder(items));
      }
    }

    setPendingDelete(null);
  };

  const handleToggleActive = async (item: NavigationItem) => {
    clearMessages();

    if (!canEdit) {
      setSuccessMessage('Seu perfil possui acesso somente leitura para menus.');
      return;
    }

    setIsMutating(true);
    const result = await updateNavigationItem(item.id, { is_active: !item.is_active });
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await refreshItems();
    setSuccessMessage(item.is_active ? 'Item desativado.' : 'Item ativado.');
  };

  const handleMove = async (id: string, direction: 'up' | 'down') => {
    clearMessages();

    if (!canEdit) {
      setSuccessMessage('Seu perfil possui acesso somente leitura para menus.');
      return;
    }

    const currentIndex = orderedItems.findIndex((item) => item.id === id);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedItems.length) {
      return;
    }

    const reordered = [...orderedItems];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    setIsMutating(true);
    const result = await reorderNavigationItems(
      locationFilter,
      reordered.map((item, index) => ({
        id: item.id,
        sort_order: index,
      })),
    );
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setItems(result.data ?? []);
    setSuccessMessage('Ordem dos menus atualizada.');
  };

  const columns: Array<AdminTableColumn<NavigationItem>> = [
    {
      key: 'label',
      label: 'Label',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.label}</p>
          <p className="text-xs text-brand-dark/60">{row.url}</p>
        </div>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (row) => (
        <span className="text-xs text-brand-dark/80">
          {LOCATION_LABELS[row.location as NavigationLocation] ?? row.location}
        </span>
      ),
    },
    {
      key: 'style',
      label: 'Estilo',
      render: (row) => (
        <div className="space-y-1">
          <p className="text-sm text-brand-dark">{row.style ?? 'default'}</p>
          <p className="text-xs text-brand-dark/60">{row.icon ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'sort_order',
      label: 'Ordem',
      render: (row) => (
        <div className="space-y-2">
          <p className="text-sm font-semibold">{row.sort_order}</p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => void handleMove(row.id, 'up')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-50"
              aria-label={`Subir item ${row.label}`}
              disabled={isMutating || !canEdit}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleMove(row.id, 'down')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-50"
              aria-label={`Descer item ${row.label}`}
              disabled={isMutating || !canEdit}
            >
              <ArrowDown className="w-4 h-4" />
            </button>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="space-y-2">
          <StatusBadge label={row.is_active ? 'Ativo' : 'Inativo'} tone={row.is_active ? 'success' : 'draft'} />
          <div className="flex flex-wrap gap-1">
            {row.open_in_new_tab && (
              <span className="inline-flex items-center gap-1 text-[10px] text-brand-dark/60 uppercase tracking-brand">
                <ExternalLink className="w-3 h-3" />
                Nova aba
              </span>
            )}
            {row.requires_auth && (
              <span className="inline-flex items-center text-[10px] text-brand-dark/60 uppercase tracking-brand">
                Requer login
              </span>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleStartEdit(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
            disabled={!canEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleToggleActive(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
            disabled={!canEdit || isMutating}
          >
            {row.is_active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={() => setPendingDelete(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            disabled={!canEdit || isMutating}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Menus | CMS Mega Polo Moda"
        description="Gerencie menus da Navbar com controle de ordem, visibilidade, estilo e destino."
      />

      <AdminPageHeader
        title="Menus"
        description="Gerencie os itens da Navbar desktop e mobile sem alterar codigo."
        actions={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshItems()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleStartCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50"
              disabled={!canEdit}
            >
              <Plus className="w-4 h-4" />
              Novo item
            </button>
          </div>
        )}
      />

      {!canEdit && (
        <div className="mb-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Perfil atual: <strong>{getRoleLabel(profile?.role)}</strong>. Acesso em modo somente leitura.
        </div>
      )}

      {!isSupabaseConfigured && (
        <div className="mb-6">
          <AdminEmptyState
            title="Supabase nao configurado"
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o CMS de menus."
          />
        </div>
      )}

      {isLoading && <AdminLoadingState label="Carregando itens de navegacao..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshItems()} />}

      {!isLoading && !error && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[1.35fr_0.95fr] gap-6">
            <AdminCard title="Itens de menu" description="Filtre por grupo, ajuste ordem e controle quais links ficam visiveis no site.">
            <div className="space-y-4">
              {successMessage && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                  {successMessage}
                </p>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <label htmlFor="navigation-location-filter" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Grupo do menu
                  </label>
                  <select
                    id="navigation-location-filter"
                    value={locationFilter}
                    onChange={(event) => handleChangeLocationFilter(event.target.value as NavigationLocation)}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  >
                    {NAVIGATION_LOCATIONS.map((location) => (
                      <option key={location} value={location}>
                        {LOCATION_LABELS[location]} ({location})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-brand-dark/60">{locationDescription}</p>
                </div>

                <div className="space-y-2">
                  <label htmlFor="navigation-search" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Buscar
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                    <input
                      id="navigation-search"
                      type="search"
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="label, url, estilo ou icone"
                      className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 text-xs">
                <span className="inline-flex items-center gap-1 rounded-full border border-brand-dark/10 bg-brand-paper px-3 py-1">
                  Total: {orderedItems.length}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
                  Ativos: {activeCount}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-amber-700">
                  Inativos: {inactiveCount}
                </span>
              </div>

              {filteredItems.length === 0 ? (
                <AdminEmptyState
                  title="Nenhum item encontrado"
                  description={
                    items.length
                      ? 'Ajuste o termo de busca para localizar itens desta location.'
                      : 'Cadastre o primeiro item de menu para esta location.'
                  }
                />
              ) : (
                <AdminTable
                  columns={columns}
                  rows={filteredItems}
                  rowKey={(row) => row.id}
                  emptyMessage="Nenhum item de menu encontrado."
                />
              )}
            </div>
          </AdminCard>

          <AdminCard
            title={editingId ? 'Editar item de menu' : 'Novo item de menu'}
            description="Defina destino, estilo visual e regras de autenticacao."
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <AdminFormSection title="Dados principais">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="navigation-label" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Label *
                    </label>
                    <input
                      id="navigation-label"
                      type="text"
                      value={form.label}
                      onChange={(event) => setForm((current) => ({ ...current, label: event.target.value }))}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                      disabled={!canEdit}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="navigation-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      URL *
                    </label>
                    <input
                      id="navigation-url"
                      type="text"
                      value={form.url}
                      onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                      disabled={!canEdit}
                      placeholder="/lojas ou https://..."
                      required
                    />
                    <p className="text-xs text-brand-dark/60">
                      Use <code className="font-mono">/rota-interna</code> para links do site ou
                      <code className="font-mono"> https://</code> para links externos.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="navigation-location" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Location *
                    </label>
                    <select
                      id="navigation-location"
                      value={form.location}
                      onChange={(event) => setForm((current) => ({ ...current, location: event.target.value as NavigationLocation }))}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                      disabled={!canEdit}
                    >
                      {NAVIGATION_LOCATIONS.map((location) => (
                        <option key={location} value={location}>
                          {LOCATION_LABELS[location]} ({location})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </AdminFormSection>

              <AdminFormSection title="Estilo e comportamento">
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="navigation-icon" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Icone
                      </label>
                      <input
                        id="navigation-icon"
                        type="text"
                        value={form.icon}
                        onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        disabled={!canEdit}
                        placeholder="message-circle, user..."
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="navigation-style" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Estilo
                      </label>
                      <input
                        id="navigation-style"
                        type="text"
                        value={form.style}
                        onChange={(event) => setForm((current) => ({ ...current, style: event.target.value }))}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        list="navigation-style-suggestions"
                        disabled={!canEdit}
                        placeholder="default, primary, whatsapp..."
                      />
                      <datalist id="navigation-style-suggestions">
                        {STYLE_SUGGESTIONS.map((style) => (
                          <option key={style} value={style} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="navigation-sort-order" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      sort_order
                    </label>
                    <input
                      id="navigation-sort-order"
                      type="number"
                      value={form.sort_order}
                      onChange={(event) => setForm((current) => ({ ...current, sort_order: event.target.value }))}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                      disabled={!canEdit}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark">
                      <input
                        type="checkbox"
                        checked={form.is_active}
                        onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                        disabled={!canEdit}
                        className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30 disabled:opacity-50"
                      />
                      Item ativo
                    </label>

                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark ml-2">
                      <input
                        type="checkbox"
                        checked={form.open_in_new_tab}
                        onChange={(event) => setForm((current) => ({ ...current, open_in_new_tab: event.target.checked }))}
                        disabled={!canEdit}
                        className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30 disabled:opacity-50"
                      />
                      Abrir em nova aba
                    </label>

                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark ml-2">
                      <input
                        type="checkbox"
                        checked={form.requires_auth}
                        onChange={(event) => setForm((current) => ({ ...current, requires_auth: event.target.checked }))}
                        disabled={!canEdit}
                        className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30 disabled:opacity-50"
                      />
                      Requer autenticacao
                    </label>
                  </div>
                </div>
              </AdminFormSection>

              {formError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                  {formError}
                </p>
              )}

              {(form.label || normalizedUrlPreview) && (
                <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/40 p-4 space-y-2">
                  <p className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Preview rapido do item
                  </p>
                  <p className="text-sm font-semibold text-brand-dark">
                    {form.label || 'Sem label'}
                  </p>
                  <p className="text-xs break-all text-brand-dark/70">
                    {normalizedUrlPreview || 'Sem URL'}
                  </p>
                  <div className="flex flex-wrap gap-2 text-[11px] text-brand-dark/65">
                    <span className="rounded-full border border-brand-dark/15 px-2.5 py-1">
                      {LOCATION_LABELS[form.location]}
                    </span>
                    {normalizedUrlPreview && (
                      <span className="rounded-full border border-brand-dark/15 px-2.5 py-1">
                        {isExternalUrlPreview ? 'Link externo' : 'Link interno'}
                      </span>
                    )}
                    {!form.is_active && (
                      <span className="rounded-full border border-amber-300 bg-amber-50 px-2.5 py-1 text-amber-700">
                        Inativo
                      </span>
                    )}
                    {form.open_in_new_tab && (
                      <span className="rounded-full border border-brand-dark/15 px-2.5 py-1">
                        Nova aba
                      </span>
                    )}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 justify-end">
                {(editingId || form.label || form.url || form.icon || form.style) && (
                  <button
                    type="button"
                    onClick={() => resetForm(locationFilter, nextSortOrder)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={!canEdit || isMutating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-50"
                >
                  {editingId ? 'Salvar item' : 'Criar item'}
                </button>
              </div>
              </form>
            </AdminCard>
          </div>

          <AdminCard
            title={`Preview da location: ${LOCATION_LABELS[locationFilter]}`}
            description="Visualizacao rapida da ordem final dos itens para o grupo selecionado."
          >
            {orderedItems.length === 0 ? (
              <AdminEmptyState
                title="Sem itens nesta location"
                description="Cadastre itens para visualizar o preview do menu."
              />
            ) : (
              <div className="space-y-3">
                {orderedItems.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-brand-dark/10 bg-white p-3.5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-brand-dark truncate">{item.label}</p>
                      <p className="text-xs text-brand-dark/60 break-all">{item.url}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="rounded-full border border-brand-dark/15 px-2 py-1">
                        #{item.sort_order}
                      </span>
                      <StatusBadge
                        label={item.is_active ? 'Ativo' : 'Inativo'}
                        tone={item.is_active ? 'success' : 'draft'}
                      />
                      {item.open_in_new_tab && (
                        <span className="rounded-full border border-brand-dark/15 px-2 py-1">
                          Nova aba
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir item de menu"
        description={pendingDelete ? `Deseja excluir o item "${pendingDelete.label}" da location ${pendingDelete.location}?` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
