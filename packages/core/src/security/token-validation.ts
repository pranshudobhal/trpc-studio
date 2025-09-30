import type {
  TokenValidationResult,
  RequestContext,
  TokenSource,
  StudioOptions,
} from '../types/security';

/**
 * Extracts token from Authorization Bearer header
 */
export function extractBearerToken(
  authHeader: string | string[] | undefined
): string | null {
  if (!authHeader) return null;

  const header = Array.isArray(authHeader) ? authHeader[0] : authHeader;
  if (!header || typeof header !== 'string') return null;

  const match = header.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}

/**
 * Extracts token from x-trpc-studio-token header
 */
export function extractStudioToken(
  studioHeader: string | string[] | undefined
): string | null {
  if (!studioHeader) return null;

  const header = Array.isArray(studioHeader) ? studioHeader[0] : studioHeader;
  return header && typeof header === 'string' ? header : null;
}

/**
 * Extracts token from request headers using multiple sources
 */
export function extractToken(
  headers: Record<string, string | string[] | undefined>,
  getToken?: (req: unknown) => string | null,
  request?: unknown
): { token: string | null; source: TokenSource } {
  // Try custom token extraction first if provided
  if (getToken && request) {
    try {
      const customToken = getToken(request);
      // If custom extraction is provided, it's exclusive - don't fall back
      return { token: customToken, source: 'custom' };
    } catch (error) {
      // Only fall back to standard headers if custom extraction throws an error
      // This handles unexpected errors in custom extraction logic
    }
  }

  // Try Authorization Bearer token
  const bearerToken = extractBearerToken(headers.authorization);
  if (bearerToken) {
    return { token: bearerToken, source: 'authorization' };
  }

  // Try x-trpc-studio-token header
  const studioToken = extractStudioToken(headers['x-trpc-studio-token']);
  if (studioToken) {
    return { token: studioToken, source: 'x-trpc-studio-token' };
  }

  return { token: null, source: 'authorization' };
}

/**
 * Validates a token against the expected token
 */
export function validateToken(
  providedToken: string | null,
  expectedToken: string | undefined
): TokenValidationResult {
  if (!expectedToken) {
    return {
      valid: false,
      error: 'No token configured for validation',
    };
  }

  if (!providedToken) {
    return {
      valid: false,
      error: 'No token provided',
    };
  }

  if (providedToken !== expectedToken) {
    return {
      valid: false,
      error: 'Invalid token',
    };
  }

  return {
    valid: true,
    token: providedToken,
  };
}

/**
 * Validates request token using multiple extraction methods
 */
export function validateRequestToken(
  context: RequestContext,
  options: StudioOptions,
  request?: unknown
): TokenValidationResult {
  const { token: extractedToken } = extractToken(
    context.headers,
    options.getToken,
    request
  );

  return validateToken(extractedToken, options.token);
}
