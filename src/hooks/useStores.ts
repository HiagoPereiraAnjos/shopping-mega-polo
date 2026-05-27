import { useCallback, useEffect, useMemo, useState } from 'react';
import { STORES as MOCK_STORES } from '../data/mockData';
import { shouldUseMockFallback } from '../config/environment';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  createStore,
  deleteStore,
  getStoreById,
  getStoreBySlug,
  listPublishedStores,
  listStores,
  publishStore,
  unpublishStore,
  updateStore,
  uploadStoreBanner,
  uploadStoreLogo,
} from '../services/stores.service';
import { mapCmsStoreToPublicStore } from '../utils/storeMappers';
import type { Store as PublicStore } from '../types';
import type {
  Catalog,
  Category,
  CmsServiceResult,
  Store,
  StoreInsert,
  StoreProduct,
  StoreQueryFilters,
  StoreUpdate,
} from '../types/cms';

interface UseStoresOptions extends StoreQueryFilters {
  autoLoad?: boolean;
  fallbackToMock?: boolean;
  publishedOnly?: boolean;
  includeProducts?: boolean;
}

interface StoreActionResult<T> {
  data: T | null;
  error: string | null;
}

function emptyResult<T>(error: string): StoreActionResult<T> {
  return { data: null, error };
}

export function useStores(options: UseStoresOptions = {}) {
  const {
    autoLoad = true,
    fallbackToMock = false,
    publishedOnly = false,
    includeProducts = false,
    ...filters
  } = options;
  const canUseMockFallback = shouldUseMockFallback(fallbackToMock);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const resolvedFilters = useMemo<StoreQueryFilters>(
    () => (filtersKey ? (JSON.parse(filtersKey) as StoreQueryFilters) : {}),
    [filtersKey],
  );

  const [stores, setStores] = useState<Store[]>([]);
  const [publicStores, setPublicStores] = useState<PublicStore[]>(canUseMockFallback ? MOCK_STORES : []);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const applyMockFallback = useCallback(() => {
    setStores([]);
    setPublicStores(MOCK_STORES);
    setIsUsingFallback(true);
    setError(null);
  }, []);

  const buildPublicStores = useCallback(
    async (storeRows: Store[]): Promise<PublicStore[]> => {
      if (!storeRows.length) {
        return [];
      }

      const categoryIds = Array.from(
        new Set(storeRows.map((store) => store.category_id).filter((value): value is string => !!value)),
      );
      const storeIds = storeRows.map((store) => store.id);

      const categoriesResult = categoryIds.length && supabase
        ? await supabase.from('categories').select('*').in('id', categoryIds)
        : { data: [] as Category[], error: null };

      const catalogsResult = storeIds.length && supabase
        ? await supabase
            .from('catalogs')
            .select('*')
            .in('store_id', storeIds)
            .eq('is_active', true)
            .not('file_url', 'is', null)
        : { data: [] as Catalog[], error: null };

      const productsResult = includeProducts && storeIds.length && supabase
        ? await supabase
            .from('store_products')
            .select('*')
            .in('store_id', storeIds)
            .eq('is_active', true)
            .order('sort_order', { ascending: true })
        : { data: [] as StoreProduct[], error: null };

      if (categoriesResult.error && import.meta.env.DEV) {
        console.warn('Falha ao carregar categorias para mapear lojas:', categoriesResult.error.message);
      }

      if (catalogsResult.error && import.meta.env.DEV) {
        console.warn('Falha ao carregar catalogos para mapear lojas:', catalogsResult.error.message);
      }

      if (productsResult.error && import.meta.env.DEV) {
        console.warn('Falha ao carregar produtos para mapear lojas:', productsResult.error.message);
      }

      const categoriesMap = new Map((categoriesResult.data ?? []).map((category) => [category.id, category]));
      const catalogsByStore = new Map<string, Catalog[]>();
      const productsByStore = new Map<string, StoreProduct[]>();

      (catalogsResult.data ?? []).forEach((catalog) => {
        const current = catalogsByStore.get(catalog.store_id) ?? [];
        current.push(catalog);
        catalogsByStore.set(catalog.store_id, current);
      });

      (productsResult.data ?? []).forEach((product) => {
        const current = productsByStore.get(product.store_id) ?? [];
        current.push(product);
        productsByStore.set(product.store_id, current);
      });

      return storeRows.map((store) =>
        mapCmsStoreToPublicStore({
          store,
          category: store.category_id ? categoriesMap.get(store.category_id) ?? null : null,
          catalogs: catalogsByStore.get(store.id),
          products: productsByStore.get(store.id),
        }),
      );
    },
    [includeProducts],
  );

  const refreshStores = useCallback(
    async (overrideFilters?: StoreQueryFilters): Promise<StoreActionResult<Store[]>> => {
      if (!isSupabaseConfigured) {
        if (canUseMockFallback) {
          applyMockFallback();
          setIsLoading(false);
          return { data: [], error: null };
        }

        const configError = 'Supabase nao configurado para carregar lojas.';
        setError(configError);
        setIsLoading(false);
        return emptyResult<Store[]>(configError);
      }

      setIsLoading(true);
      setError(null);

      const mergedFilters = {
        ...resolvedFilters,
        ...overrideFilters,
      };

      const result: CmsServiceResult<Store[]> = publishedOnly
        ? await listPublishedStores(mergedFilters)
        : await listStores(mergedFilters);

      if (result.error) {
        if (canUseMockFallback) {
          applyMockFallback();
          setIsLoading(false);
          return { data: [], error: null };
        }

        setError(result.error);
        setIsLoading(false);
        return emptyResult<Store[]>(result.error);
      }

      const rows = result.data ?? [];

      if (!rows.length && canUseMockFallback) {
        applyMockFallback();
        setIsLoading(false);
        return { data: [], error: null };
      }

      const mappedPublicStores = await buildPublicStores(rows);

      setStores(rows);
      setPublicStores(mappedPublicStores);
      setIsUsingFallback(false);
      setError(null);
      setIsLoading(false);

      return { data: rows, error: null };
    },
    [applyMockFallback, buildPublicStores, canUseMockFallback, publishedOnly, resolvedFilters],
  );

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void refreshStores();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [autoLoad, refreshStores]);

  const createStoreItem = useCallback(
    async (payload: StoreInsert): Promise<StoreActionResult<Store>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await createStore(payload);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return emptyResult<Store>(result.error);
      }

      await refreshStores();
      setSuccessMessage('Loja criada com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshStores],
  );

  const updateStoreItem = useCallback(
    async (id: string, payload: StoreUpdate): Promise<StoreActionResult<Store>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await updateStore(id, payload);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return emptyResult<Store>(result.error);
      }

      await refreshStores();
      setSuccessMessage('Loja atualizada com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshStores],
  );

  const deleteStoreItem = useCallback(
    async (id: string): Promise<StoreActionResult<{ id: string }>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await deleteStore(id);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return emptyResult<{ id: string }>(result.error);
      }

      await refreshStores();
      setSuccessMessage('Loja removida com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshStores],
  );

  const publishStoreItem = useCallback(
    async (id: string): Promise<StoreActionResult<Store>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await publishStore(id);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return emptyResult<Store>(result.error);
      }

      await refreshStores();
      setSuccessMessage('Loja publicada com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshStores],
  );

  const unpublishStoreItem = useCallback(
    async (id: string): Promise<StoreActionResult<Store>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await unpublishStore(id);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return emptyResult<Store>(result.error);
      }

      await refreshStores();
      setSuccessMessage('Loja despublicada com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshStores],
  );

  const uploadStoreLogoFile = useCallback(async (file: File) => {
    return uploadStoreLogo(file);
  }, []);

  const uploadStoreBannerFile = useCallback(async (file: File) => {
    return uploadStoreBanner(file);
  }, []);

  const getStoreByIdItem = useCallback(async (id: string): Promise<StoreActionResult<Store>> => {
    const result = await getStoreById(id);
    if (result.error) {
      return emptyResult<Store>(result.error);
    }
    return { data: result.data, error: null };
  }, []);

  const getStoreBySlugItem = useCallback(
    async (
      slug: string,
      options?: { includeUnpublished?: boolean; fallbackToMockBySlug?: boolean },
    ): Promise<StoreActionResult<PublicStore>> => {
      const canUseMockBySlug = shouldUseMockFallback(options?.fallbackToMockBySlug);

      if (!isSupabaseConfigured) {
        if (canUseMockBySlug) {
          const mockStore = MOCK_STORES.find((item) => item.slug === slug);
          if (mockStore) {
            return { data: mockStore, error: null };
          }
        }

        return emptyResult<PublicStore>('Supabase nao configurado para carregar a loja.');
      }

      const result = await getStoreBySlug(slug, options?.includeUnpublished ?? false);
      if (result.error || !result.data) {
        if (canUseMockBySlug) {
          const mockStore = MOCK_STORES.find((item) => item.slug === slug);
          if (mockStore) {
            return { data: mockStore, error: null };
          }
        }

        return emptyResult<PublicStore>(result.error ?? 'Loja nao encontrada.');
      }

      const mapped = await buildPublicStores([result.data]);

      return { data: mapped[0] ?? null, error: null };
    },
    [buildPublicStores],
  );

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const availableFloors = useMemo(() => {
    const floors = stores
      .map((store) => (typeof store.floor === 'string' ? store.floor.trim() : ''))
      .filter((value): value is string => value.length > 0);

    return Array.from(new Set<string>(floors)).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [stores]);

  return {
    stores,
    publicStores,
    availableFloors,
    isLoading,
    isMutating,
    error,
    successMessage,
    isUsingFallback,
    isSupabaseEnabled: isSupabaseConfigured,
    refreshStores,
    createStoreItem,
    updateStoreItem,
    deleteStoreItem,
    publishStoreItem,
    unpublishStoreItem,
    uploadStoreLogoFile,
    uploadStoreBannerFile,
    getStoreByIdItem,
    getStoreBySlugItem,
    clearMessages,
  };
}

