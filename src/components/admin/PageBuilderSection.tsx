import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import type { ContentBlock, ContentBlockItem, Page } from '../../types/cms';
import type { Json } from '../../types/database';
import { useContentBlocks } from '../../hooks/useContentBlocks';
import {
  blockTypeSupportsItems,
  buildPageContentKey,
  getPageBuilderBlockTypeLabel,
  PAGE_BUILDER_BLOCK_TYPE_OPTIONS,
  type PageBuilderBlockType,
} from '../../types/pageBuilder';
import AdminCard from './AdminCard';
import AdminEmptyState from './AdminEmptyState';
import AdminErrorState from './AdminErrorState';
import AdminFormSection from './AdminFormSection';
import AdminLoadingState from './AdminLoadingState';
import AdminTable, { type AdminTableColumn } from './AdminTable';
import ConfirmDialog from './ConfirmDialog';
import StatusBadge from './StatusBadge';
import { ImageWithFallback } from '../ui/ImageWithFallback';

interface PageBuilderSectionProps {
  pages: Page[];
  selectedPageId: string | null;
  onSelectPageId: (pageId: string | null) => void;
  canEdit: boolean;
}

interface BlockFormState {
  block_key: string;
  block_type: PageBuilderBlockType;
  title: string;
  subtitle: string;
  content: string;
  image_url: string;
  button_label: string;
  button_url: string;
  secondary_button_label: string;
  secondary_button_url: string;
  settings: string;
  sort_order: string;
  is_active: boolean;
}

interface ItemFormState {
  title: string;
  subtitle: string;
  content: string;
  image_url: string;
  button_label: string;
  button_url: string;
  metadata: string;
  sort_order: string;
  is_active: boolean;
}

function normalizeText(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function slugifyBlockKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
}

function parseJsonField(raw: string, label: string): { value: Json | null; error: string | null } {
  const normalized = normalizeText(raw);
  if (!normalized) {
    return { value: {}, error: null };
  }

  try {
    return { value: JSON.parse(normalized) as Json, error: null };
  } catch {
    return { value: null, error: `${label} deve ser um JSON valido.` };
  }
}

function parseSortOrder(raw: string): { value: number | null; error: string | null } {
  const normalized = normalizeText(raw);
  if (!normalized) {
    return { value: 0, error: null };
  }

  if (!/^-?[0-9]+$/.test(normalized)) {
    return { value: null, error: 'sort_order deve ser numerico.' };
  }

  return { value: Number.parseInt(normalized, 10), error: null };
}

function createBlockForm(sortOrder = 0): BlockFormState {
  return {
    block_key: '',
    block_type: 'text',
    title: '',
    subtitle: '',
    content: '',
    image_url: '',
    button_label: '',
    button_url: '',
    secondary_button_label: '',
    secondary_button_url: '',
    settings: '{}',
    sort_order: String(sortOrder),
    is_active: true,
  };
}

function createItemForm(sortOrder = 0): ItemFormState {
  return {
    title: '',
    subtitle: '',
    content: '',
    image_url: '',
    button_label: '',
    button_url: '',
    metadata: '{}',
    sort_order: String(sortOrder),
    is_active: true,
  };
}

function mapBlockToForm(block: ContentBlock): BlockFormState {
  const blockType = PAGE_BUILDER_BLOCK_TYPE_OPTIONS.find((item) => item.value === block.block_type)
    ?.value ?? 'text';

  return {
    block_key: block.block_key,
    block_type: blockType,
    title: block.title ?? '',
    subtitle: block.subtitle ?? '',
    content: block.content ?? '',
    image_url: block.image_url ?? '',
    button_label: block.button_label ?? '',
    button_url: block.button_url ?? '',
    secondary_button_label: block.secondary_button_label ?? '',
    secondary_button_url: block.secondary_button_url ?? '',
    settings: JSON.stringify(block.settings ?? {}, null, 2),
    sort_order: String(block.sort_order ?? 0),
    is_active: block.is_active,
  };
}

function mapItemToForm(item: ContentBlockItem): ItemFormState {
  return {
    title: item.title ?? '',
    subtitle: item.subtitle ?? '',
    content: item.content ?? '',
    image_url: item.image_url ?? '',
    button_label: item.button_label ?? '',
    button_url: item.button_url ?? '',
    metadata: JSON.stringify(item.metadata ?? {}, null, 2),
    sort_order: String(item.sort_order ?? 0),
    is_active: item.is_active,
  };
}

function getNextBlockSortOrder(blocks: ContentBlock[]): number {
  if (!blocks.length) {
    return 0;
  }
  return Math.max(...blocks.map((item) => item.sort_order ?? 0)) + 1;
}

function getNextItemSortOrder(items: ContentBlockItem[]): number {
  if (!items.length) {
    return 0;
  }
  return Math.max(...items.map((item) => item.sort_order ?? 0)) + 1;
}

function buildCopyBlockKey(baseKey: string, takenKeys: Set<string>): string {
  const normalizedBase = slugifyBlockKey(baseKey) || 'bloco';
  let index = 1;
  let candidate = `${normalizedBase}-copy`;
  while (takenKeys.has(candidate)) {
    index += 1;
    candidate = `${normalizedBase}-copy-${index}`;
  }
  return candidate;
}

function renderBlockPreview(block: ContentBlock, items: ContentBlockItem[]) {
  const activeItems = items
    .filter((item) => item.is_active)
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));

  if (block.block_type === 'hero') {
    return (
      <article className="rounded-2xl border border-brand-dark/10 bg-white overflow-hidden">
        {block.image_url && (
          <ImageWithFallback
            src={block.image_url}
            alt={block.title ?? 'Hero'}
            className="w-full h-56 object-cover"
            width={1200}
            height={600}
            sizes="100vw"
          />
        )}
        <div className="p-5 space-y-2">
          {block.subtitle && <p className="text-[11px] uppercase tracking-brand text-brand-dark/60">{block.subtitle}</p>}
          <h3 className="text-2xl font-serif font-semibold text-brand-dark">{block.title || 'Hero'}</h3>
          {block.content && <p className="text-sm text-brand-dark/75">{block.content}</p>}
        </div>
      </article>
    );
  }

  if (block.block_type === 'image') {
    return (
      <article className="rounded-2xl border border-brand-dark/10 bg-white p-3">
        <ImageWithFallback
          src={block.image_url}
          alt={block.title || 'Imagem'}
          className="w-full h-64 object-cover rounded-xl"
          width={1200}
          height={700}
          sizes="100vw"
        />
      </article>
    );
  }

  if (block.block_type === 'text_image') {
    return (
      <article className="rounded-2xl border border-brand-dark/10 bg-white p-5 grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          {block.title && <h3 className="text-2xl font-serif font-semibold text-brand-dark">{block.title}</h3>}
          {block.content && <p className="text-sm text-brand-dark/75">{block.content}</p>}
        </div>
        {block.image_url && (
          <ImageWithFallback
            src={block.image_url}
            alt={block.title || 'Imagem'}
            className="w-full h-56 object-cover rounded-xl"
            width={960}
            height={640}
            sizes="(max-width: 1024px) 100vw, 50vw"
          />
        )}
      </article>
    );
  }

  if (block.block_type === 'cta') {
    return (
      <article className="rounded-2xl border border-brand-dark/10 bg-brand-dark text-white p-6 space-y-3">
        {block.title && <h3 className="text-2xl font-serif font-semibold">{block.title}</h3>}
        {block.content && <p className="text-white/80">{block.content}</p>}
        <div className="flex flex-wrap gap-2">
          {block.button_label && block.button_url && (
            <span className="inline-flex px-4 py-2 rounded-lg bg-brand-red text-[11px] uppercase tracking-brand font-bold">
              {block.button_label}
            </span>
          )}
          {block.secondary_button_label && block.secondary_button_url && (
            <span className="inline-flex px-4 py-2 rounded-lg border border-white/30 text-[11px] uppercase tracking-brand font-bold">
              {block.secondary_button_label}
            </span>
          )}
        </div>
      </article>
    );
  }

  return (
    <article className="rounded-2xl border border-brand-dark/10 bg-white p-5 space-y-3">
      <header className="space-y-1">
        <p className="text-[11px] uppercase tracking-brand text-brand-dark/50">{getPageBuilderBlockTypeLabel(block.block_type)}</p>
        {block.title && <h3 className="text-2xl font-serif font-semibold text-brand-dark">{block.title}</h3>}
      </header>

      {block.content && <p className="text-sm text-brand-dark/75">{block.content}</p>}

      {activeItems.length > 0 && (
        <div className="space-y-2">
          {activeItems.map((item) => (
            <div key={item.id} className="rounded-xl border border-brand-dark/10 bg-brand-paper/40 p-3 space-y-1">
              {item.title && <p className="font-semibold text-brand-dark">{item.title}</p>}
              {item.content && <p className="text-sm text-brand-dark/75">{item.content}</p>}
            </div>
          ))}
        </div>
      )}
    </article>
  );
}

export default function PageBuilderSection({
  pages,
  selectedPageId,
  onSelectPageId,
  canEdit,
}: PageBuilderSectionProps) {
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState<BlockFormState>(() => createBlockForm());
  const [blockFormError, setBlockFormError] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(() => createItemForm());
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemFormError, setItemFormError] = useState<string | null>(null);
  const [itemsByBlockId, setItemsByBlockId] = useState<Record<string, ContentBlockItem[]>>({});
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pendingDeleteBlock, setPendingDeleteBlock] = useState<ContentBlock | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ContentBlockItem | null>(null);

  const selectedPage = useMemo(
    () => pages.find((page) => page.id === selectedPageId) ?? null,
    [pages, selectedPageId],
  );
  const pageKey = useMemo(
    () => (selectedPage ? buildPageContentKey(selectedPage.slug) : ''),
    [selectedPage],
  );

  const {
    blocks,
    isLoading,
    isMutating,
    error,
    successMessage,
    refreshBlocks,
    createBlock,
    updateBlock,
    deleteBlock,
    reorderBlocks,
    listItems,
    createItem,
    updateItem,
    deleteItem,
    reorderItems,
    clearMessages,
  } = useContentBlocks({ pageKey, autoLoad: Boolean(pageKey) });

  const orderedBlocks = useMemo(
    () => [...blocks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [blocks],
  );

  const selectedBlock = useMemo(
    () => orderedBlocks.find((block) => block.id === selectedBlockId) ?? null,
    [orderedBlocks, selectedBlockId],
  );

  const selectedBlockItems = useMemo(
    () =>
      [...(selectedBlock ? itemsByBlockId[selectedBlock.id] ?? [] : [])].sort(
        (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
      ),
    [itemsByBlockId, selectedBlock],
  );

  const clearLocalMessages = useCallback(() => {
    setFeedbackMessage(null);
    setBlockFormError(null);
    setItemFormError(null);
    setItemsError(null);
    clearMessages();
  }, [clearMessages]);

  const resetBlockForm = useCallback((sortOrder = 0) => {
    setBlockForm(createBlockForm(sortOrder));
    setEditingBlockId(null);
    setBlockFormError(null);
  }, []);

  const resetItemForm = useCallback((sortOrder = 0) => {
    setItemForm(createItemForm(sortOrder));
    setEditingItemId(null);
    setItemFormError(null);
  }, []);

  const loadItemsForBlocks = useCallback(
    async (sourceBlocks: ContentBlock[]) => {
      if (!sourceBlocks.length) {
        setItemsByBlockId({});
        return;
      }

      setIsItemsLoading(true);
      const results = await Promise.all(
        sourceBlocks.map(async (block) => ({
          blockId: block.id,
          result: await listItems(block.id),
        })),
      );
      setIsItemsLoading(false);

      const firstError = results.find((entry) => entry.result.error)?.result.error ?? null;
      setItemsError(firstError);

      const mapped: Record<string, ContentBlockItem[]> = {};
      for (const entry of results) {
        mapped[entry.blockId] = [...(entry.result.data ?? [])].sort(
          (a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0),
        );
      }
      setItemsByBlockId(mapped);
    },
    [listItems],
  );

  useEffect(() => {
    if (!pageKey) {
      const timerId = window.setTimeout(() => {
        setSelectedBlockId(null);
        setEditingBlockId(null);
        setItemsByBlockId({});
        resetBlockForm(0);
        resetItemForm(0);
      }, 0);

      return () => {
        window.clearTimeout(timerId);
      };

      return;
    }

    const timerId = window.setTimeout(() => {
      void loadItemsForBlocks(orderedBlocks);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadItemsForBlocks, orderedBlocks, pageKey, resetBlockForm, resetItemForm]);

  useEffect(() => {
    if (!selectedBlockId) {
      return;
    }

    if (!orderedBlocks.some((item) => item.id === selectedBlockId)) {
      const timerId = window.setTimeout(() => {
        setSelectedBlockId(null);
        resetItemForm(0);
      }, 0);

      return () => {
        window.clearTimeout(timerId);
      };
    }
  }, [orderedBlocks, resetItemForm, selectedBlockId]);

  const nextBlockSortOrder = useMemo(() => getNextBlockSortOrder(orderedBlocks), [orderedBlocks]);
  const nextItemSortOrder = useMemo(() => getNextItemSortOrder(selectedBlockItems), [selectedBlockItems]);
  const canEditItems = canEdit && Boolean(selectedBlock) && blockTypeSupportsItems(selectedBlock.block_type);

  const handleCreateBlock = () => {
    clearLocalMessages();
    resetBlockForm(nextBlockSortOrder);
    setSelectedBlockId(null);
  };

  const handleEditBlock = (block: ContentBlock) => {
    clearLocalMessages();
    setEditingBlockId(block.id);
    setBlockForm(mapBlockToForm(block));
    setSelectedBlockId(block.id);
  };

  const handleBlockSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearLocalMessages();

    if (!selectedPage || !pageKey) {
      setBlockFormError('Selecione uma pagina para editar blocos.');
      return;
    }

    if (!canEdit) {
      setBlockFormError('Seu perfil possui acesso somente leitura.');
      return;
    }

    const blockKey = slugifyBlockKey(blockForm.block_key);
    if (!blockKey) {
      setBlockFormError('block_key e obrigatorio.');
      return;
    }

    const sortOrderResult = parseSortOrder(blockForm.sort_order);
    if (sortOrderResult.error || sortOrderResult.value === null) {
      setBlockFormError(sortOrderResult.error ?? 'sort_order invalido.');
      return;
    }

    const settingsResult = parseJsonField(blockForm.settings, 'settings');
    if (settingsResult.error || settingsResult.value === null) {
      setBlockFormError(settingsResult.error ?? 'settings invalido.');
      return;
    }

    const payload = {
      page_key: pageKey,
      block_key: blockKey,
      block_type: blockForm.block_type,
      title: normalizeText(blockForm.title) || null,
      subtitle: normalizeText(blockForm.subtitle) || null,
      content: normalizeText(blockForm.content) || null,
      image_url: normalizeText(blockForm.image_url) || null,
      icon: null,
      button_label: normalizeText(blockForm.button_label) || null,
      button_url: normalizeText(blockForm.button_url) || null,
      secondary_button_label: normalizeText(blockForm.secondary_button_label) || null,
      secondary_button_url: normalizeText(blockForm.secondary_button_url) || null,
      settings: settingsResult.value,
      sort_order: sortOrderResult.value,
      is_active: blockForm.is_active,
    };

    const result = editingBlockId
      ? await updateBlock(editingBlockId, payload)
      : await createBlock(payload);

    if (result.error || !result.data) {
      setBlockFormError(result.error ?? 'Nao foi possivel salvar o bloco.');
      return;
    }

    setFeedbackMessage(editingBlockId ? 'Bloco atualizado com sucesso.' : 'Bloco criado com sucesso.');
    setSelectedBlockId(result.data.id);
    resetBlockForm(getNextBlockSortOrder(orderedBlocks));
    await refreshBlocks(pageKey);
  };

  const handleToggleBlock = async (block: ContentBlock) => {
    clearLocalMessages();
    if (!canEdit) {
      setFeedbackMessage('Perfil com acesso somente leitura.');
      return;
    }

    const result = await updateBlock(block.id, { is_active: !block.is_active });
    if (!result.error) {
      setFeedbackMessage(block.is_active ? 'Bloco desativado.' : 'Bloco ativado.');
    }
  };

  const handleDeleteBlock = async () => {
    if (!pendingDeleteBlock) {
      return;
    }

    if (!canEdit) {
      setFeedbackMessage('Perfil com acesso somente leitura.');
      setPendingDeleteBlock(null);
      return;
    }

    const result = await deleteBlock(pendingDeleteBlock.id);
    if (!result.error) {
      setFeedbackMessage('Bloco removido com sucesso.');
      if (selectedBlockId === pendingDeleteBlock.id) {
        setSelectedBlockId(null);
        resetItemForm(0);
      }
    }
    setPendingDeleteBlock(null);
  };

  const handleMoveBlock = async (blockId: string, direction: 'up' | 'down') => {
    if (!canEdit) {
      setFeedbackMessage('Perfil com acesso somente leitura.');
      return;
    }

    const currentIndex = orderedBlocks.findIndex((block) => block.id === blockId);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedBlocks.length) {
      return;
    }

    const reordered = [...orderedBlocks];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const payload = reordered.map((block, index) => ({
      id: block.id,
      sort_order: index,
    }));

    const result = await reorderBlocks(payload, pageKey);
    if (!result.error) {
      setFeedbackMessage('Ordem dos blocos atualizada.');
    }
  };

  const handleDuplicateBlock = async (block: ContentBlock) => {
    clearLocalMessages();
    if (!canEdit) {
      setFeedbackMessage('Perfil com acesso somente leitura.');
      return;
    }

    const takenKeys = new Set<string>(orderedBlocks.map((item) => item.block_key || ''));
    const duplicateKey = buildCopyBlockKey(block.block_key, takenKeys);
    const result = await createBlock({
      page_key: pageKey,
      block_key: duplicateKey,
      block_type: PAGE_BUILDER_BLOCK_TYPE_OPTIONS.find((item) => item.value === block.block_type)?.value ?? 'text',
      title: block.title,
      subtitle: block.subtitle,
      content: block.content,
      image_url: block.image_url,
      icon: block.icon,
      button_label: block.button_label,
      button_url: block.button_url,
      secondary_button_label: block.secondary_button_label,
      secondary_button_url: block.secondary_button_url,
      settings: block.settings,
      sort_order: getNextBlockSortOrder(orderedBlocks),
      is_active: false,
    });

    if (result.error || !result.data) {
      setFeedbackMessage(result.error ?? 'Nao foi possivel duplicar bloco.');
      return;
    }

    const sourceItems = itemsByBlockId[block.id] ?? [];
    for (const sourceItem of sourceItems) {
      await createItem({
        block_id: result.data.id,
        title: sourceItem.title,
        subtitle: sourceItem.subtitle,
        content: sourceItem.content,
        image_url: sourceItem.image_url,
        icon: sourceItem.icon,
        button_label: sourceItem.button_label,
        button_url: sourceItem.button_url,
        metadata: sourceItem.metadata,
        sort_order: sourceItem.sort_order,
        is_active: sourceItem.is_active,
      });
    }

    setFeedbackMessage('Bloco duplicado com sucesso.');
    await refreshBlocks(pageKey);
  };

  const handleCreateItem = () => {
    clearLocalMessages();
    resetItemForm(nextItemSortOrder);
  };

  const handleEditItem = (item: ContentBlockItem) => {
    clearLocalMessages();
    setEditingItemId(item.id);
    setItemForm(mapItemToForm(item));
  };

  const refreshSelectedItems = useCallback(async () => {
    if (!selectedBlock) {
      return;
    }
    const result = await listItems(selectedBlock.id);
    if (!result.error) {
      setItemsByBlockId((current) => ({
        ...current,
        [selectedBlock.id]: [...(result.data ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
      }));
    } else {
      setItemsError(result.error);
    }
  }, [listItems, selectedBlock]);

  const handleItemSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearLocalMessages();

    if (!selectedBlock) {
      setItemFormError('Selecione um bloco para editar itens.');
      return;
    }

    if (!canEditItems) {
      setItemFormError('Seu perfil nao pode editar itens neste bloco.');
      return;
    }

    const sortOrderResult = parseSortOrder(itemForm.sort_order);
    if (sortOrderResult.error || sortOrderResult.value === null) {
      setItemFormError(sortOrderResult.error ?? 'sort_order invalido.');
      return;
    }

    const metadataResult = parseJsonField(itemForm.metadata, 'metadata');
    if (metadataResult.error || metadataResult.value === null) {
      setItemFormError(metadataResult.error ?? 'metadata invalido.');
      return;
    }

    const payload = {
      block_id: selectedBlock.id,
      title: normalizeText(itemForm.title) || null,
      subtitle: normalizeText(itemForm.subtitle) || null,
      content: normalizeText(itemForm.content) || null,
      image_url: normalizeText(itemForm.image_url) || null,
      icon: null,
      button_label: normalizeText(itemForm.button_label) || null,
      button_url: normalizeText(itemForm.button_url) || null,
      metadata: metadataResult.value,
      sort_order: sortOrderResult.value,
      is_active: itemForm.is_active,
    };

    const result = editingItemId
      ? await updateItem(editingItemId, payload)
      : await createItem(payload);

    if (result.error) {
      setItemFormError(result.error);
      return;
    }

    await refreshSelectedItems();
    setFeedbackMessage(editingItemId ? 'Item atualizado.' : 'Item criado.');
    resetItemForm(getNextItemSortOrder(selectedBlockItems));
  };

  const handleDeleteItem = async () => {
    if (!pendingDeleteItem) {
      return;
    }

    if (!canEditItems) {
      setPendingDeleteItem(null);
      setFeedbackMessage('Seu perfil nao pode excluir itens.');
      return;
    }

    const result = await deleteItem(pendingDeleteItem.id);
    if (!result.error) {
      await refreshSelectedItems();
      setFeedbackMessage('Item removido com sucesso.');
    }
    setPendingDeleteItem(null);
  };

  const handleToggleItem = async (item: ContentBlockItem) => {
    if (!canEditItems) {
      setFeedbackMessage('Seu perfil nao pode editar itens.');
      return;
    }

    const result = await updateItem(item.id, { is_active: !item.is_active });
    if (!result.error) {
      await refreshSelectedItems();
      setFeedbackMessage(item.is_active ? 'Item desativado.' : 'Item ativado.');
    }
  };

  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    if (!selectedBlock || !canEditItems) {
      return;
    }

    const currentItems = selectedBlockItems;
    const currentIndex = currentItems.findIndex((item) => item.id === itemId);
    if (currentIndex < 0) {
      return;
    }
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= currentItems.length) {
      return;
    }

    const reordered = [...currentItems];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const payload = reordered.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    const result = await reorderItems(selectedBlock.id, payload);
    if (!result.error) {
      await refreshSelectedItems();
      setFeedbackMessage('Ordem dos itens atualizada.');
    }
  };

  const blockColumns: Array<AdminTableColumn<ContentBlock>> = [
    {
      key: 'block',
      label: 'Bloco',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.title || row.block_key}</p>
          <p className="text-xs text-brand-dark/60">{row.block_key} • {getPageBuilderBlockTypeLabel(row.block_type)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge label={row.is_active ? 'Ativo' : 'Inativo'} tone={row.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'order',
      label: 'Ordem',
      render: (row) => <span className="text-xs text-brand-dark/60">{row.sort_order}</span>,
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleEditBlock(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => setSelectedBlockId(row.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Itens
          </button>
          <button
            type="button"
            onClick={() => void handleToggleBlock(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            {row.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {row.is_active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={() => void handleDuplicateBlock(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicar
          </button>
          <button
            type="button"
            onClick={() => void handleMoveBlock(row.id, 'up')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
            aria-label="Mover bloco para cima"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void handleMoveBlock(row.id, 'down')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
            aria-label="Mover bloco para baixo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPendingDeleteBlock(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      ),
    },
  ];

  const itemColumns: Array<AdminTableColumn<ContentBlockItem>> = [
    {
      key: 'item',
      label: 'Item',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.title || 'Item sem titulo'}</p>
          <p className="text-xs text-brand-dark/60">{row.content || '-'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <StatusBadge label={row.is_active ? 'Ativo' : 'Inativo'} tone={row.is_active ? 'active' : 'inactive'} />
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleEditItem(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleToggleItem(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            {row.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {row.is_active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={() => void handleMoveItem(row.id, 'up')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
            aria-label="Mover item para cima"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => void handleMoveItem(row.id, 'down')}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
            aria-label="Mover item para baixo"
          >
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setPendingDeleteItem(row)}
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
    <div className="space-y-6">
      <AdminCard
        title="Page Builder"
        description="Edite blocos por pagina com fallback seguro quando nao houver blocos publicados."
      >
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
          <div className="space-y-2">
            <label htmlFor="page-builder-page" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
              Pagina
            </label>
            <select
              id="page-builder-page"
              value={selectedPageId ?? ''}
              onChange={(event) => onSelectPageId(event.target.value || null)}
              className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
            >
              <option value="">Selecione uma pagina</option>
              {pages.map((page) => (
                <option key={page.id} value={page.id}>
                  {page.title} ({page.slug})
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/40 p-4 text-sm text-brand-dark/70">
            {selectedPage ? (
              <div className="space-y-1">
                <p>
                  Chave de conteudo: <span className="font-mono text-brand-dark">{pageKey}</span>
                </p>
                <p>
                  Rota publica: <span className="font-mono text-brand-dark">
                    {['sobre', 'privacidade', 'termos', 'planeje-sua-visita', 'abra-sua-loja'].includes(selectedPage.slug)
                      ? `/${selectedPage.slug}`
                      : `/pagina/${selectedPage.slug}`}
                  </span>
                </p>
                {!canEdit && (
                  <p className="text-amber-700 font-semibold">
                    Seu perfil esta em modo leitura. Visualizacao liberada, edicao bloqueada.
                  </p>
                )}
              </div>
            ) : (
              <p>Selecione uma pagina para editar os blocos.</p>
            )}
          </div>
        </div>

        {feedbackMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {feedbackMessage}
          </div>
        )}
        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">
            {successMessage}
          </div>
        )}
      </AdminCard>

      {!selectedPage ? (
        <AdminEmptyState
          title="Selecione uma pagina"
          description="Escolha uma pagina da lista para montar blocos e visualizar preview."
        />
      ) : (
        <>
          {isLoading && <AdminLoadingState label="Carregando blocos da pagina..." />}
          {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshBlocks(pageKey)} />}

          {!isLoading && !error && (
            <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
              <div className="space-y-6">
                <AdminCard title="Blocos da pagina" description="Adicione, ordene, duplique e publique blocos.">
                  <div className="mb-4">
                    <button
                      type="button"
                      onClick={handleCreateBlock}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                      disabled={!canEdit}
                    >
                      <Plus className="w-4 h-4" />
                      Novo bloco
                    </button>
                  </div>

                  <AdminTable
                    columns={blockColumns}
                    rows={orderedBlocks}
                    rowKey={(row) => row.id}
                    emptyMessage="Nenhum bloco cadastrado. O front publico usara fallback do conteudo da pagina."
                  />
                </AdminCard>

                <AdminCard title={editingBlockId ? 'Editar bloco' : 'Novo bloco'} description="Tipos: hero, texto, imagem, texto+imagem, cards, CTA, FAQ, galeria e beneficios.">
                  <form className="space-y-6" onSubmit={handleBlockSubmit}>
                    <AdminFormSection title="Dados do bloco">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label htmlFor="builder-block-key" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                            block_key
                          </label>
                          <input
                            id="builder-block-key"
                            type="text"
                            value={blockForm.block_key}
                            onChange={(event) =>
                              setBlockForm((current) => ({ ...current, block_key: slugifyBlockKey(event.target.value) }))
                            }
                            disabled={!canEdit}
                            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                            placeholder="hero-principal"
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <label htmlFor="builder-block-type" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                            Tipo do bloco
                          </label>
                          <select
                            id="builder-block-type"
                            value={blockForm.block_type}
                            onChange={(event) =>
                              setBlockForm((current) => ({
                                ...current,
                                block_type: event.target.value as PageBuilderBlockType,
                              }))
                            }
                            disabled={!canEdit}
                            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          >
                            {PAGE_BUILDER_BLOCK_TYPE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="builder-block-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          Titulo
                        </label>
                        <input
                          id="builder-block-title"
                          type="text"
                          value={blockForm.title}
                          onChange={(event) => setBlockForm((current) => ({ ...current, title: event.target.value }))}
                          disabled={!canEdit}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="builder-block-subtitle" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          Subtitulo
                        </label>
                        <input
                          id="builder-block-subtitle"
                          type="text"
                          value={blockForm.subtitle}
                          onChange={(event) => setBlockForm((current) => ({ ...current, subtitle: event.target.value }))}
                          disabled={!canEdit}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="builder-block-content" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          Conteudo
                        </label>
                        <textarea
                          id="builder-block-content"
                          rows={5}
                          value={blockForm.content}
                          onChange={(event) => setBlockForm((current) => ({ ...current, content: event.target.value }))}
                          disabled={!canEdit}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y disabled:bg-brand-paper/40"
                        />
                      </div>
                    </AdminFormSection>

                    <AdminFormSection title="Imagem e acoes">
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="builder-block-image" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                            URL da imagem
                          </label>
                          <input
                            id="builder-block-image"
                            type="text"
                            value={blockForm.image_url}
                            onChange={(event) => setBlockForm((current) => ({ ...current, image_url: event.target.value }))}
                            disabled={!canEdit}
                            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                            placeholder="https://..."
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="builder-block-button-label" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                              Botao principal
                            </label>
                            <input
                              id="builder-block-button-label"
                              type="text"
                              value={blockForm.button_label}
                              onChange={(event) => setBlockForm((current) => ({ ...current, button_label: event.target.value }))}
                              disabled={!canEdit}
                              className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="builder-block-button-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                              URL principal
                            </label>
                            <input
                              id="builder-block-button-url"
                              type="text"
                              value={blockForm.button_url}
                              onChange={(event) => setBlockForm((current) => ({ ...current, button_url: event.target.value }))}
                              disabled={!canEdit}
                              className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                              placeholder="/lojas"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <label htmlFor="builder-block-button2-label" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                              Botao secundario
                            </label>
                            <input
                              id="builder-block-button2-label"
                              type="text"
                              value={blockForm.secondary_button_label}
                              onChange={(event) =>
                                setBlockForm((current) => ({ ...current, secondary_button_label: event.target.value }))
                              }
                              disabled={!canEdit}
                              className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                            />
                          </div>
                          <div className="space-y-2">
                            <label htmlFor="builder-block-button2-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                              URL secundaria
                            </label>
                            <input
                              id="builder-block-button2-url"
                              type="text"
                              value={blockForm.secondary_button_url}
                              onChange={(event) =>
                                setBlockForm((current) => ({ ...current, secondary_button_url: event.target.value }))
                              }
                              disabled={!canEdit}
                              className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                              placeholder="https://..."
                            />
                          </div>
                        </div>
                      </div>
                    </AdminFormSection>

                    <AdminFormSection title="Configuracoes">
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                          <div className="space-y-2">
                            <label htmlFor="builder-block-sort-order" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                              sort_order
                            </label>
                            <input
                              id="builder-block-sort-order"
                              type="number"
                              value={blockForm.sort_order}
                              onChange={(event) => setBlockForm((current) => ({ ...current, sort_order: event.target.value }))}
                              disabled={!canEdit}
                              className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                            />
                          </div>
                          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark">
                            <input
                              type="checkbox"
                              checked={blockForm.is_active}
                              onChange={(event) =>
                                setBlockForm((current) => ({ ...current, is_active: event.target.checked }))
                              }
                              disabled={!canEdit}
                              className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30 disabled:opacity-50"
                            />
                            Bloco ativo
                          </label>
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="builder-block-settings" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                            settings (JSON)
                          </label>
                          <textarea
                            id="builder-block-settings"
                            rows={5}
                            value={blockForm.settings}
                            onChange={(event) => setBlockForm((current) => ({ ...current, settings: event.target.value }))}
                            disabled={!canEdit}
                            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y disabled:bg-brand-paper/40"
                          />
                        </div>
                      </div>
                    </AdminFormSection>

                    {blockFormError && (
                      <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                        {blockFormError}
                      </p>
                    )}

                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => resetBlockForm(nextBlockSortOrder)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                      >
                        Limpar
                      </button>
                      <button
                        type="submit"
                        disabled={!canEdit || isMutating}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-50"
                      >
                        <Save className="w-4 h-4" />
                        {editingBlockId ? 'Salvar bloco' : 'Criar bloco'}
                      </button>
                    </div>
                  </form>
                </AdminCard>

                <AdminCard title="Preview da pagina" description="Preview simples com blocos ativos.">
                  {orderedBlocks.filter((block) => block.is_active).length === 0 ? (
                    <div className="space-y-3">
                      <p className="text-sm text-brand-dark/70">
                        Nenhum bloco ativo nesta pagina. O front publico usa fallback com o conteudo principal da pagina.
                      </p>
                      <div className="rounded-xl border border-brand-dark/10 bg-white p-4">
                        <h3 className="text-xl font-serif font-semibold text-brand-dark">{selectedPage.title}</h3>
                        {selectedPage.subtitle && <p className="text-brand-dark/70 mt-1">{selectedPage.subtitle}</p>}
                        {selectedPage.content && <p className="text-sm text-brand-dark/70 mt-2">{selectedPage.content}</p>}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {orderedBlocks
                        .filter((block) => block.is_active)
                        .map((block) => renderBlockPreview(block, itemsByBlockId[block.id] ?? []))}
                    </div>
                  )}
                </AdminCard>
              </div>

              <div className="space-y-6">
                <AdminCard
                  title="Itens internos do bloco"
                  description="Use para cards, FAQ, galeria e lista de beneficios."
                >
                  {!selectedBlock ? (
                    <AdminEmptyState
                      title="Selecione um bloco"
                      description="Clique em Itens na lista para editar os itens internos."
                    />
                  ) : !blockTypeSupportsItems(selectedBlock.block_type) ? (
                    <AdminEmptyState
                      title="Bloco sem itens internos"
                      description="Este tipo de bloco usa apenas campos principais. Selecione um tipo com itens (cards, FAQ, galeria ou beneficios)."
                    />
                  ) : (
                    <div className="space-y-4">
                      {isItemsLoading && <AdminLoadingState label="Carregando itens..." />}
                      {!isItemsLoading && itemsError && <AdminErrorState message={itemsError} />}
                      {!isItemsLoading && !itemsError && (
                        <>
                          <button
                            type="button"
                            onClick={handleCreateItem}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                            disabled={!canEditItems}
                          >
                            <Plus className="w-4 h-4" />
                            Novo item
                          </button>

                          <AdminTable
                            columns={itemColumns}
                            rows={selectedBlockItems}
                            rowKey={(row) => row.id}
                            emptyMessage="Sem itens neste bloco."
                          />

                          <form className="space-y-4 pt-2 border-t border-brand-dark/10" onSubmit={handleItemSubmit}>
                            <div className="space-y-2">
                              <label htmlFor="builder-item-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                Titulo
                              </label>
                              <input
                                id="builder-item-title"
                                type="text"
                                value={itemForm.title}
                                onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))}
                                disabled={!canEditItems}
                                className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                              />
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="builder-item-content" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                Conteudo
                              </label>
                              <textarea
                                id="builder-item-content"
                                rows={3}
                                value={itemForm.content}
                                onChange={(event) => setItemForm((current) => ({ ...current, content: event.target.value }))}
                                disabled={!canEditItems}
                                className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y disabled:bg-brand-paper/40"
                              />
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="builder-item-image" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                URL da imagem
                              </label>
                              <input
                                id="builder-item-image"
                                type="text"
                                value={itemForm.image_url}
                                onChange={(event) => setItemForm((current) => ({ ...current, image_url: event.target.value }))}
                                disabled={!canEditItems}
                                className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label htmlFor="builder-item-button-label" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                  Botao
                                </label>
                                <input
                                  id="builder-item-button-label"
                                  type="text"
                                  value={itemForm.button_label}
                                  onChange={(event) => setItemForm((current) => ({ ...current, button_label: event.target.value }))}
                                  disabled={!canEditItems}
                                  className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                                />
                              </div>
                              <div className="space-y-2">
                                <label htmlFor="builder-item-button-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                  URL do botao
                                </label>
                                <input
                                  id="builder-item-button-url"
                                  type="text"
                                  value={itemForm.button_url}
                                  onChange={(event) => setItemForm((current) => ({ ...current, button_url: event.target.value }))}
                                  disabled={!canEditItems}
                                  className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                              <div className="space-y-2">
                                <label htmlFor="builder-item-sort-order" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                  sort_order
                                </label>
                                <input
                                  id="builder-item-sort-order"
                                  type="number"
                                  value={itemForm.sort_order}
                                  onChange={(event) => setItemForm((current) => ({ ...current, sort_order: event.target.value }))}
                                  disabled={!canEditItems}
                                  className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                                />
                              </div>
                              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark">
                                <input
                                  type="checkbox"
                                  checked={itemForm.is_active}
                                  onChange={(event) => setItemForm((current) => ({ ...current, is_active: event.target.checked }))}
                                  disabled={!canEditItems}
                                  className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30 disabled:opacity-50"
                                />
                                Item ativo
                              </label>
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="builder-item-metadata" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                metadata (JSON)
                              </label>
                              <textarea
                                id="builder-item-metadata"
                                rows={4}
                                value={itemForm.metadata}
                                onChange={(event) => setItemForm((current) => ({ ...current, metadata: event.target.value }))}
                                disabled={!canEditItems}
                                className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y disabled:bg-brand-paper/40"
                              />
                            </div>

                            {itemFormError && (
                              <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                                {itemFormError}
                              </p>
                            )}

                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => resetItemForm(nextItemSortOrder)}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                              >
                                Limpar
                              </button>
                              <button
                                type="submit"
                                disabled={!canEditItems || isMutating}
                                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-50"
                              >
                                <Save className="w-4 h-4" />
                                {editingItemId ? 'Salvar item' : 'Criar item'}
                              </button>
                            </div>
                          </form>
                        </>
                      )}
                    </div>
                  )}
                </AdminCard>
              </div>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pendingDeleteBlock}
        title="Excluir bloco"
        description={
          pendingDeleteBlock
            ? `Deseja excluir o bloco "${pendingDeleteBlock.block_key}"? Esta acao remove os itens internos.`
            : ''
        }
        confirmLabel="Excluir bloco"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onCancel={() => setPendingDeleteBlock(null)}
        onConfirm={() => void handleDeleteBlock()}
      />

      <ConfirmDialog
        open={!!pendingDeleteItem}
        title="Excluir item"
        description={
          pendingDeleteItem
            ? `Deseja excluir o item "${pendingDeleteItem.title ?? pendingDeleteItem.id}"?`
            : ''
        }
        confirmLabel="Excluir item"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={() => void handleDeleteItem()}
      />
    </div>
  );
}
