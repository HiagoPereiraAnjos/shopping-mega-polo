import { describe, expect, it } from 'vitest';
import type { Store } from '../types';
import type { ResolvedSiteSettings } from '../hooks/useSiteSettings';
import {
  buildBreadcrumbStructuredData,
  buildOrganizationStructuredData,
  buildStoreStructuredData,
  getCanonicalUrl,
  toAbsoluteUrl,
} from './seo';

const settings: ResolvedSiteSettings = {
  site_name: 'Mega Polo Moda',
  short_description: 'Shopping de moda atacadista no Bras',
  logo_url: '/images/logo-mega-polo.png',
  favicon_url: '/favicon.ico',
  primary_color: '#E30613',
  secondary_color: '#111111',
  accent_color: '#B38956',
  whatsapp: '5511999999999',
  email: 'contato@megapolomoda.com.br',
  phone: '(11) 3311-2800',
  address: 'Rua Barão de Ladário, 670 - Brás - São Paulo - SP',
  instagram_url: 'https://www.instagram.com/megapolomoda',
  facebook_url: '',
  linkedin_url: '',
  opening_hours: 'Seg a Sex: 8h às 18h',
  institutional_image_url: '/images/institucional.jpg',
  footer_newsletter_title: 'Insights',
  footer_newsletter_text: 'Receba novidades',
  footer_newsletter_button_label: 'Cadastrar',
  footer_copyright_text: 'Shopping Mega Polo Moda',
  footer_institutional_phrase: 'Referencia em moda atacadista',
  youtube_url: 'https://www.youtube.com/@megapolomoda',
  footer_legal_text: 'Informacoes sujeitas a alteracao.',
  copyright_text: 'Mega Polo Moda',
  copyright_year: '2026',
  default_whatsapp_message: 'Ola, gostaria de mais informacoes.',
  leasing_whatsapp_message: 'Ola, tenho interesse em abrir uma loja.',
  planning_whatsapp_message: 'Ola, gostaria de planejar minha visita.',
  hotel_whatsapp_message: 'Ola, gostaria de informacoes do hotel.',
  business_center_whatsapp_message: 'Ola, gostaria de informacoes do centro empresarial.',
  login_title: 'Area do Lojista',
  login_subtitle: 'Acesse sua conta',
  login_image_url: '/images/logo-mega-polo.png',
  default_og_image_url: '/images/default-og.jpg',
  google_analytics_id: '',
  google_tag_manager_id: '',
  meta_pixel_id: '',
  custom_head_scripts: '',
  custom_body_scripts: '',
  seo_base_url: 'https://www.megapolomoda.com.br',
  seo_default_robots: 'index,follow',
  seo_default_language: 'pt-BR',
  seo_keywords: 'moda atacadista, bras',
};

const store: Store = {
  id: 'store-1',
  slug: 'loja-teste',
  name: 'Loja Teste',
  category: 'Moda Feminina',
  segment: 'Feminino',
  floor: 'Piso 1',
  unit: '101',
  logo: 'LT',
  image: 'https://images.unsplash.com/photo-1551232864-3f0890e580d9',
  saleType: 'Atacado',
  hasCatalog: false,
};

describe('seo helpers', () => {
  it('converte URL relativa e absoluta corretamente', () => {
    expect(toAbsoluteUrl('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
    expect(toAbsoluteUrl('/lojas')).toMatch(/\/lojas$/);
  });

  it('gera canonical URL padrao', () => {
    expect(getCanonicalUrl('/lancamentos')).toMatch(/\/lancamentos$/);
  });

  it('gera dados estruturados de organizacao', () => {
    const result = buildOrganizationStructuredData(settings);
    expect(result['@type']).toBe('Organization');
    expect(result.name).toBe('Mega Polo Moda');
  });

  it('gera dados estruturados de loja', () => {
    const result = buildStoreStructuredData(store, settings);
    expect(result['@type']).toBe('Store');
    expect(result.name).toBe('Loja Teste');
  });

  it('gera breadcrumb com ordem correta', () => {
    const result = buildBreadcrumbStructuredData([
      { name: 'Home', path: '/' },
      { name: 'Lojas', path: '/lojas' },
    ]);
    expect(result['@type']).toBe('BreadcrumbList');
    const items = result.itemListElement as Array<{ position: number; name: string }>;
    expect(items[0].position).toBe(1);
    expect(items[1].name).toBe('Lojas');
  });
});
