export interface FooterRuntimeLink {
  id: string;
  footer_section_id: string;
  label: string;
  url: string;
  sort_order: number;
  is_active: boolean;
  open_in_new_tab: boolean;
}

export interface FooterRuntimeSection {
  id: string;
  title: string;
  sort_order: number;
  is_active: boolean;
  links: FooterRuntimeLink[];
}

export const FALLBACK_FOOTER_SECTIONS: FooterRuntimeSection[] = [
  {
    id: 'footer-section-platform',
    title: 'Plataforma Mega Polo',
    sort_order: 1,
    is_active: true,
    links: [
      {
        id: 'footer-link-platform-1',
        footer_section_id: 'footer-section-platform',
        label: 'Guia de Lojas',
        url: '/lojas',
        sort_order: 1,
        is_active: true,
        open_in_new_tab: false,
      },
      {
        id: 'footer-link-platform-2',
        footer_section_id: 'footer-section-platform',
        label: 'Lancamentos',
        url: '/lancamentos',
        sort_order: 2,
        is_active: true,
        open_in_new_tab: false,
      },
      {
        id: 'footer-link-platform-3',
        footer_section_id: 'footer-section-platform',
        label: 'Abra sua loja',
        url: '/abra-sua-loja',
        sort_order: 3,
        is_active: true,
        open_in_new_tab: false,
      },
      {
        id: 'footer-link-platform-4',
        footer_section_id: 'footer-section-platform',
        label: 'Area do Lojista',
        url: '/login',
        sort_order: 4,
        is_active: true,
        open_in_new_tab: false,
      },
    ],
  },
  {
    id: 'footer-section-visit',
    title: 'Visite o Mega Polo',
    sort_order: 2,
    is_active: true,
    links: [
      {
        id: 'footer-link-visit-1',
        footer_section_id: 'footer-section-visit',
        label: 'Planeje sua visita',
        url: '/planeje-sua-visita',
        sort_order: 1,
        is_active: true,
        open_in_new_tab: false,
      },
      {
        id: 'footer-link-visit-2',
        footer_section_id: 'footer-section-visit',
        label: 'Meu Roteiro',
        url: '/meu-roteiro',
        sort_order: 2,
        is_active: true,
        open_in_new_tab: false,
      },
      {
        id: 'footer-link-visit-3',
        footer_section_id: 'footer-section-visit',
        label: 'Hotel Mega Polo',
        url: '/planeje-sua-visita#hotel',
        sort_order: 3,
        is_active: true,
        open_in_new_tab: false,
      },
      {
        id: 'footer-link-visit-4',
        footer_section_id: 'footer-section-visit',
        label: 'Centro Empresarial',
        url: '/planeje-sua-visita#centro-empresarial',
        sort_order: 4,
        is_active: true,
        open_in_new_tab: false,
      },
    ],
  },
];
