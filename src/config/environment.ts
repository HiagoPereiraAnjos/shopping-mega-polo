interface RuntimeEnvironmentLike {
  DEV?: boolean;
  PROD?: boolean;
  VITE_ALLOW_MOCK_FALLBACK?: string;
}

function normalizeEnvBoolean(value: string | undefined): boolean | null {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === 'true') {
    return true;
  }

  if (normalized === 'false') {
    return false;
  }

  return null;
}

export function resolveAllowMockFallback(env: RuntimeEnvironmentLike): boolean {
  const isDev = Boolean(env.DEV);

  if (!isDev) {
    return false;
  }

  const override = normalizeEnvBoolean(env.VITE_ALLOW_MOCK_FALLBACK);
  if (override === null) {
    return true;
  }

  return override;
}

export function resolveShouldUseMockFallback(
  requestedFallback: boolean | undefined,
  env: RuntimeEnvironmentLike,
): boolean {
  return Boolean(requestedFallback) && resolveAllowMockFallback(env);
}

export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;
export const allowMockFallback = resolveAllowMockFallback(import.meta.env);

export function shouldUseMockFallback(requestedFallback: boolean | undefined): boolean {
  return resolveShouldUseMockFallback(requestedFallback, import.meta.env);
}

