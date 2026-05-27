import { logActivity } from '../lib/logActivity';
import { supabase, supabaseConfigMessage } from '../lib/supabase';
import type {
  CmsServiceResult,
  FooterLink,
  FooterLinkInsert,
  FooterLinkUpdate,
  FooterSection,
  FooterSectionInsert,
  FooterSectionUpdate,
} from '../types/cms';

export interface FooterSectionWithLinks extends FooterSection {
  links: FooterLink[];
}

export interface ReorderFooterItemPayload {
  id: string;
  sort_order: number;
}

type FooterLogAction =
  | 'create_footer_section'
  | 'update_footer_section'
  | 'delete_footer_section'
  | 'create_footer_link'
  | 'update_footer_link'
  | 'delete_footer_link'
  | 'reorder_footer';

function missingConfigResult<T>(): CmsServiceResult<T> {
  return {
    data: null,
    error:
      supabaseConfigMessage ??
      'Supabase nao configurado. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.',
  };
}

function mapErrorMessage(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes('row-level security')) {
    return 'Sua conta nao possui permissao para gerenciar o rodape.';
  }

  return message;
}

function normalizeRequiredText(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim();
}

function normalizeNullableText(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeSortOrder(value: number | null | undefined): number | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (!Number.isFinite(value)) {
    return Number.NaN;
  }

  return Number(value);
}

async function logFooterAction(
  action: FooterLogAction,
  entity: 'footer_sections' | 'footer_links',
  metadata: Record<string, unknown>,
  entityId?: string | null,
): Promise<void> {
  await logActivity({
    action,
    entity,
    entity_id: entityId ?? null,
    metadata,
  });
}

function mapSectionsWithLinks(
  sections: FooterSection[],
  links: FooterLink[],
): FooterSectionWithLinks[] {
  const linksBySection = new Map<string, FooterLink[]>();

  for (const link of links) {
    const scopedLinks = linksBySection.get(link.footer_section_id) ?? [];
    scopedLinks.push(link);
    linksBySection.set(link.footer_section_id, scopedLinks);
  }

  return sections.map((section) => {
    const sectionLinks = linksBySection.get(section.id) ?? [];
    sectionLinks.sort((a, b) => {
      if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      return (a.created_at ?? '').localeCompare(b.created_at ?? '');
    });

    return {
      ...section,
      links: sectionLinks,
    };
  });
}

function sanitizeSectionInsertPayload(
  payload: FooterSectionInsert,
): FooterSectionInsert | { error: string } {
  const title = normalizeRequiredText(payload.title);
  const sortOrder = normalizeSortOrder(payload.sort_order);

  if (!title) {
    return { error: 'Titulo da coluna e obrigatorio.' };
  }

  if (Number.isNaN(sortOrder)) {
    return { error: 'sort_order da coluna deve ser numerico.' };
  }

  return {
    title,
    sort_order: sortOrder ?? 0,
    is_active: payload.is_active ?? true,
  };
}

function sanitizeSectionUpdatePayload(
  payload: FooterSectionUpdate,
): FooterSectionUpdate | { error: string } {
  const sanitized: FooterSectionUpdate = {};

  if (payload.title !== undefined) {
    const title = normalizeRequiredText(payload.title);
    if (!title) {
      return { error: 'Titulo da coluna e obrigatorio.' };
    }
    sanitized.title = title;
  }

  if (payload.sort_order !== undefined) {
    const sortOrder = normalizeSortOrder(payload.sort_order);
    if (Number.isNaN(sortOrder)) {
      return { error: 'sort_order da coluna deve ser numerico.' };
    }
    sanitized.sort_order = sortOrder;
  }

  if (payload.is_active !== undefined) {
    sanitized.is_active = payload.is_active;
  }

  return sanitized;
}

function sanitizeLinkInsertPayload(
  payload: FooterLinkInsert,
): FooterLinkInsert | { error: string } {
  const footerSectionId = normalizeRequiredText(payload.footer_section_id);
  const label = normalizeRequiredText(payload.label);
  const url = normalizeRequiredText(payload.url);
  const sortOrder = normalizeSortOrder(payload.sort_order);

  if (!footerSectionId) {
    return { error: 'footer_section_id e obrigatorio.' };
  }

  if (!label) {
    return { error: 'Label do link e obrigatorio.' };
  }

  if (!url) {
    return { error: 'URL do link e obrigatoria.' };
  }

  if (Number.isNaN(sortOrder)) {
    return { error: 'sort_order do link deve ser numerico.' };
  }

  return {
    footer_section_id: footerSectionId,
    label,
    url,
    sort_order: sortOrder ?? 0,
    is_active: payload.is_active ?? true,
    open_in_new_tab: payload.open_in_new_tab ?? false,
  };
}

function sanitizeLinkUpdatePayload(
  payload: FooterLinkUpdate,
): FooterLinkUpdate | { error: string } {
  const sanitized: FooterLinkUpdate = {};

  if (payload.footer_section_id !== undefined) {
    const sectionId = normalizeRequiredText(payload.footer_section_id);
    if (!sectionId) {
      return { error: 'footer_section_id e obrigatorio.' };
    }
    sanitized.footer_section_id = sectionId;
  }

  if (payload.label !== undefined) {
    const label = normalizeRequiredText(payload.label);
    if (!label) {
      return { error: 'Label do link e obrigatorio.' };
    }
    sanitized.label = label;
  }

  if (payload.url !== undefined) {
    const url = normalizeRequiredText(payload.url);
    if (!url) {
      return { error: 'URL do link e obrigatoria.' };
    }
    sanitized.url = url;
  }

  if (payload.sort_order !== undefined) {
    const sortOrder = normalizeSortOrder(payload.sort_order);
    if (Number.isNaN(sortOrder)) {
      return { error: 'sort_order do link deve ser numerico.' };
    }
    sanitized.sort_order = sortOrder;
  }

  if (payload.is_active !== undefined) {
    sanitized.is_active = payload.is_active;
  }

  if (payload.open_in_new_tab !== undefined) {
    sanitized.open_in_new_tab = payload.open_in_new_tab;
  }

  return sanitized;
}

async function loadSectionsAndLinks(
  options: { activeOnly: boolean },
): Promise<CmsServiceResult<FooterSectionWithLinks[]>> {
  if (!supabase) {
    return missingConfigResult<FooterSectionWithLinks[]>();
  }

  let sectionsQuery = supabase
    .from('footer_sections')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  let linksQuery = supabase
    .from('footer_links')
    .select('*')
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (options.activeOnly) {
    sectionsQuery = sectionsQuery.eq('is_active', true);
    linksQuery = linksQuery.eq('is_active', true);
  }

  const [{ data: sectionsData, error: sectionsError }, { data: linksData, error: linksError }] =
    await Promise.all([sectionsQuery, linksQuery]);

  if (sectionsError) {
    return { data: null, error: mapErrorMessage(sectionsError.message) };
  }

  if (linksError) {
    return { data: null, error: mapErrorMessage(linksError.message) };
  }

  const sections = sectionsData ?? [];
  const links = linksData ?? [];

  return {
    data: mapSectionsWithLinks(sections, links),
    error: null,
  };
}

export async function listFooterSections(): Promise<CmsServiceResult<FooterSectionWithLinks[]>> {
  return loadSectionsAndLinks({ activeOnly: false });
}

export async function listActiveFooterSectionsWithLinks(): Promise<CmsServiceResult<FooterSectionWithLinks[]>> {
  return loadSectionsAndLinks({ activeOnly: true });
}

export async function createFooterSection(
  payload: FooterSectionInsert,
): Promise<CmsServiceResult<FooterSection>> {
  if (!supabase) {
    return missingConfigResult<FooterSection>();
  }

  const sanitizedPayload = sanitizeSectionInsertPayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('footer_sections')
    .insert(sanitizedPayload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  await logFooterAction(
    'create_footer_section',
    'footer_sections',
    {
      title: data.title,
      sort_order: data.sort_order,
      is_active: data.is_active,
    },
    data.id,
  );

  return { data, error: null };
}

export async function updateFooterSection(
  id: string,
  payload: FooterSectionUpdate,
): Promise<CmsServiceResult<FooterSection>> {
  if (!supabase) {
    return missingConfigResult<FooterSection>();
  }

  const sectionId = normalizeRequiredText(id);
  if (!sectionId) {
    return { data: null, error: 'ID da coluna e obrigatorio.' };
  }

  const sanitizedPayload = sanitizeSectionUpdatePayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('footer_sections')
    .update(sanitizedPayload)
    .eq('id', sectionId)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  await logFooterAction(
    'update_footer_section',
    'footer_sections',
    {
      title: data.title,
      updated_fields: Object.keys(sanitizedPayload),
    },
    data.id,
  );

  return { data, error: null };
}

export async function deleteFooterSection(
  id: string,
): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  const sectionId = normalizeRequiredText(id);
  if (!sectionId) {
    return { data: null, error: 'ID da coluna e obrigatorio.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('footer_sections')
    .select('id,title')
    .eq('id', sectionId)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: mapErrorMessage(existingError.message) };
  }

  if (!existing) {
    return { data: null, error: 'Coluna de rodape nao encontrada.' };
  }

  const { error } = await supabase.from('footer_sections').delete().eq('id', sectionId);

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  await logFooterAction(
    'delete_footer_section',
    'footer_sections',
    {
      title: existing.title,
    },
    existing.id,
  );

  return { data: { id: sectionId }, error: null };
}

export async function reorderFooterSections(
  items: ReorderFooterItemPayload[],
): Promise<CmsServiceResult<FooterSectionWithLinks[]>> {
  if (!supabase) {
    return missingConfigResult<FooterSectionWithLinks[]>();
  }

  if (!items.length) {
    return listFooterSections();
  }

  const invalidItem = items.find((item) => !normalizeRequiredText(item.id) || !Number.isFinite(item.sort_order));
  if (invalidItem) {
    return { data: null, error: 'Lista de ordenacao de colunas invalida.' };
  }

  const ids = items.map((item) => normalizeRequiredText(item.id));
  const { data: scopedSections, error: scopedError } = await supabase
    .from('footer_sections')
    .select('id')
    .in('id', ids);

  if (scopedError) {
    return { data: null, error: mapErrorMessage(scopedError.message) };
  }

  if ((scopedSections?.length ?? 0) !== ids.length) {
    return { data: null, error: 'Uma ou mais colunas nao foram encontradas para ordenacao.' };
  }

  const updates = await Promise.all(
    items.map((item) =>
      supabase
        .from('footer_sections')
        .update({ sort_order: Number(item.sort_order) })
        .eq('id', normalizeRequiredText(item.id))
        .select('id')
        .single(),
    ),
  );

  const failed = updates.find((result) => result.error);
  if (failed?.error) {
    return { data: null, error: mapErrorMessage(failed.error.message) };
  }

  await logFooterAction('reorder_footer', 'footer_sections', {
    target: 'sections',
    items: items.map((item) => ({
      id: normalizeRequiredText(item.id),
      sort_order: Number(item.sort_order),
    })),
  });

  return listFooterSections();
}

export async function createFooterLink(payload: FooterLinkInsert): Promise<CmsServiceResult<FooterLink>> {
  if (!supabase) {
    return missingConfigResult<FooterLink>();
  }

  const sanitizedPayload = sanitizeLinkInsertPayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('footer_links')
    .insert(sanitizedPayload)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  await logFooterAction(
    'create_footer_link',
    'footer_links',
    {
      footer_section_id: data.footer_section_id,
      label: data.label,
      url: data.url,
    },
    data.id,
  );

  return { data, error: null };
}

export async function updateFooterLink(
  id: string,
  payload: FooterLinkUpdate,
): Promise<CmsServiceResult<FooterLink>> {
  if (!supabase) {
    return missingConfigResult<FooterLink>();
  }

  const linkId = normalizeRequiredText(id);
  if (!linkId) {
    return { data: null, error: 'ID do link e obrigatorio.' };
  }

  const sanitizedPayload = sanitizeLinkUpdatePayload(payload);
  if ('error' in sanitizedPayload) {
    return { data: null, error: sanitizedPayload.error };
  }

  const { data, error } = await supabase
    .from('footer_links')
    .update(sanitizedPayload)
    .eq('id', linkId)
    .select('*')
    .single();

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  await logFooterAction(
    'update_footer_link',
    'footer_links',
    {
      footer_section_id: data.footer_section_id,
      label: data.label,
      updated_fields: Object.keys(sanitizedPayload),
    },
    data.id,
  );

  return { data, error: null };
}

export async function deleteFooterLink(id: string): Promise<CmsServiceResult<{ id: string }>> {
  if (!supabase) {
    return missingConfigResult<{ id: string }>();
  }

  const linkId = normalizeRequiredText(id);
  if (!linkId) {
    return { data: null, error: 'ID do link e obrigatorio.' };
  }

  const { data: existing, error: existingError } = await supabase
    .from('footer_links')
    .select('id,footer_section_id,label,url')
    .eq('id', linkId)
    .maybeSingle();

  if (existingError) {
    return { data: null, error: mapErrorMessage(existingError.message) };
  }

  if (!existing) {
    return { data: null, error: 'Link de rodape nao encontrado.' };
  }

  const { error } = await supabase.from('footer_links').delete().eq('id', linkId);

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  await logFooterAction(
    'delete_footer_link',
    'footer_links',
    {
      footer_section_id: existing.footer_section_id,
      label: existing.label,
      url: existing.url,
    },
    existing.id,
  );

  return { data: { id: linkId }, error: null };
}

export async function reorderFooterLinks(
  sectionId: string,
  items: ReorderFooterItemPayload[],
): Promise<CmsServiceResult<FooterLink[]>> {
  if (!supabase) {
    return missingConfigResult<FooterLink[]>();
  }

  const normalizedSectionId = normalizeRequiredText(sectionId);
  if (!normalizedSectionId) {
    return { data: null, error: 'ID da coluna e obrigatorio para ordenar links.' };
  }

  if (!items.length) {
    const { data, error } = await supabase
      .from('footer_links')
      .select('*')
      .eq('footer_section_id', normalizedSectionId)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      return { data: null, error: mapErrorMessage(error.message) };
    }

    return { data: data ?? [], error: null };
  }

  const invalidItem = items.find((item) => !normalizeRequiredText(item.id) || !Number.isFinite(item.sort_order));
  if (invalidItem) {
    return { data: null, error: 'Lista de ordenacao de links invalida.' };
  }

  const ids = items.map((item) => normalizeRequiredText(item.id));
  const { data: scopedLinks, error: scopedError } = await supabase
    .from('footer_links')
    .select('id')
    .eq('footer_section_id', normalizedSectionId)
    .in('id', ids);

  if (scopedError) {
    return { data: null, error: mapErrorMessage(scopedError.message) };
  }

  if ((scopedLinks?.length ?? 0) !== ids.length) {
    return { data: null, error: 'Existem links fora da coluna informada.' };
  }

  const updates = await Promise.all(
    items.map((item) =>
      supabase
        .from('footer_links')
        .update({ sort_order: Number(item.sort_order) })
        .eq('id', normalizeRequiredText(item.id))
        .select('id')
        .single(),
    ),
  );

  const failed = updates.find((result) => result.error);
  if (failed?.error) {
    return { data: null, error: mapErrorMessage(failed.error.message) };
  }

  await logFooterAction('reorder_footer', 'footer_links', {
    target: 'links',
    section_id: normalizedSectionId,
    items: items.map((item) => ({
      id: normalizeRequiredText(item.id),
      sort_order: Number(item.sort_order),
    })),
  });

  const { data, error } = await supabase
    .from('footer_links')
    .select('*')
    .eq('footer_section_id', normalizedSectionId)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) {
    return { data: null, error: mapErrorMessage(error.message) };
  }

  return { data: data ?? [], error: null };
}

export function normalizeFooterUrl(value: string | null | undefined): string {
  return normalizeNullableText(value) ?? '';
}
