import type { Request, Response } from 'express';
import {
  buildIntrospection,
  validateStudioConfiguration,
  shouldEnableStudio,
  getEffectiveToken,
  validateRequestToken,
  type RequestContext,
} from '@trpc-studio/core';
import type { ExpressStudioOptions } from '../types';
import {
  normalizeExpressOptions,
  type NormalizedExpressStudioOptions,
} from '../config';

/**
 * Create introspection route handler for Express
 */
export function createIntrospectionHandler(options: ExpressStudioOptions) {
  const config = normalizeExpressOptions(options);

  return async function introspectionHandler(req: Request, res: Response) {
    try {
      // Check if studio should be enabled
      if (!shouldEnableStudio(config)) {
        return res.status(404).end();
      }

      // Validate configuration
      const validation = validateStudioConfiguration(config);
      if (!validation.canEnable) {
        return res.status(404).end();
      }

      // Only allow GET requests
      if (req.method !== 'GET') {
        res.set('Allow', 'GET');
        return res.status(405).end();
      }

      // Validate token if required
      if (validation.requiresToken) {
        const effectiveToken = getEffectiveToken(config);
        const requestContext: RequestContext = {
          headers: req.headers as Record<string, string | string[] | undefined>,
          method: req.method,
          url: req.url,
        };

        const tokenValidation = validateRequestToken(
          requestContext,
          { ...config, token: effectiveToken },
          req
        );

        if (!tokenValidation.valid) {
          return res.status(403).json({ error: 'Unauthorized' });
        }
      } else {
        // In development, validate token only if one is provided
        const effectiveToken = getEffectiveToken(config);
        if (effectiveToken) {
          const requestContext: RequestContext = {
            headers: req.headers as Record<
              string,
              string | string[] | undefined
            >,
            method: req.method,
            url: req.url,
          };

          const tokenValidation = validateRequestToken(
            requestContext,
            { ...config, token: effectiveToken },
            req
          );

          if (!tokenValidation.valid) {
            return res.status(403).json({ error: 'Unauthorized' });
          }
        }
      }

      // Build introspection data
      const introspection = buildIntrospection(config.router);

      // Set cache headers
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
        'Content-Type': 'application/json',
      });

      return res.status(200).json(introspection);
    } catch (error) {
      console.error('Studio introspection error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
