import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ImagePlus,
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
import MediaPickerField from '../../components/admin/media/MediaPickerField';
import { useContentBlocks } from '../../hooks/useContentBlocks';
import { useAuth } from '../../hooks/useAuth';
import { canEditContent, getRoleLabel } from '../../lib/permissions';
import { isSupabaseConfigured } from '../../lib/supabase';
import { uploadFile, type MediaBucket } from '../../services/media.service';
import type { ContentBlock, ContentBlockItem } from '../../types/cms';
import type { Json } from '../../types/database';
import { normalizeSearchText } from '../../utils/storeMappers';

const PAGE_KEY_OPTIONS = [
  'home',
  'navbar',
  'footer',
  'stores',
  'store_detail',
  'launches',
  'planning',
  'leasing',
  'my_route',
  'login',
  'not_found',
] as const;

type PageKeyOption = (typeof PAGE_KEY_OPTIONS)[number];

const PAGE_KEY_LABELS: Record<PageKeyOption, string> = {
  home: 'Home',
  navbar: 'Navbar',
  footer: 'Footer',
  stores: 'Lojas',
  store_detail: 'Detalhe da Loja',
  launches: 'Lancamentos',
  planning: 'Planeje sua visita',
  leasing: 'Abra sua loja',
  my_route: 'Meu roteiro',
  login: 'Login',
  not_found: 'Pagina 404',
};

const BLOCK_TYPE_SUGGESTIONS = [
  'hero',
  'cta',
  'cards',
  'steps',
  'badges',
  'benefits',
  'stats',
  'links',
  'list',
  'custom',
];

const IMAGE_UPLOAD_BUCKETS: MediaBucket[] = ['pages', 'institutional'];

interface BlockFormState {
  page_key: PageKeyOption;
  block_key: string;
  block_type: string;
  title: string;
  subtitle: string;
  content: string;
  image_url: string;
  icon: string;
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
  icon: string;
  button_label: string;
  button_url: string;
  metadata: string;
  sort_order: string;
  is_active: boolean;
}

type BlockDeleteTarget = Pick<ContentBlock, 'id' | 'block_key' | 'title'>;
type ItemDeleteTarget = Pick<ContentBlockItem, 'id' | 'title'>;

function getPageKeyOrFallback(value: string): PageKeyOption {
  if (PAGE_KEY_OPTIONS.includes(value as PageKeyOption)) {
    return value as PageKeyOption;
  }

  return 'home';
}

function normalizeInput(value: string): string {
  return value.trim();
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '-';
  }

  return parsed.toLocaleString('pt-BR');
}

function buildJsonString(value: Json | null | undefined): string {
  try {
    return JSON.stringify(value ?? {}, null, 2);
  } catch {
    return '{}';
  }
}

function parseJsonField(rawValue: string, fieldLabel: string): { value: Json | null; error: string | null } {
  const normalized = rawValue.trim();
  if (!normalized) {
    return { value: {}, error: null };
  }

  try {
    const parsed = JSON.parse(normalized) as Json;
    return { value: parsed, error: null };
  } catch {
    return { value: null, error: `${fieldLabel} deve ser um JSON valido.` };
  }
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

function getNextBlockSortOrder(blocks: ContentBlock[]): number {
  if (!blocks.length) {
    return 0;
  }

  return Math.max(...blocks.map((block) => block.sort_order ?? 0)) + 1;
}

function getNextItemSortOrder(items: ContentBlockItem[]): number {
  if (!items.length) {
    return 0;
  }

  return Math.max(...items.map((item) => item.sort_order ?? 0)) + 1;
}

function createBlockForm(pageKey: PageKeyOption, sortOrder = 0): BlockFormState {
  return {
    page_key: pageKey,
    block_key: '',
    block_type: '',
    title: '',
    subtitle: '',
    content: '',
    image_url: '',
    icon: '',
    button_label: '',
    button_url: '',
    secondary_button_label: '',
    secondary_button_url: '',
    settings: '{}',
    sort_order: String(sortOrder),
    is_active: true,
  };
}

function mapBlockToForm(block: ContentBlock): BlockFormState {
  return {
    page_key: getPageKeyOrFallback(block.page_key),
    block_key: block.block_key ?? '',
    block_type: block.block_type ?? '',
    title: block.title ?? '',
    subtitle: block.subtitle ?? '',
    content: block.content ?? '',
    image_url: block.image_url ?? '',
    icon: block.icon ?? '',
    button_label: block.button_label ?? '',
    button_url: block.button_url ?? '',
    secondary_button_label: block.secondary_button_label ?? '',
    secondary_button_url: block.secondary_button_url ?? '',
    settings: buildJsonString(block.settings),
    sort_order: String(block.sort_order ?? 0),
    is_active: block.is_active,
  };
}

function createItemForm(sortOrder = 0): ItemFormState {
  return {
    title: '',
    subtitle: '',
    content: '',
    image_url: '',
    icon: '',
    button_label: '',
    button_url: '',
    metadata: '{}',
    sort_order: String(sortOrder),
    is_active: true,
  };
}

function mapItemToForm(item: ContentBlockItem): ItemFormState {
  return {
    title: item.title ?? '',
    subtitle: item.subtitle ?? '',
    content: item.content ?? '',
    image_url: item.image_url ?? '',
    icon: item.icon ?? '',
    button_label: item.button_label ?? '',
    button_url: item.button_url ?? '',
    metadata: buildJsonString(item.metadata),
    sort_order: String(item.sort_order ?? 0),
    is_active: item.is_active,
  };
}

export default function ContentBlocksAdmin() {
  const { profile } = useAuth();
  const canEdit = canEditContent(profile);

  const [selectedPageKey, setSelectedPageKey] = useState<PageKeyOption>('home');
  const [searchTerm, setSearchTerm] = useState('');
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [blockForm, setBlockForm] = useState<BlockFormState>(() => createBlockForm('home'));
  const [blockFormError, setBlockFormError] = useState<string | null>(null);
  const [blockItems, setBlockItems] = useState<ContentBlockItem[]>([]);
  const [isItemsLoading, setIsItemsLoading] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [itemForm, setItemForm] = useState<ItemFormState>(() => createItemForm());
  const [itemFormError, setItemFormError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [pendingDeleteBlock, setPendingDeleteBlock] = useState<BlockDeleteTarget | null>(null);
  const [pendingDeleteItem, setPendingDeleteItem] = useState<ItemDeleteTarget | null>(null);
  const [isDeletingBlock, setIsDeletingBlock] = useState(false);
  const [isDeletingItem, setIsDeletingItem] = useState(false);
  const [uploadingTarget, setUploadingTarget] = useState<'block' | 'item' | null>(null);

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
  } = useContentBlocks({ pageKey: selectedPageKey, autoLoad: true });

  const selectedBlock = useMemo(
    () => blocks.find((block) => block.id === selectedBlockId) ?? null,
    [blocks, selectedBlockId],
  );

  const orderedBlocks = useMemo(
    () => [...blocks].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [blocks],
  );

  const filteredBlocks = useMemo(() => {
    const normalizedSearch = normalizeSearchText(searchTerm);
    if (!normalizedSearch) {
      return orderedBlocks;
    }

    return orderedBlocks.filter((block) => {
      const blob = normalizeSearchText(
        `${block.page_key} ${block.block_key} ${block.block_type} ${block.title ?? ''} ${block.subtitle ?? ''}`,
      );
      return blob.includes(normalizedSearch);
    });
  }, [orderedBlocks, searchTerm]);

  const nextBlockSortOrder = useMemo(() => getNextBlockSortOrder(orderedBlocks), [orderedBlocks]);
  const nextItemSortOrder = useMemo(() => getNextItemSortOrder(blockItems), [blockItems]);

  const isBusy = isMutating || isDeletingBlock || isDeletingItem || uploadingTarget !== null;

  const resetBlockForm = useCallback((pageKey: PageKeyOption, sortOrder: number) => {
    setBlockForm(createBlockForm(pageKey, sortOrder));
    setEditingBlockId(null);
    setBlockFormError(null);
  }, []);

  const resetItemForm = useCallback((sortOrder: number) => {
    setItemForm(createItemForm(sortOrder));
    setEditingItemId(null);
    setItemFormError(null);
  }, []);

  const clearPageMessages = useCallback(() => {
    clearMessages();
    setFeedbackMessage(null);
    setItemsError(null);
    setBlockFormError(null);
    setItemFormError(null);
  }, [clearMessages]);

  const loadBlockItems = useCallback(
    async (blockId: string) => {
      setIsItemsLoading(true);
      setItemsError(null);

      const result = await listItems(blockId);
      setIsItemsLoading(false);

      if (result.error) {
        setItemsError(result.error);
        setBlockItems([]);
        return;
      }

      const rows = (result.data ?? []).sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
      setBlockItems(rows);
    },
    [listItems],
  );

  useEffect(() => {
    if (!selectedBlockId) {
      return;
    }

    const timerId = window.setTimeout(() => {
      void loadBlockItems(selectedBlockId);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [loadBlockItems, selectedBlockId]);

  useEffect(() => {
    if (!selectedBlockId) {
      return;
    }

    if (blocks.some((block) => block.id === selectedBlockId)) {
      return;
    }

    const timerId = window.setTimeout(() => {
      setSelectedBlockId(null);
      setBlockItems([]);
      resetItemForm(0);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [blocks, resetItemForm, selectedBlockId]);

  const handleChangePageFilter = (nextPageKey: PageKeyOption) => {
    clearPageMessages();
    setSelectedPageKey(nextPageKey);
    setSearchTerm('');
    setSelectedBlockId(null);
    setBlockItems([]);
    resetBlockForm(nextPageKey, 0);
    resetItemForm(0);
  };

  const handleStartCreateBlock = () => {
    clearPageMessages();
    setSelectedBlockId(null);
    setBlockItems([]);
    resetItemForm(0);
    resetBlockForm(selectedPageKey, nextBlockSortOrder);
  };

  const handleStartEditBlock = (block: ContentBlock) => {
    clearPageMessages();
    setEditingBlockId(block.id);
    setBlockForm(mapBlockToForm(block));
    setSelectedBlockId(block.id);
    setBlockFormError(null);
    void loadBlockItems(block.id);
  };

  const handleSelectBlockItems = (block: ContentBlock) => {
    clearPageMessages();
    setSelectedBlockId(block.id);
    setEditingItemId(null);
    setItemForm(createItemForm(0));
    void loadBlockItems(block.id);
  };

  const handleBlockSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearPageMessages();

    if (!canEdit) {
      setBlockFormError('Seu perfil possui acesso somente leitura para blocos do site.');
      return;
    }

    if (!normalizeInput(blockForm.block_key)) {
      setBlockFormError('block_key e obrigatorio.');
      return;
    }

    if (!normalizeInput(blockForm.block_type)) {
      setBlockFormError('block_type e obrigatorio.');
      return;
    }

    const parsedSortOrder = parseSortOrder(blockForm.sort_order);
    if (parsedSortOrder.error || parsedSortOrder.value === null) {
      setBlockFormError(parsedSortOrder.error ?? 'sort_order invalido.');
      return;
    }

    const parsedSettings = parseJsonField(blockForm.settings, 'settings');
    if (parsedSettings.error || parsedSettings.value === null) {
      setBlockFormError(parsedSettings.error ?? 'settings invalido.');
      return;
    }

    const payload = {
      page_key: blockForm.page_key,
      block_key: normalizeInput(blockForm.block_key),
      block_type: normalizeInput(blockForm.block_type),
      title: normalizeInput(blockForm.title) || null,
      subtitle: normalizeInput(blockForm.subtitle) || null,
      content: normalizeInput(blockForm.content) || null,
      image_url: normalizeInput(blockForm.image_url) || null,
      icon: normalizeInput(blockForm.icon) || null,
      button_label: normalizeInput(blockForm.button_label) || null,
      button_url: normalizeInput(blockForm.button_url) || null,
      secondary_button_label: normalizeInput(blockForm.secondary_button_label) || null,
      secondary_button_url: normalizeInput(blockForm.secondary_button_url) || null,
      settings: parsedSettings.value,
      sort_order: parsedSortOrder.value,
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
    resetBlockForm(getPageKeyOrFallback(result.data.page_key), getNextBlockSortOrder(blocks));
  };

  const handleToggleBlockActive = async (block: ContentBlock) => {
    clearPageMessages();

    if (!canEdit) {
      setFeedbackMessage('Seu perfil possui acesso somente leitura para blocos do site.');
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
      setPendingDeleteBlock(null);
      setFeedbackMessage('Seu perfil possui acesso somente leitura para blocos do site.');
      return;
    }

    setIsDeletingBlock(true);
    const result = await deleteBlock(pendingDeleteBlock.id);
    setIsDeletingBlock(false);

    if (!result.error) {
      if (selectedBlockId === pendingDeleteBlock.id) {
        setSelectedBlockId(null);
        setBlockItems([]);
        resetItemForm(0);
      }
      setFeedbackMessage('Bloco removido com sucesso.');
      resetBlockForm(selectedPageKey, nextBlockSortOrder);
    }

    setPendingDeleteBlock(null);
  };

  const handleMoveBlock = async (blockId: string, direction: 'up' | 'down') => {
    if (!canEdit) {
      setFeedbackMessage('Seu perfil possui acesso somente leitura para blocos do site.');
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

    const result = await reorderBlocks(payload, selectedPageKey);
    if (!result.error) {
      setFeedbackMessage('Ordem dos blocos atualizada.');
    }
  };

  const handleStartCreateItem = () => {
    clearPageMessages();
    resetItemForm(nextItemSortOrder);
  };

  const handleStartEditItem = (item: ContentBlockItem) => {
    clearPageMessages();
    setEditingItemId(item.id);
    setItemForm(mapItemToForm(item));
    setItemFormError(null);
  };

  const handleItemSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearPageMessages();

    if (!selectedBlock) {
      setItemFormError('Selecione um bloco para editar itens internos.');
      return;
    }

    if (!canEdit) {
      setItemFormError('Seu perfil possui acesso somente leitura para itens do bloco.');
      return;
    }

    const parsedSortOrder = parseSortOrder(itemForm.sort_order);
    if (parsedSortOrder.error || parsedSortOrder.value === null) {
      setItemFormError(parsedSortOrder.error ?? 'sort_order invalido.');
      return;
    }

    const parsedMetadata = parseJsonField(itemForm.metadata, 'metadata');
    if (parsedMetadata.error || parsedMetadata.value === null) {
      setItemFormError(parsedMetadata.error ?? 'metadata invalido.');
      return;
    }

    const payload = {
      block_id: selectedBlock.id,
      title: normalizeInput(itemForm.title) || null,
      subtitle: normalizeInput(itemForm.subtitle) || null,
      content: normalizeInput(itemForm.content) || null,
      image_url: normalizeInput(itemForm.image_url) || null,
      icon: normalizeInput(itemForm.icon) || null,
      button_label: normalizeInput(itemForm.button_label) || null,
      button_url: normalizeInput(itemForm.button_url) || null,
      metadata: parsedMetadata.value,
      sort_order: parsedSortOrder.value,
      is_active: itemForm.is_active,
    };

    const result = editingItemId
      ? await updateItem(editingItemId, payload)
      : await createItem(payload);

    if (result.error) {
      setItemFormError(result.error);
      return;
    }

    await loadBlockItems(selectedBlock.id);
    setFeedbackMessage(editingItemId ? 'Item atualizado com sucesso.' : 'Item criado com sucesso.');
    resetItemForm(getNextItemSortOrder(blockItems));
  };

  const handleToggleItemActive = async (item: ContentBlockItem) => {
    clearPageMessages();

    if (!selectedBlock) {
      return;
    }

    if (!canEdit) {
      setFeedbackMessage('Seu perfil possui acesso somente leitura para itens do bloco.');
      return;
    }

    const result = await updateItem(item.id, { is_active: !item.is_active });
    if (result.error) {
      return;
    }

    await loadBlockItems(selectedBlock.id);
    setFeedbackMessage(item.is_active ? 'Item desativado.' : 'Item ativado.');
  };

  const handleDeleteItem = async () => {
    if (!pendingDeleteItem || !selectedBlock) {
      return;
    }

    if (!canEdit) {
      setPendingDeleteItem(null);
      setFeedbackMessage('Seu perfil possui acesso somente leitura para itens do bloco.');
      return;
    }

    setIsDeletingItem(true);
    const result = await deleteItem(pendingDeleteItem.id);
    setIsDeletingItem(false);

    if (!result.error) {
      await loadBlockItems(selectedBlock.id);
      setFeedbackMessage('Item removido com sucesso.');
      resetItemForm(getNextItemSortOrder(blockItems));
    }

    setPendingDeleteItem(null);
  };

  const handleMoveItem = async (itemId: string, direction: 'up' | 'down') => {
    if (!selectedBlock) {
      return;
    }

    if (!canEdit) {
      setFeedbackMessage('Seu perfil possui acesso somente leitura para itens do bloco.');
      return;
    }

    const orderedItems = [...blockItems].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    const currentIndex = orderedItems.findIndex((item) => item.id === itemId);

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

    const payload = reordered.map((item, index) => ({
      id: item.id,
      sort_order: index,
    }));

    const result = await reorderItems(selectedBlock.id, payload);
    if (result.error) {
      return;
    }

    setFeedbackMessage('Ordem dos itens atualizada.');
    await loadBlockItems(selectedBlock.id);
  };

  const handleImageUpload = async (target: 'block' | 'item', file: File) => {
    clearPageMessages();

    if (!canEdit) {
      setFeedbackMessage('Seu perfil possui acesso somente leitura para upload de imagens.');
      return;
    }

    setUploadingTarget(target);

    const uploadPath = `content-blocks/${selectedPageKey}`;
    let latestError: string | null = null;

    for (const bucket of IMAGE_UPLOAD_BUCKETS) {
      const result = await uploadFile(bucket, file, uploadPath);
      if (result.error || !result.data) {
        latestError = result.error ?? 'Falha ao enviar imagem.';
        continue;
      }

      if (target === 'block') {
        setBlockForm((current) => ({ ...current, image_url: result.data?.publicUrl ?? current.image_url }));
      } else {
        setItemForm((current) => ({ ...current, image_url: result.data?.publicUrl ?? current.image_url }));
      }

      setUploadingTarget(null);
      setFeedbackMessage('Imagem enviada com sucesso. Salve o formulario para persistir o URL.');
      return;
    }

    setUploadingTarget(null);
    setFeedbackMessage(latestError ?? 'Nao foi possivel enviar imagem para o storage.');
  };

  const blockColumns: Array<AdminTableColumn<ContentBlock>> = [
    {
      key: 'page_key',
      label: 'Pagina',
      render: (row) => (
        <span className="font-semibold text-brand-dark">
          {PAGE_KEY_LABELS[getPageKeyOrFallback(row.page_key)]}
        </span>
      ),
    },
    {
      key: 'block_key',
      label: 'block_key',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.block_key}</p>
          <p className="text-xs text-brand-dark/60">{row.block_type}</p>
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Titulo',
      render: (row) => (
        <div className="space-y-1">
          <p className="text-sm text-brand-dark font-medium">{row.title ?? '-'}</p>
          <p className="text-xs text-brand-dark/60">{row.subtitle ?? '-'}</p>
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
              onClick={() => void handleMoveBlock(row.id, 'up')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-50"
              aria-label={`Subir bloco ${row.block_key}`}
              disabled={isBusy || !canEdit}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleMoveBlock(row.id, 'down')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-50"
              aria-label={`Descer bloco ${row.block_key}`}
              disabled={isBusy || !canEdit}
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
        <StatusBadge label={row.is_active ? 'Ativo' : 'Inativo'} tone={row.is_active ? 'success' : 'draft'} />
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSelectBlockItems(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            Itens
          </button>
          <button
            type="button"
            onClick={() => handleStartEditBlock(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
            disabled={!canEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleToggleBlockActive(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
            disabled={!canEdit || isBusy}
          >
            {row.is_active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={() =>
              setPendingDeleteBlock({
                id: row.id,
                block_key: row.block_key,
                title: row.title,
              })
            }
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            disabled={!canEdit || isBusy}
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
      key: 'title',
      label: 'Item',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.title ?? '(Sem titulo)'}</p>
          <p className="text-xs text-brand-dark/60">{row.subtitle ?? '-'}</p>
        </div>
      ),
    },
    {
      key: 'content',
      label: 'Conteudo',
      render: (row) => (
        <p className="text-xs text-brand-dark/70 max-w-sm">
          {(row.content ?? '-').slice(0, 110)}
        </p>
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
              onClick={() => void handleMoveItem(row.id, 'up')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-50"
              aria-label={`Subir item ${row.title ?? row.id}`}
              disabled={isBusy || !canEdit}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleMoveItem(row.id, 'down')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-50"
              aria-label={`Descer item ${row.title ?? row.id}`}
              disabled={isBusy || !canEdit}
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
        <StatusBadge label={row.is_active ? 'Ativo' : 'Inativo'} tone={row.is_active ? 'success' : 'draft'} />
      ),
    },
    {
      key: 'updated_at',
      label: 'Atualizado em',
      render: (row) => (
        <span className="text-xs text-brand-dark/70">{formatDate(row.updated_at)}</span>
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleStartEditItem(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
            disabled={!canEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleToggleItemActive(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
            disabled={!canEdit || isBusy}
          >
            {row.is_active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={() => setPendingDeleteItem({ id: row.id, title: row.title })}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            disabled={!canEdit || isBusy}
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
        title="Blocos do Site | CMS Mega Polo Moda"
        description="Gerencie blocos de conteudo e itens internos das paginas do portal Mega Polo Moda."
      />

      <AdminPageHeader
        title="Blocos do Site"
        description="Edite blocos granulares do front-end: textos, imagens, botoes, cards, passos, badges e configuracoes JSON."
        actions={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshBlocks(selectedPageKey)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleStartCreateBlock}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50"
              disabled={!canEdit}
            >
              <Plus className="w-4 h-4" />
              Novo bloco
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
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env para habilitar o CMS de blocos."
          />
        </div>
      )}

      {isLoading && <AdminLoadingState label="Carregando blocos de conteudo..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshBlocks(selectedPageKey)} />}

      {!isLoading && !error && (
        <div className="space-y-6">
          {(successMessage || feedbackMessage) && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {feedbackMessage ?? successMessage}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1.45fr_1fr] gap-6">
            <AdminCard title="Blocos cadastrados" description="Filtre por pagina, pesquise e gerencie status e ordenacao.">
              <div className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <label htmlFor="page-key-filter" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      page_key
                    </label>
                    <select
                      id="page-key-filter"
                      value={selectedPageKey}
                      onChange={(event) => handleChangePageFilter(event.target.value as PageKeyOption)}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    >
                      {PAGE_KEY_OPTIONS.map((pageKey) => (
                        <option key={pageKey} value={pageKey}>
                          {PAGE_KEY_LABELS[pageKey]} ({pageKey})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="block-search" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Buscar bloco
                    </label>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                      <input
                        id="block-search"
                        type="search"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                        placeholder="block_key, titulo ou tipo"
                        className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                      />
                    </div>
                  </div>
                </div>

                {filteredBlocks.length === 0 ? (
                  <AdminEmptyState
                    title="Nenhum bloco encontrado"
                    description={
                      blocks.length
                        ? 'Ajuste o termo de busca para localizar um bloco desta pagina.'
                        : 'Crie o primeiro bloco para esta pagina.'
                    }
                  />
                ) : (
                  <AdminTable
                    columns={blockColumns}
                    rows={filteredBlocks}
                    rowKey={(row) => row.id}
                    emptyMessage="Nenhum bloco cadastrado para a pagina selecionada."
                  />
                )}
              </div>
            </AdminCard>

            <AdminCard
              title={editingBlockId ? 'Editar bloco' : 'Novo bloco'}
              description="Preencha os campos e salve para atualizar o conteudo granular do site."
            >
              <form className="space-y-5" onSubmit={handleBlockSubmit}>
                <AdminFormSection title="Identificacao">
                  <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="block-page-key" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Pagina *
                      </label>
                      <select
                        id="block-page-key"
                        value={blockForm.page_key}
                        onChange={(event) =>
                          setBlockForm((current) => ({
                            ...current,
                            page_key: event.target.value as PageKeyOption,
                          }))
                        }
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                      >
                        {PAGE_KEY_OPTIONS.map((pageKey) => (
                          <option key={pageKey} value={pageKey}>
                            {PAGE_KEY_LABELS[pageKey]} ({pageKey})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="block-key" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          block_key *
                        </label>
                        <input
                          id="block-key"
                          type="text"
                          value={blockForm.block_key}
                          onChange={(event) => setBlockForm((current) => ({ ...current, block_key: event.target.value }))}
                          disabled={!canEdit}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          placeholder="hero_banner"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="block-type" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          block_type *
                        </label>
                        <input
                          id="block-type"
                          type="text"
                          value={blockForm.block_type}
                          onChange={(event) => setBlockForm((current) => ({ ...current, block_type: event.target.value }))}
                          disabled={!canEdit}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          placeholder="cards, steps, hero..."
                          list="block-type-suggestions"
                          required
                        />
                        <datalist id="block-type-suggestions">
                          {BLOCK_TYPE_SUGGESTIONS.map((option) => (
                            <option key={option} value={option} />
                          ))}
                        </datalist>
                      </div>
                    </div>
                  </div>
                </AdminFormSection>

                <AdminFormSection title="Conteudo">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="block-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Titulo
                      </label>
                      <input
                        id="block-title"
                        type="text"
                        value={blockForm.title}
                        onChange={(event) => setBlockForm((current) => ({ ...current, title: event.target.value }))}
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="block-subtitle" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Subtitulo
                      </label>
                      <input
                        id="block-subtitle"
                        type="text"
                        value={blockForm.subtitle}
                        onChange={(event) => setBlockForm((current) => ({ ...current, subtitle: event.target.value }))}
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="block-content" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Conteudo
                      </label>
                      <textarea
                        id="block-content"
                        rows={4}
                        value={blockForm.content}
                        onChange={(event) => setBlockForm((current) => ({ ...current, content: event.target.value }))}
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y disabled:bg-brand-paper/40"
                      />
                    </div>
                  </div>
                </AdminFormSection>

                <AdminFormSection title="Imagem e icone">
                  <div className="space-y-4">
                    <MediaPickerField
                      id="block-image-url"
                      label="URL da imagem"
                      value={blockForm.image_url}
                      onChange={(value) => setBlockForm((current) => ({ ...current, image_url: value }))}
                      placeholder="https://..."
                      disabled={!canEdit}
                      allowedBuckets={IMAGE_UPLOAD_BUCKETS}
                      initialBucket="pages"
                      typeFilter="image"
                      showPreview
                      previewAlt={`Imagem do bloco ${blockForm.block_key || blockForm.title || ''}`}
                      pickerTitle="Selecionar imagem do bloco"
                      pickerDescription="Escolha uma imagem da biblioteca para este bloco de conteudo."
                    />

                    <div className="space-y-2">
                      <label htmlFor="block-icon" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Icone
                      </label>
                      <input
                        id="block-icon"
                        type="text"
                        value={blockForm.icon}
                        onChange={(event) => setBlockForm((current) => ({ ...current, icon: event.target.value }))}
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        placeholder="sparkles, badge..."
                      />
                    </div>

                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors disabled:opacity-50">
                      <ImagePlus className="w-4 h-4" />
                      {uploadingTarget === 'block' ? 'Enviando...' : 'Upload de imagem'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={!canEdit || isBusy}
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void handleImageUpload('block', file);
                          }
                        }}
                      />
                    </label>
                  </div>
                </AdminFormSection>

                <AdminFormSection title="Botoes e configuracoes">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="block-button-label" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          Texto do botao
                        </label>
                        <input
                          id="block-button-label"
                          type="text"
                          value={blockForm.button_label}
                          onChange={(event) => setBlockForm((current) => ({ ...current, button_label: event.target.value }))}
                          disabled={!canEdit}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="block-button-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          URL do botao
                        </label>
                        <input
                          id="block-button-url"
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
                        <label htmlFor="block-secondary-button-label" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          Texto botao secundario
                        </label>
                        <input
                          id="block-secondary-button-label"
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
                        <label htmlFor="block-secondary-button-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          URL botao secundario
                        </label>
                        <input
                          id="block-secondary-button-url"
                          type="text"
                          value={blockForm.secondary_button_url}
                          onChange={(event) =>
                            setBlockForm((current) => ({ ...current, secondary_button_url: event.target.value }))
                          }
                          disabled={!canEdit}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          placeholder="/lancamentos"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="block-settings-json" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        settings (JSON)
                      </label>
                      <textarea
                        id="block-settings-json"
                        rows={6}
                        value={blockForm.settings}
                        onChange={(event) => setBlockForm((current) => ({ ...current, settings: event.target.value }))}
                        disabled={!canEdit}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y disabled:bg-brand-paper/40"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                      <div className="space-y-2">
                        <label htmlFor="block-sort-order" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          sort_order
                        </label>
                        <input
                          id="block-sort-order"
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
                  </div>
                </AdminFormSection>

                {blockFormError && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                    {blockFormError}
                  </p>
                )}

                <div className="flex items-center justify-end gap-2">
                  {(editingBlockId || blockForm.block_key || blockForm.title || blockForm.content) && (
                    <button
                      type="button"
                      onClick={() => resetBlockForm(selectedPageKey, nextBlockSortOrder)}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                    >
                      <X className="w-4 h-4" />
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={!canEdit || isBusy}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-50"
                  >
                    {editingBlockId ? 'Salvar bloco' : 'Criar bloco'}
                  </button>
                </div>
              </form>
            </AdminCard>
          </div>

          <AdminCard
            title="Itens internos do bloco"
            description="Gerencie cards, passos, beneficios, badges, links e estatisticas do bloco selecionado."
          >
            {!selectedBlock ? (
              <AdminEmptyState
                title="Selecione um bloco"
                description="Clique em Itens na lista de blocos para editar o conteudo interno."
              />
            ) : (
              <div className="space-y-5">
                <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/40 p-4">
                  <p className="text-sm font-semibold text-brand-dark">
                    Bloco selecionado: {selectedBlock.block_key}
                  </p>
                  <p className="text-xs text-brand-dark/70 mt-1">
                    Tipo: {selectedBlock.block_type} | Titulo: {selectedBlock.title ?? '-'}
                  </p>
                </div>

                {isItemsLoading && <AdminLoadingState label="Carregando itens internos..." />}
                {!isItemsLoading && itemsError && (
                  <AdminErrorState message={itemsError} onRetry={() => void loadBlockItems(selectedBlock.id)} />
                )}

                {!isItemsLoading && !itemsError && (
                  <div className="grid grid-cols-1 xl:grid-cols-[1.2fr_1fr] gap-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between gap-3">
                        <h3 className="text-lg font-serif font-semibold">Lista de itens</h3>
                        <button
                          type="button"
                          onClick={handleStartCreateItem}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
                          disabled={!canEdit}
                        >
                          <Plus className="w-4 h-4" />
                          Novo item
                        </button>
                      </div>

                      {blockItems.length === 0 ? (
                        <AdminEmptyState
                          title="Sem itens neste bloco"
                          description="Adicione itens para popular cards, passos, links e demais elementos internos."
                        />
                      ) : (
                        <AdminTable
                          columns={itemColumns}
                          rows={blockItems}
                          rowKey={(row) => row.id}
                          emptyMessage="Nenhum item cadastrado neste bloco."
                        />
                      )}
                    </div>

                    <div className="space-y-4">
                      <h3 className="text-lg font-serif font-semibold">
                        {editingItemId ? 'Editar item' : 'Novo item'}
                      </h3>

                      <form className="space-y-5" onSubmit={handleItemSubmit}>
                        <AdminFormSection title="Conteudo do item">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label htmlFor="item-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                Titulo
                              </label>
                              <input
                                id="item-title"
                                type="text"
                                value={itemForm.title}
                                onChange={(event) => setItemForm((current) => ({ ...current, title: event.target.value }))}
                                disabled={!canEdit}
                                className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                              />
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="item-subtitle" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                Subtitulo
                              </label>
                              <input
                                id="item-subtitle"
                                type="text"
                                value={itemForm.subtitle}
                                onChange={(event) => setItemForm((current) => ({ ...current, subtitle: event.target.value }))}
                                disabled={!canEdit}
                                className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                              />
                            </div>

                            <div className="space-y-2">
                              <label htmlFor="item-content" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                Conteudo
                              </label>
                              <textarea
                                id="item-content"
                                rows={4}
                                value={itemForm.content}
                                onChange={(event) => setItemForm((current) => ({ ...current, content: event.target.value }))}
                                disabled={!canEdit}
                                className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y disabled:bg-brand-paper/40"
                              />
                            </div>
                          </div>
                        </AdminFormSection>

                        <AdminFormSection title="Imagem, icone e botao">
                          <div className="space-y-4">
                            <MediaPickerField
                              id="item-image-url"
                              label="URL da imagem"
                              value={itemForm.image_url}
                              onChange={(value) => setItemForm((current) => ({ ...current, image_url: value }))}
                              placeholder="https://..."
                              disabled={!canEdit}
                              allowedBuckets={IMAGE_UPLOAD_BUCKETS}
                              initialBucket="pages"
                              typeFilter="image"
                              showPreview
                              previewAlt={`Imagem do item ${itemForm.title || ''}`}
                              pickerTitle="Selecionar imagem do item"
                              pickerDescription="Escolha uma imagem da biblioteca para este item interno do bloco."
                            />

                            <div className="space-y-2">
                              <label htmlFor="item-icon" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                Icone
                              </label>
                              <input
                                id="item-icon"
                                type="text"
                                value={itemForm.icon}
                                onChange={(event) => setItemForm((current) => ({ ...current, icon: event.target.value }))}
                                disabled={!canEdit}
                                className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <label htmlFor="item-button-label" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                  Texto do botao
                                </label>
                                <input
                                  id="item-button-label"
                                  type="text"
                                  value={itemForm.button_label}
                                  onChange={(event) => setItemForm((current) => ({ ...current, button_label: event.target.value }))}
                                  disabled={!canEdit}
                                  className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                                />
                              </div>

                              <div className="space-y-2">
                                <label htmlFor="item-button-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                  URL do botao
                                </label>
                                <input
                                  id="item-button-url"
                                  type="text"
                                  value={itemForm.button_url}
                                  onChange={(event) => setItemForm((current) => ({ ...current, button_url: event.target.value }))}
                                  disabled={!canEdit}
                                  className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                                  placeholder="/lojas"
                                />
                              </div>
                            </div>

                            <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors disabled:opacity-50">
                              <ImagePlus className="w-4 h-4" />
                              {uploadingTarget === 'item' ? 'Enviando...' : 'Upload de imagem'}
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={!canEdit || isBusy}
                                onChange={(event) => {
                                  const file = event.target.files?.[0];
                                  if (file) {
                                    void handleImageUpload('item', file);
                                  }
                                }}
                              />
                            </label>
                          </div>
                        </AdminFormSection>

                        <AdminFormSection title="Metadata e status">
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label htmlFor="item-metadata-json" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                metadata (JSON)
                              </label>
                              <textarea
                                id="item-metadata-json"
                                rows={5}
                                value={itemForm.metadata}
                                onChange={(event) => setItemForm((current) => ({ ...current, metadata: event.target.value }))}
                                disabled={!canEdit}
                                className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y disabled:bg-brand-paper/40"
                              />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
                              <div className="space-y-2">
                                <label htmlFor="item-sort-order" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                                  sort_order
                                </label>
                                <input
                                  id="item-sort-order"
                                  type="number"
                                  value={itemForm.sort_order}
                                  onChange={(event) => setItemForm((current) => ({ ...current, sort_order: event.target.value }))}
                                  disabled={!canEdit}
                                  className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                                />
                              </div>

                              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark">
                                <input
                                  type="checkbox"
                                  checked={itemForm.is_active}
                                  onChange={(event) =>
                                    setItemForm((current) => ({ ...current, is_active: event.target.checked }))
                                  }
                                  disabled={!canEdit}
                                  className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30 disabled:opacity-50"
                                />
                                Item ativo
                              </label>
                            </div>
                          </div>
                        </AdminFormSection>

                        {itemFormError && (
                          <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                            {itemFormError}
                          </p>
                        )}

                        <div className="flex items-center justify-end gap-2">
                          {(editingItemId || itemForm.title || itemForm.content) && (
                            <button
                              type="button"
                              onClick={() => resetItemForm(nextItemSortOrder)}
                              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                            >
                              <X className="w-4 h-4" />
                              Cancelar
                            </button>
                          )}
                          <button
                            type="submit"
                            disabled={!canEdit || isBusy}
                            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-50"
                          >
                            {editingItemId ? 'Salvar item' : 'Criar item'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}
          </AdminCard>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDeleteBlock}
        title="Excluir bloco"
        description={
          pendingDeleteBlock
            ? `Tem certeza que deseja excluir o bloco "${pendingDeleteBlock.block_key}"? Esta acao remove tambem os itens internos.`
            : ''
        }
        confirmLabel="Excluir bloco"
        cancelLabel="Cancelar"
        isConfirming={isDeletingBlock}
        onCancel={() => setPendingDeleteBlock(null)}
        onConfirm={() => void handleDeleteBlock()}
      />

      <ConfirmDialog
        open={!!pendingDeleteItem}
        title="Excluir item"
        description={
          pendingDeleteItem
            ? `Tem certeza que deseja excluir o item "${pendingDeleteItem.title ?? pendingDeleteItem.id}"?`
            : ''
        }
        confirmLabel="Excluir item"
        cancelLabel="Cancelar"
        isConfirming={isDeletingItem}
        onCancel={() => setPendingDeleteItem(null)}
        onConfirm={() => void handleDeleteItem()}
      />
    </>
  );
}
