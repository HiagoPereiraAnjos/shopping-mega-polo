import React, { useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Pencil,
  Plus,
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
import { useCategories } from '../../hooks/useCategories';
import type { Category } from '../../types/cms';
import { slugify } from '../../utils/slug';

interface CategoryFormState {
  name: string;
  slug: string;
  description: string;
  icon: string;
  color: string;
  sort_order: string;
  is_active: boolean;
}

function createInitialFormState(sortOrder = 0): CategoryFormState {
  return {
    name: '',
    slug: '',
    description: '',
    icon: '',
    color: '#E30613',
    sort_order: String(sortOrder),
    is_active: true,
  };
}

function mapCategoryToForm(category: Category): CategoryFormState {
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? '',
    icon: category.icon ?? '',
    color: category.color ?? '#E30613',
    sort_order: String(category.sort_order ?? 0),
    is_active: category.is_active,
  };
}

export default function CategoriesAdmin() {
  const {
    categories,
    isLoading,
    isMutating,
    error,
    successMessage,
    isSupabaseEnabled,
    refreshCategories,
    createCategoryItem,
    updateCategoryItem,
    deleteCategoryItem,
    reorderCategoryItems,
    toggleCategoryActive,
    clearMessages,
  } = useCategories({ activeOnly: false, autoLoad: true });

  const [searchTerm, setSearchTerm] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [form, setForm] = useState<CategoryFormState>(() => createInitialFormState());
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Category | null>(null);

  const filteredCategories = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return categories;
    }

    return categories.filter((category) => {
      const text = `${category.name} ${category.slug} ${category.description ?? ''}`.toLowerCase();
      return text.includes(normalizedSearch);
    });
  }, [categories, searchTerm]);

  const nextSortOrder = useMemo(() => {
    if (!categories.length) {
      return 0;
    }

    return Math.max(...categories.map((category) => category.sort_order ?? 0)) + 1;
  }, [categories]);

  const resetForm = () => {
    setForm(createInitialFormState(nextSortOrder));
    setEditingCategoryId(null);
    setSlugManuallyEdited(false);
    setFormError(null);
  };

  const startCreate = () => {
    clearMessages();
    setForm(createInitialFormState(nextSortOrder));
    setEditingCategoryId(null);
    setSlugManuallyEdited(false);
    setFormError(null);
  };

  const startEdit = (category: Category) => {
    clearMessages();
    setForm(mapCategoryToForm(category));
    setEditingCategoryId(category.id);
    setSlugManuallyEdited(true);
    setFormError(null);
  };

  const validateForm = (): string | null => {
    if (!form.name.trim()) {
      return 'Nome da categoria e obrigatorio.';
    }

    if (!form.slug.trim()) {
      return 'Slug da categoria e obrigatorio.';
    }

    if (!/^-?[0-9]+$/.test(form.sort_order.trim())) {
      return 'sort_order deve ser numerico.';
    }

    const normalizedSlug = slugify(form.slug);
    const duplicate = categories.find(
      (category) =>
        category.slug === normalizedSlug && category.id !== editingCategoryId,
    );

    if (duplicate) {
      return 'Slug ja existe. Escolha outro slug.';
    }

    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    const validationError = validateForm();
    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      description: form.description.trim() || null,
      icon: form.icon.trim() || null,
      color: form.color.trim() || null,
      sort_order: Number(form.sort_order),
      is_active: form.is_active,
    };

    const result = editingCategoryId
      ? await updateCategoryItem(editingCategoryId, payload)
      : await createCategoryItem(payload);

    if (!result.error) {
      resetForm();
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }

    const result = await deleteCategoryItem(pendingDelete.id);
    if (!result.error) {
      setPendingDelete(null);
      if (editingCategoryId === pendingDelete.id) {
        resetForm();
      }
    }
  };

  const handleMove = async (categoryId: string, direction: 'up' | 'down') => {
    const currentIndex = categories.findIndex((category) => category.id === categoryId);

    if (currentIndex === -1) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (targetIndex < 0 || targetIndex >= categories.length) {
      return;
    }

    const reordered = [...categories];
    const [movedItem] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, movedItem);

    const payload = reordered.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    await reorderCategoryItems(payload);
  };

  const handleToggleActive = async (category: Category) => {
    clearMessages();
    await toggleCategoryActive(category, !category.is_active);
  };

  const columns: Array<AdminTableColumn<Category>> = [
    {
      key: 'name',
      label: 'Categoria',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.name}</p>
          <p className="text-xs text-brand-dark/60">/{row.slug}</p>
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
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors"
              aria-label={`Subir categoria ${row.name}`}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleMove(row.id, 'down')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors"
              aria-label={`Descer categoria ${row.name}`}
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
        <StatusBadge label={row.is_active ? 'Ativa' : 'Inativa'} tone={row.is_active ? 'success' : 'draft'} />
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => startEdit(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleToggleActive(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            {row.is_active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={() => setPendingDelete(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
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
        title="Categorias | CMS Mega Polo Moda"
        description="Gerencie categorias do portal com cadastro, ordenacao e status de publicacao."
      />

      <AdminPageHeader
        title="Categorias"
        description="Cadastre, ordene e ative categorias que alimentam filtros e vitrines do portal."
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={startCreate}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              <Plus className="w-4 h-4" />
              Nova categoria
            </button>
            <button
              type="button"
              onClick={() => void refreshCategories()}
              className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              Atualizar
            </button>
          </div>
        }
      />

      {!isSupabaseEnabled && (
        <div className="mb-6">
          <AdminEmptyState
            title="Supabase nao configurado"
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para habilitar o CRUD real de categorias."
          />
        </div>
      )}

      {isLoading && <AdminLoadingState label="Carregando categorias..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshCategories()} />}

      {!isLoading && !error && (
        <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
          <AdminCard
            title={editingCategoryId ? 'Editar categoria' : 'Nova categoria'}
            description="Preencha os campos abaixo para salvar no Supabase."
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <AdminFormSection title="Dados principais">
                <div className="space-y-2">
                  <label htmlFor="category-name" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Nome *
                  </label>
                  <input
                    id="category-name"
                    type="text"
                    value={form.name}
                    onChange={(e) => {
                      const nameValue = e.target.value;
                      setForm((prev) => ({
                        ...prev,
                        name: nameValue,
                        slug: slugManuallyEdited ? prev.slug : slugify(nameValue),
                      }));
                    }}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="category-slug" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Slug *
                  </label>
                  <input
                    id="category-slug"
                    type="text"
                    value={form.slug}
                    onChange={(e) => {
                      setSlugManuallyEdited(true);
                      setForm((prev) => ({ ...prev, slug: e.target.value }));
                    }}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="category-description" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Descricao
                  </label>
                  <textarea
                    id="category-description"
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="category-icon" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Icone ou imagem (URL)
                  </label>
                  <input
                    id="category-icon"
                    type="text"
                    value={form.icon}
                    onChange={(e) => setForm((prev) => ({ ...prev, icon: e.target.value }))}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label htmlFor="category-color" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Cor
                    </label>
                    <input
                      id="category-color"
                      type="color"
                      value={form.color}
                      onChange={(e) => setForm((prev) => ({ ...prev, color: e.target.value }))}
                      className="w-full h-12 rounded-xl border border-brand-dark/15 bg-white p-1 cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="category-sort-order" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      sort_order *
                    </label>
                    <input
                      id="category-sort-order"
                      type="number"
                      value={form.sort_order}
                      onChange={(e) => setForm((prev) => ({ ...prev, sort_order: e.target.value }))}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                      required
                    />
                  </div>
                </div>

                <label className="inline-flex items-center gap-3 text-sm font-medium text-brand-dark/80">
                  <input
                    type="checkbox"
                    checked={form.is_active}
                    onChange={(e) => setForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                    className="h-4 w-4 rounded border-brand-dark/20 text-brand-red focus:ring-brand-red"
                  />
                  Categoria ativa
                </label>
              </AdminFormSection>

              {formError && (
                <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                  {formError}
                </p>
              )}

              {successMessage && (
                <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                  {successMessage}
                </p>
              )}

              <div className="flex items-center gap-2 justify-end">
                {(editingCategoryId || form.name || form.slug || form.description || form.icon) && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Cancelar
                  </button>
                )}
                <button
                  type="submit"
                  disabled={isMutating}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {editingCategoryId ? 'Salvar alteracoes' : 'Criar categoria'}
                </button>
              </div>
            </form>
          </AdminCard>

          <AdminCard
            title="Lista de categorias"
            description="Use busca, ordenacao e acoes rapidas para manter a navegacao do portal atualizada."
          >
            <div className="space-y-4">
              <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                <input
                  type="search"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar por nome, slug ou descricao"
                  className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                />
              </div>

              {filteredCategories.length === 0 ? (
                <AdminEmptyState
                  title="Nenhuma categoria encontrada"
                  description={
                    categories.length
                      ? 'Ajuste o termo de busca para encontrar uma categoria existente.'
                      : 'Crie a primeira categoria para alimentar filtros do site e vitrine da Home.'
                  }
                />
              ) : (
                <AdminTable
                  columns={columns}
                  rows={filteredCategories}
                  rowKey={(row) => row.id}
                  emptyMessage="Nenhuma categoria cadastrada."
                />
              )}
            </div>
          </AdminCard>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDelete}
        title="Excluir categoria"
        description={
          pendingDelete
            ? `Tem certeza que deseja excluir a categoria "${pendingDelete.name}"?`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onCancel={() => setPendingDelete(null)}
        onConfirm={() => void handleDelete()}
      />
    </>
  );
}
