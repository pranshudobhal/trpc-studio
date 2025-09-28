# @trpc-studio/next

Next.js adapter for tRPC Studio - provides documentation and interactive playground for tRPC APIs.

## Installation

```bash
npm install @trpc-studio/next
# or
pnpm add @trpc-studio/next
# or
yarn add @trpc-studio/next
```

## Quick Start

### App Router (Next.js 13+)

#### 1. Create Introspection Route

Create `app/api/__trpc-studio__/introspection/route.ts`:

```typescript
import { createStudioHandler } from '@trpc-studio/next/app-router';
import { appRouter } from '~/server/api/root';

export const GET = createStudioHandler({
  router: appRouter,
});
```

#### 2. Create Studio UI Page

Create `app/trpc-studio/page.tsx`:

```typescript
import { StudioPage } from '@trpc-studio/next/app-router';
import { appRouter } from '~/server/api/root';

export default function TrpcStudioPage() {
  return <StudioPage router={appRouter} />;
}
```

### Pages Router (Next.js 12+)

#### 1. Create Introspection API Route

Create `pages/api/__trpc-studio__/introspection.ts`:

```typescript
import { createStudioHandler } from '@trpc-studio/next/pages-router';
import { appRouter } from '~/server/api/root';

export default createStudioHandler({
  router: appRouter,
});
```

#### 2. Create Studio UI Page

Create `pages/trpc-studio.tsx`:

```typescript
import { StudioPage } from '@trpc-studio/next/pages-router';
import { appRouter } from '~/server/api/root';

export default function TrpcStudioPage() {
  return <StudioPage router={appRouter} />;
}
```

## Configuration

### Basic Options

```typescript
interface NextStudioOptions {
  router: AnyRouter; // Your tRPC router
  trpcEndpoint?: string; // Default: '/api/trpc'
  studioPath?: string; // Default: '/trpc-studio'
  introspectionPath?: string; // Default: '/__trpc-studio__/introspection'
  enabled?: boolean; // Default: !production
  token?: string; // Required in production
  getToken?: (req: unknown) => string | null; // Custom token extraction
  serveStatic?: boolean; // Default: true
  staticAssetPath?: string; // Custom static asset path
}
```

### Example with Custom Configuration

```typescript
export const GET = createStudioHandler({
  router: appRouter,
  trpcEndpoint: '/api/custom-trpc',
  studioPath: '/custom-studio',
  introspectionPath: '/custom-introspection',
  enabled: process.env.NODE_ENV !== 'production',
  token: process.env.TRPC_STUDIO_TOKEN,
});
```

## Security

### Development

In development, tRPC Studio is **enabled by default** with no authentication required.

### Production

In production, tRPC Studio is **disabled by default** for security. To enable:

1. Set environment variable: `TRPC_STUDIO_ENABLED=true`
2. Set a strong token: `TRPC_STUDIO_TOKEN=your-secure-random-token`

```bash
# .env.production
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=your-very-secure-random-token-here
```

### Token Authentication

When enabled in production, every request requires authentication via:

- `Authorization: Bearer <token>` header, or
- `x-trpc-studio-token: <token>` header

### Custom Token Extraction

```typescript
export const GET = createStudioHandler({
  router: appRouter,
  getToken: req => {
    // Extract token from custom header or cookie
    return req.headers['x-custom-auth'] || null;
  },
});
```

## Routes

The adapter creates these routes:

- **UI**: `GET /trpc-studio` (or custom `studioPath`)
- **Introspection**: `GET /__trpc-studio__/introspection` (or custom `introspectionPath`)

### Route Behavior

- **GET-only**: Introspection endpoint only accepts GET requests (returns 405 for others)
- **404 when disabled**: All routes return 404 when studio is disabled in production
- **403 for invalid auth**: Returns 403 when token is required but missing/invalid

## Next.js Configuration

Add to your `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@trpc-studio/next', '@trpc-studio/core'],
};

module.exports = nextConfig;
```

## CORS Setup

If your studio and API are on different origins, configure CORS headers:

```typescript
// In your tRPC handler
const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: '/api/trpc',
    req,
    router: appRouter,
    createContext: () => ({}),
    responseMeta() {
      return {
        headers: {
          'Access-Control-Allow-Origin': 'https://your-studio-domain.com',
          'Access-Control-Allow-Credentials': 'true',
          'Access-Control-Allow-Headers': 'authorization, x-trpc-studio-token, content-type',
          Vary: 'Origin',
        },
      };
    },
  });
```

## Procedure Metadata

Enhance your procedures with metadata for better documentation:

```typescript
export const appRouter = createTRPCRouter({
  hello: publicProcedure
    .input(z.object({ name: z.string() }))
    .output(z.object({ greeting: z.string() }))
    .meta({
      summary: 'Say hello',
      description: 'Returns a personalized greeting',
      tags: ['greeting', 'public'],
      examples: [
        {
          input: { name: 'World' },
          output: { greeting: 'Hello World!' },
        },
      ],
    })
    .query(({ input }) => ({
      greeting: `Hello ${input.name}!`,
    })),

  internal: publicProcedure
    .meta({
      visibility: 'internal', // Shows with "Internal" badge
    })
    .query(() => ({ data: 'internal' })),

  hidden: publicProcedure
    .meta({
      visibility: 'hidden', // Completely hidden from docs
    })
    .query(() => ({ secret: 'data' })),
});
```

## TypeScript

The adapter is fully typed and works with your existing tRPC setup:

```typescript
import type { AppRouter } from '~/server/api/root';

// Type-safe configuration
const studioConfig: NextStudioOptions = {
  router: appRouter, // Fully typed
  trpcEndpoint: '/api/trpc',
};
```

## Troubleshooting

### Build Errors

If you encounter build errors, ensure you have the transpile packages configured:

```javascript
// next.config.js
module.exports = {
  transpilePackages: ['@trpc-studio/next', '@trpc-studio/core'],
};
```

### 404 in Production

If you get 404 errors in production:

1. Verify `TRPC_STUDIO_ENABLED=true` is set
2. Ensure `TRPC_STUDIO_TOKEN` is configured
3. Check that your deployment includes the environment variables

### CORS Issues

For cross-origin requests:

1. Configure CORS headers in your tRPC handler
2. Include `x-trpc-studio-token` in allowed headers
3. Set appropriate `Access-Control-Allow-Origin`

## Examples

See the [examples directory](../../examples/next-basic) for a complete working example.

## License

MIT
