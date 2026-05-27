import { useCallback, useEffect, useMemo, useState } from 'react';
import { isSupabaseConfigured, supabaseConfigMessage } from '../lib/supabase';
import { listBlockItems, listContentBlocks } from '../services/contentBlocks.service';
import type { ContentBlock, ContentBlockItem } from '../types/cms';
import type {
  PublicContentBlockFallback,
  PublicContentBlockFallbackItem,
} from '../config/publicContentBlocksFallback';
import type { Json } from '../types/database';

export type PublicContentBlock = PublicContentBlockFallback;
export type PublicContentBlockItem = PublicContentBlockFallbackItem;

type PublicContentSource = 'cms' | 'fallback';

interface UsePublicContentBlocksOptions {
  pageKey: string;
  fallbackBlocks: PublicContentBlock[];
  fallbackMode?: 'merge' | 'only-when-empty';
}

interface UsePublicContentBlocksReturn {
  blocks: PublicContentBlock[];
  blocksByKey: Record<string, PublicContentBlock>;
  isLoading: boolean;
  error: string | null;
  source: PublicContentSource;
  refresh: () => Promise<void>;
}

function normalizeText(value: string | null | undefined, fallback = ''): string {
  if (typeof value !== 'string') {
    return fallback;
  }
  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeJson(value: Json | null | undefined, fallback: Json = {}): Json {
  if (value === null || value === undefined) {
    return fallback;
  }
  return value;
}

function mapItem(
  item: ContentBlockItem,
  fallback: PublicContentBlockItem | undefined,
  blockId: string,
): PublicContentBlockItem {
  return {
    id: item.id,
    block_id: item.block_id || blockId,
    title: normalizeText(item.title, fallback?.title ?? ''),
    subtitle: normalizeText(item.subtitle, fallback?.subtitle ?? ''),
    content: normalizeText(item.content, fallback?.content ?? ''),
    image_url: normalizeText(item.image_url, fallback?.image_url ?? ''),
    icon: normalizeText(item.icon, fallback?.icon ?? ''),
    button_label: normalizeText(item.button_label, fallback?.button_label ?? ''),
    button_url: normalizeText(item.button_url, fallback?.button_url ?? ''),
    metadata: normalizeJson(item.metadata, fallback?.metadata ?? {}),
    sort_order: Number.isFinite(item.sort_order) ? Number(item.sort_order) : fallback?.sort_order ?? 0,
    is_active: item.is_active ?? fallback?.is_active ?? true,
  };
}

function mapBlock(
  block: ContentBlock,
  fallback: PublicContentBlock | undefined,
  items: PublicContentBlockItem[],
): PublicContentBlock {
  return {
    id: block.id,
    page_key: block.page_key,
    block_key: block.block_key,
    block_type: block.block_type,
    title: normalizeText(block.title, fallback?.title ?? ''),
    subtitle: normalizeText(block.subtitle, fallback?.subtitle ?? ''),
    content: normalizeText(block.content, fallback?.content ?? ''),
    image_url: normalizeText(block.image_url, fallback?.image_url ?? ''),
    icon: normalizeText(block.icon, fallback?.icon ?? ''),
    button_label: normalizeText(block.button_label, fallback?.button_label ?? ''),
    button_url: normalizeText(block.button_url, fallback?.button_url ?? ''),
    secondary_button_label: normalizeText(
      block.secondary_button_label,
      fallback?.secondary_button_label ?? '',
    ),
    secondary_button_url: normalizeText(
      block.secondary_button_url,
      fallback?.secondary_button_url ?? '',
    ),
    settings: normalizeJson(block.settings, fallback?.settings ?? {}),
    sort_order: Number.isFinite(block.sort_order) ? Number(block.sort_order) : fallback?.sort_order ?? 0,
    is_active: block.is_active ?? fallback?.is_active ?? true,
    items,
  };
}

function sortBlocks(blocks: PublicContentBlock[]): PublicContentBlock[] {
  return [...blocks].sort((a, b) => {
    const sortDelta = (a.sort_order ?? 0) - (b.sort_order ?? 0);
    if (sortDelta !== 0) {
      return sortDelta;
    }
    return a.block_key.localeCompare(b.block_key);
  });
}

function sortItems(items: PublicContentBlockItem[]): PublicContentBlockItem[] {
  return [...items].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
}

export function usePublicContentBlocks({
  pageKey,
  fallbackBlocks,
  fallbackMode = 'merge',
}: UsePublicContentBlocksOptions): UsePublicContentBlocksReturn {
  const [blocks, setBlocks] = useState<PublicContentBlock[]>(() => sortBlocks(fallbackBlocks));
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [source, setSource] = useState<PublicContentSource>('fallback');

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setBlocks(sortBlocks(fallbackBlocks));
      setError(supabaseConfigMessage ?? 'Supabase nao configurado.');
      setSource('fallback');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const blocksResult = await listContentBlocks(pageKey);

    if (blocksResult.error) {
      if (import.meta.env.DEV) {
        console.warn(`Falha ao carregar content_blocks de ${pageKey}:`, blocksResult.error);
      }
      setBlocks(sortBlocks(fallbackBlocks));
      setError(blocksResult.error);
      setSource('fallback');
      setIsLoading(false);
      return;
    }

    const remoteBlocks = blocksResult.data ?? [];
    if (!remoteBlocks.length) {
      setBlocks(sortBlocks(fallbackBlocks));
      setError(null);
      setSource('fallback');
      setIsLoading(false);
      return;
    }

    const fallbackByKey = new Map(fallbackBlocks.map((block) => [block.block_key, block] as const));

    const itemResults = await Promise.all(
      remoteBlocks.map(async (block) => ({
        blockId: block.id,
        blockKey: block.block_key,
        result: await listBlockItems(block.id),
      })),
    );

    const firstItemsError = itemResults.find((entry) => entry.result.error)?.result.error ?? null;
    if (firstItemsError && import.meta.env.DEV) {
      console.warn(`Falha ao carregar itens de content_blocks de ${pageKey}:`, firstItemsError);
    }

    const mergedByKey = new Map<string, PublicContentBlock>();

    for (const block of remoteBlocks) {
      const fallbackBlock = fallbackByKey.get(block.block_key);
      const itemsEntry = itemResults.find((entry) => entry.blockId === block.id);
      const remoteItems = itemsEntry?.result.data ?? [];
      const fallbackItems = fallbackBlock?.items ?? [];
      const fallbackItemBySortOrder = new Map(
        fallbackItems.map((item) => [item.sort_order, item] as const),
      );

      const mappedItems = sortItems(
        remoteItems.map((item) => mapItem(item, fallbackItemBySortOrder.get(item.sort_order), block.id)),
      );

      const items = mappedItems.length > 0 ? mappedItems : fallbackItems;
      mergedByKey.set(block.block_key, mapBlock(block, fallbackBlock, items));
    }

    if (fallbackMode === 'merge') {
      for (const fallbackBlock of fallbackBlocks) {
        if (!mergedByKey.has(fallbackBlock.block_key)) {
          mergedByKey.set(fallbackBlock.block_key, fallbackBlock);
        }
      }
    }

    setBlocks(sortBlocks(Array.from(mergedByKey.values())));
    setError(firstItemsError);
    setSource('cms');
    setIsLoading(false);
  }, [fallbackBlocks, fallbackMode, pageKey]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refresh();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refresh]);

  const blocksByKey = useMemo(
    () =>
      blocks.reduce<Record<string, PublicContentBlock>>((acc, block) => {
        acc[block.block_key] = block;
        return acc;
      }, {}),
    [blocks],
  );

  return {
    blocks,
    blocksByKey,
    isLoading,
    error,
    source,
    refresh,
  };
}
