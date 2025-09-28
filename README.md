# tRPC Studio

A developer tool that provides **documentation** and an **interactive playground** for tRPC APIs.
Drop it into your existing tRPC application with minimal setup and start exploring your API
immediately.

## Features

- 📚 **Auto-generated Documentation** - Browse your tRPC routers and procedures with schema details
- 🎮 **Interactive Playground** - Test queries and mutations with form generation and response
  inspection
- 🔒 **Secure by Default** - Disabled in production unless explicitly enabled with token
  authentication
- 🌍 **Environment Profiles** - Manage different API environments with custom headers and
  credentials
- ⚡ **Fast & Accessible** - Small bundle size with keyboard navigation and screen reader support
- 🎨 **Modern UI** - Built with Tailwind CSS v4 and Radix primitives

## Quick Start

### Next.js (App Router)

1. Install the package:

```bash
npm install @trpc-studio/next
# or
pnpm add @trpc-studio/next
```

2. Create the introspection API route at `app/api/__trpc-studio__/introspection/route.ts`:

```typescript
import { createStudioHandler } from '@trpc-studio/next';
import { appRouter } from '@/server/api/root'; // Your tRPC router

export const GET = createStudioHandler({
  router: appRouter,
});
```

3. Create the UI page at `app/trpc-studio/page.tsx`:

```typescript
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

4. Visit `http://localhost:3000/trpc-studio` to explore your API!

### Next.js (Pages Router)

1. Install the package:

```bash
npm install @trpc-studio/next
```

2. Create the introspection API route at `pages/api/__trpc-studio__/introspection.ts`:

```typescript
import { createStudioHandler } from '@trpc-studio/next';
import { appRouter } from '@/server/api/root'; // Your tRPC router

export default createStudioHandler({
  router: appRouter,
});
```

3. Create the UI page at `pages/trpc-studio.tsx`:

```typescript
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

### Express

1. Install the package:

```bash
npm install @trpc-studio/express
```

2. Add the middleware to your Express app:

```typescript
import express from 'express';
import { studioExpress } from '@trpc-studio/express';
import { appRouter } from './router'; // Your tRPC router

const app = express();

// Mount tRPC Studio
app.use(
  studioExpress({
    router: appRouter,
    trpcEndpoint: '/trpc', // Adjust to match your tRPC endpoint
  })
);

app.listen(3000);
```

3. Visit `http://localhost:3000/trpc-studio` to explore your API!

## Security Configuration

### Development vs Production

tRPC Studio is **disabled by default in production** for security. To enable it:

1. Set the environment variable:

```bash
TRPC_STUDIO_ENABLED=true
```

2. Set a strong random token:

```bash
TRPC_STUDIO_TOKEN=your-strong-random-token-here
```

### Security Precedence

**Important**: In production environments, the `TRPC_STUDIO_ENABLED` environment variable takes
precedence over the `enabled` option. You cannot enable tRPC Studio in production using only the
`enabled: true` option - the environment variable must be set.

### Token Authentication

When enabled in production, every request to tRPC Studio requires authentication via:

- `Authorization: Bearer <token>` header, or
- `x-trpc-studio-token: <token>` header

### Route Behavior

- **Disabled**: All routes return `404` (including static assets)
- **Enabled without token**: Returns `403`
- **Enabled with valid token**: Returns `200`

### GET-Only Introspection

The introspection endpoint only accepts GET requests. All other HTTP methods return
`405 Method Not Allowed`.

## Cross-Origin Setup (CORS)

If your tRPC Studio UI is hosted on a different origin than your API, configure CORS headers:

```typescript
// Example CORS configuration
app.use(
  cors({
    origin: 'https://your-studio-domain.com',
    credentials: true, // Required if sending cookies
    allowedHeaders: ['authorization', 'x-trpc-studio-token', 'content-type'],
  })
);

// Or manually set headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://your-studio-domain.com');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'authorization, x-trpc-studio-token, content-type');
  res.header('Vary', 'Origin');
  next();
});
```

## Configuration Options

### Common Options

All adapters support these configuration options:

```typescript
interface StudioOptions {
  router: AnyRouter; // Your tRPC router (required)
  trpcEndpoint?: string; // Default: '/api/trpc'
  studioPath?: string; // Default: '/trpc-studio'
  introspectionPath?: string; // Default: '/__trpc-studio__/introspection'
  enabled?: boolean; // Default: !isProduction
  token?: string; // Required in production
  getToken?: (req: unknown) => string | null; // Custom token extraction
}
```

### Next.js Specific

```typescript
// App Router
export const GET = createStudioHandler(options);

// Pages Router
export default createStudioHandler(options);
```

### Express Specific

```typescript
app.use(studioExpress(options));
```

## Environment Profiles

tRPC Studio supports multiple environment profiles for testing against different API endpoints:

### Creating Profiles

1. Open tRPC Studio in your browser
2. Click the environment selector (defaults to "Local")
3. Click "Manage Environments"
4. Add new profiles with custom:
   - Base URLs
   - tRPC endpoints
   - Custom headers
   - Credential settings

### Profile Configuration

Each profile can include:

- **Base URL**: The root URL for your API
- **tRPC Endpoint**: Path to your tRPC handler (e.g., `/api/trpc`)
- **Custom Headers**: Key-value pairs for authentication, API keys, etc.
- **With Credentials**: Whether to include cookies in requests

### Persistence

Environment profiles are automatically saved to your browser's localStorage and restored when you
reload the page.

## tRPC Version Compatibility

### Supported Versions

- tRPC v10.x ✅
- tRPC v11.x ✅

### Migration Notes

#### From tRPC v10 to v11

The main difference affecting tRPC Studio is transformer configuration:

**v10**: Transformer configured on both client and server

```typescript
// Server (v10)
const t = initTRPC.create({
  transformer: superjson,
});
```

**v11**: Transformer configured only on client

```typescript
// Client (v11)
const trpc = createTRPCNext<AppRouter>({
  config() {
    return {
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    };
  },
});
```

tRPC Studio automatically detects SuperJSON usage at runtime and labels special types (Date, BigInt,
Map, Set) in the response viewer.

## Performance Optimization

### Bundle Size

tRPC Studio is designed to be lightweight:

- Initial bundle: ≤300KB gzipped
- Code splitting for heavy dependencies
- Monaco editor lazy-loaded (coming in v1.1)

### Large Router Trees

For applications with many procedures:

- Virtual scrolling for procedure lists
- Debounced search functionality
- Memoized component rendering

### Recommendations

1. **Use procedure metadata** to improve documentation:

```typescript
export const userRouter = router({
  getUser: publicProcedure
    .meta({
      summary: 'Get user by ID',
      description: 'Retrieves a user profile with all associated data',
      tags: ['users'],
    })
    .input(z.object({ id: z.string() }))
    .query(({ input }) => {
      // Implementation
    }),
});
```

2. **Hide internal procedures** from documentation:

```typescript
.meta({ visibility: 'hidden' }) // Completely hidden
.meta({ visibility: 'internal' }) // Shown with "Internal" badge
```

3. **Use environment profiles** for different deployment stages
4. **Enable request history** to compare responses over time

## UI Stack

tRPC Studio is built with modern, accessible technologies:

- **Tailwind CSS v4**: Utility-first styling with CSS variables for theming
- **Radix Primitives**: Accessible component primitives via shadcn/ui (committed components, no
  runtime CSS-in-JS)
- **React Hook Form + Zod**: Form generation and validation using your existing Zod schemas
- **Lightweight JSON Viewer**: Fast tree rendering for response inspection
- **Monaco Editor**: Full-featured code editor (lazy-loaded in v1.1)

The UI respects your system's color scheme preference and provides full keyboard navigation support.

## Troubleshooting

### Common Issues

#### "404 Not Found" in Production

**Cause**: tRPC Studio is disabled by default in production.

**Solution**: Set environment variables:

```bash
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=your-strong-token
```

#### "403 Forbidden" Error

**Cause**: Missing or invalid authentication token.

**Solutions**:

1. Check that `TRPC_STUDIO_TOKEN` matches the token you're using
2. Ensure you're sending the token in the correct header:
   - `Authorization: Bearer <token>`, or
   - `x-trpc-studio-token: <token>`

#### CORS Errors

**Cause**: Cross-origin requests blocked by browser.

**Solution**: Configure CORS headers on your API server (see
[Cross-Origin Setup](#cross-origin-setup-cors)).

#### Procedures Not Showing

**Cause**: Procedures might be hidden or filtered.

**Solutions**:

1. Check visibility settings - procedures with `visibility: 'hidden'` won't appear
2. Clear search filters and toggle visibility options
3. Verify your router is properly exported and imported

#### Form Generation Issues

**Cause**: Complex Zod schemas might not convert perfectly to JSON Schema.

**Solutions**:

1. Use the "Raw JSON" toggle for complex inputs
2. Simplify schema refinements where possible
3. Check browser console for conversion warnings

#### Performance Issues

**Cause**: Large router trees or complex schemas.

**Solutions**:

1. Use search and filters to narrow down procedures
2. Consider splitting large routers into smaller sub-routers
3. Hide internal/deprecated procedures using metadata

### Getting Help

1. Check the [GitHub Issues](https://github.com/your-org/trpc-studio/issues)
2. Review the example application in `examples/next-basic`
3. Enable debug logging in development

## Documentation

- **[API Documentation](docs/api.md)** - Complete API reference for all adapters
- **[Security Guide](docs/security.md)** - Security configuration and best practices
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions
- **[Migration Guide](docs/migration.md)** - Migrating between tRPC versions and from other tools
- **[Performance Guide](docs/performance.md)** - Optimization strategies and best practices

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details on:

- Development setup
- Coding standards
- Testing requirements
- Pull request process

## License

MIT License - see [LICENSE](LICENSE) for details.
