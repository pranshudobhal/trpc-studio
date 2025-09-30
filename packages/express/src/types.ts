import type { StudioOptions } from '@trpc-studio/core';
import type { Request, Response, NextFunction, Router } from 'express';

/**
 * Express-specific studio options
 */
export interface ExpressStudioOptions extends Omit<StudioOptions, 'router'> {
  /**
   * tRPC router instance
   */
  router: unknown; // AnyRouter - keeping as unknown for framework flexibility

  /**
   * Whether to serve static UI assets
   * @default true
   */
  serveStatic?: boolean;

  /**
   * Custom static asset path (for advanced use cases)
   */
  staticAssetPath?: string;

  /**
   * Custom Express router instance (optional)
   */
  expressRouter?: Router;
}

/**
 * Express request context for token validation
 */
export interface ExpressRequestContext {
  req: Request;
  res: Response;
  next: NextFunction;
}

/**
 * Express middleware function type
 */
export type ExpressMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => void | Promise<void>;

/**
 * Express route handler function type
 */
export type ExpressRouteHandler = (
  req: Request,
  res: Response
) => void | Promise<void>;
