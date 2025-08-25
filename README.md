# trpc-studio

Docs **and** Playground for your tRPC router — secure by default.  
Adapters for **Next.js** and **Express**.

> **Status:** WIP (public OSS). Contributions welcome!

## Features

- 📚 Auto docs from Zod + metadata (no OpenAPI required)
- 🧪 Playground (form mode) with inline validation
- 🔐 Production-off by default; token-gated enable
- 🧰 Environment/header profiles, response viewer
- 🧩 Next.js (App/Pages) and Express adapters (initial targets)

## Quickstart (Next.js App Router)

```ts
// app/trpc-studio/route.ts
import { createDevtoolsHandler } from '@trpc-studio/next';
import { appRouter } from '@/server/trpc/router';

export const GET = createDevtoolsHandler({
  router: appRouter,
  trpcEndpoint: process.env.TRPC_STUDIO_ENDPOINT ?? '/api/trpc',
  enableInProd: process.env.TRPC_STUDIO_ENABLED === 'true',
  token: process.env.TRPC_STUDIO_TOKEN,
});
export const POST = GET;
```

### Security

- Disabled when `NODE_ENV=production` unless **both** are set:
  - `TRPC_STUDIO_ENABLED=true`
  - `TRPC_STUDIO_TOKEN=<strong random>`
- Requests to `/trpc-studio` and the introspection endpoint must present the token.

## Monorepo layout (planned)

```
packages/
  core/        # schema/introspection + shared types
  ui/          # React UI (Docs + Playground)
  next/        # Next.js adapter
  express/     # Express adapter
examples/
  next-app/    # Minimal Next.js demo app
docs/
  requirements.md
  design.md
  tasks.md
```

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and the [Code of Conduct](CODE_OF_CONDUCT.md).

## License

[MIT](LICENSE) © 2025 trpc-studio contributors
