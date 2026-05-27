import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NewsletterForm from './NewsletterForm';

const { subscribeNewsletterMock } = vi.hoisted(() => ({
  subscribeNewsletterMock: vi.fn(),
}));

vi.mock('../services/newsletter.service', () => ({
  subscribeNewsletter: subscribeNewsletterMock,
}));

describe('NewsletterForm', () => {
  beforeEach(() => {
    subscribeNewsletterMock.mockReset();
    subscribeNewsletterMock.mockResolvedValue({ data: { id: '1' }, error: null });
  });

  it('valida e-mail antes de enviar', async () => {
    const user = userEvent.setup();
    render(<NewsletterForm />);

    await user.type(screen.getByLabelText(/seu nome/i), 'Comprador Teste');
    await user.type(screen.getByLabelText(/e-mail \*/i), 'email-invalido');
    await user.click(screen.getByRole('button', { name: /cadastrar/i }));

    expect(await screen.findByRole('alert', {}, { timeout: 10000 })).toHaveTextContent(/e-mail invalido/i);
    expect(subscribeNewsletterMock).not.toHaveBeenCalled();
  }, 15000);
});
