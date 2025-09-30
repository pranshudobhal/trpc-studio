const { z } = require('zod');
const { initTRPC } = require('@trpc/server');

// Create a simple router for debugging
const t = initTRPC.create();

const testRouter = t.router({
  hello: t.procedure
    .input(z.object({ name: z.string() }))
    .output(z.object({ message: z.string() }))
    .meta({
      summary: 'Say hello',
      description: 'Returns a greeting message',
      tags: ['greeting'],
    })
    .query(({ input }) => ({
      message: `Hello, ${input.name}!`,
    })),
});

console.log('Router structure:');
console.log('Router:', testRouter);
console.log('Router._def:', testRouter._def);
console.log('Router._def.procedures:', testRouter._def?.procedures);
console.log('Router._def.record:', testRouter._def?.record);

// Try to import and use the buildIntrospection function
try {
  const { buildIntrospection } = require('./dist/handlers/introspection');
  console.log('buildIntrospection function found');

  const result = buildIntrospection(testRouter);
  console.log('Introspection result:', JSON.stringify(result, null, 2));
} catch (error) {
  console.error('Error with introspection:', error);
}
