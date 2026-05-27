import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  ExternalLink,
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
import { useAuth } from '../../hooks/useAuth';
import { useSiteSettings, type ResolvedSiteSettings } from '../../hooks/useSiteSettings';
import { canEditContent, getRoleLabel } from '../../lib/permissions';
import { isSupabaseConfigured } from '../../lib/supabase';
import {
  createFooterLink,
  createFooterSection,
  deleteFooterLink,
  deleteFooterSection,
  listFooterSections,
  reorderFooterLinks,
  reorderFooterSections,
  updateFooterLink,
  updateFooterSection,
  type FooterSectionWithLinks,
} from '../../services/footer.service';
import type { FooterLink } from '../../types/cms';
import { normalizeSearchText } from '../../utils/storeMappers';

interface FooterSectionFormState {
  title: string;
  sort_order: string;
  is_active: boolean;
}

interface FooterLinkFormState {
  footer_section_id: string;
  label: string;
  url: string;
  sort_order: string;
  is_active: boolean;
  open_in_new_tab: boolean;
}

interface FooterInstitutionalFormState {
  short_description: string;
  phone: string;
  email: string;
  address: string;
  opening_hours: string;
  whatsapp: string;
  instagram_url: string;
  facebook_url: string;
  linkedin_url: string;
  youtube_url: string;
  logo_url: string;
  institutional_image_url: string;
  footer_newsletter_title: string;
  footer_newsletter_text: string;
  footer_newsletter_button_label: string;
  footer_institutional_phrase: string;
  footer_legal_text: string;
  copyright_text: string;
  copyright_year: string;
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

function normalizeInput(value: string): string {
  return value.trim();
}

function toNullableInput(value: string): string | null {
  const normalized = normalizeInput(value);
  return normalized || null;
}

function getNextSectionSortOrder(sections: FooterSectionWithLinks[]): number {
  if (!sections.length) {
    return 0;
  }

  return Math.max(...sections.map((section) => section.sort_order ?? 0)) + 1;
}

function getNextLinkSortOrder(links: FooterLink[]): number {
  if (!links.length) {
    return 0;
  }

  return Math.max(...links.map((link) => link.sort_order ?? 0)) + 1;
}

function createSectionForm(sortOrder = 0): FooterSectionFormState {
  return {
    title: '',
    sort_order: String(sortOrder),
    is_active: true,
  };
}

function mapSectionToForm(section: FooterSectionWithLinks): FooterSectionFormState {
  return {
    title: section.title,
    sort_order: String(section.sort_order ?? 0),
    is_active: section.is_active,
  };
}

function createLinkForm(sectionId: string, sortOrder = 0): FooterLinkFormState {
  return {
    footer_section_id: sectionId,
    label: '',
    url: '',
    sort_order: String(sortOrder),
    is_active: true,
    open_in_new_tab: false,
  };
}

function mapLinkToForm(link: FooterLink): FooterLinkFormState {
  return {
    footer_section_id: link.footer_section_id,
    label: link.label,
    url: link.url,
    sort_order: String(link.sort_order ?? 0),
    is_active: link.is_active,
    open_in_new_tab: link.open_in_new_tab,
  };
}

function mapSettingsToInstitutionalForm(
  settings: ResolvedSiteSettings,
): FooterInstitutionalFormState {
  return {
    short_description: settings.short_description,
    phone: settings.phone,
    email: settings.email,
    address: settings.address,
    opening_hours: settings.opening_hours,
    whatsapp: settings.whatsapp,
    instagram_url: settings.instagram_url,
    facebook_url: settings.facebook_url,
    linkedin_url: settings.linkedin_url,
    youtube_url: settings.youtube_url,
    logo_url: settings.logo_url,
    institutional_image_url: settings.institutional_image_url,
    footer_newsletter_title: settings.footer_newsletter_title,
    footer_newsletter_text: settings.footer_newsletter_text,
    footer_newsletter_button_label: settings.footer_newsletter_button_label,
    footer_institutional_phrase: settings.footer_institutional_phrase,
    footer_legal_text: settings.footer_legal_text,
    copyright_text: settings.copyright_text,
    copyright_year: settings.copyright_year,
  };
}

export default function FooterAdmin() {
  const { profile } = useAuth();
  const canEdit = canEditContent(profile);
  const { settings, saveSettings, isSaving: isSavingFooterSettings } = useSiteSettings();

  const [sections, setSections] = useState<FooterSectionWithLinks[]>([]);
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMutating, setIsMutating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sectionSearchTerm, setSectionSearchTerm] = useState('');
  const [linkSearchTerm, setLinkSearchTerm] = useState('');

  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);
  const [sectionForm, setSectionForm] = useState<FooterSectionFormState>(() => createSectionForm(0));
  const [sectionFormError, setSectionFormError] = useState<string | null>(null);

  const [editingLinkId, setEditingLinkId] = useState<string | null>(null);
  const [linkForm, setLinkForm] = useState<FooterLinkFormState>(() => createLinkForm('', 0));
  const [linkFormError, setLinkFormError] = useState<string | null>(null);
  const [institutionalDraft, setInstitutionalDraft] = useState<FooterInstitutionalFormState | null>(null);
  const [institutionalFormError, setInstitutionalFormError] = useState<string | null>(null);

  const [pendingDeleteSection, setPendingDeleteSection] = useState<FooterSectionWithLinks | null>(null);
  const [pendingDeleteLink, setPendingDeleteLink] = useState<FooterLink | null>(null);

  const institutionalForm = useMemo(
    () => institutionalDraft ?? mapSettingsToInstitutionalForm(settings),
    [institutionalDraft, settings],
  );

  const orderedSections = useMemo(
    () => [...sections].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0)),
    [sections],
  );

  const selectedSection = useMemo(
    () => orderedSections.find((section) => section.id === selectedSectionId) ?? null,
    [orderedSections, selectedSectionId],
  );

  const selectedLinks = useMemo(() => {
    if (!selectedSection) {
      return [];
    }

    return [...selectedSection.links].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  }, [selectedSection]);

  const filteredSections = useMemo(() => {
    const normalizedSearch = normalizeSearchText(sectionSearchTerm);
    if (!normalizedSearch) {
      return orderedSections;
    }

    return orderedSections.filter((section) =>
      normalizeSearchText(section.title).includes(normalizedSearch),
    );
  }, [orderedSections, sectionSearchTerm]);

  const filteredLinks = useMemo(() => {
    const normalizedSearch = normalizeSearchText(linkSearchTerm);
    if (!normalizedSearch) {
      return selectedLinks;
    }

    return selectedLinks.filter((link) =>
      normalizeSearchText(`${link.label} ${link.url}`).includes(normalizedSearch),
    );
  }, [selectedLinks, linkSearchTerm]);

  const nextSectionSortOrder = useMemo(
    () => getNextSectionSortOrder(orderedSections),
    [orderedSections],
  );

  const nextLinkSortOrder = useMemo(
    () => getNextLinkSortOrder(selectedLinks),
    [selectedLinks],
  );
  const activeSectionCount = useMemo(
    () => orderedSections.filter((section) => section.is_active).length,
    [orderedSections],
  );
  const totalLinksCount = useMemo(
    () => orderedSections.reduce((accumulator, section) => accumulator + section.links.length, 0),
    [orderedSections],
  );

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
    setSectionFormError(null);
    setLinkFormError(null);
    setInstitutionalFormError(null);
  };

  const updateInstitutionalField = useCallback(
    (field: keyof FooterInstitutionalFormState, value: string) => {
      setInstitutionalDraft((current) => ({
        ...(current ?? mapSettingsToInstitutionalForm(settings)),
        [field]: value,
      }));
    },
    [settings],
  );

  const resetSectionForm = useCallback((sortOrder: number) => {
    setSectionForm(createSectionForm(sortOrder));
    setEditingSectionId(null);
    setSectionFormError(null);
  }, []);

  const resetLinkForm = useCallback((sectionId: string, sortOrder: number) => {
    setLinkForm(createLinkForm(sectionId, sortOrder));
    setEditingLinkId(null);
    setLinkFormError(null);
  }, []);

  const refreshSections = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const result = await listFooterSections();
    setIsLoading(false);

    if (result.error) {
      setError(result.error);
      setSections([]);
      setSelectedSectionId(null);
      return;
    }

    const nextSections = result.data ?? [];
    setSections(nextSections);

    if (!nextSections.length) {
      setSelectedSectionId(null);
      resetSectionForm(0);
      resetLinkForm('', 0);
      return;
    }

    const hasSelected = selectedSectionId
      ? nextSections.some((section) => section.id === selectedSectionId)
      : false;

    const fallbackSectionId = nextSections[0]?.id ?? null;
    const resolvedSectionId = hasSelected ? selectedSectionId : fallbackSectionId;

    setSelectedSectionId(resolvedSectionId);

    const resolvedSection = nextSections.find((section) => section.id === resolvedSectionId) ?? nextSections[0];

    if (resolvedSection) {
      if (!editingLinkId) {
        resetLinkForm(resolvedSection.id, getNextLinkSortOrder(resolvedSection.links));
      }
      if (!editingSectionId) {
        resetSectionForm(getNextSectionSortOrder(nextSections));
      }
    }
  }, [
    editingLinkId,
    editingSectionId,
    resetLinkForm,
    resetSectionForm,
    selectedSectionId,
  ]);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void refreshSections();
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [refreshSections]);

  const handleStartCreateSection = () => {
    clearMessages();
    resetSectionForm(nextSectionSortOrder);
  };

  const handleStartEditSection = (section: FooterSectionWithLinks) => {
    clearMessages();
    setEditingSectionId(section.id);
    setSectionForm(mapSectionToForm(section));
    setSectionFormError(null);
  };

  const handleStartCreateLink = () => {
    clearMessages();
    if (!selectedSection) {
      setLinkFormError('Selecione uma coluna para cadastrar links.');
      return;
    }
    resetLinkForm(selectedSection.id, nextLinkSortOrder);
  };

  const handleStartEditLink = (link: FooterLink) => {
    clearMessages();
    setEditingLinkId(link.id);
    setLinkForm(mapLinkToForm(link));
    setLinkFormError(null);
  };

  const handleSelectSection = (sectionId: string) => {
    if (sectionId === selectedSectionId) {
      return;
    }

    clearMessages();
    setSelectedSectionId(sectionId);
    const nextSection = orderedSections.find((section) => section.id === sectionId);
    if (nextSection) {
      resetLinkForm(sectionId, getNextLinkSortOrder(nextSection.links));
    }
  };

  const handleSectionSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!canEdit) {
      setSectionFormError('Seu perfil possui acesso somente leitura para o rodape.');
      return;
    }

    const title = normalizeInput(sectionForm.title);
    if (!title) {
      setSectionFormError('Titulo da coluna e obrigatorio.');
      return;
    }

    const sortOrder = parseSortOrder(sectionForm.sort_order);
    if (sortOrder.error || sortOrder.value === null) {
      setSectionFormError(sortOrder.error ?? 'sort_order invalido.');
      return;
    }

    setIsMutating(true);

    const payload = {
      title,
      sort_order: sortOrder.value,
      is_active: sectionForm.is_active,
    };

    const result = editingSectionId
      ? await updateFooterSection(editingSectionId, payload)
      : await createFooterSection(payload);

    setIsMutating(false);

    if (result.error) {
      setSectionFormError(result.error);
      return;
    }

    const savedSectionId = result.data?.id ?? null;
    await refreshSections();

    if (savedSectionId) {
      setSelectedSectionId(savedSectionId);
    }

    setSuccessMessage(editingSectionId ? 'Coluna atualizada com sucesso.' : 'Coluna criada com sucesso.');
    resetSectionForm(getNextSectionSortOrder(sections));
  };

  const handleLinkSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!canEdit) {
      setLinkFormError('Seu perfil possui acesso somente leitura para o rodape.');
      return;
    }

    const footerSectionId = normalizeInput(linkForm.footer_section_id || selectedSectionId || '');
    if (!footerSectionId) {
      setLinkFormError('Selecione uma coluna para cadastrar o link.');
      return;
    }

    const label = normalizeInput(linkForm.label);
    const url = normalizeInput(linkForm.url);

    if (!label) {
      setLinkFormError('Label do link e obrigatorio.');
      return;
    }

    if (!url) {
      setLinkFormError('URL do link e obrigatoria.');
      return;
    }

    const sortOrder = parseSortOrder(linkForm.sort_order);
    if (sortOrder.error || sortOrder.value === null) {
      setLinkFormError(sortOrder.error ?? 'sort_order invalido.');
      return;
    }

    setIsMutating(true);

    const payload = {
      footer_section_id: footerSectionId,
      label,
      url,
      sort_order: sortOrder.value,
      is_active: linkForm.is_active,
      open_in_new_tab: linkForm.open_in_new_tab,
    };

    const result = editingLinkId
      ? await updateFooterLink(editingLinkId, payload)
      : await createFooterLink(payload);

    setIsMutating(false);

    if (result.error) {
      setLinkFormError(result.error);
      return;
    }

    await refreshSections();
    setSuccessMessage(editingLinkId ? 'Link atualizado com sucesso.' : 'Link criado com sucesso.');

    const scopedSection = sections.find((section) => section.id === footerSectionId);
    const nextSortOrder = scopedSection ? getNextLinkSortOrder(scopedSection.links) : 0;
    resetLinkForm(footerSectionId, nextSortOrder);
  };

  const handleInstitutionalSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearMessages();

    if (!canEdit) {
      setInstitutionalFormError('Seu perfil possui acesso somente leitura para o rodape.');
      return;
    }

    const payload = {
      short_description: toNullableInput(institutionalForm.short_description),
      phone: toNullableInput(institutionalForm.phone),
      email: toNullableInput(institutionalForm.email),
      address: toNullableInput(institutionalForm.address),
      opening_hours: toNullableInput(institutionalForm.opening_hours),
      whatsapp: toNullableInput(institutionalForm.whatsapp),
      instagram_url: toNullableInput(institutionalForm.instagram_url),
      facebook_url: toNullableInput(institutionalForm.facebook_url),
      linkedin_url: toNullableInput(institutionalForm.linkedin_url),
      youtube_url: toNullableInput(institutionalForm.youtube_url),
      logo_url: toNullableInput(institutionalForm.logo_url),
      institutional_image_url: toNullableInput(institutionalForm.institutional_image_url),
      footer_newsletter_title: toNullableInput(institutionalForm.footer_newsletter_title),
      footer_newsletter_text: toNullableInput(institutionalForm.footer_newsletter_text),
      footer_newsletter_button_label: toNullableInput(institutionalForm.footer_newsletter_button_label),
      footer_institutional_phrase: toNullableInput(institutionalForm.footer_institutional_phrase),
      footer_legal_text: toNullableInput(institutionalForm.footer_legal_text),
      copyright_text: toNullableInput(institutionalForm.copyright_text),
      copyright_year: toNullableInput(institutionalForm.copyright_year),
    };

    const result = await saveSettings(payload);

    if (result.error) {
      setInstitutionalFormError(result.error);
      return;
    }

    setInstitutionalDraft(null);
    setSuccessMessage('Informacoes institucionais do rodape salvas com sucesso.');
  };

  const handleDeleteSection = async () => {
    if (!pendingDeleteSection) {
      return;
    }

    if (!canEdit) {
      setPendingDeleteSection(null);
      setSuccessMessage('Seu perfil possui acesso somente leitura para o rodape.');
      return;
    }

    setIsMutating(true);
    const result = await deleteFooterSection(pendingDeleteSection.id);
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      setPendingDeleteSection(null);
      return;
    }

    if (editingSectionId === pendingDeleteSection.id) {
      resetSectionForm(nextSectionSortOrder);
    }

    if (selectedSectionId === pendingDeleteSection.id) {
      setSelectedSectionId(null);
      resetLinkForm('', 0);
    }

    setPendingDeleteSection(null);
    await refreshSections();
    setSuccessMessage('Coluna removida com sucesso.');
  };

  const handleDeleteLink = async () => {
    if (!pendingDeleteLink) {
      return;
    }

    if (!canEdit) {
      setPendingDeleteLink(null);
      setSuccessMessage('Seu perfil possui acesso somente leitura para o rodape.');
      return;
    }

    setIsMutating(true);
    const result = await deleteFooterLink(pendingDeleteLink.id);
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      setPendingDeleteLink(null);
      return;
    }

    if (editingLinkId === pendingDeleteLink.id) {
      const sectionId = pendingDeleteLink.footer_section_id;
      const scopedSection = sections.find((section) => section.id === sectionId);
      resetLinkForm(sectionId, scopedSection ? getNextLinkSortOrder(scopedSection.links) : 0);
    }

    setPendingDeleteLink(null);
    await refreshSections();
    setSuccessMessage('Link removido com sucesso.');
  };

  const handleToggleSectionActive = async (section: FooterSectionWithLinks) => {
    clearMessages();

    if (!canEdit) {
      setSuccessMessage('Seu perfil possui acesso somente leitura para o rodape.');
      return;
    }

    setIsMutating(true);
    const result = await updateFooterSection(section.id, { is_active: !section.is_active });
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await refreshSections();
    setSuccessMessage(section.is_active ? 'Coluna desativada.' : 'Coluna ativada.');
  };

  const handleToggleLinkActive = async (link: FooterLink) => {
    clearMessages();

    if (!canEdit) {
      setSuccessMessage('Seu perfil possui acesso somente leitura para o rodape.');
      return;
    }

    setIsMutating(true);
    const result = await updateFooterLink(link.id, { is_active: !link.is_active });
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    await refreshSections();
    setSuccessMessage(link.is_active ? 'Link desativado.' : 'Link ativado.');
  };

  const handleMoveSection = async (id: string, direction: 'up' | 'down') => {
    clearMessages();

    if (!canEdit) {
      setSuccessMessage('Seu perfil possui acesso somente leitura para o rodape.');
      return;
    }

    const currentIndex = orderedSections.findIndex((section) => section.id === id);
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

    setIsMutating(true);
    const result = await reorderFooterSections(
      reordered.map((section, index) => ({
        id: section.id,
        sort_order: index,
      })),
    );
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSections(result.data ?? []);
    setSuccessMessage('Ordem das colunas atualizada.');
  };

  const handleMoveLink = async (id: string, direction: 'up' | 'down') => {
    clearMessages();

    if (!canEdit) {
      setSuccessMessage('Seu perfil possui acesso somente leitura para o rodape.');
      return;
    }

    if (!selectedSection) {
      return;
    }

    const currentIndex = selectedLinks.findIndex((link) => link.id === id);
    if (currentIndex < 0) {
      return;
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= selectedLinks.length) {
      return;
    }

    const reordered = [...selectedLinks];
    const [moved] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, moved);

    setIsMutating(true);
    const result = await reorderFooterLinks(
      selectedSection.id,
      reordered.map((link, index) => ({
        id: link.id,
        sort_order: index,
      })),
    );
    setIsMutating(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setSections((current) =>
      current.map((section) =>
        section.id === selectedSection.id ? { ...section, links: result.data ?? [] } : section,
      ),
    );

    setSuccessMessage('Ordem dos links atualizada.');
  };

  const sectionColumns: Array<AdminTableColumn<FooterSectionWithLinks>> = [
    {
      key: 'title',
      label: 'Coluna',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.title}</p>
          <p className="text-xs text-brand-dark/60">{row.links.length} link(s)</p>
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
              onClick={() => void handleMoveSection(row.id, 'up')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-50"
              aria-label={`Subir coluna ${row.title}`}
              disabled={isMutating || !canEdit}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleMoveSection(row.id, 'down')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-50"
              aria-label={`Descer coluna ${row.title}`}
              disabled={isMutating || !canEdit}
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
        <StatusBadge label={row.is_active ? 'Ativa' : 'Inativa'} tone={row.is_active ? 'success' : 'draft'} />
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleSelectSection(row.id)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors"
          >
            Selecionar
          </button>
          <button
            type="button"
            onClick={() => handleStartEditSection(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
            disabled={!canEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleToggleSectionActive(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
            disabled={!canEdit || isMutating}
          >
            {row.is_active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={() => setPendingDeleteSection(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            disabled={!canEdit || isMutating}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir
          </button>
        </div>
      ),
    },
  ];

  const linkColumns: Array<AdminTableColumn<FooterLink>> = [
    {
      key: 'label',
      label: 'Link',
      render: (row) => (
        <div className="space-y-1">
          <p className="font-semibold text-brand-dark">{row.label}</p>
          <p className="text-xs text-brand-dark/60 break-all">{row.url}</p>
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
              onClick={() => void handleMoveLink(row.id, 'up')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-50"
              aria-label={`Subir link ${row.label}`}
              disabled={isMutating || !canEdit}
            >
              <ArrowUp className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => void handleMoveLink(row.id, 'down')}
              className="p-1.5 rounded-lg border border-brand-dark/15 hover:bg-brand-paper transition-colors disabled:opacity-50"
              aria-label={`Descer link ${row.label}`}
              disabled={isMutating || !canEdit}
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
        <div className="space-y-1">
          <StatusBadge label={row.is_active ? 'Ativo' : 'Inativo'} tone={row.is_active ? 'success' : 'draft'} />
          {row.open_in_new_tab && (
            <span className="inline-flex items-center gap-1 text-[10px] text-brand-dark/60 uppercase tracking-brand">
              <ExternalLink className="w-3 h-3" />
              Nova aba
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'actions',
      label: 'Acoes',
      render: (row) => (
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => handleStartEditLink(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
            disabled={!canEdit}
          >
            <Pencil className="w-3.5 h-3.5" />
            Editar
          </button>
          <button
            type="button"
            onClick={() => void handleToggleLinkActive(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
            disabled={!canEdit || isMutating}
          >
            {row.is_active ? 'Desativar' : 'Ativar'}
          </button>
          <button
            type="button"
            onClick={() => setPendingDeleteLink(row)}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-red-200 text-red-700 text-xs font-semibold hover:bg-red-50 transition-colors disabled:opacity-50"
            disabled={!canEdit || isMutating}
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
        title="Rodape | CMS Mega Polo Moda"
        description="Gerencie colunas, links e estrutura do rodape do site sem alterar codigo."
      />

      <AdminPageHeader
        title="Rodape"
        description="Cadastre colunas e links do rodape, definindo ordem, status e comportamento de abertura."
        actions={(
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => void refreshSections()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors"
            >
              <RefreshCcw className="w-4 h-4" />
              Atualizar
            </button>
            <button
              type="button"
              onClick={handleStartCreateSection}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-white transition-colors disabled:opacity-50"
              disabled={!canEdit}
            >
              <Plus className="w-4 h-4" />
              Nova coluna
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
            description="Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY para habilitar o CMS de rodape."
          />
        </div>
      )}

      {isLoading && <AdminLoadingState label="Carregando configuracoes do rodape..." />}

      {!isLoading && error && <AdminErrorState message={error} onRetry={() => void refreshSections()} />}

      {!isLoading && !error && (
        <div className="space-y-6">
          {successMessage && (
            <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-4 py-3" role="status">
              {successMessage}
            </p>
          )}

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-dark/10 bg-brand-paper px-3 py-1">
              Colunas: {orderedSections.length}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-emerald-700">
              Colunas ativas: {activeSectionCount}
            </span>
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-dark/15 px-3 py-1">
              Links totais: {totalLinksCount}
            </span>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.25fr_0.95fr] gap-6">
            <AdminCard title="Colunas do rodape" description="Selecione uma coluna para editar seus links e comportamento.">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="footer-sections-search" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                    Buscar coluna
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                    <input
                      id="footer-sections-search"
                      type="search"
                      value={sectionSearchTerm}
                      onChange={(event) => setSectionSearchTerm(event.target.value)}
                      placeholder="Titulo da coluna"
                      className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                    />
                  </div>
                </div>

                {filteredSections.length === 0 ? (
                  <AdminEmptyState
                    title="Nenhuma coluna encontrada"
                    description={
                      orderedSections.length
                        ? 'Ajuste o termo de busca para localizar uma coluna.'
                        : 'Cadastre a primeira coluna do rodape para iniciar.'
                    }
                  />
                ) : (
                  <AdminTable
                    columns={sectionColumns}
                    rows={filteredSections}
                    rowKey={(row) => row.id}
                    emptyMessage="Nenhuma coluna encontrada."
                  />
                )}
              </div>
            </AdminCard>

            <div className="space-y-6">
              <AdminCard
                title={editingSectionId ? 'Editar coluna' : 'Nova coluna'}
                description="Defina titulo, ordem e status da coluna do rodape."
              >
                <form className="space-y-5" onSubmit={handleSectionSubmit}>
                  <AdminFormSection title="Dados da coluna">
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="footer-section-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          Titulo *
                        </label>
                        <input
                          id="footer-section-title"
                          type="text"
                          value={sectionForm.title}
                          onChange={(event) => setSectionForm((current) => ({ ...current, title: event.target.value }))}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="footer-section-order" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                          sort_order
                        </label>
                        <input
                          id="footer-section-order"
                          type="number"
                          value={sectionForm.sort_order}
                          onChange={(event) => setSectionForm((current) => ({ ...current, sort_order: event.target.value }))}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>

                      <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark">
                        <input
                          type="checkbox"
                          checked={sectionForm.is_active}
                          onChange={(event) => setSectionForm((current) => ({ ...current, is_active: event.target.checked }))}
                          disabled={!canEdit}
                          className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30 disabled:opacity-50"
                        />
                        Coluna ativa
                      </label>
                    </div>
                  </AdminFormSection>

                  {sectionFormError && (
                    <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                      {sectionFormError}
                    </p>
                  )}

                  <div className="flex items-center gap-2 justify-end">
                    {(editingSectionId || sectionForm.title) && (
                      <button
                        type="button"
                        onClick={() => resetSectionForm(nextSectionSortOrder)}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                      >
                        <X className="w-4 h-4" />
                        Cancelar
                      </button>
                    )}
                    <button
                      type="submit"
                      disabled={!canEdit || isMutating}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-50"
                    >
                      {editingSectionId ? 'Salvar coluna' : 'Criar coluna'}
                    </button>
                  </div>
                </form>
              </AdminCard>

              <AdminCard
                title="Links da coluna"
                description={selectedSection ? `Gerencie os links da coluna ${selectedSection.title}.` : 'Selecione uma coluna para cadastrar links.'}
              >
                {!selectedSection ? (
                  <AdminEmptyState
                    title="Nenhuma coluna selecionada"
                    description="Selecione uma coluna para listar e editar os links do rodape."
                  />
                ) : (
                  <div className="space-y-5">
                    <div className="space-y-2">
                      <label htmlFor="footer-links-search" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Buscar link
                      </label>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-dark/40" />
                        <input
                          id="footer-links-search"
                          type="search"
                          value={linkSearchTerm}
                          onChange={(event) => setLinkSearchTerm(event.target.value)}
                          placeholder="Label ou URL"
                          className="w-full rounded-xl border border-brand-dark/15 bg-white pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15"
                        />
                      </div>
                    </div>

                    {filteredLinks.length === 0 ? (
                      <AdminEmptyState
                        title="Nenhum link encontrado"
                        description={
                          selectedLinks.length
                            ? 'Ajuste o termo de busca para localizar um link.'
                            : 'Cadastre o primeiro link desta coluna.'
                        }
                      />
                    ) : (
                      <AdminTable
                        columns={linkColumns}
                        rows={filteredLinks}
                        rowKey={(row) => row.id}
                        emptyMessage="Nenhum link encontrado."
                      />
                    )}

                    <form className="space-y-5 border-t border-brand-dark/10 pt-5" onSubmit={handleLinkSubmit}>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-semibold text-brand-dark">
                          {editingLinkId ? 'Editar link' : 'Novo link'}
                        </p>
                        <button
                          type="button"
                          onClick={handleStartCreateLink}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-brand-dark/15 text-xs font-semibold hover:bg-brand-paper transition-colors disabled:opacity-50"
                          disabled={!canEdit}
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Novo link
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label htmlFor="footer-link-label" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                            Label *
                          </label>
                          <input
                            id="footer-link-label"
                            type="text"
                            value={linkForm.label}
                            onChange={(event) => setLinkForm((current) => ({ ...current, label: event.target.value }))}
                            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                            disabled={!canEdit}
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="footer-link-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                            URL *
                          </label>
                          <input
                            id="footer-link-url"
                            type="text"
                            value={linkForm.url}
                            onChange={(event) => setLinkForm((current) => ({ ...current, url: event.target.value }))}
                            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                            disabled={!canEdit}
                            placeholder="/lojas ou https://..."
                            required
                          />
                        </div>

                        <div className="space-y-2">
                          <label htmlFor="footer-link-order" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                            sort_order
                          </label>
                          <input
                            id="footer-link-order"
                            type="number"
                            value={linkForm.sort_order}
                            onChange={(event) => setLinkForm((current) => ({ ...current, sort_order: event.target.value }))}
                            className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                            disabled={!canEdit}
                          />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark">
                            <input
                              type="checkbox"
                              checked={linkForm.is_active}
                              onChange={(event) => setLinkForm((current) => ({ ...current, is_active: event.target.checked }))}
                              disabled={!canEdit}
                              className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30 disabled:opacity-50"
                            />
                            Link ativo
                          </label>

                          <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-brand-dark/15 bg-white text-sm text-brand-dark">
                            <input
                              type="checkbox"
                              checked={linkForm.open_in_new_tab}
                              onChange={(event) => setLinkForm((current) => ({ ...current, open_in_new_tab: event.target.checked }))}
                              disabled={!canEdit}
                              className="rounded border-brand-dark/20 text-brand-red focus:ring-brand-red/30 disabled:opacity-50"
                            />
                            Abrir em nova aba
                          </label>
                        </div>
                      </div>

                      {linkFormError && (
                        <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                          {linkFormError}
                        </p>
                      )}

                      <div className="flex items-center gap-2 justify-end">
                        {(editingLinkId || linkForm.label || linkForm.url) && (
                          <button
                            type="button"
                            onClick={() => resetLinkForm(selectedSection.id, nextLinkSortOrder)}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-dark/15 text-sm font-semibold hover:bg-brand-paper transition-colors"
                          >
                            <X className="w-4 h-4" />
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          disabled={!canEdit || isMutating}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-50"
                        >
                          {editingLinkId ? 'Salvar link' : 'Criar link'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
              </AdminCard>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[1.05fr_1.15fr] gap-6">
            <AdminCard
              title="Preview rapido do rodape"
              description="Acompanhe a hierarquia de colunas e links para validar ordem e status."
            >
              {orderedSections.length === 0 ? (
                <AdminEmptyState
                  title="Sem colunas cadastradas"
                  description="Cadastre ao menos uma coluna para visualizar o preview do rodape."
                />
              ) : (
                <div className="space-y-4">
                  {orderedSections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-xl border border-brand-dark/10 p-4 bg-white space-y-2"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-brand-dark">{section.title}</p>
                          <p className="text-xs text-brand-dark/60">
                            Ordem #{section.sort_order}
                          </p>
                        </div>
                        <StatusBadge
                          label={section.is_active ? 'Ativa' : 'Inativa'}
                          tone={section.is_active ? 'success' : 'draft'}
                        />
                      </div>
                      <ul className="space-y-1.5">
                        {section.links
                          .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
                          .map((link) => (
                            <li
                              key={link.id}
                              className="text-xs text-brand-dark/70 flex flex-wrap items-center gap-2"
                            >
                              <span className="font-semibold">{link.label}</span>
                              <span className="text-brand-dark/50">({link.url})</span>
                              {!link.is_active && (
                                <span className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] text-amber-700">
                                  Inativo
                                </span>
                              )}
                              {link.open_in_new_tab && (
                                <span className="rounded-full border border-brand-dark/15 px-2 py-0.5 text-[10px]">
                                  Nova aba
                                </span>
                              )}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </AdminCard>

            <AdminCard
              title="Textos e contatos do rodape"
              description="Edite conteudos institucionais, contatos, redes sociais e textos de newsletter/copyright."
            >
              <form className="space-y-6" onSubmit={handleInstitutionalSubmit}>
                <AdminFormSection title="Informacoes institucionais">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label htmlFor="footer-short-description" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">
                        Texto institucional curto
                      </label>
                      <textarea
                        id="footer-short-description"
                        value={institutionalForm.short_description}
                        onChange={(event) => updateInstitutionalField('short_description', event.target.value)}
                        rows={3}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="footer-phone" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Telefone</label>
                        <input
                          id="footer-phone"
                          type="text"
                          value={institutionalForm.phone}
                          onChange={(event) => updateInstitutionalField('', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="footer-email" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">E-mail</label>
                        <input
                          id="footer-email"
                          type="email"
                          value={institutionalForm.email}
                          onChange={(event) => updateInstitutionalField('', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="footer-address" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Endereco</label>
                      <input
                        id="footer-address"
                        type="text"
                        value={institutionalForm.address}
                        onChange={(event) => updateInstitutionalField('', event.target.value)}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="footer-opening-hours" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Horarios</label>
                        <input
                          id="footer-opening-hours"
                          type="text"
                          value={institutionalForm.opening_hours}
                          onChange={(event) => updateInstitutionalField('', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="footer-whatsapp" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">WhatsApp</label>
                        <input
                          id="footer-whatsapp"
                          type="text"
                          value={institutionalForm.whatsapp}
                          onChange={(event) => updateInstitutionalField('', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </div>
                </AdminFormSection>

                <AdminFormSection title="Redes sociais e imagens">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="footer-instagram-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Instagram</label>
                        <input
                          id="footer-instagram-url"
                          type="url"
                          value={institutionalForm.instagram_url}
                          onChange={(event) => updateInstitutionalField('', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="footer-facebook-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Facebook</label>
                        <input
                          id="footer-facebook-url"
                          type="url"
                          value={institutionalForm.facebook_url}
                          onChange={(event) => updateInstitutionalField('', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="footer-linkedin-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">LinkedIn</label>
                        <input
                          id="footer-linkedin-url"
                          type="url"
                          value={institutionalForm.linkedin_url}
                          onChange={(event) => updateInstitutionalField('', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="footer-youtube-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">YouTube</label>
                        <input
                          id="footer-youtube-url"
                          type="url"
                          value={institutionalForm.youtube_url}
                          onChange={(event) => updateInstitutionalField('', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="footer-logo-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">URL da logo</label>
                        <input
                          id="footer-logo-url"
                          type="url"
                          value={institutionalForm.logo_url}
                          onChange={(event) => updateInstitutionalField('', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="footer-institutional-image-url" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Selo / imagem institucional</label>
                        <input
                          id="footer-institutional-image-url"
                          type="url"
                          value={institutionalForm.institutional_image_url}
                          onChange={(event) => updateInstitutionalField('institutional_image_url', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </div>
                </AdminFormSection>

                <AdminFormSection title="Newsletter e textos finais">
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="footer-newsletter-title" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Titulo da newsletter</label>
                        <input
                          id="footer-newsletter-title"
                          type="text"
                          value={institutionalForm.footer_newsletter_title}
                          onChange={(event) => updateInstitutionalField('footer_newsletter_title', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="footer-newsletter-button-label" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Texto do botao</label>
                        <input
                          id="footer-newsletter-button-label"
                          type="text"
                          value={institutionalForm.footer_newsletter_button_label}
                          onChange={(event) => updateInstitutionalField('footer_newsletter_button_label', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="footer-newsletter-text" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Texto da newsletter</label>
                      <textarea
                        id="footer-newsletter-text"
                        rows={3}
                        value={institutionalForm.footer_newsletter_text}
                        onChange={(event) => updateInstitutionalField('footer_newsletter_text', event.target.value)}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="footer-institutional-phrase" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Frase institucional</label>
                      <input
                        id="footer-institutional-phrase"
                        type="text"
                        value={institutionalForm.footer_institutional_phrase}
                        onChange={(event) => updateInstitutionalField('footer_institutional_phrase', event.target.value)}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="space-y-2">
                      <label htmlFor="footer-legal-text" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Texto legal</label>
                      <textarea
                        id="footer-legal-text"
                        rows={2}
                        value={institutionalForm.footer_legal_text}
                        onChange={(event) => updateInstitutionalField('footer_legal_text', event.target.value)}
                        className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                        disabled={!canEdit}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label htmlFor="footer-copyright-text" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Copyright</label>
                        <input
                          id="footer-copyright-text"
                          type="text"
                          value={institutionalForm.copyright_text}
                          onChange={(event) => updateInstitutionalField('copyright_text', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>

                      <div className="space-y-2">
                        <label htmlFor="footer-copyright-year" className="text-xs font-bold tracking-brand text-brand-dark/70 uppercase">Ano</label>
                        <input
                          id="footer-copyright-year"
                          type="text"
                          value={institutionalForm.copyright_year}
                          onChange={(event) => updateInstitutionalField('copyright_year', event.target.value)}
                          className="w-full rounded-xl border border-brand-dark/15 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-red/15 disabled:bg-brand-paper/40"
                          disabled={!canEdit}
                        />
                      </div>
                    </div>
                  </div>
                </AdminFormSection>

                {institutionalFormError && (
                  <p className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
                    {institutionalFormError}
                  </p>
                )}

                <div className="rounded-xl border border-brand-dark/10 bg-brand-paper/30 p-3 text-xs text-brand-dark/70">
                  Para upload de logo/selo utilize a Biblioteca de Midia e cole a URL publica nos campos acima.
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={!canEdit || isSavingFooterSettings}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-dark text-white text-sm font-semibold hover:bg-brand-red transition-colors disabled:opacity-50"
                  >
                    {isSavingFooterSettings ? 'Salvando...' : 'Salvar textos e contatos'}
                  </button>
                </div>
              </form>
            </AdminCard>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!pendingDeleteSection}
        title="Excluir coluna do rodape"
        description={pendingDeleteSection ? `Deseja excluir a coluna "${pendingDeleteSection.title}" e todos os links vinculados?` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onCancel={() => setPendingDeleteSection(null)}
        onConfirm={() => void handleDeleteSection()}
      />

      <ConfirmDialog
        open={!!pendingDeleteLink}
        title="Excluir link do rodape"
        description={pendingDeleteLink ? `Deseja excluir o link "${pendingDeleteLink.label}"?` : ''}
        confirmLabel="Excluir"
        cancelLabel="Cancelar"
        isConfirming={isMutating}
        onCancel={() => setPendingDeleteLink(null)}
        onConfirm={() => void handleDeleteLink()}
      />
    </>
  );
}

