# Troubleshooting Guide

This guide helps you diagnose and resolve common issues with tRPC Studio.

## Common Issues

### 404 Not Found Errors

#### Symptom

- Accessing `/trpc-studio` returns 404
- Introspection endpoint returns 404

#### Causes & Solutions

**1. Studio disabled in production**

tRPC Studio is disabled by default in production environments.

```bash
# Check if you're in production
echo $NODE_ENV

# Enable in production
export TRPC_STUDIO_ENABLED=true
export TRPC_STUDIO_TOKEN=your-strong-token
```

**2. Incorrect path configuration**

```typescript
// Check your path configuration
export const GET = createStudioHandler({
  router: appRouter,
  studioPath: '/trpc-studio', // Default
  introspectionPath: '/__trpc-studio__/introspection', // Default
});
```

**3. Route not properly mounted**

```typescript
// Next.js App Router - file must be at correct location
// app/api/__trpc-studio__/introspection/route.ts
export const GET = createStudioHandler({ router: appRouter });

// Next.js Pages Router - file must be at correct location
// pages/api/__trpc-studio__/introspection.ts
export default createStudioHandler({ router: appRouter });

// Express - middleware must be mounted
app.use(studioExpress({ router: appRouter }));
```

### 403 Forbidden Errors

#### Symptom

- Studio loads but shows "Forbidden" error
- Introspection requests fail with 403

#### Causes & Solutions

**1. Missing authentication token**

```bash
# Set the token environment variable
export TRPC_STUDIO_TOKEN=your-token-here
```

**2. Token mismatch**

```typescript
// Ensure token in config matches environment
export const GET = createStudioHandler({
  router: appRouter,
  token: process.env.TRPC_STUDIO_TOKEN, // Must match TRPC_STUDIO_TOKEN
});
```

**3. Incorrect token header**

The UI must send the token in the correct header:

```typescript
// Correct headers (automatically handled by StudioApp)
Authorization: Bearer your-token
// OR
x-trpc-studio-token: your-token
```

**4. Custom token extraction not working**

```typescript
// Debug custom token extraction
export const GET = createStudioHandler({
  router: appRouter,
  getToken: req => {
    const token = req.headers.get('x-custom-token');
    console.log('Extracted token:', token); // Debug log
    return token;
  },
});
```

### 405 Method Not Allowed

#### Symptom

- POST/PUT requests to introspection endpoint fail

#### Cause & Solution

The introspection endpoint only accepts GET requests by design.

```typescript
// This is expected behavior - only GET is allowed
GET /__trpc-studio__/introspection  ✅
POST /__trpc-studio__/introspection ❌ 405
```

If you're seeing this error, check that your client is making GET requests to the introspection
endpoint.

### CORS Errors

#### Symptom

- Browser console shows CORS errors
- Requests blocked by CORS policy

#### Causes & Solutions

**1. Missing CORS headers**

```typescript
// Express
app.use(
  cors({
    origin: 'https://your-studio-domain.com',
    credentials: true,
    allowedHeaders: ['authorization', 'x-trpc-studio-token', 'content-type'],
  })
);

// Next.js API Route
export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://your-studio-domain.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'authorization, x-trpc-studio-token, content-type',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}
```

**2. Wildcard origin with credentials**

```typescript
// ❌ This doesn't work
app.use(
  cors({
    origin: '*',
    credentials: true, // Can't use wildcard with credentials
  })
);

// ✅ Use specific origins
app.use(
  cors({
    origin: ['https://studio.yourapp.com', 'http://localhost:3000'],
    credentials: true,
  })
);
```

**3. Missing Vary header**

```typescript
// Add Vary header for proper caching
res.header('Vary', 'Origin');
```

### Procedures Not Showing

#### Symptom

- Router tree is empty or missing procedures
- Some procedures don't appear in the documentation

#### Causes & Solutions

**1. Hidden procedures**

```typescript
// Procedures with visibility: 'hidden' won't appear
export const adminRouter = router({
  secretProcedure: publicProcedure
    .meta({ visibility: 'hidden' }) // This won't show
    .query(() => 'secret'),

  internalProcedure: publicProcedure
    .meta({ visibility: 'internal' }) // This shows with "Internal" badge
    .query(() => 'internal'),
});
```

**2. Search filters active**

- Clear the search box
- Check tag filters
- Toggle "Hide Deprecated" and "Hide Internal" options

**3. Router not properly exported**

```typescript
// ❌ Router not exported
const appRouter = router({
  // procedures
});

// ✅ Router properly exported
export const appRouter = router({
  // procedures
});

// ✅ Used in studio
export const GET = createStudioHandler({
  router: appRouter, // Must be the exported router
});
```

### Form Generation Issues

#### Symptom

- Forms don't generate correctly
- Complex schemas show raw JSON editor

#### Causes & Solutions

**1. Complex Zod schemas**

Some Zod schemas can't be perfectly converted to JSON Schema:

```typescript
// ❌ Complex refinements might not convert
z.string().refine(val => complexValidation(val));

// ✅ Use simpler validations when possible
z.string().min(3).max(50).email();
```

**2. Use Raw JSON mode**

For complex inputs, toggle to "Raw JSON" mode in the playground.

**3. Schema conversion fallbacks**

When conversion fails, tRPC Studio shows a JSON editor with `x-zod.unmapped` annotation:

```json
{
  "type": "object",
  "properties": {
    "complexField": {
      "x-zod": { "unmapped": true }
    }
  }
}
```

### Performance Issues

#### Symptom

- Slow loading times
- UI becomes unresponsive with large routers

#### Causes & Solutions

**1. Large router trees**

```typescript
// Use search and filters to narrow down procedures
// Consider splitting large routers:

// ❌ One massive router
const appRouter = router({
  // 100+ procedures
});

// ✅ Split into sub-routers
const appRouter = router({
  user: userRouter, // 20 procedures
  admin: adminRouter, // 15 procedures
  api: apiRouter, // 30 procedures
});
```

**2. Hide unnecessary procedures**

```typescript
// Hide internal/deprecated procedures
.meta({
  visibility: 'hidden',     // Completely hidden
  deprecated: true,         // Can be filtered out
})
```

**3. Browser performance**

- Close other browser tabs
- Disable browser extensions
- Use Chrome DevTools to profile performance

### Bundle Size Issues

#### Symptom

- Large JavaScript bundle sizes
- Slow initial page loads

#### Solutions

**1. Check bundle analysis**

```bash
# Analyze bundle size
pnpm run size

# Should be ≤300KB gzipped
```

**2. Ensure code splitting**

Monaco editor should be lazy-loaded (coming in v1.1):

```typescript
// Monaco is dynamically imported, not in initial bundle
const MonacoEditor = lazy(() => import('./monaco-editor'));
```

**3. Check for duplicate dependencies**

```bash
# Check for duplicate React versions
pnpm ls react

# Ensure workspace dependencies use "workspace:*"
```

### TypeScript Errors

#### Symptom

- TypeScript compilation errors
- Type mismatches in configuration

#### Solutions

**1. Update TypeScript configuration**

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "node",
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true
  }
}
```

**2. Check tRPC version compatibility**

```bash
# Ensure compatible tRPC version
pnpm ls @trpc/server

# Should be v10.x or v11.x
```

**3. Router type issues**

```typescript
// Ensure router is properly typed
import type { AppRouter } from './path/to/router';

export const GET = createStudioHandler({
  router: appRouter as AppRouter,
});
```

## Environment-Specific Issues

### Development Environment

**Hot reload not working**

```typescript
// Ensure proper Next.js configuration
// next.config.js
module.exports = {
  experimental: {
    appDir: true, // For App Router
  },
};
```

**Port conflicts**

```bash
# Check if port is in use
lsof -i :3000

# Use different port
PORT=3001 npm run dev
```

### Staging Environment

**Environment variables not set**

```bash
# Check environment variables
printenv | grep TRPC_STUDIO

# Set in deployment configuration
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=staging-token
```

### Production Environment

**Security headers missing**

```typescript
// Add security headers
app.use((req, res, next) => {
  res.header('X-Content-Type-Options', 'nosniff');
  res.header('X-Frame-Options', 'DENY');
  res.header('X-XSS-Protection', '1; mode=block');
  next();
});
```

**Token rotation**

```bash
# Generate new token
NEW_TOKEN=$(openssl rand -hex 32)

# Update environment variable
export TRPC_STUDIO_TOKEN=$NEW_TOKEN

# Restart application
```

## Debugging Tips

### Enable Debug Logging

```typescript
// Add debug logging
export const GET = createStudioHandler({
  router: appRouter,
  logger: {
    debug: console.log,
    info: console.log,
    warn: console.warn,
    error: console.error,
  },
});
```

### Browser Developer Tools

1. **Network tab**: Check request/response details
2. **Console tab**: Look for JavaScript errors
3. **Application tab**: Check localStorage for environment profiles
4. **Security tab**: Verify HTTPS and certificate issues

### Server Logs

```bash
# Check server logs for errors
tail -f /var/log/your-app.log

# Look for tRPC Studio related entries
grep "trpc-studio" /var/log/your-app.log
```

### Health Checks

Create a simple health check endpoint:

```typescript
// pages/api/health.ts or app/api/health/route.ts
export async function GET() {
  return Response.json({
    status: 'ok',
    trpcStudio: {
      enabled: process.env.TRPC_STUDIO_ENABLED === 'true',
      hasToken: !!process.env.TRPC_STUDIO_TOKEN,
    },
  });
}
```

## Getting Help

### Before Asking for Help

1. Check this troubleshooting guide
2. Review the [API documentation](./api.md)
3. Check the [security guide](./security.md)
4. Look at the example application in `examples/next-basic`

### Information to Include

When reporting issues, include:

- tRPC Studio version
- tRPC version
- Framework (Next.js/Express) and version
- Node.js version
- Environment (development/production)
- Complete error messages
- Relevant configuration code
- Steps to reproduce

### Community Resources

- [GitHub Issues](https://github.com/your-org/trpc-studio/issues)
- [GitHub Discussions](https://github.com/your-org/trpc-studio/discussions)
- [Example Applications](../examples/)

### Creating Minimal Reproductions

For complex issues, create a minimal reproduction:

1. Start with the basic example
2. Add only the code that reproduces the issue
3. Share the complete, runnable example
4. Include package.json and relevant config files
