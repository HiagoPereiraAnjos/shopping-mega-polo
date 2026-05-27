import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import Login from './Login';

const signInMock = vi.fn();
const resetPasswordMock = vi.fn();

vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    session: null,
    profile: null,
    isLoading: false,
    isAuthenticated: false,
    signIn: signInMock,
    signOut: vi.fn(),
    resetPassword: resetPasswordMock,
    refreshProfile: vi.fn(),
  }),
}));

vi.mock('../components/ui/SEO', () => ({
  SEO: () => null,
}));

vi.mock('../hooks/useSiteSettings', () => ({
  useSiteSettings: () => ({
    settings: {
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

function renderLoginPage() {
  render(
    <MemoryRouter>
      <Login />
    </MemoryRouter>,
  );
}

describe('Login', () => {
  beforeEach(() => {
    signInMock.mockReset();
    resetPasswordMock.mockReset();
    signInMock.mockResolvedValue({ error: null });
    resetPasswordMock.mockResolvedValue({ error: null });
  });

  it('renderiza campos principais do formulario', () => {
    renderLoginPage();

    expect(screen.getByLabelText(/e-mail \*/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha \*/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('valida tamanho minimo da senha antes de autenticar', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/e-mail \*/i), 'comprador@teste.com.br');
    await user.type(screen.getByLabelText(/senha \*/i), '123');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/ao menos 6 caracteres/i);
    expect(signInMock).not.toHaveBeenCalled();
  }, 10000);

  it('valida formato de e-mail', async () => {
    const user = userEvent.setup();
    renderLoginPage();

    await user.type(screen.getByLabelText(/e-mail \*/i), 'email-invalido');
    await user.type(screen.getByLabelText(/senha \*/i), '123456');
    const form = screen.getByRole('button', { name: /entrar/i }).closest('form');
    expect(form).not.toBeNull();
    fireEvent.submit(form as HTMLFormElement);

    expect(await screen.findByRole('alert')).toHaveTextContent(/e-mail/i);
    expect(signInMock).not.toHaveBeenCalled();
  }, 10000);
});
