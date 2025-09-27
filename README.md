# tRPC Studio

A developer tool that provides documentation and an interactive playground for tRPC APIs.

## Features

- 📚 **Auto-generated Documentation** - Browse your tRPC router with schema information
- 🎮 **Interactive Playground** - Test queries and mutations with form generation
- 🔒 **Secure by Default** - Disabled in production unless explicitly enabled
- ⚡ **Fast & Lightweight** - Small bundle size with lazy-loaded components
- 🎨 **Modern UI** - Built with Tailwind CSS v4 and Radix UI primitives
- 🌍 **Environment Profiles** - Manage different API environments

## Quick Start

### Next.js (App Router)

```bash
npm install @trpc-studio/next
```

```typescript
// app/api/__trpc-studio__/introspection/route.ts
import { createStudioHandler } from '@trpc-studio/next';
import { appRouter } from '~/server/routers/_app';

export const GET = createStudioHandler({
  router: appRouter,
});
```

```typescript
// app/trpc-studio/page.tsx
import { StudioApp } from '@trpc-studio/ui';

export default function StudioPage() {
  return (
    <StudioApp
      introspectionUrl="/__trpc-studio__/introspection"
      trpcEndpoint="/api/trpc"
    />
  );
}
```

### Express

```bash
npm install @trpc-studio/express
```

```typescript
import express from 'express';
import { studioExpress } from '@trpc-studio/express';
import { appRouter } from './routers/_app';

const app = express();

app.use(
  studioExpress({
    router: appRouter,
  })
);
```

## Security

tRPC Studio is **disabled by default in production**. To enable it:

1. Set environment variables:

   ```bash
   TRPC_STUDIO_ENABLED=true
   TRPC_STUDIO_TOKEN=your-secure-random-token
   ```

2. Access the studio with the token:
   - Header: `Authorization: Bearer your-secure-random-token`
   - Or: `x-trpc-studio-token: your-secure-random-token`

## Development

This project uses pnpm workspaces:

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm run build

# Run tests
pnpm run test

# Type check
pnpm run typecheck

# Lint
pnpm run lint
```

## Packages

- `@trpc-studio/core` - Core introspection and schema utilities
- `@trpc-studio/ui` - React UI components
- `@trpc-studio/next` - Next.js adapter (Pages + App Router)
- `@trpc-studio/express` - Express adapter

## Requirements

- Node.js ≥18.18
- tRPC v10 or v11
- Zod ^3.23.0

## License

MIT
