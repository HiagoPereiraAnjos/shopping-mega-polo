import React from 'react';
import {
  ArrowRight,
  Building2,
  Car,
  CheckCircle2,
  Clock,
  Hotel,
  MapPin,
  MessageCircle,
  Navigation,
  PlusSquare,
  Search,
  ShoppingBag,
  Store,
  UtensilsCrossed,
  type LucideIcon,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { SEO } from '../components/ui/SEO';
import { ImageWithFallback } from '../components/ui/ImageWithFallback';
import { shouldUseMockFallback } from '../config/environment';
import { useSiteSettings } from '../hooks/useSiteSettings';
import { isSupabaseConfigured } from '../lib/supabase';
import { listBlockItems, listContentBlocks } from '../services/contentBlocks.service';
import { getPageBySlug } from '../services/pages.service';
import type { ContentBlock, ContentBlockItem, Page } from '../types/cms';
import type { Json } from '../types/database';
import { createWhatsAppLink } from '../utils/whatsapp';
import {
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
  buildShoppingCenterStructuredData,
} from '../utils/seo';

const PLANNING_PAGE_KEY = 'planning';
const PLANNING_BLOCK_KEYS = [
  'hero',
  'info_cards',
  'visit_steps',
  'map_block',
  'hotel_block',
  'business_center_block',
  'final_cta',
] as const;
type PlanningBlockKey = (typeof PLANNING_BLOCK_KEYS)[number];

const DEFAULT_PLANNING_HERO_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=2000';
const DEFAULT_PLANNING_MAP_IMAGE =
  'https://images.unsplash.com/photo-1526778548025-fa2f459cd5c1?auto=format&fit=crop&q=80&w=2000';

interface PlanningItem {
  id: string;
  title: string;
  subtitle: string;
  content: string;
  image_url: string;
  icon: string;
  button_label: string;
  button_url: string;
  metadata: Record<string, Json>;
  sort_order: number;
  is_active: boolean;
}

interface PlanningBlock {
  id: string;
  key: PlanningBlockKey;
  block_type: string;
  title: string;
  subtitle: string;
  content: string;
  image_url: string;
  button_label: string;
  button_url: string;
  secondary_button_label: string;
  secondary_button_url: string;
  settings: Record<string, Json>;
  sort_order: number;
  is_active: boolean;
  items: PlanningItem[];
}

type PlanningBlocksState = Record<PlanningBlockKey, PlanningBlock | null>;

interface InfoCardProps {
  icon: LucideIcon;
  title: string;
  content: string;
  delay?: number;
}

const ICON_MAP: Record<string, LucideIcon> = {
  'map-pin': MapPin,
  map: MapPin,
  pin: MapPin,
  clock: Clock,
  hour: Clock,
  car: Car,
  parking: Car,
  'message-circle': MessageCircle,
  message: MessageCircle,
  whatsapp: MessageCircle,
  search: Search,
  'plus-square': PlusSquare,
  plus: PlusSquare,
  'shopping-bag': ShoppingBag,
  bag: ShoppingBag,
  navigation: Navigation,
  hotel: Hotel,
  building: Building2,
  'building-2': Building2,
  store: Store,
  utensils: UtensilsCrossed,
  'utensils-crossed': UtensilsCrossed,
  check: CheckCircle2,
};

const FALLBACK_PLANNING_BLOCKS: PlanningBlocksState = {
  hero: {
    id: 'fallback-planning-hero',
    key: 'hero',
    block_type: 'hero',
    title: 'Planeje sua visita ao Mega Polo Moda',
    subtitle: 'Experiencia de compra',
    content:
      'Organize sua visita comercial, encontre lojas e otimize seu tempo no shopping de moda atacadista no Bras.',
    image_url: DEFAULT_PLANNING_HERO_IMAGE,
    button_label: 'Montar roteiro de compras',
    button_url: '/lojas',
    secondary_button_label: 'Ver meu roteiro',
    secondary_button_url: '/meu-roteiro',
    settings: {},
    sort_order: 1,
    is_active: true,
    items: [],
  },
  info_cards: {
    id: 'fallback-planning-info-cards',
    key: 'info_cards',
    block_type: 'cards',
    title: 'Informacoes essenciais',
    subtitle: '',
    content: '',
    image_url: '',
    button_label: '',
    button_url: '',
    secondary_button_label: '',
    secondary_button_url: '',
    settings: {},
    sort_order: 2,
    is_active: true,
    items: [
      {
        id: 'fallback-info-address',
        title: 'Endereco',
        subtitle: '',
        content: '{{address}}',
        image_url: '',
        icon: 'map-pin',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 1,
        is_active: true,
      },
      {
        id: 'fallback-info-hours',
        title: 'Horarios',
        subtitle: '',
        content: '{{opening_hours}}',
        image_url: '',
        icon: 'clock',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 2,
        is_active: true,
      },
      {
        id: 'fallback-info-parking',
        title: 'Estacionamento',
        subtitle: '',
        content: 'Vagas para carros e onibus de compradores.',
        image_url: '',
        icon: 'car',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 3,
        is_active: true,
      },
      {
        id: 'fallback-info-support',
        title: 'Atendimento',
        subtitle: '',
        content: 'Suporte via WhatsApp para informacoes rapidas.',
        image_url: '',
        icon: 'message-circle',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 4,
        is_active: true,
      },
    ],
  },
  visit_steps: {
    id: 'fallback-planning-visit-steps',
    key: 'visit_steps',
    block_type: 'steps',
    title: 'Como organizar sua visita',
    subtitle: 'Praticidade',
    content: '',
    image_url: '',
    button_label: 'Comecar planejamento',
    button_url: '/lojas',
    secondary_button_label: '',
    secondary_button_url: '',
    settings: {},
    sort_order: 3,
    is_active: true,
    items: [
      {
        id: 'fallback-step-1',
        title: 'Busque lojas por categoria',
        subtitle: '',
        content: 'Encontre as melhores marcas de atacado filtrando por segmento.',
        image_url: '',
        icon: 'search',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 1,
        is_active: true,
      },
      {
        id: 'fallback-step-2',
        title: 'Adicione lojas ao roteiro',
        subtitle: '',
        content: 'Salve suas preferidas para otimizar seu tempo de caminhada.',
        image_url: '',
        icon: 'plus-square',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 2,
        is_active: true,
      },
      {
        id: 'fallback-step-3',
        title: 'Fale com as marcas',
        subtitle: '',
        content: 'Tire duvidas via WhatsApp antes mesmo de chegar ao shopping.',
        image_url: '',
        icon: 'message-circle',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 3,
        is_active: true,
      },
      {
        id: 'fallback-step-4',
        title: 'Visite com praticidade',
        subtitle: '',
        content: 'Aproveite a estrutura completa do Bras com tudo organizado.',
        image_url: '',
        icon: 'shopping-bag',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 4,
        is_active: true,
      },
    ],
  },
  map_block: {
    id: 'fallback-planning-map-block',
    key: 'map_block',
    block_type: 'map',
    title: 'Como chegar',
    subtitle: '',
    content: 'Abra a rota no Google Maps e planeje sua chegada ao Mega Polo Moda.',
    image_url: DEFAULT_PLANNING_MAP_IMAGE,
    button_label: 'Abrir no Google Maps',
    button_url: '',
    secondary_button_label: '',
    secondary_button_url: '',
    settings: {},
    sort_order: 4,
    is_active: true,
    items: [],
  },
  hotel_block: {
    id: 'fallback-planning-hotel-block',
    key: 'hotel_block',
    block_type: 'institutional',
    title: 'Hotel Mega Polo',
    subtitle: 'Hospedagem',
    content:
      'Mais praticidade para compradores que vem de outras cidades e querem aproveitar melhor sua visita ao Bras.',
    image_url: '',
    button_label: 'Saiba mais sobre o hotel',
    button_url: '',
    secondary_button_label: '',
    secondary_button_url: '',
    settings: {},
    sort_order: 5,
    is_active: true,
    items: [
      {
        id: 'fallback-hotel-benefit-1',
        title: 'Hospedagem integrada ao complexo',
        subtitle: '',
        content: '',
        image_url: '',
        icon: 'check',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 1,
        is_active: true,
      },
      {
        id: 'fallback-hotel-benefit-2',
        title: 'Praticidade para compradores de outras regioes',
        subtitle: '',
        content: '',
        image_url: '',
        icon: 'check',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 2,
        is_active: true,
      },
    ],
  },
  business_center_block: {
    id: 'fallback-planning-business-center-block',
    key: 'business_center_block',
    block_type: 'institutional',
    title: 'Centro Empresarial',
    subtitle: 'Centro empresarial',
    content:
      'Estrutura para empresas, reunioes e operacoes comerciais conectadas a plataforma comercial do Bras.',
    image_url: '',
    button_label: 'Conhecer Centro Empresarial',
    button_url: '',
    secondary_button_label: '',
    secondary_button_url: '',
    settings: {},
    sort_order: 6,
    is_active: true,
    items: [
      {
        id: 'fallback-business-benefit-1',
        title: 'Salas para reunioes e operacoes comerciais',
        subtitle: '',
        content: '',
        image_url: '',
        icon: 'check',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 1,
        is_active: true,
      },
      {
        id: 'fallback-business-benefit-2',
        title: 'Infraestrutura corporativa no Bras',
        subtitle: '',
        content: '',
        image_url: '',
        icon: 'check',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 2,
        is_active: true,
      },
    ],
  },
  final_cta: {
    id: 'fallback-planning-final-cta',
    key: 'final_cta',
    block_type: 'cta',
    title: 'Precisa de ajuda para planejar sua visita?',
    subtitle: 'Suporte',
    content: 'Nosso time de atendimento esta disponivel para tirar suas duvidas.',
    image_url: '',
    button_label: 'Falar no canal de suporte',
    button_url: '',
    secondary_button_label: '',
    secondary_button_url: '',
    settings: {},
    sort_order: 7,
    is_active: true,
    items: [
      {
        id: 'fallback-final-item-1',
        title: 'Praca de alimentacao',
        subtitle: '',
        content: 'Diversas opcoes gastronomicas para sua visita.',
        image_url: '',
        icon: 'utensils-crossed',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 1,
        is_active: true,
      },
      {
        id: 'fallback-final-item-2',
        title: 'Lojas e marcas',
        subtitle: '',
        content: 'Lojas de diferentes segmentos com novidades para atacado.',
        image_url: '',
        icon: 'store',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 2,
        is_active: true,
      },
      {
        id: 'fallback-final-item-3',
        title: 'Localizacao no Bras',
        subtitle: '',
        content: 'Acesso facilitado no coracao do Bras.',
        image_url: '',
        icon: 'map-pin',
        button_label: '',
        button_url: '',
        metadata: {},
        sort_order: 3,
        is_active: true,
      },
    ],
  },
};

const InfoCard: React.FC<InfoCardProps> = ({ icon: Icon, title, content, delay = 0 }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ delay }}
    className="bg-white p-8 rounded-[32px] border border-brand-dark/5 shadow-soft hover:shadow-xl transition-all group"
  >
    <div className="w-12 h-12 bg-brand-paper rounded-2xl flex items-center justify-center mb-6 group-hover:bg-brand-red/5 transition-colors">
      <Icon className="w-6 h-6 text-brand-red" />
    </div>
    <div className="space-y-2">
      <h3 className="text-[10px] tracking-premium font-bold text-brand-dark/30 uppercase">{title}</h3>
      <p className="text-sm font-sans font-bold text-brand-dark leading-relaxed">{content}</p>
    </div>
  </motion.div>
);

function buildGoogleMapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

function normalizeText(value: string | null | undefined): string {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim();
}

function normalizeIconKey(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value.trim().toLowerCase().replace(/\s+/g, '-').replace(/_/g, '-');
}

function normalizeMatchKey(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function isExternalUrl(url: string): boolean {
  return /^(https?:\/\/|mailto:|tel:|wa\.me\/|whatsapp:\/\/)/i.test(url);
}

function toSettingsObject(value: Json | null | undefined): Record<string, Json> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, Json>;
}

function resolvePlanningKey(blockKey: string): PlanningBlockKey | null {
  const normalized = normalizeIconKey(blockKey);
  switch (normalized) {
    case 'hero':
      return 'hero';
    case 'info-cards':
    case 'info_cards':
      return 'info_cards';
    case 'visit-steps':
    case 'visit_steps':
      return 'visit_steps';
    case 'map-block':
    case 'map_block':
      return 'map_block';
    case 'hotel-block':
    case 'hotel_block':
      return 'hotel_block';
    case 'business-center-block':
    case 'business_center_block':
      return 'business_center_block';
    case 'final-cta':
    case 'final_cta':
      return 'final_cta';
    case 'planning-visit-info':
    case 'planning_visit_info':
      return 'hero';
    default:
      return null;
  }
}

function createEmptyPlanningBlocksState(): PlanningBlocksState {
  return {
    hero: null,
    info_cards: null,
    visit_steps: null,
    map_block: null,
    hotel_block: null,
    business_center_block: null,
    final_cta: null,
  };
}

function cloneFallbackPlanningState(): PlanningBlocksState {
  const next = createEmptyPlanningBlocksState();
  for (const key of PLANNING_BLOCK_KEYS) {
    const block = FALLBACK_PLANNING_BLOCKS[key];
    next[key] = {
      ...block,
      settings: { ...block.settings },
      items: block.items.map((item) => ({
        ...item,
        metadata: { ...item.metadata },
      })),
    };
  }
  return next;
}

function mapContentBlockItem(item: ContentBlockItem): PlanningItem {
  return {
    id: item.id,
    title: normalizeText(item.title),
    subtitle: normalizeText(item.subtitle),
    content: normalizeText(item.content),
    image_url: normalizeText(item.image_url),
    icon: normalizeText(item.icon),
    button_label: normalizeText(item.button_label),
    button_url: normalizeText(item.button_url),
    metadata: toSettingsObject(item.metadata),
    sort_order: item.sort_order ?? 0,
    is_active: item.is_active,
  };
}

function mapContentBlock(block: ContentBlock, items: ContentBlockItem[]): PlanningBlock | null {
  const key = resolvePlanningKey(block.block_key);
  if (!key) {
    return null;
  }

  const activeItems = [...items]
    .filter((item) => item.is_active)
    .sort((a, b) => {
      if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
        return (a.sort_order ?? 0) - (b.sort_order ?? 0);
      }
      return (a.created_at ?? '').localeCompare(b.created_at ?? '');
    })
    .map(mapContentBlockItem);

  return {
    id: block.id,
    key,
    block_type: normalizeText(block.block_type),
    title: normalizeText(block.title),
    subtitle: normalizeText(block.subtitle),
    content: normalizeText(block.content),
    image_url: normalizeText(block.image_url),
    button_label: normalizeText(block.button_label),
    button_url: normalizeText(block.button_url),
    secondary_button_label: normalizeText(block.secondary_button_label),
    secondary_button_url: normalizeText(block.secondary_button_url),
    settings: toSettingsObject(block.settings),
    sort_order: block.sort_order ?? 0,
    is_active: block.is_active,
    items: activeItems,
  };
}

function mergePlanningStates(
  remoteState: PlanningBlocksState,
  fallbackState: PlanningBlocksState,
): PlanningBlocksState {
  const merged = createEmptyPlanningBlocksState();
  for (const key of PLANNING_BLOCK_KEYS) {
    merged[key] = remoteState[key] ?? fallbackState[key];
  }
  return merged;
}

function resolveIcon(iconKey: string, fallback: LucideIcon): LucideIcon {
  return ICON_MAP[normalizeIconKey(iconKey)] ?? fallback;
}

function applyPlanningTokens(value: string, replacements: Record<string, string>): string {
  if (!value) {
    return '';
  }

  let result = value;
  for (const [key, replacement] of Object.entries(replacements)) {
    const pattern = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi');
    result = result.replace(pattern, replacement);
  }

  return result;
}

function getSettingText(block: PlanningBlock | null, key: string): string {
  if (!block) {
    return '';
  }
  const rawValue = block.settings[key];
  return typeof rawValue === 'string' ? rawValue.trim() : '';
}

function resolveBlockActionUrl(
  block: PlanningBlock | null,
  supportPhone: string,
  fallbackMessage: string,
): string {
  if (!block) {
    return createWhatsAppLink(supportPhone, fallbackMessage);
  }

  const explicitUrl = normalizeText(block.button_url);
  if (explicitUrl && explicitUrl !== '#') {
    return explicitUrl;
  }

  const message = getSettingText(block, 'whatsapp_message') || fallbackMessage;
  return createWhatsAppLink(supportPhone, message);
}

function ActionLink({
  label,
  url,
  className,
  icon,
}: {
  label: string;
  url: string;
  className: string;
  icon?: React.ReactNode;
}) {
  if (isExternalUrl(url)) {
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className={className}>
        {label}
        {icon}
      </a>
    );
  }

  return (
    <Link to={url} className={className}>
      {label}
      {icon}
    </Link>
  );
}

export default function Planning() {
  const { hash } = useLocation();
  const { settings } = useSiteSettings();
  const canUseFallback = shouldUseMockFallback(true);

  const [cmsPage, setCmsPage] = React.useState<Page | null>(null);
  const [planningBlocks, setPlanningBlocks] = React.useState<PlanningBlocksState>(() =>
    canUseFallback ? cloneFallbackPlanningState() : createEmptyPlanningBlocksState(),
  );
  const [isBlocksLoading, setIsBlocksLoading] = React.useState(true);
  const [blocksError, setBlocksError] = React.useState<string | null>(null);

  const institutionalAddress =
    normalizeText(settings.address) || 'Rua Barao de Ladario, 670 - Bras, Sao Paulo - SP';
  const institutionalHours =
    normalizeText(settings.opening_hours) || 'Segunda a Quinta: 7h as 17h | Sexta: 7h as 16h';
  const supportPhone = normalizeText(settings.whatsapp);

  React.useEffect(() => {
    let mounted = true;

    const loadPage = async () => {
      if (!isSupabaseConfigured) {
        if (mounted) {
          setCmsPage(null);
        }
        return;
      }

      const result = await getPageBySlug('planeje-sua-visita', false);
      if (!mounted) {
        return;
      }

      if (result.error) {
        if (import.meta.env.DEV) {
          console.warn('Falha ao carregar pagina CMS planeje-sua-visita:', result.error);
        }
        setCmsPage(null);
        return;
      }

      setCmsPage(result.data ?? null);
    };

    void loadPage();

    return () => {
      mounted = false;
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;

    const loadPlanningBlocks = async () => {
      if (!isSupabaseConfigured) {
        if (!mounted) {
          return;
        }

        if (canUseFallback) {
          setPlanningBlocks(cloneFallbackPlanningState());
          setBlocksError(null);
        } else {
          setPlanningBlocks(createEmptyPlanningBlocksState());
          setBlocksError('Nao foi possivel carregar os blocos da pagina Planeje sua visita.');
        }
        setIsBlocksLoading(false);
        return;
      }

      setIsBlocksLoading(true);
      const blocksResult = await listContentBlocks(PLANNING_PAGE_KEY);

      if (!mounted) {
        return;
      }

      if (blocksResult.error) {
        if (import.meta.env.DEV) {
          console.warn('Falha ao carregar planning content_blocks:', blocksResult.error);
        }

        if (canUseFallback) {
          setPlanningBlocks(cloneFallbackPlanningState());
          setBlocksError(null);
        } else {
          setPlanningBlocks(createEmptyPlanningBlocksState());
          setBlocksError('Nao foi possivel carregar os dados da visita. Tente novamente em instantes.');
        }
        setIsBlocksLoading(false);
        return;
      }

      const rows = (blocksResult.data ?? []).filter((row) => resolvePlanningKey(row.block_key));
      if (!rows.length) {
        if (canUseFallback) {
          setPlanningBlocks(cloneFallbackPlanningState());
          setBlocksError(null);
        } else {
          setPlanningBlocks(createEmptyPlanningBlocksState());
          setBlocksError(null);
        }
        setIsBlocksLoading(false);
        return;
      }

      const itemsResults = await Promise.all(
        rows.map(async (block) => ({
          blockId: block.id,
          result: await listBlockItems(block.id),
        })),
      );

      if (!mounted) {
        return;
      }

      const failedItems = itemsResults.find((entry) => entry.result.error);
      if (failedItems?.result.error) {
        if (import.meta.env.DEV) {
          console.warn('Falha ao carregar content_block_items de planning:', failedItems.result.error);
        }

        if (canUseFallback) {
          setPlanningBlocks(cloneFallbackPlanningState());
          setBlocksError(null);
        } else {
          setPlanningBlocks(createEmptyPlanningBlocksState());
          setBlocksError('Nao foi possivel carregar os itens da pagina Planeje sua visita.');
        }
        setIsBlocksLoading(false);
        return;
      }

      const itemsByBlockId = new Map<string, ContentBlockItem[]>();
      for (const entry of itemsResults) {
        itemsByBlockId.set(entry.blockId, entry.result.data ?? []);
      }

      const sortedRows = [...rows].sort((a, b) => {
        if ((a.sort_order ?? 0) !== (b.sort_order ?? 0)) {
          return (a.sort_order ?? 0) - (b.sort_order ?? 0);
        }
        return (a.created_at ?? '').localeCompare(b.created_at ?? '');
      });

      const remoteState = createEmptyPlanningBlocksState();
      for (const row of sortedRows) {
        const mapped = mapContentBlock(row, itemsByBlockId.get(row.id) ?? []);
        if (!mapped) {
          continue;
        }

        const current = remoteState[mapped.key];
        if (!current || mapped.sort_order <= current.sort_order) {
          remoteState[mapped.key] = mapped;
        }
      }

      const hasAnyRemoteBlock = PLANNING_BLOCK_KEYS.some((key) => Boolean(remoteState[key]));
      const resolvedState =
        canUseFallback && hasAnyRemoteBlock
          ? mergePlanningStates(remoteState, cloneFallbackPlanningState())
          : canUseFallback && !hasAnyRemoteBlock
            ? cloneFallbackPlanningState()
            : remoteState;

      setPlanningBlocks(resolvedState);
      setBlocksError(hasAnyRemoteBlock ? null : canUseFallback ? null : 'Nenhum bloco publicado no momento.');
      setIsBlocksLoading(false);
    };

    void loadPlanningBlocks();

    return () => {
      mounted = false;
    };
  }, [canUseFallback]);

  React.useEffect(() => {
    if (hash) {
      const id = hash.replace('#', '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    }
  }, [hash]);

  const heroBlock = planningBlocks.hero;
  const infoCardsBlock = planningBlocks.info_cards;
  const visitStepsBlock = planningBlocks.visit_steps;
  const mapBlock = planningBlocks.map_block;
  const hotelBlock = planningBlocks.hotel_block;
  const businessCenterBlock = planningBlocks.business_center_block;
  const finalCtaBlock = planningBlocks.final_cta;

  const tokenValues = React.useMemo(
    () => ({
      address: institutionalAddress,
      opening_hours: institutionalHours,
      whatsapp: supportPhone,
    }),
    [institutionalAddress, institutionalHours, supportPhone],
  );

  const infoCards = React.useMemo(() => {
    if (!infoCardsBlock) {
      return [];
    }

    return infoCardsBlock.items
      .filter((item) => item.is_active)
      .map((item, index) => {
        const title = item.title || `Informacao ${index + 1}`;
        const contentWithTokens = applyPlanningTokens(item.content, tokenValues).trim();
        const titleMatch = normalizeMatchKey(title);

        let content = contentWithTokens;
        if (!content) {
          if (titleMatch.includes('endere')) {
            content = institutionalAddress;
          } else if (titleMatch.includes('horar')) {
            content = institutionalHours;
          }
        }

        if (!content) {
          return null;
        }

        return {
          id: item.id,
          title,
          content,
          icon: resolveIcon(item.icon, MapPin),
          delay: (index + 1) * 0.1,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [infoCardsBlock, institutionalAddress, institutionalHours, tokenValues]);

  const visitSteps = React.useMemo(() => {
    if (!visitStepsBlock) {
      return [];
    }

    return visitStepsBlock.items
      .filter((item) => item.is_active)
      .map((item, index) => ({
        id: item.id,
        title: item.title || `Passo ${index + 1}`,
        description: applyPlanningTokens(item.content, tokenValues),
        icon: resolveIcon(item.icon, [Search, PlusSquare, MessageCircle, ShoppingBag][index] ?? Search),
      }));
  }, [visitStepsBlock, tokenValues]);

  const hotelBenefits = React.useMemo(
    () =>
      (hotelBlock?.items ?? [])
        .filter((item) => item.is_active)
        .map((item) => item.title || item.content)
        .filter(Boolean),
    [hotelBlock],
  );

  const businessCenterBenefits = React.useMemo(
    () =>
      (businessCenterBlock?.items ?? [])
        .filter((item) => item.is_active)
        .map((item) => item.title || item.content)
        .filter(Boolean),
    [businessCenterBlock],
  );

  const finalCtaItems = React.useMemo(
    () => (finalCtaBlock?.items ?? []).filter((item) => item.is_active),
    [finalCtaBlock],
  );

  const hasAnyActiveBlock = PLANNING_BLOCK_KEYS.some((key) => planningBlocks[key]?.is_active);
  const showDataErrorState =
    !canUseFallback && !isBlocksLoading && Boolean(blocksError) && !hasAnyActiveBlock;
  const showEmptyContentState =
    !canUseFallback && !isBlocksLoading && !blocksError && !hasAnyActiveBlock;

  const planningHeroImage =
    normalizeText(cmsPage?.hero_image_url) ||
    heroBlock?.image_url ||
    settings.institutional_image_url ||
    DEFAULT_PLANNING_HERO_IMAGE;
  const planningMapImage =
    mapBlock?.image_url || settings.institutional_image_url || DEFAULT_PLANNING_MAP_IMAGE;
  const planningSeoTitle = normalizeText(cmsPage?.seo_title) || heroBlock?.title || 'Planeje sua visita';
  const planningSeoDescription =
    normalizeText(cmsPage?.seo_description) ||
    heroBlock?.content ||
    'Veja endereco, horarios, hotel, estacionamento e informacoes para visitar o Mega Polo Moda.';
  const planningOgTitle = normalizeText(cmsPage?.og_title) || planningSeoTitle;
  const planningOgDescription = normalizeText(cmsPage?.og_description) || planningSeoDescription;
  const planningCanonical = normalizeText(cmsPage?.canonical_url) || '/planeje-sua-visita';
  const planningRobots = `${cmsPage?.robots_index === false ? 'noindex' : 'index'},${cmsPage?.robots_follow === false ? 'nofollow' : 'follow'}`;
  const planningHeroLabel =
    heroBlock?.subtitle || normalizeText(cmsPage?.subtitle) || 'Experiencia de Compra';
  const planningHeroTitle =
    heroBlock?.title || normalizeText(cmsPage?.title) || 'Planeje sua visita ao Mega Polo Moda';
  const planningHeroDescription =
    heroBlock?.content ||
    normalizeText(cmsPage?.content) ||
    'Encontre lojas, salve favoritos e organize sua visita comercial antes de chegar ao shopping.';

  const heroPrimaryLabel = heroBlock?.button_label || 'Montar roteiro de compras';
  const heroPrimaryUrl = heroBlock?.button_url || '/lojas';
  const heroSecondaryLabel = heroBlock?.secondary_button_label || 'Ver meu roteiro';
  const heroSecondaryUrl = heroBlock?.secondary_button_url || '/meu-roteiro';

  const mapAddressOverride = getSettingText(mapBlock, 'address');
  const mapAddress = mapAddressOverride || institutionalAddress;
  const mapUrl =
    normalizeText(getSettingText(mapBlock, 'map_url')) ||
    normalizeText(mapBlock?.button_url) ||
    buildGoogleMapsUrl(mapAddress);
  const mapButtonLabel = mapBlock?.button_label || 'Abrir no Google Maps';
  const mapDescription =
    mapBlock?.content || 'Abra a rota no Google Maps e planeje sua chegada ao Mega Polo Moda.';

  const hotelCtaUrl = resolveBlockActionUrl(hotelBlock, supportPhone, settings.hotel_whatsapp_message);
  const businessCenterCtaUrl = resolveBlockActionUrl(
    businessCenterBlock,
    supportPhone,
    settings.business_center_whatsapp_message,
  );
  const finalCtaUrl = resolveBlockActionUrl(finalCtaBlock, supportPhone, settings.planning_whatsapp_message);

  const planningStructuredData = [
    buildOrganizationStructuredData(settings),
    buildShoppingCenterStructuredData(settings),
    buildBreadcrumbStructuredData([
      { name: 'Home', path: '/' },
      { name: 'Planeje sua visita', path: '/planeje-sua-visita' },
    ]),
  ];

  return (
    <div className="bg-white min-h-screen">
      <SEO
        title={planningSeoTitle}
        description={planningSeoDescription}
        canonical={planningCanonical}
        ogTitle={planningOgTitle}
        ogDescription={planningOgDescription}
        ogImage={planningHeroImage}
        robots={planningRobots}
        structuredData={planningStructuredData}
      />

      {showDataErrorState && (
        <section className="max-w-7xl mx-auto px-6 pt-32">
          <div className="bg-white border border-red-200 rounded-2xl p-6 md:p-8 text-center space-y-3">
            <p className="text-[11px] tracking-brand font-bold uppercase text-red-700">
              Nao foi possivel carregar os dados
            </p>
            <p className="text-brand-dark/70">Tente novamente em instantes.</p>
          </div>
        </section>
      )}

      {showEmptyContentState && (
        <section className="max-w-7xl mx-auto px-6 pt-32">
          <div className="bg-white border border-brand-dark/10 rounded-2xl p-6 md:p-8 text-center space-y-3">
            <p className="text-[11px] tracking-brand font-bold uppercase text-brand-dark/70">
              Nenhum conteudo publicado no momento
            </p>
          </div>
        </section>
      )}

      {isBlocksLoading && !hasAnyActiveBlock && (
        <section className="max-w-7xl mx-auto px-6 pt-32">
          <div className="bg-white border border-brand-dark/10 rounded-2xl p-6 md:p-8 text-center">
            <p className="text-brand-dark/60">Carregando conteudo de Planeje sua visita...</p>
          </div>
        </section>
      )}

      {heroBlock?.is_active && (
        <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden bg-brand-dark text-white">
          <ImageWithFallback
            src={planningHeroImage}
            alt="Planeje sua visita ao Mega Polo Moda"
            className="absolute inset-0 w-full h-full object-cover opacity-20 grayscale"
            loading="eager"
            width={1600}
            height={900}
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-brand-dark via-brand-dark/80 to-brand-dark" />

          <div className="max-w-7xl mx-auto px-6 relative z-10">
            <div className="max-w-3xl space-y-8">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                <span className="text-brand-gold text-[10px] tracking-[0.4em] font-bold uppercase inline-block italic">
                  {planningHeroLabel}
                </span>
                <h1 className="text-5xl md:text-8xl font-serif font-bold italic leading-none">
                  {planningHeroTitle}
                </h1>
                <p className="text-lg md:text-2xl font-sans text-white/50 max-w-xl font-light italic">
                  {planningHeroDescription}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="flex flex-wrap gap-4"
              >
                {heroPrimaryLabel && heroPrimaryUrl && (
                  <ActionLink
                    label={heroPrimaryLabel}
                    url={heroPrimaryUrl}
                    className="px-10 py-5 bg-brand-red text-white text-[11px] font-bold tracking-brand rounded-full hover:bg-white hover:text-brand-dark transition-all shadow-2xl shadow-brand-red/20 uppercase"
                  />
                )}
                {heroSecondaryLabel && heroSecondaryUrl && (
                  <ActionLink
                    label={heroSecondaryLabel}
                    url={heroSecondaryUrl}
                    className="px-10 py-5 bg-white/10 backdrop-blur-md text-white text-[11px] font-bold tracking-brand rounded-full border border-white/20 hover:bg-white hover:text-brand-dark transition-all uppercase"
                  />
                )}
              </motion.div>
            </div>
          </div>
        </section>
      )}

      {infoCardsBlock?.is_active && infoCards.length > 0 && (
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {infoCards.map((card) => (
              <InfoCard
                key={card.id}
                icon={card.icon}
                title={card.title}
                content={card.content}
                delay={card.delay}
              />
            ))}
          </div>
        </section>
      )}

      {visitStepsBlock?.is_active && visitSteps.length > 0 && (
        <section className="py-24 bg-brand-paper">
          <div className="max-w-7xl mx-auto px-6 space-y-20">
            <div className="text-center space-y-4">
              <h2 className="text-[11px] tracking-[0.4em] font-bold text-brand-gold uppercase">
                {visitStepsBlock.subtitle || 'Praticidade'}
              </h2>
              <h3 className="text-4xl md:text-6xl font-serif font-bold italic">
                {visitStepsBlock.title || 'Como organizar sua visita'}
              </h3>
              {visitStepsBlock.content && (
                <p className="text-brand-dark/50 text-sm max-w-2xl mx-auto">{visitStepsBlock.content}</p>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
              {visitSteps.map((step, idx) => (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: idx * 0.1 }}
                  className="space-y-6 text-center"
                >
                  <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto shadow-sm border border-brand-dark/5">
                    <step.icon className="w-6 h-6 text-brand-red" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-serif font-bold italic">{step.title}</h4>
                    <p className="text-xs text-brand-dark/40 font-sans leading-relaxed tracking-tight">
                      {step.description}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {visitStepsBlock.button_label && visitStepsBlock.button_url && (
              <div className="pt-10 flex justify-center">
                <ActionLink
                  label={visitStepsBlock.button_label}
                  url={visitStepsBlock.button_url}
                  className="flex items-center gap-3 px-12 py-6 bg-brand-dark text-white rounded-full text-[11px] font-bold tracking-brand shadow-2xl hover:bg-brand-red transition-all uppercase"
                  icon={<ArrowRight className="w-4 h-4" />}
                />
              </div>
            )}
          </div>
        </section>
      )}

      {mapBlock?.is_active && (
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="bg-brand-paper rounded-[48px] overflow-hidden border border-brand-dark/5 h-[400px] md:h-[600px] relative flex items-center justify-center group">
            <ImageWithFallback
              src={planningMapImage}
              alt="Mapa da regiao do Bras em Sao Paulo"
              className="absolute inset-0 w-full h-full object-cover grayscale opacity-10"
              width={1600}
              height={900}
              sizes="100vw"
            />
            <div className="relative text-center space-y-6 p-8">
              <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto shadow-xl">
                <Navigation className="w-8 h-8 text-brand-red animate-bounce" />
              </div>
              <div className="space-y-2">
                <h3 className="text-3xl font-serif font-bold italic">{mapBlock.title || 'Como chegar'}</h3>
                <p className="text-brand-dark/40 font-sans text-sm max-w-sm mx-auto">{mapDescription}</p>
              </div>
              <ActionLink
                label={mapButtonLabel}
                url={mapUrl}
                className="inline-flex items-center px-8 py-4 bg-brand-dark text-white rounded-full text-[10px] font-bold tracking-brand uppercase shadow-lg hover:bg-brand-red transition-all"
              />
            </div>
          </div>
        </section>
      )}

      {(hotelBlock?.is_active || businessCenterBlock?.is_active) && (
        <section className="py-24 max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {hotelBlock?.is_active && (
              <motion.div
                id="hotel"
                initial={{ opacity: 0, x: -30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-brand-dark rounded-[48px] p-12 lg:p-20 text-white relative overflow-hidden flex flex-col justify-between min-h-[500px] scroll-mt-24"
              >
                {hotelBlock.image_url && (
                  <ImageWithFallback
                    src={hotelBlock.image_url}
                    alt={hotelBlock.title || 'Hotel Mega Polo'}
                    className="absolute inset-0 w-full h-full object-cover opacity-15"
                    width={1200}
                    height={900}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                )}
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-red/10 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative space-y-8">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10">
                    <Hotel className="w-4 h-4 text-brand-gold" />
                    <span className="text-[10px] font-bold tracking-premium uppercase">
                      {hotelBlock.subtitle || 'Hospedagem'}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl lg:text-6xl font-serif font-bold italic leading-tight">
                      {hotelBlock.title || 'Hotel Mega Polo'}
                    </h3>
                    {hotelBlock.content && (
                      <p className="text-white/50 font-sans leading-relaxed text-lg max-w-md">
                        {hotelBlock.content}
                      </p>
                    )}
                    {hotelBenefits.length > 0 && (
                      <ul className="space-y-2">
                        {hotelBenefits.map((benefit) => (
                          <li key={benefit} className="text-sm text-white/75 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-brand-gold shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <ActionLink
                  label={hotelBlock.button_label || 'Saiba mais sobre o hotel'}
                  url={hotelCtaUrl}
                  className="relative w-fit px-12 py-6 bg-white text-brand-dark rounded-full text-[11px] font-bold tracking-brand hover:bg-brand-red hover:text-white transition-all shadow-2xl uppercase group inline-flex items-center gap-2"
                  icon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                />
              </motion.div>
            )}

            {businessCenterBlock?.is_active && (
              <motion.div
                id="centro-empresarial"
                initial={{ opacity: 0, x: 30 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                className="bg-brand-paper rounded-[48px] p-12 lg:p-20 border border-brand-dark/5 relative overflow-hidden flex flex-col justify-between min-h-[500px] scroll-mt-24"
              >
                {businessCenterBlock.image_url && (
                  <ImageWithFallback
                    src={businessCenterBlock.image_url}
                    alt={businessCenterBlock.title || 'Centro Empresarial'}
                    className="absolute inset-0 w-full h-full object-cover opacity-10"
                    width={1200}
                    height={900}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                  />
                )}
                <div className="absolute bottom-0 left-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-3xl -ml-32 -mb-32" />
                <div className="relative space-y-8">
                  <div className="inline-flex items-center gap-3 px-4 py-2 bg-brand-dark/5 rounded-full border border-brand-dark/5">
                    <Building2 className="w-4 h-4 text-brand-red" />
                    <span className="text-[10px] font-bold tracking-premium text-brand-dark/40 uppercase">
                      {businessCenterBlock.subtitle || 'Centro Empresarial'}
                    </span>
                  </div>
                  <div className="space-y-4">
                    <h3 className="text-4xl lg:text-6xl font-serif font-bold italic leading-tight text-brand-dark">
                      {businessCenterBlock.title || 'Centro Empresarial'}
                    </h3>
                    {businessCenterBlock.content && (
                      <p className="text-brand-dark/40 font-sans leading-relaxed text-lg max-w-md">
                        {businessCenterBlock.content}
                      </p>
                    )}
                    {businessCenterBenefits.length > 0 && (
                      <ul className="space-y-2">
                        {businessCenterBenefits.map((benefit) => (
                          <li key={benefit} className="text-sm text-brand-dark/70 flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 mt-0.5 text-brand-red shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <ActionLink
                  label={businessCenterBlock.button_label || 'Conhecer Centro Empresarial'}
                  url={businessCenterCtaUrl}
                  className="relative w-fit px-12 py-6 bg-brand-dark text-white rounded-full text-[11px] font-bold tracking-brand hover:bg-brand-red transition-all shadow-2xl uppercase group inline-flex items-center gap-2"
                  icon={<ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />}
                />
              </motion.div>
            )}
          </div>
        </section>
      )}

      {finalCtaBlock?.is_active && (
        <section className="py-24 bg-brand-dark text-white">
          <div className="max-w-7xl mx-auto px-6 space-y-14">
            {finalCtaItems.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-12 lg:gap-16">
                {finalCtaItems.map((item) => {
                  const CardIcon = resolveIcon(item.icon, CheckCircle2);
                  return (
                    <div key={item.id} className="space-y-6">
                      <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center">
                        <CardIcon className="w-6 h-6 text-brand-gold" />
                      </div>
                      <div className="space-y-2">
                        <h4 className="text-xl font-serif font-bold italic text-white/90">
                          {item.title || 'Destaque'}
                        </h4>
                        {item.content && (
                          <p className="text-xs text-white/40 font-sans leading-relaxed">{item.content}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-8 bg-brand-red rounded-[32px] space-y-4">
              <p className="text-[10px] font-bold tracking-premium uppercase">
                {finalCtaBlock.subtitle || 'Precisa de ajuda?'}
              </p>
              {finalCtaBlock.title && <h3 className="text-3xl font-serif italic">{finalCtaBlock.title}</h3>}
              {finalCtaBlock.content && (
                <p className="text-sm font-sans font-medium text-white/90">{finalCtaBlock.content}</p>
              )}
              <ActionLink
                label={finalCtaBlock.button_label || 'Falar no canal de suporte'}
                url={finalCtaUrl}
                className="inline-flex items-center gap-2 text-xs font-bold underline"
              />
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
