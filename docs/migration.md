# Migration Guide

This guide helps you migrate between different versions of tRPC and integrate tRPC Studio into
existing projects.

## tRPC Version Compatibility

tRPC Studio supports both tRPC v10 and v11, with automatic detection of features and transformers.

### Supported Versions

| tRPC Version   | Support Status   | Notes                        |
| -------------- | ---------------- | ---------------------------- |
| v10.x          | ✅ Full Support  | Stable, well-tested          |
| v11.x          | ✅ Full Support  | Latest features, recommended |
| v9.x and below | ❌ Not Supported | Please upgrade tRPC first    |

## Migrating from tRPC v10 to v11

### Key Changes Affecting tRPC Studio

The main difference between v10 and v11 that affects tRPC Studio is transformer configuration:

#### Transformer Configuration

**tRPC v10**: Transformer configured on both client and server

```typescript
// Server (v10)
import { initTRPC } from '@trpc/server';
import superjson from 'superjson';

const t = initTRPC.create({
  transformer: superjson, // Server-side transformer
});

// Client (v10)
import { createTRPCNext } from '@trpc/next';
import superjson from 'superjson';

const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson, // Client-side transformer
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    };
  },
});
```

**tRPC v11**: Transformer configured only on client links

```typescript
// Server (v11) - no transformer configuration
import { initTRPC } from '@trpc/server';

const t = initTRPC.create(); // No transformer here

// Client (v11) - transformer on links
import { createTRPCNext } from '@trpc/next';
import { httpBatchLink } from '@trpc/client';
import superjson from 'superjson';

const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson, // Transformer on link
        }),
      ],
    };
  },
});
```

### Impact on tRPC Studio

tRPC Studio handles this difference automatically:

- **v10**: Detects transformer from server configuration
- **v11**: Detects transformer at runtime from response format

The UI will automatically label SuperJSON types (Date, BigInt, Map, Set) regardless of the tRPC
version.

### Migration Steps

1. **Update tRPC packages**:

```bash
# Update to v11
npm install @trpc/server@^11 @trpc/client@^11 @trpc/next@^11
# or
pnpm add @trpc/server@^11 @trpc/client@^11 @trpc/next@^11
```

2. **Update server configuration**:

```typescript
// Before (v10)
const t = initTRPC.create({
  transformer: superjson,
});

// After (v11)
const t = initTRPC.create();
```

3. **Update client configuration**:

```typescript
// Before (v10)
const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      transformer: superjson,
      links: [
        httpBatchLink({
          url: '/api/trpc',
        }),
      ],
    };
  },
});

// After (v11)
const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson, // Move transformer here
        }),
      ],
    };
  },
});
```

4. **Update tRPC Studio** (no changes needed):

```typescript
// Works with both v10 and v11
export const GET = createStudioHandler({
  router: appRouter,
});
```

## Adding tRPC Studio to Existing Projects

### Next.js Projects

#### Step 1: Install tRPC Studio

```bash
npm install @trpc-studio/next
```

#### Step 2: Add Introspection Route

**App Router**:

```typescript
// app/api/__trpc-studio__/introspection/route.ts
import { createStudioHandler } from '@trpc-studio/next';
import { appRouter } from '@/server/api/root'; // Your existing router

export const GET = createStudioHandler({
  router: appRouter,
});
```

**Pages Router**:

```typescript
// pages/api/__trpc-studio__/introspection.ts
import { createStudioHandler } from '@trpc-studio/next';
import { appRouter } from '@/server/api/root'; // Your existing router

export default createStudioHandler({
  router: appRouter,
});
```

#### Step 3: Add UI Page

**App Router**:

```typescript
// app/trpc-studio/page.tsx
import { StudioApp } from '@trpc-studio/ui';

export default function TrpcStudioPage() {
  return (
    <StudioApp
      introspectionUrl="/__trpc-studio__/introspection"
      trpcEndpoint="/api/trpc" // Match your existing tRPC endpoint
    />
  );
}
```

**Pages Router**:

```typescript
// pages/trpc-studio.tsx
import { StudioApp } from '@trpc-studio/ui';

export default function TrpcStudioPage() {
  return (
    <StudioApp
      introspectionUrl="/__trpc-studio__/introspection"
      trpcEndpoint="/api/trpc" // Match your existing tRPC endpoint
    />
  );
}
```

#### Step 4: Configure Security (Production)

```bash
# .env.local or production environment
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=your-strong-random-token
```

### Express Projects

#### Step 1: Install tRPC Studio

```bash
npm install @trpc-studio/express
```

#### Step 2: Add Middleware

```typescript
// server.ts or app.ts
import express from 'express';
import { studioExpress } from '@trpc-studio/express';
import { appRouter } from './router'; // Your existing router

const app = express();

// Add tRPC Studio middleware
app.use(
  studioExpress({
    router: appRouter,
    trpcEndpoint: '/trpc', // Match your existing tRPC endpoint
  })
);

// Your existing tRPC handler
app.use(
  '/trpc',
  trpcExpress({
    router: appRouter,
    // ... other options
  })
);

app.listen(3000);
```

#### Step 3: Configure Security (Production)

```bash
# Environment variables
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=your-strong-random-token
```

## Migrating from Other API Documentation Tools

### From Swagger/OpenAPI

If you're currently using Swagger/OpenAPI documentation:

1. **Remove Swagger dependencies** (optional):

```bash
npm uninstall swagger-ui-express @types/swagger-ui-express
```

2. **Add procedure metadata** for better documentation:

```typescript
// Before (Swagger annotations)
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: string
 */

// After (tRPC Studio metadata)
export const userRouter = router({
  getById: publicProcedure
    .meta({
      summary: 'Get user by ID',
      description: 'Retrieves a user profile with all associated data',
      tags: ['users'],
    })
    .input(z.object({ id: z.string() }))
    .output(
      z.object({
        id: z.string(),
        name: z.string(),
        email: z.string(),
      })
    )
    .query(({ input }) => {
      // Implementation
    }),
});
```

3. **Update documentation workflow**:

Instead of maintaining separate OpenAPI specs, your documentation is now generated directly from
your tRPC router definitions.

### From Postman Collections

If you're using Postman for API testing:

1. **Export environment variables** from Postman
2. **Create environment profiles** in tRPC Studio:
   - Base URLs
   - Authentication headers
   - Custom headers

3. **Migrate test cases** to tRPC Studio playground:
   - Use the form generator for type-safe inputs
   - Save common requests in browser history
   - Use environment profiles for different stages

### From GraphQL Playground

If you're migrating from GraphQL:

1. **Similar developer experience**:
   - Interactive query building
   - Schema exploration
   - Real-time validation

2. **Key differences**:
   - Form-based input instead of query language
   - Type-safe from TypeScript instead of GraphQL schema
   - HTTP-based instead of GraphQL protocol

## Configuration Migration

### Environment Variables

Update your environment configuration:

```bash
# Development
NODE_ENV=development
# tRPC Studio enabled by default in development

# Staging
NODE_ENV=production
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=staging-secure-token

# Production
NODE_ENV=production
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=production-ultra-secure-token
```

### Build Configuration

Update your build scripts:

```json
{
  "scripts": {
    "build": "next build",
    "start": "next start",
    "dev": "next dev",
    "studio": "open http://localhost:3000/trpc-studio"
  }
}
```

### TypeScript Configuration

Ensure your TypeScript configuration supports tRPC Studio:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"]
}
```

## Common Migration Issues

### Router Import Errors

**Problem**: Can't import router in studio configuration

```typescript
// ❌ Circular import
// pages/api/__trpc-studio__/introspection.ts
import { appRouter } from '../trpc/[trpc]'; // Circular dependency
```

**Solution**: Extract router to separate file

```typescript
// server/router.ts
export const appRouter = router({
  // procedures
});

// pages/api/trpc/[trpc].ts
import { appRouter } from '../../server/router';

// pages/api/__trpc-studio__/introspection.ts
import { appRouter } from '../../server/router';
```

### Transformer Detection Issues

**Problem**: SuperJSON types not detected in v11

**Solution**: Ensure transformer is configured on client links:

```typescript
// Client configuration (v11)
const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson, // Required for detection
        }),
      ],
    };
  },
});
```

### Security Configuration

**Problem**: Studio works in development but not production

**Solution**: Set both environment variables:

```bash
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=your-token
```

### Path Conflicts

**Problem**: Studio paths conflict with existing routes

**Solution**: Use custom paths:

```typescript
export const GET = createStudioHandler({
  router: appRouter,
  studioPath: '/admin/api-docs',
  introspectionPath: '/admin/api-docs/introspection',
});
```

## Testing Migration

### Verification Checklist

After migration, verify:

- [ ] Studio loads at `/trpc-studio`
- [ ] All routers and procedures are visible
- [ ] Schemas render correctly
- [ ] Playground forms generate properly
- [ ] Requests execute successfully
- [ ] SuperJSON types are labeled (if using SuperJSON)
- [ ] Environment profiles work
- [ ] Security configuration works in production
- [ ] No console errors or warnings

### Automated Testing

Add tests to verify the migration:

```typescript
// __tests__/trpc-studio.test.ts
import { createStudioHandler } from '@trpc-studio/next';
import { appRouter } from '../server/router';

describe('tRPC Studio Integration', () => {
  it('should create handler without errors', () => {
    expect(() => {
      createStudioHandler({ router: appRouter });
    }).not.toThrow();
  });

  it('should handle introspection request', async () => {
    const handler = createStudioHandler({ router: appRouter });
    const request = new Request('http://localhost:3000/__trpc-studio__/introspection');
    const response = await handler(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.routers).toBeDefined();
  });
});
```

## Rollback Plan

If you need to rollback the migration:

1. **Remove tRPC Studio packages**:

```bash
npm uninstall @trpc-studio/next @trpc-studio/express @trpc-studio/ui
```

2. **Remove studio routes**:
   - Delete introspection API routes
   - Delete studio UI pages

3. **Remove environment variables**:

```bash
unset TRPC_STUDIO_ENABLED
unset TRPC_STUDIO_TOKEN
```

4. **Restore previous documentation** (if applicable):
   - Re-enable Swagger/OpenAPI
   - Restore Postman collections

The migration is designed to be non-breaking, so your existing tRPC setup will continue to work
normally even if you remove tRPC Studio.
