// Next.js adapter exports for @trpc-studio/next

// Main exports (convenience)
export * from './shared';

// App Router specific exports
export * as AppRouter from './app-router';

// Pages Router specific exports
export * as PagesRouter from './pages-router';

// Re-export types for convenience
export type { NextStudioOptions } from './shared/config';
