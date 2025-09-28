# Express tRPC Studio Example

This example demonstrates how to integrate tRPC Studio with an Express.js application.

## Features

- Complete tRPC router with nested routes
- User management endpoints (CRUD operations)
- Post management with pagination
- Comprehensive metadata and validation
- CORS configuration for development
- Production security configuration

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Open your browser and navigate to:
   - **tRPC Studio**: http://localhost:3000/trpc-studio
   - **API Info**: http://localhost:3000/api/info
   - **Health Check**: http://localhost:3000/health

## Production Mode

To run in production mode with Studio enabled:

```bash
npm run prod
```

This sets the required environment variables:

- `NODE_ENV=production`
- `TRPC_STUDIO_ENABLED=true`
- `TRPC_STUDIO_TOKEN=demo-token-123`

In production, you'll need to include the token in your requests:

- `Authorization: Bearer demo-token-123`
- Or `x-trpc-studio-token: demo-token-123`

## API Structure

The example includes the following tRPC procedures:

### Root Level

- `hello` (query) - Simple greeting with name input

### Users Router (`/users`)

- `list` (query) - Get all users
- `create` (mutation) - Create a new user
- `getById` (query) - Get user by ID

### Posts Router (`/posts`)

- `list` (query) - Get paginated posts with date objects

## Security Configuration

### Development

- Studio is enabled by default
- No token required
- CORS enabled for all origins

### Production

- Studio is disabled by default
- Requires `TRPC_STUDIO_ENABLED=true` environment variable
- Requires `TRPC_STUDIO_TOKEN` environment variable
- Token validation on all Studio requests
- Static assets return 404 when disabled

## Custom Configuration

You can customize the Studio configuration:

```typescript
app.use(
  studioExpress({
    router: appRouter,
    studioPath: '/custom-studio', // Default: '/trpc-studio'
    introspectionPath: '/custom-api', // Default: '/__trpc-studio__/introspection'
    trpcEndpoint: '/api/trpc', // Default: '/api/trpc'
    enabled: true, // Default: !isProduction
    token: 'your-secure-token', // Default: process.env.TRPC_STUDIO_TOKEN
    serveStatic: true, // Default: true
  })
);
```

## CORS Configuration

For cross-origin requests, ensure your API includes the necessary CORS headers:

```typescript
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', 'https://your-studio-domain.com');
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'authorization, x-trpc-studio-token, content-type');
  res.header('Vary', 'Origin');
  next();
});
```

## Testing

The example includes comprehensive test coverage. Run tests with:

```bash
npm test
```

## Troubleshooting

### Studio returns 404 in production

- Ensure `TRPC_STUDIO_ENABLED=true` is set
- Ensure `TRPC_STUDIO_TOKEN` is configured

### Studio returns 403

- Check that you're including the correct token
- Verify token format: `Authorization: Bearer <token>` or `x-trpc-studio-token: <token>`

### CORS errors

- Ensure your API includes the necessary CORS headers
- Check that the Studio origin is allowed
- Include credentials if using cookie-based authentication
