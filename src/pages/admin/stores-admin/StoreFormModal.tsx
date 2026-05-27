import type React from 'react';
import { ArrowDown, ArrowUp, Eye, EyeOff, Pencil, Trash2, Upload, X } from 'lucide-react';
import AdminCard from '../../../components/admin/AdminCard';
import AdminEmptyState from '../../../components/admin/AdminEmptyState';
import AdminFormSection from '../../../components/admin/AdminFormSection';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import StatusBadge from '../../../components/admin/StatusBadge';
import MediaPickerField from '../../../components/admin/media/MediaPickerField';
import { ImageWithFallback } from '../../../components/ui/ImageWithFallback';
import type { Catalog, Category, Store, StoreProduct } from '../../../types/cms';
import StoreBasicInfoFields from './StoreBasicInfoFields';
import StoreCatalogFields from './StoreCatalogFields';
import StoreMediaFields from './StoreMediaFields';
import StoreSeoFields from './StoreSeoFields';
import StoreStatusFields from './StoreStatusFields';
import type {
  ProductFormState,
  SetProductFormState,
  SetStoreFormState,
  StoreAdminTab,
  StoreFormState,
} from './storeAdmin.types';

interface StoreFormModalProps {
  editingStoreId: string | null;
  currentEditingStore: Store | null;
  activeTab: StoreAdminTab;
  onActiveTabChange: (value: StoreAdminTab) => void;
  form: StoreFormState;
  setForm: SetStoreFormState;
  slugManuallyEdited: boolean;
  setSlugManuallyEdited: (value: boolean) => void;
  categories: Category[];
  onStoreSubmit: (event: React.FormEvent) => Promise<void> | void;
  onResetStoreForm: () => void;
  formError: string | null;
  successMessage: string | null;
  isMutating: boolean;
  isUploadingLogo: boolean;
  isUploadingBanner: boolean;
  onUploadLogo: (file: File) => Promise<void> | void;
  onUploadBanner: (file: File) => Promise<void> | void;
  activeCatalog: Catalog | null;
  catalogTitle: string;
  onCatalogTitleChange: (value: string) => void;
  catalogError: string | null;
  catalogSuccess: string | null;
  isCatalogLoading: boolean;
  isCatalogMutating: boolean;
  isUploadingCatalogPdf: boolean;
  isAssigningCatalogFromLibrary: boolean;
  formatFileSize: (bytes: number | null) => string;
  onCatalogToggle: () => Promise<void> | void;
  onCatalogDelete: () => Promise<void> | void;
  onCatalogTitleSave: () => Promise<void> | void;
  onUploadStoreCatalog: (file: File) => Promise<void> | void;
  onAssignCatalogFromLibrary: (catalogUrl: string) => Promise<void> | void;
  seoPreviewTitle: string;
  seoPreviewDescription: string;
  seoPreviewUrl: string;
  productForm: ProductFormState;
  setProductForm: SetProductFormState;
  editingProductId: string | null;
  onProductSubmit: (event: React.FormEvent) => Promise<void> | void;
  onResetProductForm: () => void;
  productsError: string | null;
  productsSuccess: string | null;
  isProductsLoading: boolean;
  isProductsMutating: boolean;
  isUploadingProductImage: boolean;
  onUploadProductImage: (file: File) => Promise<void> | void;
  sortedProducts: StoreProduct[];
  formatPrice: (value: number | null) => string;
  isReorderingProducts: boolean;
  onMoveProduct: (productId: string, direction: -1 | 1) => Promise<void> | void;
  onEditProduct: (product: StoreProduct) => void;
  onToggleProductActive: (product: StoreProduct) => Promise<void> | void;
  onDeleteProductRequest: (product: StoreProduct) => void;
}

export default function StoreFormModal({
  editingStoreId,
  currentEditingStore,
  activeTab,
  onActiveTabChange,
  form,
  setForm,
  slugManuallyEdited,
  setSlugManuallyEdited,
  categories,
  onStoreSubmit,
  onResetStoreForm,
  formError,
  successMessage,
  isMutating,
  isUploadingLogo,
  isUploadingBanner,
  onUploadLogo,
  onUploadBanner,
  activeCatalog,
  catalogTitle,
  onCatalogTitleChange,
  catalogError,
  catalogSuccess,
  isCatalogLoading,
  isCatalogMutating,
  isUploadingCatalogPdf,
  isAssigningCatalogFromLibrary,
  formatFileSize,
  onCatalogToggle,
  onCatalogDelete,
  onCatalogTitleSave,
  onUploadStoreCatalog,
  onAssignCatalogFromLibrary,
  seoPreviewTitle,
  seoPreviewDescription,
  seoPreviewUrl,
  productForm,
  setProductForm,
  editingProductId,
  onProductSubmit,
  onResetProductForm,
  productsError,
  productsSuccess,
  isProductsLoading,
  isProductsMutating,
  isUploadingProductImage,
  onUploadProductImage,
  sortedProducts,
  formatPrice,
  isReorderingProducts,
  onMoveProduct,
  onEditProduct,
  onToggleProductActive,
  onDeleteProductRequest,
}: StoreFormModalProps) {
  const tabs: Array<{
    id: StoreAdminTab;
    label: string;
    disabled?: boolean;
  }> = [
    { id: 'main', label: 'Dados principais' },
    { id: 'media', label: 'Imagens e vitrine' },
    { id: 'products', label: 'Produtos', disabled: !editingStoreId },
    { id: 'catalogs', label: 'Catalogos', disabled: !editingStoreId },
    { id: 'seo', label: 'SEO' },
    { id: 'publication', label: 'Publicacao' },
  ];

  const isStoreEditionTab = activeTab !== 'products';

  return (
    <AdminCard
      title={editingStoreId ? `Editar loja${currentEditingStore ? `: ${currentEditingStore.name}` : ''}` : 'Nova loja'}
      description="Preencha os dados da loja e gerencie a vitrine de produtos."
    >
      <div className="mb-5 rounded-xl border border-brand-dark/10 p-1 bg-brand-paper/70">
        <div className="flex gap-1 overflow-x-auto pb-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => onActiveTabChange(tab.id)}
              disabled={tab.disabled}
              className={`shrink-0 px-3 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-white text-brand-dark shadow-sm'
                  : 'text-brand-dark/65 hover:text-brand-dark'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {isStoreEditionTab && (
        <form className="space-y-6" onSubmit={onStoreSubmit}>
          {activeTab === 'main' && (
            <>
              <StoreBasicInfoFields
                form={form}
                setForm={setForm}
                categories={categories}
                slugManuallyEdited={slugManuallyEdited}
                setSlugManuallyEdited={setSlugManuallyEdited}
              />

              <AdminFormSection title="Status atual">
                <div className="flex flex-wrap gap-2">
                  <StatusBadge label={form.is_published ? 'Publicado' : 'Nao publicado'} tone={form.is_published ? 'published' : 'draft'} />
                  <StatusBadge label={form.is_featured ? 'Em destaque' : 'Sem destaque'} tone={form.is_featured ? 'warning' : 'neutral'} />
                </div>
                <p className="text-sm text-brand-dark/70">
                  Campos obrigatorios para salvar: nome, slug e categoria.
                </p>
              </AdminFormSection>
            </>
          )}

          {activeTab === 'media' && (
            <>
              <StoreMediaFields
                form={form}
                setForm={setForm}
                isUploadingLogo={isUploadingLogo}
                isUploadingBanner={isUploadingBanner}
                onUploadLogo={onUploadLogo}
                onUploadBanner={onUploadBanner}
              />
              <AdminFormSection title="Galeria e imagens principais">
                <p className="text-sm text-brand-dark/70">
                  Logo e capa da loja sao gerenciadas acima. Para outras imagens auxiliares, utilize a Biblioteca de Midia e salve as URLs aqui quando aplicavel.
                </p>
              </AdminFormSection>
            </>
          )}

          {activeTab === 'catalogs' && (
            <StoreCatalogFields
              editingStoreId={editingStoreId}
              activeCatalog={activeCatalog}
              catalogTitle={catalogTitle}
              setCatalogTitle={onCatalogTitleChange}
              catalogError={catalogError}
              catalogSuccess={catalogSuccess}
              isCatalogLoading={isCatalogLoading}
              isCatalogMutating={isCatalogMutating}
              isUploadingCatalogPdf={isUploadingCatalogPdf}
              isAssigningCatalogFromLibrary={isAssigningCatalogFromLibrary}
              formatFileSize={formatFileSize}
              onCatalogToggle={onCatalogToggle}
              onCatalogDelete={onCatalogDelete}
              onCatalogTitleSave={onCatalogTitleSave}
              onUploadStoreCatalog={onUploadStoreCatalog}
              onAssignCatalogFromLibrary={onAssignCatalogFromLibrary}
            />
          )}

          {activeTab === 'seo' && (
            <>
              <AdminFormSection title="Slug da pagina da loja">
                <div className="space-y-2">
                  <label htmlFor="store-slug-seo" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Slug
                  </label>
                  <input
                    id="store-slug-seo"
                    type="text"
                    value={form.slug}
                    onChange={(event) => {
                      setSlugManuallyEdited(true);
                      setForm((prev) => ({ ...prev, slug: event.target.value }));
                    }}
                    className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                  />
                </div>
              </AdminFormSection>

              <StoreSeoFields
                form={form}
                setForm={setForm}
                seoPreviewTitle={seoPreviewTitle}
                seoPreviewDescription={seoPreviewDescription}
                seoPreviewUrl={seoPreviewUrl}
              />
            </>
          )}

          {activeTab === 'publication' && (
            <>
              <StoreStatusFields form={form} setForm={setForm} />
              <AdminFormSection title="Visibilidade no portal">
                <p className="text-sm text-brand-dark/70">
                  Publicado: {form.is_published ? 'sim' : 'nao'} - Destaque: {form.is_featured ? 'sim' : 'nao'}.
                </p>
              </AdminFormSection>
            </>
          )}

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
            {(editingStoreId || form.name || form.slug) && (
              <button
                type="button"
                onClick={onResetStoreForm}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
              >
                <X className="w-4 h-4" />
                Cancelar
              </button>
            )}
            <button
              type="submit"
              disabled={isMutating || isUploadingLogo || isUploadingBanner}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {editingStoreId ? 'Salvar alteracoes' : 'Criar loja'}
            </button>
          </div>
        </form>
      )}

      {activeTab === 'products' && (
        <div className="space-y-6">
          {!editingStoreId ? (
            <AdminEmptyState
              title="Salve a loja antes"
              description="Para gerenciar Produtos/Vitrine, salve a loja e abra novamente em modo de edicao."
            />
          ) : (
            <>
              <AdminFormSection title={editingProductId ? 'Editar produto de vitrine' : 'Novo produto de vitrine'}>
                <form className="space-y-4" onSubmit={onProductSubmit}>
                  <div className="space-y-2">
                    <label htmlFor="product-name" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Nome *
                    </label>
                    <input
                      id="product-name"
                      type="text"
                      value={productForm.name}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <label htmlFor="product-description" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                      Descricao
                    </label>
                    <textarea
                      id="product-description"
                      rows={2}
                      value={productForm.description}
                      onChange={(event) => setProductForm((prev) => ({ ...prev, description: event.target.value }))}
                      className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label htmlFor="product-category" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Categoria
                      </label>
                      <input
                        id="product-category"
                        type="text"
                        value={productForm.category}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, category: event.target.value }))}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                        placeholder="Ex: Jeans"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="product-price" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Preco (opcional)
                      </label>
                      <input
                        id="product-price"
                        type="text"
                        inputMode="decimal"
                        value={productForm.price}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                        placeholder="Ex: 129.90"
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="product-sort-order" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Ordem (sort_order)
                      </label>
                      <input
                        id="product-sort-order"
                        type="number"
                        value={productForm.sort_order}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, sort_order: event.target.value }))}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                        placeholder="Automatico"
                      />
                    </div>

                    <label className="inline-flex items-center gap-3 text-sm font-medium text-brand-dark/80 mt-8">
                      <input
                        type="checkbox"
                        checked={productForm.is_active}
                        onChange={(event) => setProductForm((prev) => ({ ...prev, is_active: event.target.checked }))}
                        className="h-4 w-4 rounded border-brand-dark/20 text-brand-red focus:ring-brand-red"
                      />
                      Produto ativo
                    </label>
                  </div>

                  <div className="space-y-2">
                    <MediaPickerField
                      id="product-image-url"
                      label="Imagem (opcional)"
                      value={productForm.image_url}
                      onChange={(value) => setProductForm((prev) => ({ ...prev, image_url: value }))}
                      placeholder="https://..."
                      allowedBuckets={['products', 'stores', 'banners']}
                      initialBucket="products"
                      typeFilter="image"
                      showPreview
                      previewAlt={`Imagem de ${productForm.name || 'produto'}`}
                      pickerTitle="Selecionar imagem do produto"
                      pickerDescription="Escolha uma imagem da biblioteca para o item de vitrine."
                    />
                    <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
                      <Upload className="w-4 h-4" />
                      {isUploadingProductImage ? 'Enviando imagem...' : 'Upload imagem'}
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void onUploadProductImage(file);
                          }
                        }}
                      />
                    </label>
                  </div>

                  {productsError && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                      {productsError}
                    </p>
                  )}

                  {productsSuccess && (
                    <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
                      {productsSuccess}
                    </p>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    {(editingProductId || productForm.name || productForm.description || productForm.image_url) && (
                      <button
                        type="button"
                        onClick={onResetProductForm}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={isProductsMutating || isUploadingProductImage}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-red text-white text-sm font-semibold hover:bg-brand-red-dark transition-colors disabled:opacity-70 disabled:cursor-not-allowed"
                    >
                      {editingProductId ? 'Salvar produto' : 'Adicionar produto'}
                    </button>
                  </div>
                </form>
              </AdminFormSection>

              <AdminFormSection title="Produtos cadastrados">
                {isProductsLoading ? (
                  <AdminLoadingState label="Carregando produtos..." />
                ) : sortedProducts.length === 0 ? (
                  <AdminEmptyState
                    title="Sem produtos cadastrados"
                    description="Cadastre itens de vitrine para esta loja."
                  />
                ) : (
                  <div className="space-y-3">
                    {sortedProducts.map((product, index) => (
                      <div
                        key={product.id}
                        className="rounded-xl border border-brand-dark/10 bg-white p-4 flex flex-col gap-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="font-semibold text-brand-dark">{product.name}</p>
                              <StatusBadge
                                label={product.is_active ? 'Ativo' : 'Inativo'}
                                tone={product.is_active ? 'published' : 'draft'}
                              />
                            </div>
                            <p className="text-xs text-brand-dark/60">
                              {product.category || 'Sem categoria'} - {formatPrice(product.price)}
                            </p>
                            {product.description && (
                              <p className="text-sm text-brand-dark/80">{product.description}</p>
                            )}
                            <p className="text-xs text-brand-dark/50">Ordem: {product.sort_order}</p>
                          </div>

                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => void onMoveProduct(product.id, -1)}
                              disabled={index === 0 || isReorderingProducts}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Subir ${product.name}`}
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                              Subir
                            </button>
                            <button
                              type="button"
                              onClick={() => void onMoveProduct(product.id, 1)}
                              disabled={index === sortedProducts.length - 1 || isReorderingProducts}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              aria-label={`Descer ${product.name}`}
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                              Descer
                            </button>
                            <button
                              type="button"
                              onClick={() => onEditProduct(product)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => void onToggleProductActive(product)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
                            >
                              {product.is_active ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                              {product.is_active ? 'Desativar' : 'Ativar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteProductRequest(product)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              Excluir
                            </button>
                          </div>
                        </div>

                        {product.image_url && (
                          <div className="h-28 w-28 rounded-lg overflow-hidden border border-brand-dark/10">
                            <ImageWithFallback
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                              loading="lazy"
                              width={112}
                              height={112}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </AdminFormSection>
            </>
          )}
        </div>
      )}
    </AdminCard>
  );
}
