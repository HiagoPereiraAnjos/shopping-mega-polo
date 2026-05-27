import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Leasing from './Leasing';

const { createLeadMock, getPageBySlugMock } = vi.hoisted(() => ({
  createLeadMock: vi.fn(),
  getPageBySlugMock: vi.fn(),
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

vi.mock('../components/ui/SEO', () => ({
  SEO: () => null,
}));

vi.mock('../lib/supabase', () => ({
  isSupabaseConfigured: false,
}));

vi.mock('../services/pages.service', () => ({
  getPageBySlug: getPageBySlugMock,
}));

vi.mock('../services/leads.service', () => ({
  createLead: createLeadMock,
}));

describe('Leasing form', () => {
  beforeEach(() => {
    getPageBySlugMock.mockReset();
    createLeadMock.mockReset();
    getPageBySlugMock.mockResolvedValue({ data: null, error: null });
    createLeadMock.mockResolvedValue({ data: { id: 'lead-1' }, error: null });
  });

  it('exige consentimento LGPD antes de enviar lead', async () => {
    render(<Leasing />);

    fireEvent.change(screen.getByLabelText(/seu nome/i), { target: { value: 'Comprador Teste' } });
    fireEvent.change(screen.getByLabelText(/nome da marca/i), { target: { value: 'Marca Teste' } });
    fireEvent.change(screen.getByLabelText(/cnpj/i), { target: { value: '04.252.011/0001-10' } });
    fireEvent.change(screen.getByLabelText(/whatsapp \*/i), { target: { value: '11988887777' } });
    fireEvent.change(screen.getByLabelText(/e-mail corporativo/i), {
      target: { value: 'comprador@teste.com.br' },
    });

    const form = screen.getByRole('button', { name: /enviar solicitacao/i }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    const alerts = await screen.findAllByRole('alert');
    expect(alerts.some((item) => /consentimento lgpd/i.test(item.textContent ?? ''))).toBe(true);
    expect(createLeadMock).not.toHaveBeenCalled();
  }, 10000);
});
