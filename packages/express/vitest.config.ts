import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.d.ts',
        '**/__tests__/**',
        '**/test-setup.ts',
      ],
    },
  },
  resolve: {
    alias: {
      '@trpc-studio/core': resolve(__dirname, '../core/src/index.ts'),
      '@trpc-studio/ui': resolve(__dirname, '../ui/src/index.ts'),
    },
  },
});
