import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test-setup.ts'],
    globals: true,
    include: [
      'src/**/*.{test,tests}.?(c|m)[jt]s?(x)',
      'src/**/__tests__/**/*.{ts,tsx}',
    ],
    exclude: [
      '**/*.spec.ts', // Treat .spec.ts as Playwright / E2E specs
      '**/*.spec.tsx',
      'node_modules',
      'dist',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/test-setup.ts',
        '**/*.spec.ts',
        '**/*.spec.tsx',
      ],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
