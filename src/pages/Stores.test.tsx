import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Store as PublicStore } from '../types';
import Stores from './Stores';

const addItemMock = vi.fn();
const isInRouteMock = vi.fn(() => false);

let storesMock: PublicStore[] = [];
let categoriesMock: Array<{ id: string; name: string }> = [];
let storesErrorMock: string | null = null;
let categoriesErrorMock: string | null = null;
let isStoresLoadingMock = false;
let isCategoriesLoadingMock = false;

const refreshStoresMock = vi.fn();
const refreshCategoriesMock = vi.fn();

vi.mock('../hooks/usePlanning', () => ({
  usePlanning: () => ({
    addItem: addItemMock,
    isInRoute: isInRouteMock,
  }),
}));

vi.mock('../hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    settings: {
      site_name: 'Mega Polo Moda',
      short_description: '',
      logo_url: '/images/logo-mega-polo.png',
      favicon_url: '/favicon.ico',
      primary_color: '#E30613',
      secondary_color: '#111111',
      accent_color: '#B38956',
      whatsapp: '5511999999999',
      email: 'contato@megapolomoda.com.br',
      phone: '(11) 3311-2800',
      address: 'Bras, Sao Paulo',
      instagram_url: '',
      facebook_url: '',
      linkedin_url: '',
      opening_hours: 'Seg a Sex',
      institutional_image_url: '',
      footer_newsletter_title: 'Insights',
      footer_newsletter_text: 'Receba novidades',
      footer_newsletter_button_label: 'Cadastrar',
      footer_copyright_text: 'Shopping Mega Polo Moda',
      footer_institutional_phrase: 'Referencia em moda atacadista',
      youtube_url: '',
      footer_legal_text: '',
      copyright_text: 'Mega Polo Moda',
      copyright_year: '2026',
      default_whatsapp_message: 'Ola, gostaria de mais informacoes.',
      leasing_whatsapp_message: 'Ola, tenho interesse em abrir loja.',
      planning_whatsapp_message: 'Ola, gostaria de planejar a visita.',
      hotel_whatsapp_message: 'Ola, gostaria de informacoes do hotel.',
      business_center_whatsapp_message: 'Ola, gostaria de informacoes do centro empresarial.',
      login_title: 'Area do Lojista',
      login_subtitle: 'Acesse para gerenciar sua loja.',
      login_image_url: '/images/logo-mega-polo.png',
      default_og_image_url: '/images/logo-mega-polo.png',
      google_analytics_id: '',
      google_tag_manager_id: '',
      meta_pixel_id: '',
      custom_head_scripts: '',
      custom_body_scripts: '',
    },
  }),
}));

vi.mock('../hooks/useCategories', () => ({
  useCategories: () => ({
    categories: categoriesMock,
    isLoading: isCategoriesLoadingMock,
    error: categoriesErrorMock,
    refreshCategories: refreshCategoriesMock,
  }),
}));

vi.mock('../hooks/useStores', () => ({
  useStores: () => ({
    publicStores: storesMock,
    isLoading: isStoresLoadingMock,
    error: storesErrorMock,
    refreshStores: refreshStoresMock,
  }),
}));

vi.mock('../components/ui/SEO', () => ({
  SEO: () => null,
}));

function makeStore(partial: Partial<PublicStore>): PublicStore {
  return {
    id: partial.id ?? crypto.randomUUID(),
    slug: partial.slug ?? 'loja-teste',
    name: partial.name ?? 'Loja Teste',
    category: partial.category ?? 'Moda Feminina',
    segment: partial.segment ?? 'Moda Feminina',
    floor: partial.floor ?? 'Piso 1',
    unit: partial.unit ?? '101',
    logo: partial.logo ?? 'LT',
    image:
      partial.image ??
      'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&q=80&w=600',
    banner: partial.banner,
    whatsapp: partial.whatsapp ?? '5511999999999',
    instagram: partial.instagram,
    description: partial.description ?? 'Descricao da loja',
    featured: partial.featured ?? false,
    saleType: partial.saleType ?? 'Atacado',
    hasCatalog: partial.hasCatalog ?? false,
    catalogUrl: partial.catalogUrl,
    tags: partial.tags ?? ['atacado'],
    products: partial.products,
    seoTitle: partial.seoTitle,
    seoDescription: partial.seoDescription,
    ogImageUrl: partial.ogImageUrl,
  };
}

function renderPage(initialEntry = '/lojas') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Stores />
    </MemoryRouter>,
  );
}

describe('Stores page', () => {
  beforeEach(() => {
    addItemMock.mockReset();
    isInRouteMock.mockReset();
    isInRouteMock.mockReturnValue(false);
    refreshStoresMock.mockReset();
    refreshCategoriesMock.mockReset();

    storesErrorMock = null;
    categoriesErrorMock = null;
    isStoresLoadingMock = false;
    isCategoriesLoadingMock = false;

    storesMock = [
      makeStore({
        id: 'store-jeans',
        slug: 'loja-jeans',
        name: 'Loja Jeans',
        category: 'Jeans',
        segment: 'Jeans',
        floor: 'Piso 1',
        unit: '101',
        hasCatalog: true,
        catalogUrl: '/catalogos/loja-jeans.pdf',
      }),
      makeStore({
        id: 'store-festa',
        slug: 'loja-festa',
        name: 'Loja Festa',
        category: 'Festa',
        segment: 'Moda Festa',
        floor: 'Piso 2',
        unit: '202',
        hasCatalog: false,
      }),
    ];

    categoriesMock = [
      { id: 'cat-jeans', name: 'Jeans' },
      { id: 'cat-festa', name: 'Festa' },
    ];
  });

  it('renderiza card com dados principais da loja', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Loja Jeans' })).toBeInTheDocument();
    expect(screen.getAllByText('Jeans').length).toBeGreaterThan(0);
    expect(screen.getByText(/Piso 1/i)).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /ver loja/i }).length).toBeGreaterThan(0);
  });

  it('filtra lojas por categoria', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /filtros/i }));
    const categorySelect = await screen.findByLabelText(/^categoria$/i);
    await user.selectOptions(categorySelect, 'Jeans');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Loja Jeans' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Loja Festa' })).not.toBeInTheDocument();
    });
  }, 10000);

  it('busca lojas pelo campo de pesquisa', async () => {
    const user = userEvent.setup();
    renderPage('/lojas');

    await user.type(screen.getByLabelText(/buscar loja, categoria, produto ou tag/i), 'festa');

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Loja Festa' })).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: 'Loja Jeans' })).not.toBeInTheDocument();
    });
  });

  it('exibe estado de erro quando nao consegue carregar dados', () => {
    storesMock = [];
    categoriesMock = [];
    storesErrorMock = 'Falha ao consultar Supabase.';

    renderPage();

    expect(screen.getByText(/Nao foi possivel carregar os dados/i)).toBeInTheDocument();
    expect(screen.getByText(/Tente novamente em instantes/i)).toBeInTheDocument();
  });

  it('exibe estado vazio sem dados publicados', () => {
    storesMock = [];
    categoriesMock = [];

    renderPage();

    expect(screen.getByText(/Nenhum conteudo publicado no momento/i)).toBeInTheDocument();
  });
});
