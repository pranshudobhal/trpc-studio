# tRPC Studio - Next.js 14 Example

This is a comprehensive example application demonstrating tRPC Studio integration with Next.js 14
App Router, featuring modern technologies and best practices.

## 🚀 Features

- **Next.js 14** with App Router
- **tRPC v11** with full type safety
- **Tailwind CSS v4** with custom theming and dark mode
- **SuperJSON** for complex data type serialization
- **TanStack Query v5** for client-side state management
- **TypeScript** with strict mode
- **Comprehensive tRPC router** with various procedure types
- **Authentication examples** with protected procedures
- **Rich metadata** with summaries, descriptions, tags, and examples

## 📦 Tech Stack

| Technology     | Version | Purpose                              |
| -------------- | ------- | ------------------------------------ |
| Next.js        | ^14.2.0 | React framework with App Router      |
| tRPC           | ^11.0.0 | End-to-end typesafe APIs             |
| TanStack Query | ^5.0.0  | Data fetching and caching            |
| Tailwind CSS   | ^4.0.0  | Utility-first CSS framework          |
| SuperJSON      | ^2.2.0  | JSON serialization for complex types |
| Zod            | ^3.23.0 | Schema validation                    |
| TypeScript     | ^5.0.0  | Type safety                          |

## 🛠 Setup Instructions

### 1. Install Dependencies

```bash
# From the example directory
pnpm install

# Or from the root of the monorepo
pnpm install
```

### 2. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your configuration:

```env
# Development (tRPC Studio enabled by default)
NODE_ENV=development
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=dev-token-123
PORT=3000
```

For production deployment:

```env
# Production (requires explicit enablement)
NODE_ENV=production
TRPC_STUDIO_ENABLED=true
TRPC_STUDIO_TOKEN=your-super-secret-token-here
VERCEL_URL=your-app.vercel.app
```

### 3. Start Development Server

```bash
pnpm dev
```

The application will be available at:

- **Main App**: http://localhost:3000
- **tRPC Studio**: http://localhost:3000/trpc-studio
- **Introspection API**: http://localhost:3000/**trpc-studio**/introspection

## 🏗 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── trpc/[trpc]/   # tRPC API routes
│   │   └── __trpc-studio__/ # tRPC Studio introspection
│   ├── trpc-studio/       # tRPC Studio UI page
│   ├── globals.css        # Global styles with Tailwind v4
│   ├── layout.tsx         # Root layout with providers
│   └── page.tsx           # Home page with examples
├── components/
│   └── providers.tsx      # TanStack Query providers
├── lib/
│   └── trpc.ts           # tRPC client configuration
└── server/
    └── api/
        ├── root.ts       # Main tRPC router
        └── trpc.ts       # tRPC server configuration
```

## 📋 tRPC Router Features

The example includes a comprehensive tRPC router demonstrating:

### Query Procedures

- **Simple queries** with basic input/output
- **Complex data types** (Date, BigInt, Map, Set)
- **Paginated lists** with filtering and sorting
- **Search functionality** with full-text search

### Mutation Procedures

- **Create operations** with validation
- **Update operations** with partial data
- **Delete operations** with confirmation

### Schema Examples

- **Primitive types** with constraints (min, max, email, regex)
- **Object schemas** with nested properties
- **Array schemas** with item validation
- **Union types** and discriminated unions
- **Enum schemas** with predefined values
- **Optional and nullable** fields
- **Default values** and transformations

### Metadata Features

- **Summaries and descriptions** for documentation
- **Tags** for categorization
- **Examples** with input/output samples
- **Visibility controls** (public, internal, hidden)
- **Deprecation markers** for API evolution
- **Authentication requirements** indicators

### Authentication

- **Public procedures** accessible to all
- **Protected procedures** requiring authentication
- **Mock authentication system** for demonstration
- **Context-based authorization** patterns

## 🎨 Styling and Theming

### Tailwind CSS v4 Features

- **CSS variables** for theming
- **Dark mode** with `prefers-color-scheme`
- **Custom color palette** with OKLCH colors
- **Responsive design** utilities
- **Focus management** for accessibility

### Theme Customization

The global CSS file (`src/app/globals.css`) includes:

- Custom color variables
- Typography scales
- Spacing system
- Border radius tokens
- Shadow definitions
- Component utilities

### Dark Mode

Automatic dark mode support based on system preferences:

```css
@media (prefers-color-scheme: dark) {
  /* Dark theme overrides */
}
```

## 🔒 Security Configuration

### Development Mode

- tRPC Studio is **enabled by default**
- No token required for local development
- All procedures accessible for testing

### Production Mode

- tRPC Studio is **disabled by default**
- Requires `TRPC_STUDIO_ENABLED=true` environment variable
- Requires `TRPC_STUDIO_TOKEN` for access
- Protected procedures need authentication headers

### Security Headers

The Next.js configuration includes security headers:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`

## 🧪 Testing the Integration

### 1. Basic Functionality

1. Start the development server
2. Visit http://localhost:3000
3. Test the interactive examples on the home page
4. Verify queries and mutations work correctly

### 2. tRPC Studio

1. Open http://localhost:3000/trpc-studio
2. Browse the router tree and procedures
3. Test the interactive playground
4. Verify schema rendering and metadata display

### 3. Authentication

1. Test public procedures (should work without auth)
2. Test protected procedures (may require mock token)
3. Verify error handling for unauthorized access

### 4. Complex Data Types

1. Test the "Complex Data Types" example
2. Verify SuperJSON serialization works
3. Check Date, BigInt, Map, and Set handling

## 🚀 Deployment

### Vercel Deployment

1. Connect your repository to Vercel
2. Set environment variables in Vercel dashboard:
   ```
   NODE_ENV=production
   TRPC_STUDIO_ENABLED=true
   TRPC_STUDIO_TOKEN=your-secure-token
   ```
3. Deploy and test the production build

### Other Platforms

1. Build the application: `pnpm build`
2. Set production environment variables
3. Start the production server: `pnpm start`

## 📚 Learning Resources

### tRPC Documentation

- [tRPC Official Docs](https://trpc.io)
- [tRPC with Next.js](https://trpc.io/docs/nextjs)
- [tRPC Server Setup](https://trpc.io/docs/server/introduction)

### Next.js Resources

- [Next.js App Router](https://nextjs.org/docs/app)
- [Next.js API Routes](https://nextjs.org/docs/app/building-your-application/routing/route-handlers)

### Styling and UI

- [Tailwind CSS v4](https://tailwindcss.com/docs)
- [TanStack Query](https://tanstack.com/query/latest)

## 🤝 Contributing

This example is part of the tRPC Studio monorepo. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This example is part of tRPC Studio and is licensed under the MIT License.

## 🆘 Troubleshooting

### Common Issues

**tRPC Studio not loading:**

- Check that `TRPC_STUDIO_ENABLED=true` in production
- Verify the token is set correctly
- Check browser console for errors

**Authentication errors:**

- Ensure mock token is included in requests
- Check the `createContext` function in the API route
- Verify protected procedures are configured correctly

**Styling issues:**

- Ensure Tailwind CSS is properly configured
- Check that PostCSS configuration is correct
- Verify global CSS imports are working

**Build errors:**

- Check TypeScript configuration
- Ensure all dependencies are installed
- Verify workspace package linking

### Getting Help

- Check the main tRPC Studio documentation
- Review the tRPC official documentation
- Open an issue in the tRPC Studio repository
- Join the tRPC Discord community
