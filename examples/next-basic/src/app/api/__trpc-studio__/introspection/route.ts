import { createStudioHandler } from '@trpc-studio/next/app-router';
import { appRouter } from '~/server/api/root';

export const GET = createStudioHandler({
  router: appRouter,
  // In development, studio is enabled by default
  // In production, requires TRPC_STUDIO_ENABLED=true and TRPC_STUDIO_TOKEN
});
