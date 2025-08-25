# Contributing to trpc-studio

Thanks for your interest in contributing!

## Setup

- Node 18+
- pnpm (recommended) or npm

```bash
pnpm install
pnpm build
pnpm dev
```

## Development

- Keep PRs small and focused.
- Ensure `pnpm test` passes (unit + e2e where applicable).
- Write or update docs/specs in `docs/` when behavior changes.

## Commit style

Use Conventional Commits:

- `feat: add form builder for enums`
- `fix: handle zod refinements in renderer`
- `docs: update README quickstart`

## Security

Never include secrets in fixtures or tests. See `SECURITY.md` for reporting guidelines.
