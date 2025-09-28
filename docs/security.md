# Security Guide

This guide covers security considerations and best practices for deploying tRPC Studio in production
environments.

## Security Model Overview

tRPC Studio follows a **secure-by-default** approach:

1. **Disabled by default in production**
2. **Explicit opt-in required** via environment variables
3. **Token-based authentication** for all requests
4. **GET-only introspection** endpoint
5. **Complete route hiding** when disabled

## Production Deployment

### Environment Variables

Two environment variables control tRPC Studio in production:

```bash
# Required: Explicitly enable tRPC Studio
TRPC_STUDIO_ENABLED=true

# Required: Strong random token for authentication
TRPC_STUDIO_TOKEN=your-256-bit-random-token-here
```

### Token Generation

Generate a strong random token:

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32

# Using Python
python -c "import secrets; print(secrets.token_hex(32))"
```

### Security Precedence Rules

**Critical**: The `TRPC_STUDIO_ENABLED` environment variable takes absolute precedence in
production:

- ✅ `TRPC_STUDIO_ENABLED=true` + `options.enabled=false` → **Enabled**
- ❌ `TRPC_STUDIO_ENABLED=false` + `options.enabled=true` → **Disabled**
- ❌ No `TRPC_STUDIO_ENABLED` + `options.enabled=true` → **Disabled**

This prevents accidental enablement through configuration options.

## Authentication

### Token Headers

tRPC Studio accepts authentication tokens via two headers:

1. **Standard Authorization header**:

   ```
   Authorization: Bearer your-token-here
   ```

2. **Custom header** (useful for avoiding conflicts):
   ```
   x-trpc-studio-token: your-token-here
   ```

### Custom Token Extraction

Override the default token extraction logic:

```typescript
// Next.js
export const GET = createStudioHandler({
  router: appRouter,
  getToken: req => {
    // Extract from custom header
    return req.headers.get('x-api-key') || null;
  },
});

// Express
app.use(
  studioExpress({
    router: appRouter,
    getToken: req => {
      // Extract from cookie
      return req.cookies.authToken || null;
    },
  })
);
```

## Route Security

### HTTP Method Restrictions

The introspection endpoint only accepts GET requests:

- `GET /__trpc-studio__/introspection` → ✅ 200 (with valid token)
- `POST /__trpc-studio__/introspection` → ❌ 405 Method Not Allowed
- `PUT /__trpc-studio__/introspection` → ❌ 405 Method Not Allowed

### Response Codes

| Scenario               | Status Code | Description         |
| ---------------------- | ----------- | ------------------- |
| Disabled in production | 404         | Route doesn't exist |
| Enabled, no token      | 403         | Forbidden           |
| Enabled, invalid token | 403         | Forbidden           |
| Enabled, valid token   | 200         | Success             |
| Wrong HTTP method      | 405         | Method not allowed  |

### Static Asset Protection

When tRPC Studio is disabled, **all static assets** return 404:

- `/trpc-studio` → 404
- `/trpc-studio/assets/app.js` → 404
- `/trpc-studio/assets/styles.css` → 404

This prevents information leakage about the studio's existence.

## Cross-Origin Requests (CORS)

### Required Headers

When tRPC Studio UI is hosted on a different origin than your API:

```typescript
// Express example
app.use(
  cors({
    origin: ['https://your-studio-domain.com'],
    credentials: true, // Required for cookies/auth headers
    allowedHeaders: [
      'authorization',
      'x-trpc-studio-token',
      'content-type',
      'x-trpc-source', // tRPC client header
    ],
  })
);
```

### Manual CORS Configuration

```typescript
app.use((req, res, next) => {
  const origin = req.headers.origin;

  // Whitelist specific origins
  if (['https://studio.yourapp.com', 'https://localhost:3000'].includes(origin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Headers', 'authorization, x-trpc-studio-token, content-type');
    res.header('Vary', 'Origin');
  }

  next();
});
```

### Preflight Requests

Handle OPTIONS requests for complex CORS scenarios:

```typescript
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  res.sendStatus(204);
});
```

## Logging and Monitoring

### Access Logging

tRPC Studio logs minimal access information:

```typescript
// Example log entry
{
  timestamp: '2024-01-15T10:30:00Z',
  method: 'GET',
  path: '/__trpc-studio__/introspection',
  status: 200,
  duration: 45,
  adapter: 'next-app-router'
}
```

### What's NOT Logged

For security, these are never logged:

- Request bodies
- Token values
- Authorization headers
- Sensitive cookies

### Custom Logging

Provide your own logger:

```typescript
// Next.js
export const GET = createStudioHandler({
  router: appRouter,
  logger: {
    info: (msg, meta) => console.log(msg, meta),
    warn: (msg, meta) => console.warn(msg, meta),
    error: (msg, meta) => console.error(msg, meta),
  },
});
```

## Best Practices

### 1. Environment Separation

Use different tokens for different environments:

```bash
# Development
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=dev-token-not-secret

# Staging
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=staging-strong-random-token

# Production
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=production-ultra-secure-token
```

### 2. Network Security

- Deploy behind a VPN or firewall when possible
- Use HTTPS in production
- Consider IP whitelisting for sensitive environments

### 3. Token Management

- Rotate tokens regularly
- Use different tokens per environment
- Store tokens in secure secret management systems
- Never commit tokens to version control

### 4. Monitoring

- Monitor access logs for unusual patterns
- Set up alerts for failed authentication attempts
- Track token usage across environments

### 5. Procedure Visibility

Control what's exposed in the documentation:

```typescript
// Hide sensitive procedures completely
.meta({ visibility: 'hidden' })

// Mark internal procedures
.meta({ visibility: 'internal' })

// Add security context
.meta({
  authRequired: true,
  tags: ['admin-only']
})
```

## Security Checklist

Before deploying to production:

- [ ] `TRPC_STUDIO_ENABLED` environment variable is set
- [ ] Strong random token is generated and set
- [ ] Token is stored securely (not in code)
- [ ] CORS headers are configured if needed
- [ ] HTTPS is enabled
- [ ] Access logging is configured
- [ ] Sensitive procedures are hidden or marked internal
- [ ] Network access is restricted if required
- [ ] Monitoring and alerting is set up

## Incident Response

If you suspect unauthorized access:

1. **Immediately disable** tRPC Studio:

   ```bash
   unset TRPC_STUDIO_ENABLED
   # or
   TRPC_STUDIO_ENABLED=false
   ```

2. **Rotate the token**:

   ```bash
   TRPC_STUDIO_TOKEN=new-secure-token
   ```

3. **Review access logs** for suspicious activity

4. **Check network logs** for unusual traffic patterns

5. **Audit procedure visibility** settings

## UI Stack

tRPC Studio is built with modern, secure technologies that prioritize performance and accessibility:

### Core Technologies

- **Tailwind CSS v4**: Utility-first styling with CSS variables for theming
  - Build-time CSS processing (no runtime CSS-in-JS)
  - Automatic purging of unused styles
  - Consistent design system with CSS custom properties

- **Radix Primitives via shadcn/ui**: Accessible component primitives
  - Components are committed to the repository (no external dependencies at runtime)
  - Full keyboard navigation and screen reader support
  - ARIA-compliant interactive elements

- **React Hook Form + Zod**: Form generation and validation
  - Uses your existing Zod schemas for type-safe forms
  - Client-side validation with server schema enforcement
  - Minimal re-renders for optimal performance

- **Lightweight JSON Viewer**: Fast response inspection
  - Tree-based rendering with expand/collapse
  - SuperJSON type detection and labeling
  - Copy-to-clipboard functionality

### Future Enhancements (v1.1)

- **Monaco Editor**: Full-featured code editor (lazy-loaded)
  - Dynamic import to keep initial bundle small
  - Syntax highlighting for JSON and TypeScript
  - Code generation and snippet copying

### Security Benefits

This technology stack provides several security advantages:

- **No runtime CSS-in-JS**: Eliminates potential XSS vectors from dynamic styling
- **Committed components**: All UI components are auditable and version-controlled
- **Type-safe forms**: Zod validation prevents malformed data submission
- **Minimal dependencies**: Reduced attack surface with fewer third-party packages

## Compliance Considerations

### Data Privacy

- tRPC Studio may expose API schemas and example data
- Review procedure metadata for sensitive information
- Consider data classification when setting visibility

### Audit Requirements

- Access logs provide audit trail
- Token-based authentication enables user tracking
- Consider additional logging for compliance needs

### Regulatory Compliance

- Ensure token strength meets organizational requirements
- Document security controls for compliance audits
- Regular security reviews and updates
