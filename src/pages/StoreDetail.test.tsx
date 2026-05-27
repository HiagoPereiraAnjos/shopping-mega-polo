import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Store as PublicStore } from '../types';
import StoreDetail from './StoreDetail';

const addItemMock = vi.fn();
const isInRouteMock = vi.fn(() => false);
const getStoreBySlugItemMock = vi.fn();

let storeMock: PublicStore | null = null;

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
    },
  }),
}));

vi.mock('../hooks/useStores', () => ({
  useStores: () => ({
    publicStores: storeMock ? [storeMock] : [],
    getStoreBySlugItem: getStoreBySlugItemMock,
  }),
}));

vi.mock('../components/ui/SEO', () => ({
  SEO: () => null,
}));

function makeStore(partial: Partial<PublicStore>): PublicStore {
  return {
    id: partial.id ?? 'store-1',
    slug: partial.slug ?? 'store-1',
    name: partial.name ?? 'Loja Teste',
    category: partial.category ?? 'Moda Feminina',
    segment: partial.segment ?? 'Feminino',
    floor: partial.floor ?? 'Piso 1',
    unit: partial.unit ?? '101',
    logo: partial.logo ?? 'LT',
    image:
      partial.image ??
      'https://images.unsplash.com/photo-1555529669-e69e7aa0ba9a?auto=format&fit=crop&q=80&w=600',
    banner: partial.banner,
    whatsapp: partial.whatsapp ?? '5511999999999',
    instagram: partial.instagram ?? '@lojateste',
    description: partial.description ?? 'Descricao da loja',
    featured: partial.featured ?? false,
    saleType: partial.saleType ?? 'Atacado',
    hasCatalog: partial.hasCatalog ?? false,
    catalogUrl: partial.catalogUrl,
    tags: partial.tags ?? [],
    products: partial.products ?? [],
    seoTitle: partial.seoTitle,
    seoDescription: partial.seoDescription,
    ogImageUrl: partial.ogImageUrl,
  };
}

function renderPage(path = '/lojas/loja-teste') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/lojas/:slug" element={<StoreDetail />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('StoreDetail', () => {
  beforeEach(() => {
    addItemMock.mockReset();
    isInRouteMock.mockReset();
    isInRouteMock.mockReturnValue(false);

    getStoreBySlugItemMock.mockReset();
    getStoreBySlugItemMock.mockImplementation(async () => ({
      data: storeMock,
      error: storeMock ? null : 'Loja nao encontrada.',
    }));
  });

  it('exibe botao de catalogo quando ha catalogo ativo', async () => {
    storeMock = makeStore({
      slug: 'loja-com-catalogo',
      name: 'Loja com Catalogo',
      hasCatalog: true,
      catalogUrl: '/catalogos/loja-com-catalogo.pdf',
    });

    renderPage('/lojas/loja-com-catalogo');

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /loja com catalogo/i },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^ver cat[aá]logo$/i })).toBeInTheDocument();
  });

  it('nao exibe botao de catalogo quando catalogo ativo nao existe', async () => {
    storeMock = makeStore({
      slug: 'loja-sem-catalogo',
      name: 'Loja sem Catalogo',
      hasCatalog: false,
      catalogUrl: undefined,
    });

    renderPage('/lojas/loja-sem-catalogo');

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /loja sem catalogo/i },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^ver cat[aá]logo$/i })).not.toBeInTheDocument();
  });
  it('nao renderiza link de instagram quando valor esta vazio', async () => {
    storeMock = makeStore({
      slug: 'loja-sem-instagram',
      name: 'Loja sem Instagram',
      instagram: '',
    });

    renderPage('/lojas/loja-sem-instagram');

    expect(
      await screen.findByRole(
        'heading',
        { level: 1, name: /loja sem instagram/i },
        { timeout: 4000 },
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText('Instagram')).not.toBeInTheDocument();
    expect(document.querySelector('a[href*="instagram.com/undefined"]')).not.toBeInTheDocument();
  });
});

