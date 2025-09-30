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
import { getCorsHeaders, handleCorsPreflight } from './cors';

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

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return handleCorsPreflight(request, config.cors);
      }

      // Only allow GET requests (after handling OPTIONS)
      if (request.method !== 'GET') {
        const corsHeaders = getCorsHeaders(request, config.cors);
        return new NextResponse(null, {
          status: 405,
          headers: {
            Allow: 'GET, OPTIONS',
            ...corsHeaders,
          },
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
          const corsHeaders = getCorsHeaders(request, config.cors);
          return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
            status: 403,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          });
        }
      }

      // Build introspection data
      const introspection = buildIntrospection(config.router);

      // Get CORS headers for the response
      const corsHeaders = getCorsHeaders(request, config.cors);

      return NextResponse.json(introspection, {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
          ...corsHeaders,
        },
      });
    } catch (error) {
      console.error('Studio introspection error:', error);
      const corsHeaders = getCorsHeaders(request, config.cors);
      return new NextResponse(
        JSON.stringify({ error: 'Internal server error' }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
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
    req: unknown, // NextApiRequest
    res: unknown // NextApiResponse
  ) {
    try {
      // Check if studio should be enabled
      if (!shouldEnableStudio(config)) {
        return (res as any).status(404).end();
      }

      // Validate configuration
      const validation = validateStudioConfiguration(config);
      if (!validation.canEnable) {
        return (res as any).status(404).end();
      }

      // Only allow GET requests
      if ((req as any).method !== 'GET') {
        (res as any).setHeader('Allow', 'GET');
        return (res as any).status(405).end();
      }

      // Validate token if required
      if (validation.requiresToken) {
        const effectiveToken = getEffectiveToken(config);
        const requestContext: RequestContext = {
          headers: (req as any).headers,
          method: (req as any).method,
          url: (req as any).url,
        };

        const tokenValidation = validateRequestToken(
          requestContext,
          { ...config, token: effectiveToken },
          req
        );

        if (!tokenValidation.valid) {
          return (res as any).status(403).json({ error: 'Unauthorized' });
        }
      }

      // Build introspection data
      const introspection = buildIntrospection(config.router);

      // Set cache headers
      (res as any).setHeader(
        'Cache-Control',
        'no-cache, no-store, must-revalidate'
      );
      (res as any).setHeader('Pragma', 'no-cache');
      (res as any).setHeader('Expires', '0');

      return (res as any).status(200).json(introspection);
    } catch (error) {
      console.error('Studio introspection error:', error);
      return (res as any).status(500).json({ error: 'Internal server error' });
    }
  };
}
