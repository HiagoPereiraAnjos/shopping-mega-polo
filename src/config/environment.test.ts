import { describe, expect, it } from 'vitest';
import {
  resolveAllowMockFallback,
  resolveShouldUseMockFallback,
} from './environment';

describe('environment mock fallback rules', () => {
  it('permite fallback em desenvolvimento por padrao', () => {
    expect(
      resolveAllowMockFallback({
        DEV: true,
        PROD: false,
      }),
    ).toBe(true);
  });

  it('nunca permite fallback em producao', () => {
    expect(
      resolveAllowMockFallback({
        DEV: false,
        PROD: true,
        VITE_ALLOW_MOCK_FALLBACK: 'true',
      }),
    ).toBe(false);
  });

  it('permite desabilitar fallback em desenvolvimento via env flag', () => {
    expect(
      resolveAllowMockFallback({
        DEV: true,
        PROD: false,
        VITE_ALLOW_MOCK_FALLBACK: 'false',
      }),
    ).toBe(false);
  });

  it('usa fallback somente quando solicitado e permitido', () => {
    expect(
      resolveShouldUseMockFallback(true, {
        DEV: true,
        PROD: false,
      }),
    ).toBe(true);

    expect(
      resolveShouldUseMockFallback(true, {
        DEV: false,
        PROD: true,
      }),
    ).toBe(false);

    expect(
      resolveShouldUseMockFallback(false, {
        DEV: true,
        PROD: false,
      }),
    ).toBe(false);
  });
});

