import type { Introspection } from './types.js';

/**
 * buildIntrospection
 * NOTE: Placeholder — implement Zod → JSON Schema and router walk.
 */
export function buildIntrospection(_router: unknown): Introspection {
  return {
    routers: {},
    meta: {
      generatedAt: new Date().toISOString(),
      transformer: 'superjson',
    },
  };
}
