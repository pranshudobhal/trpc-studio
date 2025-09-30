import { AppRouter } from '@trpc-studio/next';
import { appRouter } from '~/server/api/root';

export const GET = AppRouter.createStudioHandler({
  router: appRouter,
  // In development, studio is enabled by default
  // In production, requires TRPC_STUDIO_ENABLED=true and TRPC_STUDIO_TOKEN
});
