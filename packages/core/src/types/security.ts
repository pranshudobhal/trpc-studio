// Security-related type definitions

/**
 * Token validation result
 */
export interface TokenValidationResult {
  valid: boolean;
  token?: string;
  error?: string;
}

/**
 * Security configuration for studio instances
 */
export interface SecurityConfig {
  enabled?: boolean;
  token?: string;
  getToken?: (req: unknown) => string | null;
}

/**
 * Environment detection utilities
 */
export interface EnvironmentInfo {
  isProduction: boolean;
  nodeEnv: string;
  studioEnabled: boolean;
  hasToken: boolean;
}

/**
 * Base options for all framework adapters
 */
export interface StudioOptions {
  router: unknown; // AnyRouter - keeping as unknown for framework flexibility
  trpcEndpoint?: string; // default: '/api/trpc'
  studioPath?: string; // default: '/trpc-studio'
  introspectionPath?: string; // default: '/__trpc-studio__/introspection'
  enabled?: boolean; // default: !isProduction (ignored in production unless TRPC_STUDIO_ENABLED=true)
  token?: string; // required when isProduction && enabled
  getToken?: (req: unknown) => string | null; // override header/cookie extraction
}

/**
 * Request context for token validation
 */
export interface RequestContext {
  headers: Record<string, string | string[] | undefined>;
  method: string;
  url: string;
}

/**
 * Token extraction sources
 */
export type TokenSource = 'authorization' | 'x-trpc-studio-token' | 'custom';

/**
 * Security validation context
 */
export interface SecurityContext {
  environment: EnvironmentInfo;
  request: RequestContext;
  options: StudioOptions;
}
