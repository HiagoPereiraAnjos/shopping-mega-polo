import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Loader2, RefreshCcw, Save, Upload } from 'lucide-react';
import AdminCard from '../../components/admin/AdminCard';
import AdminEmptyState from '../../components/admin/AdminEmptyState';
import AdminErrorState from '../../components/admin/AdminErrorState';
import AdminFormSection from '../../components/admin/AdminFormSection';
import AdminLoadingState from '../../components/admin/AdminLoadingState';
import AdminPageHeader from '../../components/admin/AdminPageHeader';
import { ImageWithFallback } from '../../components/ui/ImageWithFallback';
import { SEO } from '../../components/ui/SEO';
import {
  HOME_SECTION_KEYS,
  HOME_SECTION_LABELS,
  getFallbackHomeSections,
  resolveHomeSections,
  type HomeSectionKey,
  type ResolvedHomeSection,
} from '../../config/homeSectionsFallback';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  listHomeSections,
  reorderHomeSections,
  updateHomeSection,
  uploadHomeImage,
} from '../../services/homeSections.service';

function sanitizeInput(value: string): string {
  return value.trim();
}

function sortByOrder(sections: ResolvedHomeSection[]): ResolvedHomeSection[] {
  return [...sections].sort((a, b) => a.sort_order - b.sort_order);
}

function assignSequentialSortOrder(sections: ResolvedHomeSection[]): ResolvedHomeSection[] {
  return sections.map((section, index) => ({ ...section, sort_order: index + 1 }));
}

export default function HomeAdmin() {
  const [sections, setSections] = useState<ResolvedHomeSection[]>(() => getFallbackHomeSections());
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingSectionKey, setIsSavingSectionKey] = useState<string | null>(null);
  const [isUploadingSectionKey, setIsUploadingSectionKey] = useState<string | null>(null);
  const [isReordering, setIsReordering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(!isSupabaseConfigured);

  const refreshSections = useCallback(async () => {
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    if (!isSupabaseConfigured) {
      setSections(getFallbackHomeSections());
      setIsUsingFallback(true);
      setIsLoading(false);
      return;
    }

    const result = await listHomeSections();

    if (result.error) {
      setError(result.error);
      setSections(getFallbackHomeSections());
      setIsUsingFallback(true);
      setIsLoading(false);
      return;
    }

    const rows = result.data ?? [];
    setSections(resolveHomeSections(rows));
    setIsUsingFallback(rows.length === 0);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshSections();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshSections]);

  const sectionsByKey = useMemo(
    () =>
      sections.reduce<Record<string, ResolvedHomeSection>>((acc, section) => {
        acc[section.section_key] = section;
        return acc;
      }, {}),
    [sections],
  );

  const orderedSections = useMemo(() => sortByOrder(sections), [sections]);

  const handleFieldChange = (
    sectionKey: HomeSectionKey,
    field: keyof ResolvedHomeSection,
    value: string | boolean | number,
  ) => {
    setError(null);
    setSuccessMessage(null);
    setSections((prev) =>
      prev.map((section) =>
        section.section_key === sectionKey ? { ...section, [field]: value } : section,
      ),
    );
  };

  const handleSaveSection = async (sectionKey: HomeSectionKey) => {
    if (!isSupabaseConfigured) {
      setError('Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.');
      return;
    }

    const section = sectionsByKey[sectionKey];
    if (!section) {
      setError('Secao nao encontrada para salvar.');
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSavingSectionKey(sectionKey);

    const result = await updateHomeSection(sectionKey, {
      title: sanitizeInput(section.title) || null,
      subtitle: sanitizeInput(section.subtitle) || null,
      content: sanitizeInput(section.content) || null,
      image_url: sanitizeInput(section.image_url) || null,
      button_label: sanitizeInput(section.button_label) || null,
      button_url: sanitizeInput(section.button_url) || null,
      sort_order: section.sort_order,
      is_active: section.is_active,
    });

    setIsSavingSectionKey(null);

    if (result.error) {
      setError(result.error);
      return;
    }

    await refreshSections();
    setSuccessMessage(`Secao "${HOME_SECTION_LABELS[sectionKey]}" salva com sucesso.`);
  };

  const handleImageUpload = async (sectionKey: HomeSectionKey, file: File) => {
    setError(null);
    setSuccessMessage(null);
    setIsUploadingSectionKey(sectionKey);

    const result = await uploadHomeImage(file);

    setIsUploadingSectionKey(null);

    if (result.error || !result.data) {
      setError(result.error ?? 'Falha no upload da imagem da Home.');
      return;
    }

    setSections((prev) =>
      prev.map((section) =>
        section.section_key === sectionKey
          ? { ...section, image_url: result.data?.publicUrl ?? section.image_url }
          : section,
      ),
    );

    setSuccessMessage(
      `Imagem enviada com sucesso para "${HOME_SECTION_LABELS[sectionKey]}". Clique em "Salvar secao" para persistir.`,
    );
  };

  const handleMoveSection = async (sectionKey: HomeSectionKey, direction: 'up' | 'down') => {
    const currentIndex = orderedSections.findIndex((section) => section.section_key === sectionKey);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= orderedSections.length) {
      return;
    }

    const reordered = [...orderedSections];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    const normalized = assignSequentialSortOrder(reordered);
    setSections(normalized);

    if (!isSupabaseConfigured) {
      setSuccessMessage('Ordem atualizada no fallback local.');
      return;
    }

    setIsReordering(true);
    setError(null);
    setSuccessMessage(null);

    const result = await reorderHomeSections(
      normalized.map((section) => ({
        section_key: section.section_key,
        sort_order: section.sort_order,
      })),
    );

    setIsReordering(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSuccessMessage('Ordem das secoes da Home atualizada.');
  };

  return (
    <>
      <SEO
        title="Home | CMS Mega Polo Moda"
        description="Gerencie os blocos da Home do Mega Polo Moda sem alterar codigo."
      />

      <AdminPageHeader
        title="Home"
        description="Edite textos, links, imagens e status das secoes principais da Home."
        actions={
          <button
            type="button"
            onClick={() => void refreshSections()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
          >
            <RefreshCcw className="w-4 h-4" />
            Atualizar
          </button>
        }
      />

      {!isSupabaseConfigured && (
        <div className="mb-6">
          <AdminEmptyState
            title="Supabase nao configurado"
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para salvar configuracoes da Home no banco."
          />
        </div>
      )}

      {isLoading && <AdminLoadingState label="Carregando secoes da Home..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshSections()} />}

      {!isLoading && !error && (
        <div className="space-y-6">
          {isUsingFallback && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Nenhum dado remoto encontrado. O CMS esta usando o fallback atual da Home.
            </div>
          )}

          {successMessage && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              {successMessage}
            </div>
          )}

          {HOME_SECTION_KEYS.map((sectionKey) => {
            const section = sectionsByKey[sectionKey];
            if (!section) {
              return null;
            }

            const isSaving = isSavingSectionKey === sectionKey;
            const isUploading = isUploadingSectionKey === sectionKey;
            const isBusy = isSaving || isUploading || isReordering;

            return (
              <div key={sectionKey}>
                <AdminCard
                  title={HOME_SECTION_LABELS[sectionKey]}
                  description={`Chave: ${sectionKey}`}
                  actions={
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void handleMoveSection(sectionKey, 'up')}
                        disabled={isBusy}
                        className="p-2 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-60"
                        aria-label={`Mover secao ${HOME_SECTION_LABELS[sectionKey]} para cima`}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMoveSection(sectionKey, 'down')}
                        disabled={isBusy}
                        className="p-2 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-60"
                        aria-label={`Mover secao ${HOME_SECTION_LABELS[sectionKey]} para baixo`}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                    </div>
                  }
                >
                  <div className="space-y-6">
                  <AdminFormSection title="Conteudo principal">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor={`section-title-${sectionKey}`}
                          className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase"
                        >
                          Titulo
                        </label>
                        <input
                          id={`section-title-${sectionKey}`}
                          type="text"
                          value={section.title}
                          onChange={(event) => handleFieldChange(sectionKey, 'title', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`section-subtitle-${sectionKey}`}
                          className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase"
                        >
                          Subtitulo
                        </label>
                        <input
                          id={`section-subtitle-${sectionKey}`}
                          type="text"
                          value={section.subtitle}
                          onChange={(event) => handleFieldChange(sectionKey, 'subtitle', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor={`section-content-${sectionKey}`}
                        className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase"
                      >
                        Conteudo
                      </label>
                      <textarea
                        id={`section-content-${sectionKey}`}
                        rows={3}
                        value={section.content}
                        onChange={(event) => handleFieldChange(sectionKey, 'content', event.target.value)}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 resize-y"
                      />
                    </div>
                  </AdminFormSection>

                  <AdminFormSection title="Imagem da secao">
                    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
                      <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/60 p-3">
                        <ImageWithFallback
                          src={section.image_url}
                          alt={`${HOME_SECTION_LABELS[sectionKey]} - preview`}
                          className="h-44 object-cover rounded-lg"
                        />
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-2">
                          <label
                            htmlFor={`section-image-url-${sectionKey}`}
                            className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase"
                          >
                            URL da imagem
                          </label>
                          <input
                            id={`section-image-url-${sectionKey}`}
                            type="text"
                            value={section.image_url}
                            onChange={(event) =>
                              handleFieldChange(sectionKey, 'image_url', event.target.value)
                            }
                            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                            placeholder="https://..."
                          />
                        </div>

                        <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-dark/20 text-sm font-semibold cursor-pointer hover:bg-brand-paper transition-colors">
                          {isUploading ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                          Upload imagem
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={(event) => {
                              const file = event.target.files?.[0];
                              if (file) {
                                void handleImageUpload(sectionKey, file);
                              }
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  </AdminFormSection>

                  <AdminFormSection title="Botao e status">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label
                          htmlFor={`section-button-label-${sectionKey}`}
                          className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase"
                        >
                          Texto do botao
                        </label>
                        <input
                          id={`section-button-label-${sectionKey}`}
                          type="text"
                          value={section.button_label}
                          onChange={(event) =>
                            handleFieldChange(sectionKey, 'button_label', event.target.value)
                          }
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                        />
                      </div>

                      <div className="space-y-2">
                        <label
                          htmlFor={`section-button-url-${sectionKey}`}
                          className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase"
                        >
                          Link do botao
                        </label>
                        <input
                          id={`section-button-url-${sectionKey}`}
                          type="text"
                          value={section.button_url}
                          onChange={(event) => handleFieldChange(sectionKey, 'button_url', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                          placeholder="/lojas"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-end">
                      <div className="space-y-2">
                        <label
                          htmlFor={`section-order-${sectionKey}`}
                          className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase"
                        >
                          Ordem
                        </label>
                        <input
                          id={`section-order-${sectionKey}`}
                          type="number"
                          value={section.sort_order}
                          onChange={(event) =>
                            handleFieldChange(
                              sectionKey,
                              'sort_order',
                              Number.parseInt(event.target.value || '0', 10) || 0,
                            )
                          }
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                        />
                      </div>

                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark">
                        <input
                          type="checkbox"
                          checked={section.is_active}
                          onChange={(event) =>
                            handleFieldChange(sectionKey, 'is_active', event.target.checked)
                          }
                          className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30"
                        />
                        Secao ativa na Home
                      </label>
                    </div>
                  </AdminFormSection>

                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={() => void handleSaveSection(sectionKey)}
                        disabled={isBusy}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-60"
                      >
                        {isSaving ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4" />
                        )}
                        Salvar secao
                      </button>
                    </div>
                  </div>
                </AdminCard>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}

