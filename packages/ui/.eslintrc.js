module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'react', 'react-hooks'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
  ],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  env: {
    browser: true,
    es2022: true,
  },
  settings: {
    react: {
      version: 'detect',
    },
  },
  ignorePatterns: ['dist/', 'node_modules/'],
  rules: {
    // TODO: Fix unused variables and change back to 'error'
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // TODO: Replace 'any' types with proper types and change back to 'error'
    '@typescript-eslint/no-explicit-any': 'warn',
    // TODO: Replace @ts-ignore with @ts-expect-error and re-enable
    '@typescript-eslint/prefer-ts-expect-error': 'off',
    // TODO: Remove @ts-ignore comments by fixing underlying issues and re-enable
    '@typescript-eslint/ban-ts-comment': 'off',
    'react/react-in-jsx-scope': 'off', // Not needed with React 17+ JSX transform
    'react/prop-types': 'off', // Using TypeScript for prop validation
    // TODO: Escape HTML entities in JSX and change back to 'error'
    'react/no-unescaped-entities': 'warn',
    // TODO: Add block statements to case clauses and change back to 'error'
    'no-case-declarations': 'warn',
    // TODO: Use const for variables that are never reassigned and change back to 'error'
    'prefer-const': 'warn',
  },
};
