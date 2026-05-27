import { useCallback, useEffect, useMemo, useState } from 'react';
import type { PlanningItem, Store } from '../types';

const STORAGE_KEY = 'mega_polo_roteiro';
const STORAGE_VERSION = 2;
const STORAGE_SYNC_EVENT = 'mega_polo_roteiro_updated';

interface PlanningStoragePayload {
  version: number;
  items: PlanningItem[];
}

type RawPlanningItem = Partial<
  PlanningItem & {
    storeId: string;
    unit: string;
    notes: string;
  }
>;

function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeOptionalText(value: unknown): string | undefined {
  const normalized = normalizeText(value);
  return normalized || undefined;
}

function normalizeDate(value: unknown): string {
  const raw = normalizeText(value);
  if (!raw) {
    return new Date().toISOString();
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return new Date().toISOString();
  }

  return parsed.toISOString();
}

function getItemIdentity(item: Pick<PlanningItem, 'store_id' | 'slug'>): string {
  const storeId = normalizeText(item.store_id);
  const slug = normalizeText(item.slug);
  if (storeId) {
    return `id:${storeId}`;
  }
  return `slug:${slug}`;
}

function mapRawItem(rawItem: RawPlanningItem): PlanningItem | null {
  const storeId = normalizeText(rawItem.store_id ?? rawItem.storeId);
  const slug = normalizeText(rawItem.slug);

  if (!storeId && !slug) {
    return null;
  }

  const name = normalizeText(rawItem.name) || 'Loja';

  return {
    store_id: storeId,
    slug,
    name,
    floor: normalizeText(rawItem.floor) || 'Piso nao informado',
    store_number:
      normalizeText(rawItem.store_number ?? rawItem.unit) || 'Numero nao informado',
    whatsapp: normalizeOptionalText(rawItem.whatsapp),
    note: normalizeOptionalText(rawItem.note ?? rawItem.notes),
    added_at: normalizeDate(rawItem.added_at),
  };
}

function normalizeItems(rawItems: RawPlanningItem[]): PlanningItem[] {
  const seen = new Set<string>();
  const normalized: PlanningItem[] = [];

  for (const rawItem of rawItems) {
    const mapped = mapRawItem(rawItem);
    if (!mapped) {
      continue;
    }

    const identity = getItemIdentity(mapped);
    if (seen.has(identity)) {
      continue;
    }

    seen.add(identity);
    normalized.push(mapped);
  }

  return normalized;
}

function readFromStorage(): PlanningItem[] {
  if (typeof window === 'undefined') {
    return [];
  }

  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as PlanningStoragePayload | RawPlanningItem[];

    if (Array.isArray(parsed)) {
      return normalizeItems(parsed);
    }

    if (parsed && Array.isArray(parsed.items)) {
      return normalizeItems(parsed.items);
    }
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('Falha ao ler roteiro salvo no localStorage:', error);
    }
  }

  return [];
}

function writeToStorage(items: PlanningItem[]): void {
  if (typeof window === 'undefined') {
    return;
  }

  const payload: PlanningStoragePayload = {
    version: STORAGE_VERSION,
    items: normalizeItems(items),
  };

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

function reorderList(
  items: PlanningItem[],
  targetIdentity: string,
  direction: 'up' | 'down',
): PlanningItem[] {
  const index = items.findIndex((item) => getItemIdentity(item) === targetIdentity);
  if (index < 0) {
    return items;
  }

  const nextIndex = direction === 'up' ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const reordered = [...items];
  const [current] = reordered.splice(index, 1);
  reordered.splice(nextIndex, 0, current);
  return reordered;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function usePlanning() {
  const [items, setItems] = useState<PlanningItem[]>(() => readFromStorage());

  useEffect(() => {
    const syncFromStorage = () => {
      setItems(readFromStorage());
    };

    window.addEventListener('storage', syncFromStorage);
    window.addEventListener(STORAGE_SYNC_EVENT, syncFromStorage as EventListener);

    return () => {
      window.removeEventListener('storage', syncFromStorage);
      window.removeEventListener(STORAGE_SYNC_EVENT, syncFromStorage as EventListener);
    };
  }, []);

  const saveItems = useCallback((nextItems: PlanningItem[]) => {
    const normalized = normalizeItems(nextItems);
    writeToStorage(normalized);
    setItems(normalized);
    window.dispatchEvent(new Event(STORAGE_SYNC_EVENT));
  }, []);

  const isInRoute = useCallback(
    (storeIdOrSlug: string) => {
      const normalized = normalizeText(storeIdOrSlug);
      if (!normalized) {
        return false;
      }

      return items.some(
        (item) => item.store_id === normalized || item.slug === normalized,
      );
    },
    [items],
  );

  const addItem = useCallback(
    (store: Store) => {
      const storeId = normalizeText(store.id);
      const slug = normalizeText(store.slug);

      if (!storeId && !slug) {
        return false;
      }

      if (isInRoute(storeId || slug)) {
        return false;
      }

      const newItem: PlanningItem = {
        store_id: storeId,
        slug,
        name: normalizeText(store.name) || 'Loja',
        floor: normalizeText(store.floor) || 'Piso nao informado',
        store_number: normalizeText(store.unit) || 'Numero nao informado',
        whatsapp: normalizeOptionalText(store.whatsapp),
        note: undefined,
        added_at: new Date().toISOString(),
      };

      saveItems([...items, newItem]);
      return true;
    },
    [isInRoute, items, saveItems],
  );

  const removeItem = useCallback(
    (identityOrStoreId: string) => {
      const normalized = normalizeText(identityOrStoreId);
      if (!normalized) {
        return;
      }

      const nextItems = items.filter((item) => {
        const identity = getItemIdentity(item);
        return (
          identity !== normalized &&
          item.store_id !== normalized &&
          item.slug !== normalized
        );
      });

      saveItems(nextItems);
    },
    [items, saveItems],
  );

  const updateNote = useCallback(
    (identityOrStoreId: string, note: string) => {
      const normalized = normalizeText(identityOrStoreId);
      if (!normalized) {
        return;
      }

      const nextItems = items.map((item) => {
        const identity = getItemIdentity(item);
        if (
          identity !== normalized &&
          item.store_id !== normalized &&
          item.slug !== normalized
        ) {
          return item;
        }

        return {
          ...item,
          note: normalizeOptionalText(note),
        };
      });

      saveItems(nextItems);
    },
    [items, saveItems],
  );

  const clearPlanning = useCallback(() => {
    saveItems([]);
  }, [saveItems]);

  const moveItem = useCallback(
    (identityOrStoreId: string, direction: 'up' | 'down') => {
      const normalized = normalizeText(identityOrStoreId);
      if (!normalized) {
        return;
      }

      const identity =
        normalized.startsWith('id:') || normalized.startsWith('slug:')
          ? normalized
          : items.find(
              (item) => item.store_id === normalized || item.slug === normalized,
            )
            ? getItemIdentity(
                items.find(
                  (item) => item.store_id === normalized || item.slug === normalized,
                ) as PlanningItem,
              )
            : normalized;

      const reordered = reorderList(items, identity, direction);
      saveItems(reordered);
    },
    [items, saveItems],
  );

  const generateShareMessage = useCallback(
    (title = 'Roteiro de compras | Mega Polo Moda') => {
      const rows = [
        title,
        '',
        ...items.map((item, index) => {
          const noteLine = item.note ? `Observacao: ${item.note}` : '';
          return [
            `${index + 1}. ${item.name}`,
            `Piso: ${item.floor}`,
            `Numero: ${item.store_number}`,
            noteLine,
          ]
            .filter(Boolean)
            .join('\n');
        }),
      ];

      return rows.join('\n\n').trim();
    },
    [items],
  );

  const getPrintableHtml = useCallback(
    (title = 'Roteiro de Compras - Mega Polo Moda') => {
      const now = new Date().toLocaleString('pt-BR');
      const itemRows = items
        .map((item, index) => {
          const note = item.note
            ? `<p class="note"><strong>Observacao:</strong> ${escapeHtml(item.note)}</p>`
            : '';

          return `
            <li>
              <h3>${index + 1}. ${escapeHtml(item.name)}</h3>
              <p><strong>Piso:</strong> ${escapeHtml(item.floor)}</p>
              <p><strong>Numero:</strong> ${escapeHtml(item.store_number)}</p>
              ${note}
            </li>
          `;
        })
        .join('');

      return `
        <!doctype html>
        <html lang="pt-BR">
          <head>
            <meta charset="utf-8" />
            <title>${escapeHtml(title)}</title>
            <style>
              body { font-family: Arial, sans-serif; margin: 28px; color: #1a1a1a; }
              h1 { margin: 0 0 8px; }
              .meta { color: #555; margin-bottom: 20px; }
              ul { list-style: none; padding: 0; margin: 0; }
              li { border: 1px solid #e5e7eb; border-radius: 10px; padding: 14px; margin-bottom: 12px; }
              h3 { margin: 0 0 8px; }
              p { margin: 4px 0; font-size: 14px; }
              .note { margin-top: 8px; }
            </style>
          </head>
          <body>
            <h1>${escapeHtml(title)}</h1>
            <p class="meta">Gerado em: ${escapeHtml(now)}</p>
            <ul>${itemRows}</ul>
          </body>
        </html>
      `;
    },
    [items],
  );

  const orderedItems = useMemo(() => items, [items]);

  return {
    items: orderedItems,
    addItem,
    removeItem,
    updateNote,
    clearPlanning,
    isInRoute,
    moveItem,
    getItemIdentity,
    generateShareMessage,
    getPrintableHtml,
  };
}
