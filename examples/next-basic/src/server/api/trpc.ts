import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';

// Mock context interface - in a real app this would include user session, database, etc.
interface Context {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const publicProcedure = t.procedure;

// Protected procedure that requires authentication
export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  // Mock authentication check - in a real app this would validate JWT, session, etc.
  if (!ctx.user) {
    throw new TRPCError({
      code: 'UNAUTHORIZED',
      message: 'Authentication required',
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});
