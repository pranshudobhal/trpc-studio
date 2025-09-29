# ESLint TODO Items

This document tracks ESLint rules that were made lenient to allow CI to pass. These should be
addressed gradually to improve code quality.

## Core Package (`packages/core/.eslintrc.js`)

### High Priority

- **`@typescript-eslint/no-unused-vars`**: Currently `warn`, should be `error`
  - Fix unused variables and imports
  - 74 warnings currently

- **`@typescript-eslint/no-var-requires`**: Currently `warn`, should be `error`
  - Replace `require()` statements with ES6 imports
  - Found in `src/introspection/builder.ts:320`

### Medium Priority

- **`@typescript-eslint/no-explicit-any`**: Currently `warn`, should be `error`
  - Replace `any` types with proper TypeScript types
  - Many instances in schema converter and introspection code

## UI Package (`packages/ui/.eslintrc.js`)

### High Priority

- **`@typescript-eslint/ban-ts-comment`**: Currently `off`, should be `error`
  - Remove `@ts-ignore` comments by fixing underlying TypeScript issues
  - Found in test files: `src/__tests__/e2e/studio-smoke.test.ts`

- **`@typescript-eslint/prefer-ts-expect-error`**: Currently `off`, should be `error`
  - Replace `@ts-ignore` with `@ts-expect-error` where suppression is needed
  - 4 instances in smoke tests

### Medium Priority

- **`@typescript-eslint/no-unused-vars`**: Currently `warn`, should be `error`
  - Fix unused variables and imports
  - 80 warnings currently

- **`no-case-declarations`**: Currently `warn`, should be `error`
  - Add block statements `{}` around case clauses with declarations
  - Found in `src/components/playground-form.tsx`

- **`prefer-const`**: Currently `warn`, should be `error`
  - Use `const` for variables that are never reassigned
  - Found in `src/lib/trpc-client.ts:100`

- **`react/no-unescaped-entities`**: Currently `warn`, should be `error`
  - Escape HTML entities like `'` and `"` in JSX
  - Found in multiple component files

### Low Priority

- **`@typescript-eslint/no-explicit-any`**: Currently `warn`, should be `error`
  - Replace `any` types with proper TypeScript types
  - Many instances across components and utilities

## Next Package (`packages/next/.eslintrc.js`)

### Medium Priority

- **`@typescript-eslint/no-unused-vars`**: Currently `warn`, should be `error`
  - Fix unused variables and imports
  - 8 warnings currently

- **`@typescript-eslint/no-explicit-any`**: Currently `warn`, should be `error`
  - Replace `any` types with proper TypeScript types
  - Found in handler and static file utilities

## Express Package (`packages/express/.eslintrc.js`)

### Medium Priority

- **`@typescript-eslint/no-unused-vars`**: Currently `warn`, should be `error`
  - Fix unused variables and imports
  - 10 warnings currently

- **`@typescript-eslint/no-explicit-any`**: Currently `warn`, should be `error`
  - Replace `any` types with proper TypeScript types
  - Found in config and handler files

## Recommended Approach

1. **Start with High Priority items** - these represent actual code issues
2. **Fix one package at a time** - easier to manage and test
3. **Change rules back to `error` after fixing** - prevents regression
4. **Use TypeScript strict mode** - helps catch type issues early

## Current Status

- ✅ ESLint properly configured across all packages
- ✅ CI passing with warnings only
- ⏳ 172 total warnings to address across all packages
- ⏳ 0 errors (all converted to warnings for CI compatibility)
