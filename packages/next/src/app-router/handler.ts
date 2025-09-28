import type { NextRequest } from 'next/server';
import { createIntrospectionHandler } from '../shared/handler';
import type { NextStudioOptions } from '../shared/config';

/**
 * Create a Next.js App Router route handler for tRPC Studio introspection
 *
 * Usage in app/api/__trpc-studio__/introspection/route.ts:
 * ```ts
 * import { createStudioHandler } from '@trpc-studio/next/app-router';
 * import { appRouter } from '~/server/api/root';
 *
 * export const GET = createStudioHandler({
 *   router: appRouter,
 *   // other options...
 * });
 * ```
 */
export function createStudioHandler(options: NextStudioOptions) {
  const handler = createIntrospectionHandler(options);

  return async function GET(request: NextRequest) {
    return handler(request);
  };
}

/**
 * Alternative export name for clarity
 */
export const createIntrospectionRouteHandler = createStudioHandler;
