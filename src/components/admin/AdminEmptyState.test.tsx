import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import AdminEmptyState from './AdminEmptyState';

describe('AdminEmptyState', () => {
  it('renderiza titulo, descricao e acao', () => {
    render(
      <AdminEmptyState
        title="Sem dados"
        description="Nenhum registro encontrado."
        action={<button type="button">Criar agora</button>}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Sem dados' })).toBeInTheDocument();
    expect(screen.getByText('Nenhum registro encontrado.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Criar agora' })).toBeInTheDocument();
  });
});
