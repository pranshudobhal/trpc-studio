// This route demonstrates where trpc-studio mounts.
// Once you publish @trpc-studio/next, replace with:
// import { createDevtoolsHandler } from '@trpc-studio/next';
// import { appRouter } from '@/server/trpc/router';
// export const GET = createDevtoolsHandler({
//   router: appRouter,
//   trpcEndpoint: process.env.TRPC_STUDIO_ENDPOINT ?? '/api/trpc',
//   enableInProd: process.env.TRPC_STUDIO_ENABLED === 'true',
//   token: process.env.TRPC_STUDIO_TOKEN,
// });
// export const POST = GET;

export async function GET() {
  return new Response(
    JSON.stringify({
      ok: false,
      message: 'Install @trpc-studio/next to enable the UI at /trpc-studio in this example app.',
    }),
    { status: 501, headers: { 'content-type': 'application/json' } }
  );
}
export const POST = GET;
