import type { Json } from '../types/database';

export interface PublicContentBlockFallbackItem {
  id: string;
  block_id: string;
  title: string;
  subtitle: string;
  content: string;
  image_url: string;
  icon: string;
  button_label: string;
  button_url: string;
  metadata: Json;
  sort_order: number;
  is_active: boolean;
}

export interface PublicContentBlockFallback {
  id: string;
  page_key: string;
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
  settings: Json;
  sort_order: number;
  is_active: boolean;
  items: PublicContentBlockFallbackItem[];
}

function createBlock(
  pageKey: string,
  blockKey: string,
  blockType: string,
  sortOrder: number,
  values: Partial<Omit<PublicContentBlockFallback, 'id' | 'page_key' | 'block_key' | 'block_type' | 'sort_order'>>,
): PublicContentBlockFallback {
  return {
    id: `fallback-${pageKey}-${blockKey}`,
    page_key: pageKey,
    block_key: blockKey,
    block_type: blockType,
    title: values.title ?? '',
    subtitle: values.subtitle ?? '',
    content: values.content ?? '',
    image_url: values.image_url ?? '',
    icon: values.icon ?? '',
    button_label: values.button_label ?? '',
    button_url: values.button_url ?? '',
    secondary_button_label: values.secondary_button_label ?? '',
    secondary_button_url: values.secondary_button_url ?? '',
    settings: values.settings ?? {},
    sort_order: sortOrder,
    is_active: values.is_active ?? true,
    items: values.items ?? [],
  };
}

function createItem(
  pageKey: string,
  blockKey: string,
  sortOrder: number,
  values: Partial<Omit<PublicContentBlockFallbackItem, 'id' | 'block_id' | 'sort_order'>>,
): PublicContentBlockFallbackItem {
  return {
    id: `fallback-${pageKey}-${blockKey}-item-${sortOrder}`,
    block_id: `fallback-${pageKey}-${blockKey}`,
    title: values.title ?? '',
    subtitle: values.subtitle ?? '',
    content: values.content ?? '',
    image_url: values.image_url ?? '',
    icon: values.icon ?? '',
    button_label: values.button_label ?? '',
    button_url: values.button_url ?? '',
    metadata: values.metadata ?? {},
    sort_order: sortOrder,
    is_active: values.is_active ?? true,
  };
}

export const HOME_PUBLIC_BLOCKS_FALLBACK: PublicContentBlockFallback[] = [
  createBlock('home', 'hero_banner', 'hero', 1, {
    title: 'Encontre lojas e marcas de moda atacadista no Bras',
    subtitle: 'Shopping de moda atacadista no Bras',
    content:
      'Explore categorias, veja lancamentos, salve lojas no roteiro e planeje sua visita ao Mega Polo Moda.',
    button_label: 'Encontrar lojas',
    button_url: '/lojas',
    secondary_button_label: 'Ver lancamentos',
    secondary_button_url: '/lancamentos',
    settings: {
      tertiary_button_label: 'Planejar visita',
      tertiary_button_url: '/planeje-sua-visita',
    },
  }),
  createBlock('home', 'hero_quick_links', 'links', 2, {
    title: 'Sugestoes',
    items: [
      createItem('home', 'hero_quick_links', 1, {
        title: 'Moda Feminina',
        button_url: '/lojas?q=Moda%20Feminina',
      }),
      createItem('home', 'hero_quick_links', 2, {
        title: 'Jeans',
        button_url: '/lojas?q=Jeans',
      }),
      createItem('home', 'hero_quick_links', 3, {
        title: 'Plus Size',
        button_url: '/lojas?q=Plus%20Size',
      }),
      createItem('home', 'hero_quick_links', 4, {
        title: 'Acessorios',
        button_url: '/lojas?q=Acessorios',
      }),
      createItem('home', 'hero_quick_links', 5, {
        title: 'Moda Intima',
        button_url: '/lojas?q=Moda%20Intima',
      }),
      createItem('home', 'hero_quick_links', 6, {
        title: 'Festa',
        button_url: '/lojas?q=Festa',
      }),
    ],
  }),
  createBlock('home', 'hero_badges', 'badges', 3, {
    items: [
      createItem('home', 'hero_badges', 1, {
        title: 'Referencia em moda atacadista',
      }),
      createItem('home', 'hero_badges', 2, {
        title: 'Estrutura completa no Bras',
      }),
      createItem('home', 'hero_badges', 3, {
        title: 'Compradores de diferentes regioes',
      }),
    ],
  }),
  createBlock('home', 'commercial_steps', 'steps', 4, {
    title: 'Como comprar no Mega Polo',
    subtitle: 'Facilidade',
    content:
      'Busque lojas por categoria, veja lancamentos, adicione lojas ao roteiro e visite o shopping.',
    items: [
      createItem('home', 'commercial_steps', 1, {
        subtitle: '01',
        title: 'Busque lojas por categoria',
        content: 'Use a busca e os filtros para encontrar lojas por segmento, categoria e produto.',
      }),
      createItem('home', 'commercial_steps', 2, {
        subtitle: '02',
        title: 'Veja lancamentos das marcas',
        content: 'Acompanhe as novidades das lojas para montar pedidos com agilidade.',
      }),
      createItem('home', 'commercial_steps', 3, {
        subtitle: '03',
        title: 'Adicione lojas ao seu roteiro',
        content: 'Salve lojas de interesse para otimizar sua visita e reduzir deslocamentos.',
      }),
      createItem('home', 'commercial_steps', 4, {
        subtitle: '04',
        title: 'Visite ou fale pelo WhatsApp',
        content: 'Visite o shopping com planejamento ou inicie contato com as lojas.',
      }),
    ],
  }),
  createBlock('home', 'planning_visit_cards', 'cards', 5, {
    items: [
      createItem('home', 'planning_visit_cards', 1, {
        title: 'Endereco',
        content: 'R. Barao de Ladario, 566 - Bras, Sao Paulo - SP',
      }),
      createItem('home', 'planning_visit_cards', 2, {
        title: 'Horarios',
        content: 'Seg a Qui: 07h as 17h | Sex: 07h as 16h',
      }),
      createItem('home', 'planning_visit_cards', 3, {
        title: 'Hotel Mega Polo',
        content: 'Hospedagem integrada para quem vem de outras regioes.',
      }),
      createItem('home', 'planning_visit_cards', 4, {
        title: 'Estacionamento',
        content: 'Vagas para carros e onibus de excursao.',
      }),
      createItem('home', 'planning_visit_cards', 5, {
        title: 'Alimentacao',
        content: 'Praca de alimentacao com opcoes para toda a equipe.',
      }),
    ],
  }),
  createBlock('home', 'leasing_highlights', 'cards', 6, {
    items: [
      createItem('home', 'leasing_highlights', 1, {
        title: 'Referencia em moda atacadista',
        content: 'Lojas e marcas de diversos segmentos',
      }),
      createItem('home', 'leasing_highlights', 2, {
        title: 'Estrutura completa no Bras',
        content: 'Compradores de diferentes regioes',
      }),
    ],
  }),
];

export const STORES_PUBLIC_BLOCKS_FALLBACK: PublicContentBlockFallback[] = [
  createBlock('stores', 'stores_intro', 'intro', 1, {
    title: 'Diretorio de Lojas',
    subtitle: 'Guia Comercial',
    content: 'Busque lojas por categoria, segmento, piso ou catalogo digital.',
  }),
];

export const LEASING_PUBLIC_BLOCKS_FALLBACK: PublicContentBlockFallback[] = [
  createBlock('leasing', 'leasing_intro', 'hero', 1, {
    title: 'Abra sua loja em uma estrutura comercial de referencia no Bras',
    subtitle: 'Oportunidade Comercial',
    content:
      'Conecte sua marca a compradores de diferentes regioes em uma estrutura completa e estrategica no coracao do Bras.',
    button_label: 'Quero receber uma proposta',
    button_url: '#proposta',
    secondary_button_label: 'Falar com o comercial',
    secondary_button_url: '#whatsapp',
  }),
  createBlock('leasing', 'authority_highlights', 'stats', 2, {
    items: [
      createItem('leasing', 'authority_highlights', 1, {
        title: 'Referencia',
        content: 'Shopping de moda atacadista',
      }),
      createItem('leasing', 'authority_highlights', 2, {
        title: 'Estrategica',
        content: 'Localizacao no Bras',
      }),
      createItem('leasing', 'authority_highlights', 3, {
        title: 'Completa',
        content: 'Estrutura comercial',
      }),
      createItem('leasing', 'authority_highlights', 4, {
        title: 'Nacional',
        content: 'Compradores de diferentes regioes',
      }),
    ],
  }),
  createBlock('leasing', 'benefits_grid', 'cards', 3, {
    items: [
      createItem('leasing', 'benefits_grid', 1, {
        icon: 'map-pin',
        title: 'Localizacao Estrategica',
        content: 'No coracao do Bras, com estrutura completa para negocios de moda atacadista.',
      }),
      createItem('leasing', 'benefits_grid', 2, {
        icon: 'users',
        title: 'Visibilidade para Compradores',
        content: 'Sua marca com visibilidade para compradores de diferentes regioes.',
      }),
      createItem('leasing', 'benefits_grid', 3, {
        icon: 'layers',
        title: 'Estrutura Completa',
        content: 'Ambiente seguro, climatizado e com infraestrutura completa para seu negocio.',
      }),
      createItem('leasing', 'benefits_grid', 4, {
        icon: 'hotel',
        title: 'Hotel Integrado',
        content: 'O Hotel Mega Polo facilita a estadia de compradores de diferentes regioes.',
      }),
      createItem('leasing', 'benefits_grid', 5, {
        icon: 'building-2',
        title: 'Centro Empresarial',
        content: 'Escritorios e salas comerciais para gestao administrativa da sua marca.',
      }),
      createItem('leasing', 'benefits_grid', 6, {
        icon: 'utensils',
        title: 'Praca de Alimentacao',
        content: 'Mix gastronomico completo para conveniencia de clientes e colaboradores.',
      }),
      createItem('leasing', 'benefits_grid', 7, {
        icon: 'calendar',
        title: 'Eventos e Campanhas',
        content: 'Calendario anual de desfiles e marketing robusto para atrair publico qualificado.',
      }),
      createItem('leasing', 'benefits_grid', 8, {
        icon: 'trending-up',
        title: 'Conexao Especializada',
        content: 'Ponto de encontro direto entre a industria e o revendedor especializado.',
      }),
    ],
  }),
  createBlock('leasing', 'spaces_grid', 'cards', 4, {
    items: [
      createItem('leasing', 'spaces_grid', 1, {
        icon: 'store',
        title: 'Loja',
        content: 'Espacos amplos para exposicao de colecoes e atendimento personalizado.',
      }),
      createItem('leasing', 'spaces_grid', 2, {
        icon: 'layout',
        title: 'Showroom',
        content: 'Areas para negociacoes de atacado e pedidos programados.',
      }),
      createItem('leasing', 'spaces_grid', 3, {
        icon: 'shopping-bag',
        title: 'Quiosque',
        content: 'Excelente visibilidade em pontos estrategicos de alto fluxo nos corredores.',
      }),
      createItem('leasing', 'spaces_grid', 4, {
        icon: 'building-2',
        title: 'Espaco Comercial',
        content: 'Solucoes sob medida para servicos e operacoes administrativas.',
      }),
    ],
  }),
  createBlock('leasing', 'proposal_intro', 'content', 5, {
    title: 'Receba uma proposta exclusiva',
    content:
      'Cadastre sua marca para receber uma analise comercial completa e as opcoes disponiveis para o seu segmento.',
  }),
  createBlock('leasing', 'proposal_support_items', 'cards', 6, {
    items: [
      createItem('leasing', 'proposal_support_items', 1, {
        icon: 'shield-check',
        title: 'Analise Profissional',
        content: 'Retorno da nossa equipe comercial com os proximos passos.',
      }),
      createItem('leasing', 'proposal_support_items', 2, {
        icon: 'map-pin',
        title: 'Visita Tecnica',
        content: 'Agendamento para conhecer as unidades presenciais.',
      }),
    ],
  }),
  createBlock('leasing', 'proposal_stats', 'stats', 7, {
    items: [
      createItem('leasing', 'proposal_stats', 1, {
        title: 'Diversas',
        content: 'Lojas',
      }),
      createItem('leasing', 'proposal_stats', 2, {
        title: 'Bras',
        content: 'Localizacao',
      }),
    ],
  }),
  createBlock('leasing', 'final_whatsapp_cta', 'cta', 8, {
    title: 'Prefere um atendimento imediato?',
    button_label: 'Falar no WhatsApp agora',
  }),
];

