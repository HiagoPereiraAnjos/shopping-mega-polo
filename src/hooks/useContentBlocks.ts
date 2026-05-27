import { useCallback, useEffect, useState } from 'react';
import type {
  ContentBlock,
  ContentBlockInsert,
  ContentBlockItem,
  ContentBlockItemInsert,
  ContentBlockItemUpdate,
  ContentBlockUpdate,
} from '../types/cms';
import type { ContentBlockWithItems } from '../types/contentBlocks';
import {
  createBlockItem,
  createContentBlock,
  deleteBlockItem,
  deleteContentBlock,
  getContentBlock,
  getContentBlockWithItems,
  listBlockItems,
  listContentBlocks,
  reorderBlockItems,
  reorderContentBlocks,
  type ReorderContentBlockItem,
  type ReorderContentBlockListItem,
  updateBlockItem,
  updateContentBlock,
} from '../services/contentBlocks.service';

interface UseContentBlocksOptions {
  pageKey?: string;
  autoLoad?: boolean;
}

interface ActionResult<T> {
  data: T | null;
  error: string | null;
}

export function useContentBlocks(options: UseContentBlocksOptions = {}) {
  const { pageKey, autoLoad = true } = options;

  const [blocks, setBlocks] = useState<ContentBlock[]>([]);
  const [isLoading, setIsLoading] = useState(() => autoLoad && Boolean(pageKey?.trim()));
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const refreshBlocks = useCallback(
    async (targetPageKey?: string): Promise<ActionResult<ContentBlock[]>> => {
      const resolvedPageKey = targetPageKey ?? pageKey;

      if (!resolvedPageKey?.trim()) {
        setBlocks([]);
        setError('page_key e obrigatorio para listar blocos.');
        setIsLoading(false);
        return { data: null, error: 'page_key e obrigatorio para listar blocos.' };
      }

      setIsLoading(true);
      const result = await listContentBlocks(resolvedPageKey);
      setIsLoading(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      setBlocks(result.data ?? []);
      setError(null);
      return { data: result.data ?? [], error: null };
    },
    [pageKey],
  );

  useEffect(() => {
    if (!autoLoad || !pageKey?.trim()) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void refreshBlocks(pageKey);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [autoLoad, pageKey, refreshBlocks]);

  const getBlock = useCallback(
    async (targetPageKey: string, blockKey: string): Promise<ActionResult<ContentBlock>> => {
      const result = await getContentBlock(targetPageKey, blockKey);
      if (result.error) {
        return { data: null, error: result.error };
      }
      return { data: result.data, error: null };
    },
    [],
  );

  const getBlockWithItems = useCallback(
    async (targetPageKey: string, blockKey: string): Promise<ActionResult<ContentBlockWithItems>> => {
      const result = await getContentBlockWithItems(targetPageKey, blockKey);
      if (result.error) {
        return { data: null, error: result.error };
      }
      return { data: result.data, error: null };
    },
    [],
  );

  const createBlock = useCallback(
    async (payload: ContentBlockInsert): Promise<ActionResult<ContentBlock>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await createContentBlock(payload);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      if (pageKey?.trim() && payload.page_key?.trim()) {
        await refreshBlocks(payload.page_key);
      }

      setSuccessMessage('Bloco criado com sucesso.');
      return { data: result.data, error: null };
    },
    [pageKey, refreshBlocks],
  );

  const updateBlock = useCallback(
    async (id: string, payload: ContentBlockUpdate): Promise<ActionResult<ContentBlock>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await updateContentBlock(id, payload);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      if (pageKey?.trim()) {
        await refreshBlocks(pageKey);
      }

      setSuccessMessage('Bloco atualizado com sucesso.');
      return { data: result.data, error: null };
    },
    [pageKey, refreshBlocks],
  );

  const removeBlock = useCallback(
    async (id: string): Promise<ActionResult<{ id: string }>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await deleteContentBlock(id);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      if (pageKey?.trim()) {
        await refreshBlocks(pageKey);
      }

      setSuccessMessage('Bloco removido com sucesso.');
      return { data: result.data, error: null };
    },
    [pageKey, refreshBlocks],
  );

  const reorderBlocks = useCallback(
    async (
      items: ReorderContentBlockListItem[],
      targetPageKey?: string,
    ): Promise<ActionResult<ContentBlock[]>> => {
      const resolvedPageKey = targetPageKey ?? pageKey;

      if (!resolvedPageKey?.trim()) {
        return { data: null, error: 'page_key e obrigatorio para reordenar blocos.' };
      }

      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await reorderContentBlocks(resolvedPageKey, items);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      setBlocks(result.data ?? []);
      setSuccessMessage('Ordenacao dos blocos atualizada.');
      return { data: result.data ?? [], error: null };
    },
    [pageKey],
  );

  const listItems = useCallback(async (blockId: string): Promise<ActionResult<ContentBlockItem[]>> => {
    const result = await listBlockItems(blockId);
    if (result.error) {
      return { data: null, error: result.error };
    }
    return { data: result.data ?? [], error: null };
  }, []);

  const createItem = useCallback(
    async (payload: ContentBlockItemInsert): Promise<ActionResult<ContentBlockItem>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await createBlockItem(payload);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      setSuccessMessage('Item de bloco criado com sucesso.');
      return { data: result.data, error: null };
    },
    [],
  );

  const updateItem = useCallback(
    async (id: string, payload: ContentBlockItemUpdate): Promise<ActionResult<ContentBlockItem>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await updateBlockItem(id, payload);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      setSuccessMessage('Item de bloco atualizado com sucesso.');
      return { data: result.data, error: null };
    },
    [],
  );

  const removeItem = useCallback(async (id: string): Promise<ActionResult<{ id: string }>> => {
    setIsMutating(true);
    setError(null);
    setSuccessMessage(null);

    const result = await deleteBlockItem(id);
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return { data: null, error: result.error };
    }

    setSuccessMessage('Item de bloco removido com sucesso.');
    return { data: result.data, error: null };
  }, []);

  const reorderItems = useCallback(
    async (blockId: string, items: ReorderContentBlockItem[]): Promise<ActionResult<ContentBlockItem[]>> => {
      setIsMutating(true);
      setError(null);
      setSuccessMessage(null);

      const result = await reorderBlockItems(blockId, items);
      setIsMutating(false);

      if (result.error) {
        setError(result.error);
        return { data: null, error: result.error };
      }

      setSuccessMessage('Ordenacao dos itens atualizada.');
      return { data: result.data ?? [], error: null };
    },
    [],
  );

  const clearMessages = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  return {
    blocks,
    isLoading,
    isMutating,
    error,
    successMessage,
    refreshBlocks,
    getBlock,
    getBlockWithItems,
    createBlock,
    updateBlock,
    deleteBlock: removeBlock,
    reorderBlocks,
    listItems,
    createItem,
    updateItem,
    deleteItem: removeItem,
    reorderItems,
    clearMessages,
  };
}
