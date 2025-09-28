import { createStudioUIHandler } from '@trpc-studio/next/app-router';
import { appRouter } from '~/server/api/root';

// For now, we'll use the route handler approach since the UI components aren't ready yet
const handler = createStudioUIHandler({
  router: appRouter,
});

export default async function TrpcStudioPage() {
  // This is a temporary implementation until the UI package is ready
  // In the final version, this will render the actual React Studio app
  return (
    <div style={{ padding: '2rem', fontFamily: 'system-ui' }}>
      <h1>tRPC Studio</h1>
      <p>Studio UI will be available after tasks 8-11 are completed.</p>
      <p>For now, you can access the introspection data at:</p>
      <a
        href="/__trpc-studio__/introspection"
        target="_blank"
        rel="noopener noreferrer"
      >
        /__trpc-studio__/introspection
      </a>
    </div>
  );
}
