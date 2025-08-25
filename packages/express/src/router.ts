import type { ExpressDevtoolsOptions } from './types.js';
import { Router } from 'express';

/**
 * devtoolsExpress
 * Placeholder implementation that mounts a 501 route.
 */
export function devtoolsExpress(_opts: ExpressDevtoolsOptions) {
  const r = Router();
  r.get('/', (_req, res) => {
    res.status(501).json({
      ok: false,
      message: 'trpc-studio express adapter is not implemented yet.',
    });
  });
  return r;
}
