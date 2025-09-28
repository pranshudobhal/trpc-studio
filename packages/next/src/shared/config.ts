import type { StudioOptions } from '@trpc-studio/core';

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
}

/**
 * Default configuration for Next.js adapter
 */
export const DEFAULT_NEXT_CONFIG: Required<
  Pick<
    NextStudioOptions,
    'trpcEndpoint' | 'studioPath' | 'introspectionPath' | 'serveStatic'
  >
> = {
  trpcEndpoint: '/api/trpc',
  studioPath: '/trpc-studio',
  introspectionPath: '/__trpc-studio__/introspection',
  serveStatic: true,
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
  };
}
