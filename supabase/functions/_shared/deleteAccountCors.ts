export type DeleteAccountCorsDecision =
  | { allowed: true; headers: Record<string, string> }
  | {
      allowed: false;
      status: 403 | 500;
      reason: 'origin_not_allowed' | 'configuration';
      headers: Record<string, string>;
    };

const baseCorsHeaders = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function normalizeConfiguredOrigin(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (['capacitor:', 'ionic:'].includes(parsed.protocol)) {
      if (!parsed.hostname || parsed.username || parsed.password || (parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) return null;
      return `${parsed.protocol}//${parsed.host}`;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    if (parsed.username || parsed.password || parsed.pathname !== '/' || parsed.search || parsed.hash) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function normalizeRequestOrigin(value: string): string | null {
  try {
    const parsed = new URL(value);
    if (['capacitor:', 'ionic:'].includes(parsed.protocol)) {
      if (!parsed.hostname || parsed.username || parsed.password || (parsed.pathname && parsed.pathname !== '/') || parsed.search || parsed.hash) return null;
      return `${parsed.protocol}//${parsed.host}`;
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) return null;
    return parsed.origin;
  } catch {
    return null;
  }
}

function parseAllowedOrigins(serialized: string | undefined): Set<string> | null {
  if (!serialized?.trim()) return null;
  const origins = serialized.split(',').map(normalizeConfiguredOrigin);
  if (origins.length === 0 || origins.some((origin) => origin === null)) return null;
  return new Set(origins as string[]);
}

/**
 * Browser requests require an exact configured origin. Requests without an
 * Origin header remain valid for native bearer clients that do not participate
 * in browser CORS. Missing or malformed web configuration fails closed.
 */
export function resolveDeleteAccountCors(
  request: Request,
  serializedAllowedOrigins: string | undefined,
): DeleteAccountCorsDecision {
  const origin = request.headers.get('Origin');
  if (!origin) return { allowed: true, headers: { ...baseCorsHeaders } };

  const allowedOrigins = parseAllowedOrigins(serializedAllowedOrigins);
  if (!allowedOrigins) {
    return {
      allowed: false,
      status: 500,
      reason: 'configuration',
      headers: { ...baseCorsHeaders },
    };
  }

  const normalizedOrigin = normalizeRequestOrigin(origin);
  if (!normalizedOrigin || !allowedOrigins.has(normalizedOrigin)) {
    return {
      allowed: false,
      status: 403,
      reason: 'origin_not_allowed',
      headers: { ...baseCorsHeaders },
    };
  }

  return {
    allowed: true,
    headers: {
      ...baseCorsHeaders,
      'Access-Control-Allow-Origin': origin,
      Vary: 'Origin',
    },
  };
}
