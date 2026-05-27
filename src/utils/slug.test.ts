import { describe, expect, it } from 'vitest';
import { slugify } from './slug';

describe('slugify', () => {
  it('normaliza acentos e espacos para slug', () => {
    expect(slugify('Moda Íntima Premium')).toBe('moda-intima-premium');
  });

  it('remove caracteres especiais e hifens duplicados', () => {
    expect(slugify('  Nova coleção!!! -- Jeans  ')).toBe('nova-colecao-jeans');
  });

  it('retorna string vazia para entrada invalida', () => {
    expect(slugify('@@@')).toBe('');
  });
});
