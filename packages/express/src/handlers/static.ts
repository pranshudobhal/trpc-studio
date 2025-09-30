import type { Request, Response, NextFunction } from 'express';
import { join } from 'path';
import { readFileSync, existsSync } from 'fs';
import {
  shouldEnableStudio,
  validateStudioConfiguration,
  getEffectiveToken,
  validateRequestToken,
  type RequestContext,
} from '@trpc-studio/core';
import type { ExpressStudioOptions } from '../types';
import type { NormalizedExpressStudioOptions } from '../config';

/**
 * MIME type mapping for static assets
 */
const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
};

/**
 * Get MIME type from file extension
 */
function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().substring(filePath.lastIndexOf('.'));
  return MIME_TYPES[ext] || 'application/octet-stream';
}

/**
 * Create static asset handler for Express
 */
export function createStaticHandler(
  config: NormalizedExpressStudioOptions,
  staticRoot: string
) {
  return async function staticHandler(
    req: Request,
    res: Response,
    next: NextFunction
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

      // Determine file path
      let filePath = req.path;

      // Remove studio path prefix if present
      if (filePath.startsWith(config.studioPath)) {
        filePath = filePath.substring(config.studioPath.length);
      }

      // Default to index.html for root requests
      if (filePath === '' || filePath === '/') {
        filePath = '/index.html';
      }

      // Construct full file path
      const fullPath = join(staticRoot, filePath);

      // Security check: ensure file is within static root
      if (!fullPath.startsWith(staticRoot)) {
        return res.status(404).end();
      }

      // Check if file exists
      if (!existsSync(fullPath)) {
        return res.status(404).end();
      }

      try {
        // Read and serve file
        const content = readFileSync(fullPath);
        const mimeType = getMimeType(fullPath);

        res.set({
          'Content-Type': mimeType,
          'Cache-Control': 'public, max-age=3600', // Cache static assets for 1 hour
        });

        return res.send(content);
      } catch (fileError) {
        console.error('Error reading static file:', fileError);
        return res.status(404).end();
      }
    } catch (error) {
      console.error('Static handler error:', error);
      return res.status(500).end();
    }
  };
}

/**
 * Create a simple HTML page that loads the Studio UI
 */
export function createStudioIndexHtml(
  config: NormalizedExpressStudioOptions
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>tRPC Studio</title>
    <style>
        body {
            margin: 0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
            background: #f8fafc;
            color: #1e293b;
        }
        .container {
            max-width: 800px;
            margin: 2rem auto;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 2rem;
        }
        .title {
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: 0.5rem;
        }
        .subtitle {
            color: #64748b;
            font-size: 1.1rem;
        }
        .loading {
            text-align: center;
            padding: 2rem;
        }
        .spinner {
            display: inline-block;
            width: 2rem;
            height: 2rem;
            border: 3px solid #e2e8f0;
            border-top: 3px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        .error {
            background: #fef2f2;
            border: 1px solid #fecaca;
            color: #dc2626;
            padding: 1rem;
            border-radius: 6px;
            margin-top: 1rem;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="title">tRPC Studio</h1>
            <p class="subtitle">Interactive API Documentation & Playground</p>
        </div>
        <div class="loading">
            <div class="spinner"></div>
            <p>Loading Studio...</p>
        </div>
        <div id="error" class="error" style="display: none;">
            <strong>Error:</strong> Failed to load tRPC Studio. Please check your configuration.
        </div>
    </div>

    <script>
        // Configuration
        const config = {
            introspectionUrl: '${config.introspectionPath}',
            trpcEndpoint: '${config.trpcEndpoint}',
        };

        // This is a placeholder for the actual Studio UI
        // In a real implementation, this would load the React app
        setTimeout(() => {
            document.querySelector('.loading').style.display = 'none';
            document.querySelector('#error').style.display = 'block';
            document.querySelector('#error').innerHTML = 
                '<strong>Note:</strong> This is a placeholder. The actual Studio UI will be implemented when the @trpc-studio/ui package is complete.';
        }, 2000);
    </script>
</body>
</html>`;
}
