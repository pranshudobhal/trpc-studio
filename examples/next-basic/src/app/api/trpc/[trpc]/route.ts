import { fetchRequestHandler } from '@trpc/server/adapters/fetch';
import { appRouter } from '~/server/api/root';

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => {
      // Mock context creation - in a real app this would:
      // 1. Extract JWT/session from headers
      // 2. Validate authentication
      // 3. Load user data from database
      // 4. Return context with user info

      // For demo purposes, we'll mock an authenticated user
      // In production, this would be based on actual auth headers
      const authHeader = req.headers.get('authorization');
      const mockUser = authHeader?.includes('Bearer mock-token')
        ? {
            id: 1,
            email: 'demo@example.com',
            role: 'user',
          }
        : undefined;

      return {
        user: mockUser,
      };
    },
  });

export { handler as GET, handler as POST };
