import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import {
  shouldEnableStudio,
  validateStudioConfiguration,
  getEffectiveToken,
  validateRequestToken,
  type RequestContext,
} from '@trpc-studio/core';
import type { NextStudioOptions } from './config';
import { normalizeNextOptions } from './config';

/**
 * Create static UI handler for Next.js App Router
 */
export function createStaticUIHandler(options: NextStudioOptions) {
  const config = normalizeNextOptions(options);

  return async function staticUIHandler(request: NextRequest) {
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

      // Only allow GET requests for UI
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
          return new NextResponse(null, { status: 403 });
        }
      }

      // Return the studio UI HTML
      const html = generateStudioHTML(config);

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      });
    } catch (error) {
      console.error('Studio UI error:', error);
      return new NextResponse(null, { status: 500 });
    }
  };
}

/**
 * Legacy static UI handler for Pages Router
 */
export function createLegacyStaticUIHandler(options: NextStudioOptions) {
  const config = normalizeNextOptions(options);

  return async function legacyStaticUIHandler(
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

      // Only allow GET requests for UI
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
          return res.status(403).end();
        }
      }

      // Return the studio UI HTML
      const html = generateStudioHTML(config);

      res.setHeader('Content-Type', 'text/html');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');

      return res.status(200).send(html);
    } catch (error) {
      console.error('Studio UI error:', error);
      return res.status(500).end();
    }
  };
}

/**
 * Generate the studio UI HTML
 */
function generateStudioHTML(config: Required<NextStudioOptions>): string {
  const { introspectionPath, trpcEndpoint, token } = config;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>tRPC Studio</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: #f8fafc;
      color: #1e293b;
    }
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      flex-direction: column;
      gap: 1rem;
    }
    .spinner {
      width: 2rem;
      height: 2rem;
      border: 2px solid #e2e8f0;
      border-top: 2px solid #3b82f6;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    @media (prefers-color-scheme: dark) {
      body {
        background: #0f172a;
        color: #f1f5f9;
      }
      .spinner {
        border-color: #334155;
        border-top-color: #60a5fa;
      }
    }
  </style>
</head>
<body>
  <div id="trpc-studio-root">
    <div class="loading">
      <div class="spinner"></div>
      <p>Loading tRPC Studio...</p>
    </div>
  </div>
  
  <script>
    // Configuration for the studio app
    window.__TRPC_STUDIO_CONFIG__ = {
      introspectionUrl: '${introspectionPath}',
      trpcEndpoint: '${trpcEndpoint}',
      token: ${token ? `'${token}'` : 'null'}
    };
    
    // TODO: Load the actual React app bundle when UI package is ready
    // For now, show a placeholder
    setTimeout(() => {
      document.getElementById('trpc-studio-root').innerHTML = \`
        <div style="padding: 2rem; text-align: center;">
          <h1>tRPC Studio</h1>
          <p>UI components are being implemented in task 8-11.</p>
          <p>Configuration loaded:</p>
          <pre style="background: #f1f5f9; padding: 1rem; border-radius: 0.5rem; text-align: left; display: inline-block;">
Introspection URL: ${introspectionPath}
tRPC Endpoint: ${trpcEndpoint}
Token: ${token ? '[CONFIGURED]' : '[NOT SET]'}
          </pre>
        </div>
      \`;
    }, 1000);
  </script>
</body>
</html>`;
}
