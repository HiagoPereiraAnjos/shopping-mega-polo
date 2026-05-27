import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Category, CategoryInsert, CategoryUpdate } from '../types/cms';
import { CATEGORIES as MOCK_CATEGORIES } from '../data/mockData';
import { shouldUseMockFallback } from '../config/environment';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  createCategory,
  deleteCategory,
  getCategoryById,
  listCategories,
  reorderCategories,
  updateCategory,
  type ListCategoriesOptions,
  type ReorderCategoryItem,
} from '../services/categories.service';

interface UseCategoriesOptions extends ListCategoriesOptions {
  autoLoad?: boolean;
  fallbackToMock?: boolean;
}

interface ActionResult<T> {
  data: T | null;
  error: string | null;
}

function mapMockToCmsCategory(index: number, category: (typeof MOCK_CATEGORIES)[number]): Category {
  const now = new Date().toISOString();

  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: null,
    icon: category.image,
    color: '#E30613',
    sort_order: index,
    is_active: true,
    created_at: now,
    updated_at: now,
  };
}

function buildFallbackCategories(): Category[] {
  return MOCK_CATEGORIES.map((category, index) => mapMockToCmsCategory(index, category));
}

export function useCategories(options: UseCategoriesOptions = {}) {
  const {
    activeOnly = false,
    query,
    autoLoad = true,
    fallbackToMock = false,
  } = options;
  const canUseMockFallback = shouldUseMockFallback(fallbackToMock);

  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const fallbackCategories = useMemo(() => buildFallbackCategories(), []);

  const applyFallback = useCallback(() => {
    setCategories(fallbackCategories);
    setIsUsingFallback(true);
  }, [fallbackCategories]);

  const refreshCategories = useCallback(
    async (overrideOptions?: ListCategoriesOptions): Promise<ActionResult<Category[]>> => {
      const targetOptions: ListCategoriesOptions = {
        activeOnly: overrideOptions?.activeOnly ?? activeOnly,
        query: overrideOptions?.query ?? query,
      };

      if (!isSupabaseConfigured) {
        if (canUseMockFallback) {
          applyFallback();
          setError(null);
          setIsLoading(false);
          return { data: fallbackCategories, error: null };
        }

        setCategories([]);
        setIsUsingFallback(false);
        setError('Supabase nao configurado para carregar categorias.');
        setIsLoading(false);
        return { data: null, error: 'Supabase nao configurado para carregar categorias.' };
      }

      setIsLoading(true);
      const result = await listCategories(targetOptions);

      if (result.error) {
        if (canUseMockFallback) {
          applyFallback();
          setError(null);
          setIsLoading(false);
          return { data: fallbackCategories, error: null };
        }

        setCategories([]);
        setIsUsingFallback(false);
        setError(result.error);
        setIsLoading(false);
        return { data: null, error: result.error };
      }

      const loadedCategories = result.data ?? [];

      if (!loadedCategories.length && canUseMockFallback) {
        applyFallback();
        setError(null);
        setIsLoading(false);
        return { data: fallbackCategories, error: null };
      }

      setCategories(loadedCategories);
      setIsUsingFallback(false);
      setError(null);
      setIsLoading(false);
      return { data: loadedCategories, error: null };
    },
    [activeOnly, applyFallback, canUseMockFallback, fallbackCategories, query],
  );

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void refreshCategories();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [autoLoad, refreshCategories]);

  const createCategoryItem = useCallback(
    async (payload: CategoryInsert): Promise<ActionResult<Category>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await createCategory(payload);

      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      await refreshCategories();
      setSuccessMessage('Categoria criada com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshCategories],
  );

  const updateCategoryItem = useCallback(
    async (id: string, payload: CategoryUpdate): Promise<ActionResult<Category>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await updateCategory(id, payload);

      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      await refreshCategories();
      setSuccessMessage('Categoria atualizada com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshCategories],
  );

  const deleteCategoryItem = useCallback(
    async (id: string): Promise<ActionResult<{ id: string }>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await deleteCategory(id);

      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      await refreshCategories();
      setSuccessMessage('Categoria removida com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshCategories],
  );

  const reorderCategoryItems = useCallback(
    async (items: ReorderCategoryItem[]): Promise<ActionResult<Category[]>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await reorderCategories(items);

      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      await refreshCategories();
      setSuccessMessage('Ordenacao das categorias atualizada.');
      return { data: result.data, error: null };
    },
    [refreshCategories],
  );

  const toggleCategoryActive = useCallback(
    async (category: Category, isActive: boolean): Promise<ActionResult<Category>> => {
      return updateCategoryItem(category.id, { is_active: isActive });
    },
    [updateCategoryItem],
  );

  const getCategoryItemById = useCallback(
    async (id: string): Promise<ActionResult<Category>> => {
      const result = await getCategoryById(id);

      if (result.error) {
        return { data: null, error: result.error };
      }

      return { data: result.data, error: null };
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return {
    categories,
    isLoading,
    isMutating,
    error,
    successMessage,
    isUsingFallback,
    isSupabaseEnabled: isSupabaseConfigured,
    refreshCategories,
    createCategoryItem,
    updateCategoryItem,
    deleteCategoryItem,
    reorderCategoryItems,
    toggleCategoryActive,
    getCategoryItemById,
    clearMessages,
  };
}
