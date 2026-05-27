import { ExternalLink, Library, Upload } from 'lucide-react';
import { useState } from 'react';
import AdminFormSection from '../../../components/admin/AdminFormSection';
import AdminLoadingState from '../../../components/admin/AdminLoadingState';
import MediaPicker from '../../../components/admin/media/MediaPicker';
import type { Catalog } from '../../../types/cms';

interface StoreCatalogFieldsProps {
  editingStoreId: string | null;
  activeCatalog: Catalog | null;
  catalogTitle: string;
  setCatalogTitle: (value: string) => void;
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
}

function formatDate(value?: string | null): string {
  if (!value) {
    return 'Nao informado';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Nao informado';
  }

  return date.toLocaleDateString('pt-BR');
}

export default function StoreCatalogFields({
  editingStoreId,
  activeCatalog,
  catalogTitle,
  setCatalogTitle,
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
}: StoreCatalogFieldsProps) {
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  return (
    <AdminFormSection title="Catalogo digital (PDF)">
      {!editingStoreId ? (
        <p className="text-sm text-brand-dark/70">
          Salve a loja para habilitar upload e gerenciamento do catalogo digital.
        </p>
      ) : (
        <div className="space-y-4">
          {isCatalogLoading ? (
            <AdminLoadingState label="Carregando catalogo ativo..." />
          ) : (
            <>
              {activeCatalog ? (
                <div className="rounded-xl border border-brand-dark/10 bg-white p-4 space-y-2">
                  <p className="text-sm font-semibold text-brand-dark">{activeCatalog.title}</p>
                  <p className="text-xs text-brand-dark/60">
                    {formatFileSize(activeCatalog.file_size)} - {activeCatalog.is_active ? 'Ativo' : 'Inativo'}
                  </p>
                  <p className="text-xs text-brand-dark/60">
                    Publicado em {formatDate(activeCatalog.created_at)} - Atualizado em {formatDate(activeCatalog.updated_at)}
                  </p>
                  <p className="text-xs text-brand-dark/60">Destaque: {activeCatalog.is_active ? 'Catalogo principal' : 'Sem destaque'}</p>
                  <div className="flex flex-wrap gap-2">
                    <a
                      href={activeCatalog.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Abrir PDF
                    </a>
                    <button
                      type="button"
                      onClick={() => void onCatalogToggle()}
                      disabled={isCatalogMutating}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {activeCatalog.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                    <button
                      type="button"
                      onClick={() => void onCatalogDelete()}
                      disabled={isCatalogMutating}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      Remover
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-brand-dark/70">Esta loja ainda nao possui catalogo ativo.</p>
              )}

              <div className="space-y-2">
                <label htmlFor="catalog-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                  Titulo do catalogo
                </label>
                <input
                  id="catalog-title"
                  type="text"
                  value={catalogTitle}
                  onChange={(event) => setCatalogTitle(event.target.value)}
                  placeholder="Catalogo digital da loja"
                  className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                />
              </div>

              {activeCatalog && (
                <button
                  type="button"
                  onClick={() => void onCatalogTitleSave()}
                  disabled={isCatalogMutating}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  Salvar titulo
                </button>
              )}

              <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
                <Upload className="w-4 h-4" />
                {isUploadingCatalogPdf
                  ? 'Enviando PDF...'
                  : activeCatalog
                    ? 'Trocar catalogo PDF'
                    : 'Subir catalogo PDF'}
                <input
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      void onUploadStoreCatalog(file);
                    }
                  }}
                />
              </label>

              <button
                type="button"
                onClick={() => setIsPickerOpen(true)}
                disabled={isCatalogMutating || isAssigningCatalogFromLibrary}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold hover:bg-brand-paper transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Library className="w-4 h-4" />
                {isAssigningCatalogFromLibrary ? 'Aplicando PDF...' : 'Selecionar PDF da biblioteca'}
              </button>
            </>
          )}

          {catalogError && (
            <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
              {catalogError}
            </p>
          )}

          {catalogSuccess && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
              {catalogSuccess}
            </p>
          )}
        </div>
      )}

      {isPickerOpen && (
        <MediaPicker
          open={isPickerOpen}
          onClose={() => setIsPickerOpen(false)}
          onSelect={(selection) => {
            void onAssignCatalogFromLibrary(selection.url);
          }}
          allowedBuckets={['catalogs']}
          initialBucket="catalogs"
          initialTypeFilter="pdf"
          title="Selecionar catalogo PDF"
          description="Escolha um PDF existente na biblioteca para definir como catalogo digital ativo da loja."
        />
      )}
    </AdminFormSection>
  );
}
