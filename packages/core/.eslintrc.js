module.exports = {
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: ['eslint:recommended', 'plugin:@typescript-eslint/recommended'],
  parserOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
  env: {
    node: true,
    es2022: true,
  },
  ignorePatterns: ['dist/', 'node_modules/'],
  rules: {
    // TODO: Fix unused variables and change back to 'error'
    '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    // TODO: Replace 'any' types with proper types and change back to 'error'
    '@typescript-eslint/no-explicit-any': 'warn',
    // TODO: Replace require() statements with ES6 imports and change back to 'error'
    '@typescript-eslint/no-var-requires': 'warn',
  },
};
