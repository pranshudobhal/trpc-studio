import type { NextDevtoolsOptions } from './types.js';

/**
 * createDevtoolsHandler
 * Next.js App Router compatible route handler (GET/POST).
 * Placeholder implementation returning 501.
 */
export function createDevtoolsHandler(_opts: NextDevtoolsOptions) {
  return async function handler() {
    return new Response(JSON.stringify({
      ok: false,
      message: 'trpc-studio next adapter is not implemented yet.',
    }), { status: 501, headers: { 'content-type': 'application/json' } });
  };
}
