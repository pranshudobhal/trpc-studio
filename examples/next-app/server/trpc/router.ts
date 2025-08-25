import { initTRPC } from '@trpc/server';
import superjson from 'superjson';
import { z } from 'zod';

const t = initTRPC.create({
  transformer: superjson,
});

export const appRouter = t.router({
  ping: t.procedure.query(() => ({ ok: true, now: new Date().toISOString() })),
  user: t.router({
    getById: t.procedure
      .meta({
        summary: 'Fetch a user by id',
        description: 'Returns an example user payload.',
        tags: ['user'],
        visibility: 'public',
        authRequired: false,
        examples: [{ input: { id: '00000000-0000-0000-0000-000000000000' } }],
      })
      .input(z.object({ id: z.string().uuid() }))
      .output(
        z.object({
          id: z.string().uuid(),
          name: z.string(),
          createdAt: z.date(),
        })
      )
      .query(({ input }) => ({
        id: input.id,
        name: 'Ada Lovelace',
        createdAt: new Date(),
      })),
  }),
});

export type AppRouter = typeof appRouter;
