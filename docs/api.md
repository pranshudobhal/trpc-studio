# API Documentation

This document provides detailed API documentation for all tRPC Studio adapters and configuration
options.

## Core Types

### StudioOptions

Base configuration interface used by all adapters:

```typescript
interface StudioOptions {
  router: AnyRouter; // Your tRPC router (required)
  trpcEndpoint?: string; // Default: '/api/trpc'
  studioPath?: string; // Default: '/trpc-studio'
  introspectionPath?: string; // Default: '/__trpc-studio__/introspection'
  enabled?: boolean; // Default: !isProduction
  token?: string; // Required in production
  getToken?: (req: unknown) => string | null; // Custom token extraction
  logger?: Logger; // Custom logging interface
}
```

### Logger Interface

```typescript
interface Logger {
  debug?: (message: string, meta?: Record<string, unknown>) => void;
  info?: (message: string, meta?: Record<string, unknown>) => void;
  warn?: (message: string, meta?: Record<string, unknown>) => void;
  error?: (message: string, meta?: Record<string, unknown>) => void;
}
```

## Next.js Adapter

### Installation

```bash
npm install @trpc-studio/next
```

### App Router

#### createStudioHandler

Creates a route handler for the introspection endpoint.

```typescript
import { createStudioHandler } from '@trpc-studio/next';

export const GET = createStudioHandler(options: StudioOptions);
```

**Example**:

```typescript
// app/api/__trpc-studio__/introspection/route.ts
import { createStudioHandler } from '@trpc-studio/next';
import { appRouter } from '@/server/api/root';

export const GET = createStudioHandler({
  router: appRouter,
  trpcEndpoint: '/api/trpc',
  enabled: process.env.NODE_ENV !== 'production',
  token: process.env.TRPC_STUDIO_TOKEN,
});
```

#### StudioApp Component

React component for rendering the tRPC Studio UI.

```typescript
import { StudioApp } from '@trpc-studio/ui';

interface StudioAppProps {
  introspectionUrl: string;
  trpcEndpoint: string;
  token?: string;
}
```

**Example**:

```typescript
// app/trpc-studio/page.tsx
import { StudioApp } from '@trpc-studio/ui';

export default function TrpcStudioPage() {
  return (
    <StudioApp
      introspectionUrl="/__trpc-studio__/introspection"
      trpcEndpoint="/api/trpc"
      token={process.env.TRPC_STUDIO_TOKEN}
    />
  );
}
```

### Pages Router

#### createStudioHandler

Creates an API route handler for the introspection endpoint.

```typescript
import { createStudioHandler } from '@trpc-studio/next';

export default createStudioHandler(options: StudioOptions);
```

**Example**:

```typescript
// pages/api/__trpc-studio__/introspection.ts
import { createStudioHandler } from '@trpc-studio/next';
import { appRouter } from '@/server/api/root';

export default createStudioHandler({
  router: appRouter,
  trpcEndpoint: '/api/trpc',
});
```

#### Studio Page

```typescript
// pages/trpc-studio.tsx
import { StudioApp } from '@trpc-studio/ui';

export default function TrpcStudioPage() {
  return (
    <StudioApp
      introspectionUrl="/__trpc-studio__/introspection"
      trpcEndpoint="/api/trpc"
    />
  );
}
```

### Next.js Specific Options

```typescript
interface NextStudioOptions extends StudioOptions {
  // Next.js specific options can be added here in the future
}
```

## Express Adapter

### Installation

```bash
npm install @trpc-studio/express
```

### studioExpress

Creates Express middleware that mounts both the UI and introspection endpoints.

```typescript
import { studioExpress } from '@trpc-studio/express';

function studioExpress(options: ExpressStudioOptions): express.RequestHandler;
```

**Example**:

```typescript
import express from 'express';
import { studioExpress } from '@trpc-studio/express';
import { appRouter } from './router';

const app = express();

app.use(
  studioExpress({
    router: appRouter,
    trpcEndpoint: '/trpc',
    studioPath: '/studio',
    enabled: process.env.NODE_ENV !== 'production',
    token: process.env.TRPC_STUDIO_TOKEN,
  })
);

app.listen(3000);
```

### Express Specific Options

```typescript
interface ExpressStudioOptions extends StudioOptions {
  // Express specific options
  staticOptions?: express.static.ServeStaticOptions; // Options for serving static files
}
```

### Request/Response Types

The `getToken` function receives Express request objects:

```typescript
import { Request } from 'express';

const options = {
  getToken: (req: Request) => {
    // Access Express request properties
    return (req.headers['x-api-key'] as string) || null;
  },
};
```

## UI Package

### Installation

```bash
npm install @trpc-studio/ui
```

### StudioApp Component

Main React component that renders the complete tRPC Studio interface.

```typescript
interface StudioAppProps {
  introspectionUrl: string; // URL to introspection endpoint
  trpcEndpoint: string; // URL to tRPC endpoint
  token?: string; // Authentication token
  theme?: 'light' | 'dark' | 'auto'; // Theme preference (default: 'auto')
  defaultEnvironment?: string; // Default environment profile name
}
```

**Usage**:

```typescript
import { StudioApp } from '@trpc-studio/ui';

function MyStudioPage() {
  return (
    <StudioApp
      introspectionUrl="/__trpc-studio__/introspection"
      trpcEndpoint="/api/trpc"
      token="your-token"
      theme="auto"
      defaultEnvironment="Local"
    />
  );
}
```

### Styling

The UI package includes Tailwind CSS styles that need to be imported:

```typescript
// Import in your app root or layout
import '@trpc-studio/ui/styles';
```

Or include in your Tailwind config:

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './node_modules/@trpc-studio/ui/**/*.{js,ts,jsx,tsx}',
    // ... your other content paths
  ],
  // ... rest of config
};
```

## Core Package

### Installation

```bash
npm install @trpc-studio/core
```

### buildIntrospection

Builds introspection data from a tRPC router.

```typescript
import { buildIntrospection } from '@trpc-studio/core';

function buildIntrospection(router: AnyRouter): RouterIntrospection;
```

### convertZodToJsonSchema

Converts Zod schemas to JSON Schema format.

```typescript
import { convertZodToJsonSchema } from '@trpc-studio/core';

function convertZodToJsonSchema(zodSchema: z.ZodType): JSONSchema;
```

### Security Utilities

```typescript
import { validateToken, extractToken, isProductionEnvironment } from '@trpc-studio/core/security';

// Validate token against expected value
function validateToken(provided: string, expected: string): boolean;

// Extract token from request headers
function extractToken(headers: Record<string, string>): string | null;

// Check if running in production
function isProductionEnvironment(): boolean;
```

## Configuration Examples

### Development Setup

```typescript
// Minimal development configuration
export const GET = createStudioHandler({
  router: appRouter,
});
```

### Production Setup

```typescript
// Secure production configuration
export const GET = createStudioHandler({
  router: appRouter,
  enabled: process.env.TRPC_STUDIO_ENABLED === 'true',
  token: process.env.TRPC_STUDIO_TOKEN,
  logger: {
    info: (msg, meta) => logger.info(msg, meta),
    warn: (msg, meta) => logger.warn(msg, meta),
    error: (msg, meta) => logger.error(msg, meta),
  },
});
```

### Custom Token Extraction

```typescript
// Extract token from custom header
export const GET = createStudioHandler({
  router: appRouter,
  getToken: req => {
    return req.headers.get('x-studio-auth') || null;
  },
});
```

### Custom Paths

```typescript
// Custom paths for studio and introspection
export const GET = createStudioHandler({
  router: appRouter,
  studioPath: '/admin/api-docs',
  introspectionPath: '/admin/api-docs/data',
});
```

### Multiple Environments

```typescript
// Different configurations per environment
const config = {
  development: {
    enabled: true,
    token: 'dev-token',
  },
  staging: {
    enabled: true,
    token: process.env.STAGING_STUDIO_TOKEN,
  },
  production: {
    enabled: process.env.TRPC_STUDIO_ENABLED === 'true',
    token: process.env.TRPC_STUDIO_TOKEN,
  },
};

export const GET = createStudioHandler({
  router: appRouter,
  ...config[process.env.NODE_ENV],
});
```

## Error Handling

### Common Error Responses

| Status | Condition             | Response Body                        |
| ------ | --------------------- | ------------------------------------ |
| 404    | Studio disabled       | `Not Found`                          |
| 403    | Missing/invalid token | `{ error: "Forbidden" }`             |
| 405    | Wrong HTTP method     | `{ error: "Method Not Allowed" }`    |
| 500    | Server error          | `{ error: "Internal Server Error" }` |

### Error Types

```typescript
// Custom error types thrown by tRPC Studio
class StudioError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: string
  ) {
    super(message);
  }
}

// Specific error codes
const ERROR_CODES = {
  STUDIO_DISABLED: 'STUDIO_DISABLED',
  INVALID_TOKEN: 'INVALID_TOKEN',
  MISSING_TOKEN: 'MISSING_TOKEN',
  INVALID_ROUTER: 'INVALID_ROUTER',
  SCHEMA_CONVERSION_FAILED: 'SCHEMA_CONVERSION_FAILED',
} as const;
```

## TypeScript Support

All packages include full TypeScript definitions. For the best experience:

```typescript
// Enable strict mode in tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

### Type Inference

tRPC Studio automatically infers types from your router:

```typescript
// Your router types are automatically used
const appRouter = router({
  user: router({
    getById: publicProcedure
      .input(z.object({ id: z.string() }))
      .output(z.object({ name: z.string(), email: z.string() }))
      .query(({ input }) => {
        // Implementation
      }),
  }),
});

// tRPC Studio automatically knows about these types
export const GET = createStudioHandler({
  router: appRouter, // Type-safe!
});
```

## Migration Guide

### From v0.x to v1.x

Breaking changes in v1.0:

1. **Package names changed**:
   - `trpc-studio` → `@trpc-studio/next` or `@trpc-studio/express`

2. **Configuration options renamed**:
   - `apiPath` → `trpcEndpoint`
   - `docsPath` → `studioPath`

3. **Security model changed**:
   - Now disabled by default in production
   - Requires explicit environment variable to enable

**Migration steps**:

```typescript
// Before (v0.x)
import { createStudioHandler } from 'trpc-studio';

export default createStudioHandler({
  router: appRouter,
  apiPath: '/api/trpc',
  docsPath: '/docs',
});

// After (v1.x)
import { createStudioHandler } from '@trpc-studio/next';

export const GET = createStudioHandler({
  router: appRouter,
  trpcEndpoint: '/api/trpc',
  studioPath: '/docs',
  enabled: process.env.TRPC_STUDIO_ENABLED === 'true',
  token: process.env.TRPC_STUDIO_TOKEN,
});
```
