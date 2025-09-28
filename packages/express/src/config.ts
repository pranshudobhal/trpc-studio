import type { ExpressStudioOptions } from './types';

/**
 * Default configuration for Express adapter
 */
export const DEFAULT_EXPRESS_CONFIG: Required<
  Pick<
    ExpressStudioOptions,
    'trpcEndpoint' | 'studioPath' | 'introspectionPath' | 'serveStatic'
  >
> = {
  trpcEndpoint: '/api/trpc',
  studioPath: '/trpc-studio',
  introspectionPath: '/__trpc-studio__/introspection',
  serveStatic: true,
};

/**
 * Normalized Express studio options with defaults applied
 */
export interface NormalizedExpressStudioOptions extends ExpressStudioOptions {
  trpcEndpoint: string;
  studioPath: string;
  introspectionPath: string;
  serveStatic: boolean;
  enabled: boolean;
  getToken: (req: unknown) => string | null;
  staticAssetPath: string;
  expressRouter: any; // Will be created if not provided
}

/**
 * Normalize Express studio options with defaults
 */
export function normalizeExpressOptions(
  options: ExpressStudioOptions
): NormalizedExpressStudioOptions {
  return {
    ...DEFAULT_EXPRESS_CONFIG,
    router: options.router,
    enabled: options.enabled ?? process.env.NODE_ENV !== 'production',
    token: options.token ?? process.env.TRPC_STUDIO_TOKEN,
    getToken: options.getToken ?? (() => null),
    staticAssetPath: options.staticAssetPath ?? '',
    expressRouter: options.expressRouter ?? (undefined as any), // Will be created if not provided
  };
}
