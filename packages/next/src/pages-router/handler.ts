import { createLegacyIntrospectionHandler } from '../shared/handler';
import type { NextStudioOptions } from '../shared/config';

/**
 * Create a Next.js Pages Router API handler for tRPC Studio introspection
 *
 * Usage in pages/api/__trpc-studio__/introspection.ts:
 * ```ts
 * import { createStudioHandler } from '@trpc-studio/next/pages-router';
 * import { appRouter } from '~/server/api/root';
 *
 * export default createStudioHandler({
 *   router: appRouter,
 *   // other options...
 * });
 * ```
 */
export function createStudioHandler(options: NextStudioOptions) {
  return createLegacyIntrospectionHandler(options);
}

/**
 * Alternative export name for clarity
 */
export const createIntrospectionApiHandler = createStudioHandler;
