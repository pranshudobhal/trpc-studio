import type { Request, Response, NextFunction, Router } from 'express';
import { Router as createRouter } from 'express';
import { join } from 'path';
import type { ExpressStudioOptions, ExpressMiddleware } from '../types';
import { normalizeExpressOptions } from '../config';
import { createIntrospectionHandler } from '../handlers/introspection';
import { createStaticHandler, createStudioIndexHtml } from '../handlers/static';
import {
  shouldEnableStudio,
  validateStudioConfiguration,
  getEffectiveToken,
  validateRequestToken,
  type RequestContext,
} from '@trpc-studio/core';

/**
 * Create Express middleware for tRPC Studio
 */
export function studioExpress(
  options: ExpressStudioOptions
): ExpressMiddleware {
  const config = normalizeExpressOptions(options);
  const router = config.expressRouter || createRouter();

  // Create handlers
  const introspectionHandler = createIntrospectionHandler(config);

  // Determine static asset root
  // In a real implementation, this would point to the built UI assets
  const staticRoot =
    config.staticAssetPath || join(__dirname, '../../../ui/dist');

  // Mount introspection endpoint
  router.get(config.introspectionPath, introspectionHandler);

  // Handle non-GET requests to introspection endpoint
  router.all(config.introspectionPath, (req: Request, res: Response) => {
    if (!shouldEnableStudio(config)) {
      return res.status(404).end();
    }
    res.set('Allow', 'GET');
    return res.status(405).end();
  });

  // Mount static UI assets if enabled
  if (config.serveStatic) {
    // Serve the main Studio page
    router.get(config.studioPath, (req: Request, res: Response) => {
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

      // For now, serve a simple HTML page
      // In a real implementation, this would serve the built React app
      const html = createStudioIndexHtml(config);
      res.set('Content-Type', 'text/html');
      return res.send(html);
    });

    // Serve static assets under the studio path
    const staticHandler = createStaticHandler(config, staticRoot);
    router.use(config.studioPath, staticHandler);
  }

  // Return the middleware function
  return function studioMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
  ) {
    // Check if the request matches any of our routes
    const isStudioRoute =
      req.path === config.studioPath ||
      req.path.startsWith(`${config.studioPath}/`) ||
      req.path === config.introspectionPath;

    if (isStudioRoute) {
      // Use our router to handle studio routes
      return router(req, res, next);
    }

    // Not a studio route, continue to next middleware
    next();
  };
}

/**
 * Create a standalone Express router for tRPC Studio
 * Useful when you want more control over mounting
 */
export function createStudioRouter(options: ExpressStudioOptions): Router {
  const config = normalizeExpressOptions(options);
  const router = createRouter();

  // Create handlers
  const introspectionHandler = createIntrospectionHandler(config);

  // Determine static asset root
  const staticRoot =
    config.staticAssetPath || join(__dirname, '../../../ui/dist');

  // Mount introspection endpoint
  router.get(config.introspectionPath, introspectionHandler);

  // Handle non-GET requests to introspection endpoint
  router.all(config.introspectionPath, (req: Request, res: Response) => {
    if (!shouldEnableStudio(config)) {
      return res.status(404).end();
    }
    res.set('Allow', 'GET');
    return res.status(405).end();
  });

  // Mount static UI assets if enabled
  if (config.serveStatic) {
    // Serve the main Studio page
    router.get(config.studioPath, (req: Request, res: Response) => {
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

      const html = createStudioIndexHtml(config);
      res.set('Content-Type', 'text/html');
      return res.send(html);
    });

    // Serve static assets under the studio path
    const staticHandler = createStaticHandler(config, staticRoot);
    router.use(config.studioPath, staticHandler);
  }

  return router;
}
