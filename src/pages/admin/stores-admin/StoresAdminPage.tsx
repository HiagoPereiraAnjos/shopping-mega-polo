import React, { useCallback, useMemo, useState } from 'react';
import {
  Plus,
} from 'lucide-react';
import { SEO } from '../../../components/ui/SEO';
import AdminCard from '../../../components/admin/AdminCard';
import AdminEmptyState from '../../../components/admin/AdminEmptyState';
import AdminErrorState from '../../../components/admin/AdminErrorState';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../../components/admin/AdminPageHeader';
import { type AdminTableColumn } from '../../../components/admin/AdminTable';
import ConfirmDialog from '../../../components/admin/ConfirmDialog';
import StatusBadge from '../../../components/admin/StatusBadge';
import { useAuth } from '../../../hooks/useAuth';
import { useCategories } from '../../../hooks/useCategories';
import { useStores } from '../../../hooks/useStores';
import { canEditContent } from '../../../lib/permissions';
import {
  createProduct,
  deleteProduct,
  listProductsByStore,
  reorderProducts,
  updateProduct,
  uploadProductImage,
  type ReorderStoreProductItem,
} from '../../../services/storeProducts.service';
import type { Catalog } from '../../../types/cms';
import {
  activateCatalog,
  createCatalog,
  deactivateCatalog,
  deleteCatalog,
  getActiveCatalogByStore,
  updateCatalog,
  uploadCatalogPdf,
} from '../../../services/catalogs.service';
import { getSiteBaseUrl } from '../../../utils/seo';
import { normalizeSearchText } from '../../../utils/storeMappers';
import { slugify } from '../../../utils/slug';
import type {
  Store,
  StoreProduct,
  StoreProductInsert,
  StoreProductUpdate,
} from '../../../types/cms';
import StoreActions from './StoreActions';
import StoreFilters from './StoreFilters';
import StoreFormModal from './StoreFormModal';
import StoresTable from './StoresTable';
import type {
  ProductFormState,
  StoreAdminTab,
  StoreFormState,
  StoreStatusFilter,
} from './storeAdmin.types';

const DEFAULT_STORE_FORM: StoreFormState = {
  name: '',
  slug: '',
  description: '',
  category_id: '',
  segment: '',
  floor: '',
  store_number: '',
  whatsapp: '',
  phone: '',
  email: '',
  instagram: '',
  website: '',
  logo_url: '',
  banner_url: '',
  tags: '',
  seo_title: '',
  seo_description: '',
  og_image_url: '',
  is_featured: false,
  is_published: false,
};

const DEFAULT_PRODUCT_FORM: ProductFormState = {
  name: '',
  description: '',
  image_url: '',
  category: '',
  price: '',
  sort_order: '',
  is_active: true,
};

function mapStoreToForm(store: Store): StoreFormState {
  return {
    name: store.name,
    slug: store.slug,
    description: store.description ?? '',
    category_id: store.category_id ?? '',
    segment: store.segment ?? '',
    floor: store.floor ?? '',
    store_number: store.store_number ?? '',
    whatsapp: store.whatsapp ?? '',
    phone: store.phone ?? '',
    email: store.email ?? '',
    instagram: store.instagram ?? '',
    website: store.website ?? '',
    logo_url: store.logo_url ?? '',
    banner_url: store.banner_url ?? '',
    tags: (store.tags ?? []).join(', '),
    seo_title: store.seo_title ?? '',
    seo_description: store.seo_description ?? '',
    og_image_url: store.og_image_url ?? '',
    is_featured: store.is_featured,
    is_published: store.is_published,
  };
}

function mapProductToForm(product: StoreProduct): ProductFormState {
  return {
    name: product.name,
    description: product.description ?? '',
    image_url: product.image_url ?? '',
    category: product.category ?? '',
    price: product.price !== null ? String(product.price) : '',
    sort_order: String(product.sort_order),
    is_active: product.is_active,
  };
}

function normalizeInstagram(value: string): string {
  return value
    .trim()
    .replace(/^@+/, '')
    .replace(/^https?:\/\/(www\.)?instagram\.com\//i, '')
    .replace(/\/$/, '');
}

function validateWebsite(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  const withProtocol = /^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`;

  try {
    const parsed = new URL(withProtocol);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

function validateWhatsapp(value: string): boolean {
  if (!value.trim()) {
    return true;
  }

  const digits = value.replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 13;
}

function parsePrice(value: string): number | null | 'invalid' {
  const normalized = value.trim();
  if (!normalized) {
    return null;
  }

  const parsed = Number(normalized.replace(',', '.'));
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 'invalid';
  }

  return parsed;
}

function formatPrice(value: number | null): string {
  if (value === null) {
    return 'Sob consulta';
  }

  return value.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  });
}

export default function StoresAdminPage() {
  const { profile } = useAuth();
  const {
    stores,
    availableFloors,
    isLoading,
    isMutating,
    error,
    successMessage,
    isSupabaseEnabled,
    refreshStores,
    createStoreItem,
    updateStoreItem,
    deleteStoreItem,
    publishStoreItem,
    unpublishStoreItem,
    uploadStoreLogoFile,
    uploadStoreBannerFile,
    clearMessages,
  } = useStores({ autoLoad: true, publishedOnly: false });

  const { categories } = useCategories({ activeOnly: false, autoLoad: true });
  const canEditStores = canEditContent(profile);

  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StoreStatusFilter>('all');
  const [floorFilter, setFloorFilter] = useState('all');

  const [editingStoreId, setEditingStoreId] = useState<string | null>(null);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [activeTab, setActiveTab] = useState<StoreAdminTab>('main');
  const [form, setForm] = useState<StoreFormState>(DEFAULT_STORE_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [pendingDeleteStore, setPendingDeleteStore] = useState<Store | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUploadingBanner, setIsUploadingBanner] = useState(false);

  const [storeProducts, setStoreProducts] = useState<StoreProduct[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [isProductsMutating, setIsProductsMutating] = useState(false);
  const [isReorderingProducts, setIsReorderingProducts] = useState(false);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [productsSuccess, setProductsSuccess] = useState<string | null>(null);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pendingDeleteProduct, setPendingDeleteProduct] = useState<StoreProduct | null>(null);
  const [isUploadingProductImage, setIsUploadingProductImage] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(DEFAULT_PRODUCT_FORM);

  const [activeCatalog, setActiveCatalog] = useState<Catalog | null>(null);
  const [catalogTitle, setCatalogTitle] = useState('');
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogSuccess, setCatalogSuccess] = useState<string | null>(null);
  const [isCatalogLoading, setIsCatalogLoading] = useState(false);
  const [isCatalogMutating, setIsCatalogMutating] = useState(false);
  const [isUploadingCatalogPdf, setIsUploadingCatalogPdf] = useState(false);
  const [isAssigningCatalogFromLibrary, setIsAssigningCatalogFromLibrary] = useState(false);

  const categoriesById = useMemo(
    () => new Map(categories.map((category) => [category.id, category.name])),
    [categories],
  );

  const currentEditingStore = useMemo(
    () => stores.find((store) => store.id === editingStoreId) ?? null,
    [stores, editingStoreId],
  );

  const filteredStores = useMemo(() => {
    const query = normalizeSearchText(searchTerm);

    return stores.filter((store) => {
      const matchesQuery =
        !query ||
        normalizeSearchText(store.name).includes(query) ||
        normalizeSearchText(store.slug).includes(query);

      const matchesCategory = categoryFilter === 'all' || store.category_id === categoryFilter;
      const matchesFloor = floorFilter === 'all' || (store.floor ?? '') === floorFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'published' ? store.is_published : !store.is_published);

      return matchesQuery && matchesCategory && matchesFloor && matchesStatus;
    });
  }, [stores, searchTerm, categoryFilter, floorFilter, statusFilter]);

  const seoPreviewTitle = useMemo(
    () => form.seo_title.trim() || form.name.trim() || 'Nome da loja',
    [form.name, form.seo_title],
  );

  const seoPreviewDescription = useMemo(
    () =>
      form.seo_description.trim() ||
      form.description.trim() ||
      'Conheca esta loja no guia comercial do Mega Polo Moda.',
    [form.description, form.seo_description],
  );

  const seoPreviewUrl = useMemo(() => {
    const slug = slugify(form.slug || form.name || 'loja-exemplo');
    return `${getSiteBaseUrl()}/lojas/${slug}`;
  }, [form.name, form.slug]);

  const sortedProducts = useMemo(
    () =>
      [...storeProducts].sort(
        (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR'),
      ),
    [storeProducts],
  );

  const clearCatalogMessages = useCallback(() => {
    setCatalogError(null);
    setCatalogSuccess(null);
  }, []);

  const formatFileSize = useCallback((bytes: number | null) => {
    if (!bytes || bytes <= 0) {
      return 'Tamanho nÃ£o informado';
    }

    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }, []);

  const clearProductMessages = useCallback(() => {
    setProductsError(null);
    setProductsSuccess(null);
  }, []);

  const resetProductForm = useCallback(() => {
    setEditingProductId(null);
    setProductForm(DEFAULT_PRODUCT_FORM);
  }, []);

  const loadStoreProducts = useCallback(async (storeId: string) => {
    setIsProductsLoading(true);
    clearProductMessages();

    const result = await listProductsByStore(storeId);
    setIsProductsLoading(false);

    if (result.error) {
      setProductsError(result.error);
      return;
    }

    setStoreProducts(result.data ?? []);
  }, [clearProductMessages]);

  const loadActiveCatalog = useCallback(async (storeId: string) => {
    setIsCatalogLoading(true);
    clearCatalogMessages();

    const result = await getActiveCatalogByStore(storeId);
    setIsCatalogLoading(false);

    if (result.error) {
      setCatalogError(result.error);
      return;
    }

    setActiveCatalog(result.data ?? null);
    setCatalogTitle(result.data?.title ?? '');
  }, [clearCatalogMessages]);

  const loadStoreRelatedContent = useCallback(async (storeId: string) => {
    await Promise.all([loadStoreProducts(storeId), loadActiveCatalog(storeId)]);
  }, [loadActiveCatalog, loadStoreProducts]);

  const resetStoreForm = () => {
    setForm(DEFAULT_STORE_FORM);
    setEditingStoreId(null);
    setSlugManuallyEdited(false);
    setFormError(null);
    setActiveTab('main');
    setStoreProducts([]);
    clearProductMessages();
    resetProductForm();
    setActiveCatalog(null);
    setCatalogTitle('');
    clearCatalogMessages();
  };

  const startCreate = () => {
    clearMessages();
    resetStoreForm();
  };

  const startEdit = (store: Store) => {
    clearMessages();
    clearProductMessages();
    setForm(mapStoreToForm(store));
    setEditingStoreId(store.id);
    setSlugManuallyEdited(true);
    setFormError(null);
    setActiveTab('main');
    resetProductForm();
    void loadStoreRelatedContent(store.id);
  };

  const validateStoreForm = () => {
    if (!form.name.trim()) {
      return 'Nome da loja e obrigatorio.';
    }

    if (!form.slug.trim()) {
      return 'Slug da loja e obrigatorio.';
    }

    if (!form.category_id) {
      return 'Categoria da loja e obrigatoria.';
    }

    if (!validateWhatsapp(form.whatsapp)) {
      return 'WhatsApp invalido. Use de 10 a 13 digitos com DDD.';
    }

    if (!validateWebsite(form.website)) {
      return 'URL do site invalida.';
    }

    const normalizedSlug = slugify(form.slug);
    const duplicate = stores.find(
      (store) => store.slug === normalizedSlug && store.id !== editingStoreId,
    );

    if (duplicate) {
      return 'Slug ja existe. Escolha outro slug.';
    }

    return null;
  };

  const handleStoreSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    clearMessages();
    const validationError = validateStoreForm();

    if (validationError) {
      setFormError(validationError);
      return;
    }

    setFormError(null);

    const payload = {
      name: form.name.trim(),
      slug: slugify(form.slug),
      description: form.description.trim() || null,
      category_id: form.category_id,
      segment: form.segment.trim() || null,
      floor: form.floor.trim() || null,
      store_number: form.store_number.trim() || null,
      whatsapp: form.whatsapp.trim() || null,
      phone: form.phone.trim() || null,
      email: form.email.trim() || null,
      instagram: normalizeInstagram(form.instagram),
      website: form.website.trim() || null,
      logo_url: form.logo_url.trim() || null,
      banner_url: form.banner_url.trim() || null,
      tags: form.tags
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean),
      seo_title: form.seo_title.trim() || null,
      seo_description: form.seo_description.trim() || null,
      og_image_url: form.og_image_url.trim() || null,
      is_featured: form.is_featured,
      is_published: form.is_published,
    };

    const result = editingStoreId
      ? await updateStoreItem(editingStoreId, payload)
      : await createStoreItem(payload);

    if (!result.error) {
      resetStoreForm();
    }
  };

  const handleDeleteStore = async () => {
    if (!pendingDeleteStore) {
      return;
    }

    const result = await deleteStoreItem(pendingDeleteStore.id);

    if (!result.error) {
      setPendingDeleteStore(null);
      if (editingStoreId === pendingDeleteStore.id) {
        resetStoreForm();
      }
    }
  };

  const handleUploadLogo = async (file: File) => {
    setIsUploadingLogo(true);
    const result = await uploadStoreLogoFile(file);
    setIsUploadingLogo(false);

    if (result.error || !result.data) {
      setFormError(result.error ?? 'Falha no upload da logo.');
      return;
    }

    setForm((prev) => ({ ...prev, logo_url: result.data.publicUrl }));
  };

  const handleUploadBanner = async (file: File) => {
    setIsUploadingBanner(true);
    const result = await uploadStoreBannerFile(file);
    setIsUploadingBanner(false);

    if (result.error || !result.data) {
      setFormError(result.error ?? 'Falha no upload do banner.');
      return;
    }

    setForm((prev) => ({ ...prev, banner_url: result.data.publicUrl }));
  };

  const upsertActiveCatalogByUrl = useCallback(async (catalogUrl: string, fileSize: number | null) => {
    if (!editingStoreId) {
      setCatalogError('Salve a loja antes de configurar o catalogo.');
      return;
    }

    const normalizedCatalogUrl = catalogUrl.trim();
    if (!normalizedCatalogUrl) {
      setCatalogError('URL do catalogo e obrigatoria.');
      return;
    }

    const defaultTitle = currentEditingStore
      ? `Catalogo ${currentEditingStore.name}`
      : 'Catalogo digital da loja';
    const resolvedTitle = catalogTitle.trim() || defaultTitle;

    setIsCatalogMutating(true);

    if (activeCatalog) {
      const updateResult = await updateCatalog(activeCatalog.id, {
        title: resolvedTitle,
        file_url: normalizedCatalogUrl,
        file_size: fileSize,
        is_active: true,
      });
      setIsCatalogMutating(false);

      if (updateResult.error) {
        setCatalogError(updateResult.error);
        return;
      }

      setCatalogSuccess('Catalogo atualizado com sucesso.');
      setCatalogTitle(updateResult.data?.title ?? resolvedTitle);
    } else {
      const createResult = await createCatalog({
        store_id: editingStoreId,
        title: resolvedTitle,
        file_url: normalizedCatalogUrl,
        file_size: fileSize,
        is_active: true,
      });
      setIsCatalogMutating(false);

      if (createResult.error) {
        setCatalogError(createResult.error);
        return;
      }

      setCatalogSuccess('Catalogo vinculado com sucesso.');
      setCatalogTitle(createResult.data?.title ?? resolvedTitle);
    }

    await loadActiveCatalog(editingStoreId);
    await refreshStores();
  }, [
    activeCatalog,
    catalogTitle,
    currentEditingStore,
    editingStoreId,
    loadActiveCatalog,
    refreshStores,
  ]);

  const handleUploadStoreCatalog = async (file: File) => {
    if (!editingStoreId) {
      setCatalogError('Salve a loja antes de enviar um catalogo.');
      return;
    }

    clearCatalogMessages();
    setIsUploadingCatalogPdf(true);
    const uploadResult = await uploadCatalogPdf(file);
    setIsUploadingCatalogPdf(false);

    if (uploadResult.error || !uploadResult.data) {
      setCatalogError(uploadResult.error ?? 'Falha no upload do catalogo.');
      return;
    }

    await upsertActiveCatalogByUrl(uploadResult.data.publicUrl, uploadResult.data.fileSize);
  };

  const handleAssignCatalogFromLibrary = useCallback(async (catalogUrl: string) => {
    clearCatalogMessages();
    setIsAssigningCatalogFromLibrary(true);
    await upsertActiveCatalogByUrl(catalogUrl, activeCatalog?.file_size ?? null);
    setIsAssigningCatalogFromLibrary(false);
  }, [activeCatalog?.file_size, clearCatalogMessages, upsertActiveCatalogByUrl]);

  const handleCatalogTitleSave = async () => {
    if (!activeCatalog) {
      setCatalogError('Nao existe catÃ¡logo ativo para editar.');
      return;
    }

    const normalizedTitle = catalogTitle.trim();
    if (!normalizedTitle) {
      setCatalogError('Titulo do catÃ¡logo e obrigatorio.');
      return;
    }

    clearCatalogMessages();
    setIsCatalogMutating(true);
    const result = await updateCatalog(activeCatalog.id, { title: normalizedTitle });
    setIsCatalogMutating(false);

    if (result.error) {
      setCatalogError(result.error);
      return;
    }

    setCatalogSuccess('Titulo do catÃ¡logo atualizado.');
    setActiveCatalog(result.data ?? activeCatalog);
  };

  const handleCatalogToggle = async () => {
    if (!activeCatalog) {
      return;
    }

    clearCatalogMessages();
    setIsCatalogMutating(true);

    const result = activeCatalog.is_active
      ? await deactivateCatalog(activeCatalog.id)
      : await activateCatalog(activeCatalog.id);

    setIsCatalogMutating(false);

    if (result.error) {
      setCatalogError(result.error);
      return;
    }

    setCatalogSuccess(
      activeCatalog.is_active ? 'CatÃ¡logo desativado.' : 'CatÃ¡logo ativado.',
    );

    if (editingStoreId) {
      await loadActiveCatalog(editingStoreId);
      await refreshStores();
    }
  };

  const handleCatalogDelete = async () => {
    if (!activeCatalog || !editingStoreId) {
      return;
    }

    clearCatalogMessages();
    setIsCatalogMutating(true);
    const result = await deleteCatalog(activeCatalog.id);
    setIsCatalogMutating(false);

    if (result.error) {
      setCatalogError(result.error);
      return;
    }

    setCatalogSuccess('CatÃ¡logo removido com sucesso.');
    setActiveCatalog(null);
    setCatalogTitle('');
    await refreshStores();
  };

  const validateProductForm = () => {
    if (!editingStoreId) {
      return 'Selecione uma loja para gerenciar produtos.';
    }

    if (!productForm.name.trim()) {
      return 'Nome do produto e obrigatorio.';
    }

    const parsedPrice = parsePrice(productForm.price);
    if (parsedPrice === 'invalid') {
      return 'Preco invalido. Informe um valor numerico positivo.';
    }

    if (productForm.sort_order.trim()) {
      const parsedOrder = Number(productForm.sort_order);
      if (!Number.isFinite(parsedOrder)) {
        return 'sort_order deve ser numerico.';
      }
    }

    return null;
  };

  const handleProductSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    clearProductMessages();
    const validationError = validateProductForm();
    if (validationError) {
      setProductsError(validationError);
      return;
    }

    if (!editingStoreId) {
      setProductsError('Selecione uma loja para gerenciar produtos.');
      return;
    }

    const parsedPrice = parsePrice(productForm.price);
    const parsedSortOrder = productForm.sort_order.trim() ? Number(productForm.sort_order) : undefined;

    const payloadBase = {
      store_id: editingStoreId,
      name: productForm.name.trim(),
      description: productForm.description.trim() || null,
      image_url: productForm.image_url.trim() || null,
      category: productForm.category.trim() || null,
      price: parsedPrice === null ? null : parsedPrice,
      is_active: productForm.is_active,
      sort_order: parsedSortOrder,
    };

    setIsProductsMutating(true);
    const result = editingProductId
      ? await updateProduct(editingProductId, payloadBase as StoreProductUpdate)
      : await createProduct(payloadBase as StoreProductInsert);
    setIsProductsMutating(false);

    if (result.error) {
      setProductsError(result.error);
      return;
    }

    await loadStoreProducts(editingStoreId);
    await refreshStores();
    resetProductForm();
    setProductsSuccess(editingProductId ? 'Produto atualizado com sucesso.' : 'Produto criado com sucesso.');
  };

  const handleEditProduct = (product: StoreProduct) => {
    clearProductMessages();
    setEditingProductId(product.id);
    setProductForm(mapProductToForm(product));
  };

  const handleToggleProductActive = async (product: StoreProduct) => {
    clearProductMessages();
    setIsProductsMutating(true);
    const result = await updateProduct(product.id, { is_active: !product.is_active });
    setIsProductsMutating(false);

    if (result.error) {
      setProductsError(result.error);
      return;
    }

    if (editingStoreId) {
      await loadStoreProducts(editingStoreId);
      await refreshStores();
    }
    setProductsSuccess(product.is_active ? 'Produto desativado.' : 'Produto ativado.');
  };

  const handleDeleteProduct = async () => {
    if (!pendingDeleteProduct || !editingStoreId) {
      return;
    }

    setIsProductsMutating(true);
    const result = await deleteProduct(pendingDeleteProduct.id);
    setIsProductsMutating(false);

    if (result.error) {
      setProductsError(result.error);
      return;
    }

    setPendingDeleteProduct(null);
    await loadStoreProducts(editingStoreId);
    await refreshStores();

    if (editingProductId === pendingDeleteProduct.id) {
      resetProductForm();
    }

    setProductsSuccess('Produto removido com sucesso.');
  };

  const handleUploadProductImage = async (file: File) => {
    clearProductMessages();
    setIsUploadingProductImage(true);
    const result = await uploadProductImage(file);
    setIsUploadingProductImage(false);

    if (result.error || !result.data) {
      setProductsError(result.error ?? 'Falha no upload da imagem do produto.');
      return;
    }

    setProductForm((prev) => ({ ...prev, image_url: result.data.publicUrl }));
  };

  const moveProduct = async (productId: string, direction: -1 | 1) => {
    if (!editingStoreId || isReorderingProducts) {
      return;
    }

    const currentIndex = sortedProducts.findIndex((product) => product.id === productId);
    const targetIndex = currentIndex + direction;
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedProducts.length) {
      return;
    }

    clearProductMessages();

    const reordered = [...sortedProducts];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const reorderItems: ReorderStoreProductItem[] = reordered.map((product, index) => ({
      id: product.id,
      sort_order: index,
    }));

    setIsReorderingProducts(true);
    const result = await reorderProducts(editingStoreId, reorderItems);
    setIsReorderingProducts(false);

    if (result.error) {
      setProductsError(result.error);
      return;
    }

    setStoreProducts(result.data ?? []);
    setProductsSuccess('Ordem dos produtos atualizada.');
    await refreshStores();
  };

  const storeColumns: Array<AdminTableColumn<Store>> = [
    {
      key: 'name',
      label: 'Loja',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.name}</p>
          <p className="text-xs text-brand-dark/60">/{row.slug}</p>
        </div>
      ),
    },
    {
      key: 'category',
      label: 'Categoria',
      render: (row) => (
        <span>{row.category_id ? categoriesById.get(row.category_id) ?? 'Sem categoria' : 'Sem categoria'}</span>
      ),
    },
    {
      key: 'location',
      label: 'Localizacao',
      render: (row) => (
        <div className="text-sm text-brand-dark/80">
          <p>{row.floor ?? 'Piso nao informado'}</p>
          <p className="text-xs text-brand-dark/60">{row.store_number ?? 'Sem numero'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row) => (
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge
            label={row.is_published ? 'Publicada' : 'Rascunho'}
            tone={row.is_published ? 'published' : 'draft'}
          />
          {row.is_featured && <StatusBadge label="Destaque" tone="warning" />}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <StoreActions
          row={row}
          canEditStores={canEditStores}
          onEdit={startEdit}
          onTogglePublish={(store) => {
            if (store.is_published) {
              void unpublishStoreItem(store.id);
              return;
            }

            void publishStoreItem(store.id);
          }}
          onToggleFeatured={(store) => {
            void updateStoreItem(store.id, {
              is_featured: !store.is_featured,
            });
          }}
          onDelete={setPendingDeleteStore}
        />
      ),
    },
  ];

  return (
    <>
      <SEO
        title="Lojas | CMS Mega Polo Moda"
        description="Gerencie o cadastro completo de lojas, publicacao e destaque no portal Mega Polo Moda."
      />

      <AdminPageHeader
        title="Lojas"
        description={
          canEditStores
            ? 'Cadastre, publique e gerencie as lojas do shopping com dados completos de contato e localizacao.'
            : 'Visualizacao de lojas em modo somente leitura para o perfil atual.'
        }
        actions={(
          <div className="flex items-center gap-2">
            {canEditStores && (
              <button
                type="button"
                onClick={startCreate}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Nova loja
              </button>
            )}
            <button
              type="button"
              onClick={() => void refreshStores()}
              className="px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              Atualizar
            </button>
          </div>
        )}
      />

      {!isSupabaseEnabled && (
        <div className="mb-6">
          <AdminEmptyState
            title="Supabase nao configurado"
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o CRUD real de lojas."
          />
        </div>
      )}

      {!isLoading && canEditStores === false && (
        <div className="mb-6 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Seu papel atual permite apenas visualizacao desta pagina. Edicao de lojas requer perfil editor, admin ou super_admin.
        </div>
      )}

      {isLoading && <AdminLoadingState label="Carregando lojas..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshStores()} />}

      {!isLoading && !error && (
        <div className={canEditStores ? 'grid grid-cols-1 xl:grid-cols-[480px_1fr] gap-6' : 'grid grid-cols-1 gap-6'}>
          {canEditStores && (
            <StoreFormModal
              editingStoreId={editingStoreId}
              currentEditingStore={currentEditingStore}
              activeTab={activeTab}
              onActiveTabChange={setActiveTab}
              form={form}
              setForm={setForm}
              slugManuallyEdited={slugManuallyEdited}
              setSlugManuallyEdited={setSlugManuallyEdited}
              categories={categories}
              onStoreSubmit={handleStoreSubmit}
              onResetStoreForm={resetStoreForm}
              formError={formError}
              successMessage={successMessage}
              isMutating={isMutating}
              isUploadingLogo={isUploadingLogo}
              isUploadingBanner={isUploadingBanner}
              onUploadLogo={handleUploadLogo}
              onUploadBanner={handleUploadBanner}
              activeCatalog={activeCatalog}
              catalogTitle={catalogTitle}
              onCatalogTitleChange={setCatalogTitle}
              catalogError={catalogError}
              catalogSuccess={catalogSuccess}
              isCatalogLoading={isCatalogLoading}
              isCatalogMutating={isCatalogMutating}
              isUploadingCatalogPdf={isUploadingCatalogPdf}
              isAssigningCatalogFromLibrary={isAssigningCatalogFromLibrary}
              formatFileSize={formatFileSize}
              onCatalogToggle={handleCatalogToggle}
              onCatalogDelete={handleCatalogDelete}
              onCatalogTitleSave={handleCatalogTitleSave}
              onUploadStoreCatalog={handleUploadStoreCatalog}
              onAssignCatalogFromLibrary={handleAssignCatalogFromLibrary}
              seoPreviewTitle={seoPreviewTitle}
              seoPreviewDescription={seoPreviewDescription}
              seoPreviewUrl={seoPreviewUrl}
              productForm={productForm}
              setProductForm={setProductForm}
              editingProductId={editingProductId}
              onProductSubmit={handleProductSubmit}
              onResetProductForm={resetProductForm}
              productsError={productsError}
              productsSuccess={productsSuccess}
              isProductsLoading={isProductsLoading}
              isProductsMutating={isProductsMutating}
              isUploadingProductImage={isUploadingProductImage}
              onUploadProductImage={handleUploadProductImage}
              sortedProducts={sortedProducts}
              formatPrice={formatPrice}
              isReorderingProducts={isReorderingProducts}
              onMoveProduct={moveProduct}
              onEditProduct={handleEditProduct}
              onToggleProductActive={handleToggleProductActive}
              onDeleteProductRequest={setPendingDeleteProduct}
            />
          )}

          <AdminCard
            title="Lista de lojas"
            description="Filtre por nome, categoria, status e piso para localizar lojas rapidamente."
          >
            <div className="space-y-4">
              <StoreFilters
                searchTerm={searchTerm}
                categoryFilter={categoryFilter}
                statusFilter={statusFilter}
                floorFilter={floorFilter}
                categories={categories}
                availableFloors={availableFloors}
                onSearchTermChange={setSearchTerm}
                onCategoryFilterChange={setCategoryFilter}
                onStatusFilterChange={setStatusFilter}
                onFloorFilterChange={setFloorFilter}
              />

              <StoresTable
                stores={filteredStores}
                allStoresCount={stores.length}
                canEditStores={canEditStores}
                columns={storeColumns}
              />
            </div>
          </AdminCard>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDeleteStore}
        title="Excluir loja"
        description={
          pendingDeleteStore
            ? `Tem certeza que deseja excluir a loja "${pendingDeleteStore.name}"?`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onCancel={() => setPendingDeleteStore(null)}
        onConfirm={() => void handleDeleteStore()}
      />

      <ConfirmDialog
        open={!!pendingDeleteProduct}
        title="Excluir produto"
        description={
          pendingDeleteProduct
            ? `Tem certeza que deseja excluir o produto "${pendingDeleteProduct.name}"?`
            : ''
        }
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isProductsMutating}
        onCancel={() => setPendingDeleteProduct(null)}
        onConfirm={() => void handleDeleteProduct()}
      />
    </>
  );
}

