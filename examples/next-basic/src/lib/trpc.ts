import { createTRPCReact } from '@trpc/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import superjson from 'superjson';
import type { AppRouter } from '~/server/api/root';

function getBaseUrl() {
  if (typeof window !== 'undefined') return ''; // browser should use relative url
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`; // SSR should use vercel url
  return `http://localhost:${process.env.PORT ?? 3000}`; // dev SSR should use localhost
}

export const trpc = createTRPCReact<AppRouter>();

// Export a function to create the client
export const createTrpcClient = () =>
  createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${getBaseUrl()}/api/trpc`,
        transformer: superjson,
        headers() {
          // Add mock auth header for protected procedures
          // In a real app, this would come from your auth system
          return {
            authorization: 'Bearer mock-token',
          };
        },
      }),
    ],
  });
