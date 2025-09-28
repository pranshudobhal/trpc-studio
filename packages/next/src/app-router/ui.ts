import type { NextRequest } from 'next/server';
import { createStaticUIHandler } from '../shared/static';
import type { NextStudioOptions } from '../shared/config';

/**
 * Create a Next.js App Router route handler for tRPC Studio UI
 *
 * Usage in app/trpc-studio/page.tsx:
 * ```tsx
 * import { StudioPage } from '@trpc-studio/next/app-router';
 * import { appRouter } from '~/server/api/root';
 *
 * export default function Page() {
 *   return <StudioPage
 *     router={appRouter}
 *     // other options...
 *   />;
 * }
 * ```
 *
 * Or for a route handler approach in app/trpc-studio/route.ts:
 * ```ts
 * import { createStudioUIHandler } from '@trpc-studio/next/app-router';
 * import { appRouter } from '~/server/api/root';
 *
 * export const GET = createStudioUIHandler({
 *   router: appRouter,
 *   // other options...
 * });
 * ```
 */
export function createStudioUIHandler(options: NextStudioOptions) {
  const handler = createStaticUIHandler(options);

  return async function GET(request: NextRequest) {
    return handler(request);
  };
}

/**
 * React component for App Router pages
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
