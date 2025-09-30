import { createLegacyStaticUIHandler } from '../shared/static';
import type { NextStudioOptions } from '../shared/config';

/**
 * Create a Next.js Pages Router page handler for tRPC Studio UI
 *
 * Usage in pages/trpc-studio.tsx:
 * ```tsx
 * import { StudioPage } from '@trpc-studio/next/pages-router';
 * import { appRouter } from '~/server/api/root';
 *
 * export default function TrpcStudioPage() {
 *   return <StudioPage
 *     router={appRouter}
 *     // other options...
 *   />;
 * }
 * ```
 *
 * Or for an API route approach in pages/api/trpc-studio.ts:
 * ```ts
 * import { createStudioUIHandler } from '@trpc-studio/next/pages-router';
 * import { appRouter } from '~/server/api/root';
 *
 * export default createStudioUIHandler({
 *   router: appRouter,
 *   // other options...
 * });
 * ```
 */
export function createStudioUIHandler(options: NextStudioOptions) {
  return createLegacyStaticUIHandler(options);
}

/**
 * React component for Pages Router
 * This will be enhanced when the UI package is ready
 */
export function StudioPage(options: NextStudioOptions) {
  // For now, return configuration for the React app
  // This will be replaced with the actual React app when UI is ready
  return {
    introspectionUrl:
      options.introspectionPath || '/__trpc-studio__/introspection',
    trpcEndpoint: options.trpcEndpoint || '/api/trpc',
    token: options.token || null,
  };
}
