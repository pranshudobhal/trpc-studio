// Express adapter exports for @trpc-studio/express

// Main middleware export
export { studioExpress, createStudioRouter } from './middleware/studio';

// Handler exports
export * from './handlers';

// Type exports
export type {
  ExpressStudioOptions,
  ExpressRequestContext,
  ExpressMiddleware,
  ExpressRouteHandler,
} from './types';

// Configuration exports
export { normalizeExpressOptions, DEFAULT_EXPRESS_CONFIG } from './config';
