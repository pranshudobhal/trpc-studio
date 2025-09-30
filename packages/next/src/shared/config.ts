import type { StudioOptions } from '@trpc-studio/core';

/**
 * CORS configuration for the studio API endpoints
 */
export interface CorsOptions {
  /**
   * Allowed origins. Can be:
   * - false: Disable CORS
   * - true: Allow all origins (*)
   * - string: Single origin
   * - string[]: Multiple origins
   * - function: Custom origin validator
   */
  origin?: boolean | string | string[] | ((origin: string) => boolean);

  /**
   * Access-Control-Allow-Credentials
   * @default true
   */
  credentials?: boolean;

  /**
   * Access-Control-Allow-Headers
   * @default ['authorization', 'content-type', 'x-trpc-studio-token']
   */
  allowedHeaders?: string[];

  /**
   * Access-Control-Allow-Methods
   * @default ['GET', 'OPTIONS']
   */
  methods?: string[];

  /**
   * Access-Control-Max-Age
   * @default 86400
   */
  maxAge?: number;
}

/**
 * Next.js specific studio options
 */
export interface NextStudioOptions extends StudioOptions {
  /**
   * Whether to serve static UI assets
   * @default true
   */
  serveStatic?: boolean;

  /**
   * Custom static asset path (for advanced use cases)
   */
  staticAssetPath?: string;

  /**
   * CORS configuration for API endpoints
   * @default { origin: true, credentials: true }
   */
  cors?: CorsOptions;
}

/**
 * Default configuration for Next.js adapter
 */
export const DEFAULT_NEXT_CONFIG: Required<
  Pick<
    NextStudioOptions,
    'trpcEndpoint' | 'studioPath' | 'introspectionPath' | 'serveStatic' | 'cors'
  >
> = {
  trpcEndpoint: '/api/trpc',
  studioPath: '/trpc-studio',
  introspectionPath: '/__trpc-studio__/introspection',
  serveStatic: true,
  cors: {
    origin: true,
    credentials: true,
    allowedHeaders: ['authorization', 'content-type', 'x-trpc-studio-token'],
    methods: ['GET', 'OPTIONS'],
    maxAge: 86400,
  },
};

/**
 * Normalize Next.js studio options with defaults
 */
export function normalizeNextOptions(
  options: NextStudioOptions
): Required<NextStudioOptions> {
  return {
    ...DEFAULT_NEXT_CONFIG,
    router: options.router,
    enabled: options.enabled ?? process.env.NODE_ENV !== 'production',
    token: options.token ?? process.env.TRPC_STUDIO_TOKEN ?? '',
    getToken: options.getToken ?? (() => null),
    staticAssetPath: options.staticAssetPath ?? '',
    cors: {
      ...DEFAULT_NEXT_CONFIG.cors,
      ...options.cors,
    },
  };
}
