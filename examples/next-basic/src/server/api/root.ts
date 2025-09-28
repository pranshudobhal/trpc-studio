import { z } from 'zod';
import { createTRPCRouter, publicProcedure } from './trpc';

export const appRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ text: z.string() }))
    .output(z.object({ greeting: z.string() }))
    .meta({
      summary: 'Say hello',
      description: 'Returns a greeting message',
      tags: ['greeting'],
    })
    .query(({ input }) => {
      return {
        greeting: `Hello ${input.text}!`,
      };
    }),

  create: publicProcedure
    .input(z.object({ name: z.string().min(1) }))
    .output(z.object({ id: z.number(), name: z.string() }))
    .meta({
      summary: 'Create item',
      description: 'Creates a new item',
      tags: ['items'],
    })
    .mutation(({ input }) => {
      return {
        id: Math.floor(Math.random() * 1000),
        name: input.name,
      };
    }),

  internal: publicProcedure
    .input(z.object({ data: z.string() }))
    .output(z.object({ result: z.string() }))
    .meta({
      summary: 'Internal procedure',
      description: 'An internal procedure for testing',
      visibility: 'internal' as const,
    })
    .query(({ input }) => {
      return {
        result: `Internal: ${input.data}`,
      };
    }),

  hidden: publicProcedure
    .input(z.object({ secret: z.string() }))
    .output(z.object({ value: z.string() }))
    .meta({
      summary: 'Hidden procedure',
      description: 'A hidden procedure that should not appear in docs',
      visibility: 'hidden' as const,
    })
    .query(({ input }) => {
      return {
        value: `Secret: ${input.secret}`,
      };
    }),
});

export type AppRouter = typeof appRouter;
