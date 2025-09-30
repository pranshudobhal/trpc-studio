# Contributing to tRPC Studio

Thank you for your interest in contributing to tRPC Studio! This guide will help you get started
with development and understand our contribution process.

## Development Setup

### Prerequisites

- Node.js ≥18.18 (we develop with Node 22)
- pnpm (package manager)
- Git

### Getting Started

1. **Fork and clone the repository**:

```bash
git clone https://github.com/your-username/trpc-studio.git
cd trpc-studio
```

2. **Install dependencies**:

```bash
pnpm install
```

3. **Build all packages**:

```bash
pnpm -w run build
```

4. **Run tests**:

```bash
pnpm -w run test
```

5. **Start the example application**:

```bash
cd examples/next-basic
pnpm dev
```

Visit `http://localhost:3000/trpc-studio` to see tRPC Studio in action.

## Project Structure

```
trpc-studio/
├── packages/
│   ├── core/           # @trpc-studio/core - Core introspection and utilities
│   ├── ui/             # @trpc-studio/ui - React components
│   ├── next/           # @trpc-studio/next - Next.js adapter
│   └── express/        # @trpc-studio/express - Express adapter
├── examples/
│   └── next-basic/     # Working example application
├── docs/               # Documentation
└── .github/            # CI/CD workflows
```

## Development Workflow

### Making Changes

1. **Create a feature branch**:

```bash
git checkout -b feature/your-feature-name
```

2. **Make your changes** following our coding standards

3. **Add tests** for new functionality

4. **Run the test suite**:

```bash
pnpm -w run test
pnpm -w run typecheck
pnpm -w run lint
```

5. **Test with the example app**:

```bash
cd examples/next-basic
pnpm dev
```

6. **Commit your changes**:

```bash
git add .
git commit -m "feat: add new feature"
```

### Commit Message Format

We use conventional commits for consistent commit messages:

- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `style:` - Code style changes (formatting, etc.)
- `refactor:` - Code refactoring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

Examples:

```
feat: add environment profile management
fix: resolve CORS issues with custom headers
docs: update API documentation
test: add unit tests for schema converter
```

## Coding Standards

### TypeScript

- Use strict TypeScript configuration
- Prefer explicit types over `any`
- Use proper JSDoc comments for public APIs

```typescript
/**
 * Converts a Zod schema to JSON Schema format
 * @param zodSchema - The Zod schema to convert
 * @returns JSON Schema representation
 */
export function convertZodToJsonSchema(zodSchema: z.ZodType): JSONSchema {
  // Implementation
}
```

### React Components

- Use functional components with hooks
- Implement proper TypeScript interfaces for props
- Use React.memo for performance when appropriate

```typescript
interface ProcedureDetailsProps {
  procedure: ProcedureNode;
  onSelect?: (procedure: ProcedureNode) => void;
}

export const ProcedureDetails = memo<ProcedureDetailsProps>(({ procedure, onSelect }) => {
  // Component implementation
});
```

### Styling

- Use Tailwind CSS classes
- Follow the existing design system
- Ensure accessibility (ARIA labels, keyboard navigation)

```typescript
<button
  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
  aria-label="Execute procedure"
  onClick={handleExecute}
>
  Execute
</button>
```

### Testing

- Write unit tests for utility functions
- Write integration tests for components
- Use descriptive test names

```typescript
describe('convertZodToJsonSchema', () => {
  it('should convert string schema to JSON Schema', () => {
    const zodSchema = z.string();
    const result = convertZodToJsonSchema(zodSchema);

    expect(result).toEqual({
      type: 'string',
    });
  });

  it('should handle string constraints', () => {
    const zodSchema = z.string().min(3).max(50).email();
    const result = convertZodToJsonSchema(zodSchema);

    expect(result).toEqual({
      type: 'string',
      minLength: 3,
      maxLength: 50,
      format: 'email',
    });
  });
});
```

## Package Development

### Core Package (`@trpc-studio/core`)

Contains shared utilities and types:

- Router introspection logic
- Zod to JSON Schema conversion
- Security utilities
- TypeScript type definitions

**Key files**:

- `src/introspection/builder.ts` - Router walking logic
- `src/schema/converter.ts` - Schema conversion
- `src/security/` - Security utilities
- `src/types/` - TypeScript definitions

### UI Package (`@trpc-studio/ui`)

React components and UI logic:

- Main StudioApp component
- Documentation view components
- Playground form components
- Styling and theming

**Key files**:

- `src/components/studio-app.tsx` - Main container
- `src/components/documentation-view.tsx` - Router tree
- `src/components/playground-form.tsx` - Dynamic forms
- `src/styles/globals.css` - Tailwind styles

### Adapter Packages

Framework-specific integrations:

- `@trpc-studio/next` - Next.js (App Router + Pages Router)
- `@trpc-studio/express` - Express middleware

**Key responsibilities**:

- Route mounting and configuration
- Security middleware integration
- Static asset serving
- Framework-specific request/response handling

## Testing

### Running Tests

```bash
# Run all tests
pnpm -w run test

# Run tests for specific package
pnpm --filter @trpc-studio/core test

# Run tests in watch mode
pnpm -w run test --watch

# Run E2E tests
pnpm -w run e2e
```

### Test Categories

1. **Unit Tests** - Test individual functions and utilities
2. **Component Tests** - Test React components in isolation
3. **Integration Tests** - Test adapter functionality
4. **E2E Tests** - Test complete user workflows with Playwright

### Writing Tests

#### Unit Tests

```typescript
// packages/core/src/schema/__tests__/converter.test.ts
import { convertZodToJsonSchema } from '../converter';
import { z } from 'zod';

describe('Schema Converter', () => {
  test('converts basic types', () => {
    expect(convertZodToJsonSchema(z.string())).toEqual({
      type: 'string',
    });
  });
});
```

#### Component Tests

```typescript
// packages/ui/src/components/__tests__/procedure-details.test.tsx
import { render, screen } from '@testing-library/react';
import { ProcedureDetails } from '../procedure-details';

describe('ProcedureDetails', () => {
  test('renders procedure information', () => {
    const procedure = {
      name: 'getUser',
      type: 'query',
      meta: { summary: 'Get user by ID' }
    };

    render(<ProcedureDetails procedure={procedure} />);

    expect(screen.getByText('getUser')).toBeInTheDocument();
    expect(screen.getByText('Get user by ID')).toBeInTheDocument();
  });
});
```

#### Integration Tests

```typescript
// packages/next/src/__tests__/integration.test.ts
import { createStudioHandler } from '../index';
import { testRouter } from './fixtures/router';

describe('Next.js Integration', () => {
  test('creates handler successfully', () => {
    const handler = createStudioHandler({
      router: testRouter,
    });

    expect(typeof handler).toBe('function');
  });
});
```

## Documentation

### Writing Documentation

- Use clear, concise language
- Include code examples
- Add troubleshooting sections
- Keep documentation up to date with code changes

### Documentation Structure

- `README.md` - Main project documentation
- `docs/api.md` - API reference
- `docs/security.md` - Security guide
- `docs/troubleshooting.md` - Common issues and solutions
- `docs/migration.md` - Migration guides
- `docs/performance.md` - Performance optimization

### Example Documentation

````markdown
## Configuration

Configure tRPC Studio with these options:

```typescript
export const GET = createStudioHandler({
  router: appRouter, // Your tRPC router
  trpcEndpoint: '/api/trpc', // tRPC endpoint path
  enabled: true, // Enable/disable studio
  token: 'your-token', // Authentication token
});
```
````

### Options

| Option         | Type        | Default       | Description                 |
| -------------- | ----------- | ------------- | --------------------------- |
| `router`       | `AnyRouter` | -             | Your tRPC router (required) |
| `trpcEndpoint` | `string`    | `'/api/trpc'` | Path to tRPC endpoint       |

````

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**:

```bash
pnpm -w run test
pnpm -w run typecheck
pnpm -w run lint
pnpm -w run e2e
````

2. **Check bundle size**:

```bash
pnpm -w run size
```

3. **Update documentation** if needed

4. **Add changeset** for version management:

```bash
pnpm changeset
```

### Submitting a Pull Request

1. **Push your branch**:

```bash
git push origin feature/your-feature-name
```

2. **Create a pull request** on GitHub

3. **Fill out the PR template** with:
   - Description of changes
   - Testing performed
   - Breaking changes (if any)
   - Documentation updates

4. **Request review** from maintainers

### PR Review Process

- All PRs require at least one approval
- CI checks must pass
- Bundle size must stay within limits
- Documentation must be updated for user-facing changes

## Release Process

We use changesets for version management:

1. **Add changeset** when making changes:

```bash
pnpm changeset
```

2. **Choose change type**:
   - `patch` - Bug fixes
   - `minor` - New features
   - `major` - Breaking changes

3. **Describe the change** in the changeset file

4. **Releases are automated** when changesets are merged to main

## Getting Help

### Community

- **GitHub Discussions** - Ask questions and share ideas
- **GitHub Issues** - Report bugs and request features
- **Discord** - Real-time chat with maintainers and community

### Maintainers

- Review pull requests
- Triage issues
- Manage releases
- Provide technical guidance

### Issue Templates

Use the appropriate issue template:

- **Bug Report** - For reporting bugs
- **Feature Request** - For requesting new features
- **Documentation** - For documentation improvements
- **Question** - For general questions

## Code of Conduct

We are committed to providing a welcoming and inclusive environment for all contributors. Please
read and follow our [Code of Conduct](CODE_OF_CONDUCT.md).

### Expected Behavior

- Be respectful and inclusive
- Provide constructive feedback
- Focus on what's best for the community
- Show empathy towards other contributors

### Unacceptable Behavior

- Harassment or discrimination
- Trolling or insulting comments
- Personal attacks
- Publishing private information

## Recognition

Contributors are recognized in:

- Release notes
- Contributors section in README
- GitHub contributor graphs
- Special recognition for significant contributions

Thank you for contributing to tRPC Studio! 🎉
