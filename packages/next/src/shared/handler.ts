import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  buildIntrospection,
  validateStudioConfiguration,
  shouldEnableStudio,
  getEffectiveToken,
  validateRequestToken,
  type RequestContext,
} from '@trpc-studio/core';
import type { NextStudioOptions } from './config';
import { normalizeNextOptions } from './config';

/**
 * Create introspection handler for Next.js
 */
export function createIntrospectionHandler(options: NextStudioOptions) {
  const config = normalizeNextOptions(options);

  return async function introspectionHandler(request: NextRequest) {
    try {
      // Check if studio should be enabled
      if (!shouldEnableStudio(config)) {
        return new NextResponse(null, { status: 404 });
      }

      // Validate configuration
      const validation = validateStudioConfiguration(config);
      if (!validation.canEnable) {
        return new NextResponse(null, { status: 404 });
      }

      // Only allow GET requests
      if (request.method !== 'GET') {
        return new NextResponse(null, {
          status: 405,
          headers: { Allow: 'GET' },
        });
      }

      // Validate token if required
      if (validation.requiresToken) {
        const effectiveToken = getEffectiveToken(config);
        const requestContext: RequestContext = {
          headers: Object.fromEntries(request.headers.entries()),
          method: request.method,
          url: request.url,
        };

        const tokenValidation = validateRequestToken(
          requestContext,
          { ...config, token: effectiveToken },
          request
        );

        if (!tokenValidation.valid) {
          return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      }

      // Build introspection data
      const introspection = buildIntrospection(config.router);

      return NextResponse.json(introspection, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    } catch (error) {
      console.error('Studio introspection error:', error);
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  };
}

/**
 * Legacy handler for Pages Router API routes
 */
export function createLegacyIntrospectionHandler(options: NextStudioOptions) {
  const config = normalizeNextOptions(options);

  return async function legacyIntrospectionHandler(
    req: any, // NextApiRequest
    res: any // NextApiResponse
  ) {
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
        res.setHeader('Allow', 'GET');
        return res.status(405).end();
      }

      // Validate token if required
      if (validation.requiresToken) {
        const effectiveToken = getEffectiveToken(config);
        const requestContext: RequestContext = {
          headers: req.headers,
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

      // Build introspection data
      const introspection = buildIntrospection(config.router);

      // Set cache headers
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.status(200).json(introspection);
    } catch (error) {
      console.error('Studio introspection error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  };
}
