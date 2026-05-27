import { useCallback, useEffect, useMemo, useState } from 'react';
import { LAUNCHES as MOCK_LAUNCHES } from '../data/mockData';
import { shouldUseMockFallback } from '../config/environment';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  createLaunch,
  deleteLaunch,
  getLaunchById,
  listLaunches,
  listPublishedLaunches,
  publishLaunch,
  unpublishLaunch,
  updateLaunch,
  uploadLaunchImage,
} from '../services/launches.service';
import { mapCmsLaunchToPublicLaunch } from '../utils/launchMappers';
import type { Launch as PublicLaunch } from '../types';
import type {
  Category,
  CmsServiceResult,
  Launch,
  LaunchInsert,
  LaunchQueryFilters,
  LaunchUpdate,
  Store,
} from '../types/cms';

interface UseLaunchesOptions extends LaunchQueryFilters {
  autoLoad?: boolean;
  fallbackToMock?: boolean;
  publishedOnly?: boolean;
}

interface ActionResult<T> {
  data: T | null;
  error: string | null;
}

function emptyResult<T>(error: string): ActionResult<T> {
  return { data: null, error };
}

export function useLaunches(options: UseLaunchesOptions = {}) {
  const {
    autoLoad = true,
    fallbackToMock = false,
    publishedOnly = false,
    ...filters
  } = options;
  const canUseMockFallback = shouldUseMockFallback(fallbackToMock);

  const filtersKey = useMemo(() => JSON.stringify(filters), [filters]);
  const resolvedFilters = useMemo<LaunchQueryFilters>(
    () => (filtersKey ? (JSON.parse(filtersKey) as LaunchQueryFilters) : {}),
    [filtersKey],
  );

  const [launches, setLaunches] = useState<Launch[]>([]);
  const [publicLaunches, setPublicLaunches] = useState<PublicLaunch[]>(canUseMockFallback ? MOCK_LAUNCHES : []);
  const [isLoading, setIsLoading] = useState(autoLoad);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);

  const applyMockFallback = useCallback(() => {
    setLaunches([]);
    setPublicLaunches(MOCK_LAUNCHES);
    setIsUsingFallback(true);
    setError(null);
  }, []);

  const buildPublicLaunches = useCallback(async (rows: Launch[]): Promise<PublicLaunch[]> => {
    if (!rows.length || !supabase) {
      return [];
    }

    const storeIds = Array.from(
      new Set(rows.map((launch) => launch.store_id).filter((value): value is string => !!value)),
    );
    const categoryIds = Array.from(
      new Set(rows.map((launch) => launch.category_id).filter((value): value is string => !!value)),
    );

    const storesResult = storeIds.length
      ? await supabase.from('stores').select('*').in('id', storeIds)
      : { data: [] as Store[], error: null };
    const categoriesResult = categoryIds.length
      ? await supabase.from('categories').select('*').in('id', categoryIds)
      : { data: [] as Category[], error: null };

    if (storesResult.error && import.meta.env.DEV) {
      console.warn('Falha ao carregar lojas para mapear lancamentos:', storesResult.error.message);
    }
    if (categoriesResult.error && import.meta.env.DEV) {
      console.warn('Falha ao carregar categorias para mapear lancamentos:', categoriesResult.error.message);
    }

    const storesById = new Map((storesResult.data ?? []).map((store) => [store.id, store]));
    const categoriesById = new Map((categoriesResult.data ?? []).map((category) => [category.id, category]));

    return rows
      .map((launch) =>
        mapCmsLaunchToPublicLaunch({
          launch,
          store: launch.store_id ? storesById.get(launch.store_id) ?? null : null,
          category: launch.category_id ? categoriesById.get(launch.category_id) ?? null : null,
        }),
      )
      .filter((launch) => !!launch.storeSlug);
  }, []);

  const refreshLaunches = useCallback(
    async (overrideFilters?: LaunchQueryFilters): Promise<ActionResult<Launch[]>> => {
      if (!isSupabaseConfigured) {
        if (canUseMockFallback) {
          applyMockFallback();
          setIsLoading(false);
          return { data: [], error: null };
        }

        const configError = 'Supabase nao configurado para carregar lancamentos.';
        setError(configError);
        setIsLoading(false);
        return emptyResult<Launch[]>(configError);
      }

      setIsLoading(true);
      setError(null);

      const mergedFilters: LaunchQueryFilters = {
        ...resolvedFilters,
        ...overrideFilters,
      };

      const result: CmsServiceResult<Launch[]> = publishedOnly
        ? await listPublishedLaunches(mergedFilters)
        : await listLaunches(mergedFilters);

      if (result.error) {
        if (canUseMockFallback) {
          applyMockFallback();
          setIsLoading(false);
          return { data: [], error: null };
        }

        setError(result.error);
        setIsLoading(false);
        return emptyResult<Launch[]>(result.error);
      }

      const rows = result.data ?? [];
      if (!rows.length && canUseMockFallback) {
        applyMockFallback();
        setIsLoading(false);
        return { data: [], error: null };
      }

      const mapped = await buildPublicLaunches(rows);

      setLaunches(rows);
      setPublicLaunches(mapped);
      setIsUsingFallback(false);
      setError(null);
      setIsLoading(false);

      return { data: rows, error: null };
    },
    [applyMockFallback, buildPublicLaunches, canUseMockFallback, publishedOnly, resolvedFilters],
  );

  useEffect(() => {
    if (!autoLoad) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void refreshLaunches();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [autoLoad, refreshLaunches]);

  const createLaunchItem = useCallback(
    async (payload: LaunchInsert): Promise<ActionResult<Launch>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await createLaunch(payload);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return emptyResult<Launch>(result.error);
      }

      await refreshLaunches();
      setSuccessMessage('Lancamento criado com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshLaunches],
  );

  const updateLaunchItem = useCallback(
    async (id: string, payload: LaunchUpdate): Promise<ActionResult<Launch>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await updateLaunch(id, payload);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return emptyResult<Launch>(result.error);
      }

      await refreshLaunches();
      setSuccessMessage('Lancamento atualizado com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshLaunches],
  );

  const deleteLaunchItem = useCallback(
    async (id: string): Promise<ActionResult<{ id: string }>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await deleteLaunch(id);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return emptyResult<{ id: string }>(result.error);
      }

      await refreshLaunches();
      setSuccessMessage('Lancamento removido com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshLaunches],
  );

  const publishLaunchItem = useCallback(
    async (id: string): Promise<ActionResult<Launch>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await publishLaunch(id);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return emptyResult<Launch>(result.error);
      }

      await refreshLaunches();
      setSuccessMessage('Lancamento publicado com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshLaunches],
  );

  const unpublishLaunchItem = useCallback(
    async (id: string): Promise<ActionResult<Launch>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await unpublishLaunch(id);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return emptyResult<Launch>(result.error);
      }

      await refreshLaunches();
      setSuccessMessage('Lancamento despublicado com sucesso.');
      return { data: result.data, error: null };
    },
    [refreshLaunches],
  );

  const uploadLaunchImageFile = useCallback(async (file: File) => {
    return uploadLaunchImage(file);
  }, []);

  const getLaunchByIdItem = useCallback(async (id: string): Promise<ActionResult<Launch>> => {
    const result = await getLaunchById(id);
    if (result.error) {
      return emptyResult<Launch>(result.error);
    }
    return { data: result.data, error: null };
  }, []);

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return {
    launches,
    publicLaunches,
    isLoading,
    isMutating,
    error,
    successMessage,
    isUsingFallback,
    isSupabaseEnabled: isSupabaseConfigured,
    refreshLaunches,
    createLaunchItem,
    updateLaunchItem,
    deleteLaunchItem,
    publishLaunchItem,
    unpublishLaunchItem,
    uploadLaunchImageFile,
    getLaunchByIdItem,
    clearMessages,
  };
}

