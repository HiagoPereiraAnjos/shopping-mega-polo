import { describe, expect, it } from 'vitest';
import { hasValidCnpj, hasValidEmail, hasValidPhone } from './validation';

describe('validation helpers', () => {
  it('valida e-mail corretamente', () => {
    expect(hasValidEmail('contato@megapolomoda.com.br')).toBe(true);
    expect(hasValidEmail('email-invalido')).toBe(false);
  });

  it('valida telefone com DDD', () => {
    expect(hasValidPhone('(11) 98888-7777')).toBe(true);
    expect(hasValidPhone('12345')).toBe(false);
  });

  it('valida CNPJ basico com digito verificador', () => {
    expect(hasValidCnpj('04.252.011/0001-10')).toBe(true);
    expect(hasValidCnpj('11.111.111/1111-11')).toBe(false);
  });

  it('aceita CNPJ vazio para campos opcionais', () => {
    expect(hasValidCnpj('')).toBe(true);
  });
});
