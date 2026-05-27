import type { HomeSection } from '../types/cms';

export const HOME_SECTION_KEYS = [
  'hero',
  'categories_highlight',
  'featured_stores',
  'launches_highlight',
  'how_to_buy',
  'planning_visit',
  'leasing_cta',
  'newsletter_cta',
] as const;

export type HomeSectionKey = (typeof HOME_SECTION_KEYS)[number];

export interface ResolvedHomeSection {
  section_key: HomeSectionKey;
  title: string;
  subtitle: string;
  content: string;
  image_url: string;
  button_label: string;
  button_url: string;
  sort_order: number;
  is_active: boolean;
}

export type ResolvedHomeSectionMap = Record<HomeSectionKey, ResolvedHomeSection>;

const DEFAULT_HERO_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000';
const DEFAULT_PLANNING_IMAGE =
  'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=1200';
const DEFAULT_LEASING_IMAGE =
  'https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&q=80&w=2000';

export const HOME_SECTION_LABELS: Record<HomeSectionKey, string> = {
  hero: 'Hero',
  categories_highlight: 'Categorias principais',
  featured_stores: 'Lojas em destaque',
  launches_highlight: 'Novidades das marcas',
  how_to_buy: 'Como comprar',
  planning_visit: 'Planeje sua visita',
  leasing_cta: 'Abra sua loja',
  newsletter_cta: 'Newsletter',
};

const FALLBACK_HOME_SECTIONS_MAP: ResolvedHomeSectionMap = {
  hero: {
    section_key: 'hero',
    title: 'Encontre lojas e marcas de moda atacadista no Bras',
    subtitle: 'Shopping de moda atacadista no Bras',
    content:
      'Explore categorias, veja lancamentos, salve lojas no roteiro e planeje sua visita ao Mega Polo Moda.',
    image_url: DEFAULT_HERO_IMAGE,
    button_label: 'Encontrar lojas',
    button_url: '/lojas',
    sort_order: 1,
    is_active: true,
  },
  categories_highlight: {
    section_key: 'categories_highlight',
    title: 'Explore por Categoria',
    subtitle: 'Segmentos do Shopping',
    content: 'Navegue pelos principais segmentos de moda atacadista.',
    image_url: '',
    button_label: 'Ver todas as categorias',
    button_url: '/lojas',
    sort_order: 2,
    is_active: true,
  },
  featured_stores: {
    section_key: 'featured_stores',
    title: 'Lojas em Destaque',
    subtitle: 'Selecao de lojas e marcas',
    content: 'Conheca vitrines e oportunidades comerciais do shopping.',
    image_url: '',
    button_label: 'Ver lojas',
    button_url: '/lojas',
    sort_order: 3,
    is_active: true,
  },
  launches_highlight: {
    section_key: 'launches_highlight',
    title: 'Novidades das marcas',
    subtitle: 'Acompanhe os lancamentos',
    content: 'Acompanhe lancamentos, colecoes e destaques das lojas do Mega Polo Moda.',
    image_url: '',
    button_label: 'Ver todos os lancamentos',
    button_url: '/lancamentos',
    sort_order: 4,
    is_active: true,
  },
  how_to_buy: {
    section_key: 'how_to_buy',
    title: 'Como comprar no Mega Polo',
    subtitle: 'Facilidade',
    content:
      'Busque lojas por categoria, veja lancamentos, adicione lojas ao roteiro e visite o shopping.',
    image_url: '',
    button_label: 'Planejar visita',
    button_url: '/planeje-sua-visita',
    sort_order: 5,
    is_active: true,
  },
  planning_visit: {
    section_key: 'planning_visit',
    title: 'Planeje sua visita',
    subtitle: 'Conveniencia',
    content:
      'Organize sua ida ao Mega Polo Moda com informacoes praticas para comprar com tranquilidade no Bras.',
    image_url: DEFAULT_PLANNING_IMAGE,
    button_label: 'Planejar visita',
    button_url: '/planeje-sua-visita',
    sort_order: 6,
    is_active: true,
  },
  leasing_cta: {
    section_key: 'leasing_cta',
    title: 'Sua marca na plataforma comercial do Mega Polo Moda',
    subtitle: 'Mais visibilidade para sua marca',
    content:
      'Faca parte da estrutura comercial do shopping com espacos estrategicos para lojas, exposicoes e quiosques.',
    image_url: DEFAULT_LEASING_IMAGE,
    button_label: 'Quero abrir minha loja',
    button_url: '/abra-sua-loja',
    sort_order: 7,
    is_active: true,
  },
  newsletter_cta: {
    section_key: 'newsletter_cta',
    title: 'Fique por dentro das novidades',
    subtitle: 'Receba conteudo comercial semanalmente',
    content:
      'Receba semanalmente nossa selecao de lojas e lancamentos diretamente no seu e-mail ou WhatsApp.',
    image_url: '',
    button_label: 'Cadastrar e-mail',
    button_url: '/#newsletter',
    sort_order: 8,
    is_active: true,
  },
};

function normalizeText(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

function normalizeUrl(value: string | null | undefined, fallback: string): string {
  if (typeof value !== 'string') {
    return fallback;
  }

  const trimmed = value.trim();
  return trimmed || fallback;
}

export function isHomeSectionKey(value: string): value is HomeSectionKey {
  return HOME_SECTION_KEYS.includes(value as HomeSectionKey);
}

export function getFallbackHomeSections(): ResolvedHomeSection[] {
  return HOME_SECTION_KEYS.map((sectionKey) => ({ ...FALLBACK_HOME_SECTIONS_MAP[sectionKey] }));
}

export function getFallbackHomeSectionsMap(): ResolvedHomeSectionMap {
  return HOME_SECTION_KEYS.reduce<ResolvedHomeSectionMap>((acc, sectionKey) => {
    acc[sectionKey] = { ...FALLBACK_HOME_SECTIONS_MAP[sectionKey] };
    return acc;
  }, {} as ResolvedHomeSectionMap);
}

interface ResolveHomeSectionsOptions {
  disableMissingSections?: boolean;
}

export function resolveHomeSections(
  remoteSections: HomeSection[] | null | undefined,
  options: ResolveHomeSectionsOptions = {},
): ResolvedHomeSection[] {
  const fallbackMap = getFallbackHomeSectionsMap();
  const remoteByKey = new Map<HomeSectionKey, HomeSection>();

  for (const section of remoteSections ?? []) {
    if (isHomeSectionKey(section.section_key)) {
      remoteByKey.set(section.section_key, section);
    }
  }

  const shouldDisableMissing = options.disableMissingSections && (remoteSections?.length ?? 0) > 0;

  const merged = HOME_SECTION_KEYS.map((sectionKey, index) => {
    const fallback = fallbackMap[sectionKey];
    const remote = remoteByKey.get(sectionKey);

    if (!remote) {
      return {
        ...fallback,
        is_active: shouldDisableMissing ? false : fallback.is_active,
      };
    }

    return {
      ...fallback,
      title: normalizeText(remote.title, fallback.title),
      subtitle: normalizeText(remote.subtitle, fallback.subtitle),
      content: normalizeText(remote.content, fallback.content),
      image_url: normalizeUrl(remote.image_url, fallback.image_url),
      button_label: normalizeText(remote.button_label, fallback.button_label),
      button_url: normalizeUrl(remote.button_url, fallback.button_url),
      sort_order:
        typeof remote.sort_order === 'number' && Number.isFinite(remote.sort_order)
          ? remote.sort_order
          : fallback.sort_order ?? index + 1,
      is_active: remote.is_active ?? fallback.is_active,
    };
  });

  return merged.sort((a, b) => a.sort_order - b.sort_order);
}

export function resolveHomeSectionsMap(
  remoteSections: HomeSection[] | null | undefined,
  options: ResolveHomeSectionsOptions = {},
): ResolvedHomeSectionMap {
  const resolved = resolveHomeSections(remoteSections, options);

  return resolved.reduce<ResolvedHomeSectionMap>((acc, item) => {
    acc[item.section_key] = item;
    return acc;
  }, {} as ResolvedHomeSectionMap);
}
