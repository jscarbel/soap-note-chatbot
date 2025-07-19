import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        '.dependency-cruiser.js',
        '**/__tests__/**',
        '**/*.config.*',
        '**/*.d.ts',
        '**/*.spec.*',
        '**/*.test.*',
        '**/index.ts',
        '**/test/**',
        '**/tests/**',
        'coverage/',
        'dist/',
        'docs/',
        'node_modules/',
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80,
        },
      },
    },
    include: ['./**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    exclude: ['node_modules', 'dist', 'docs', '.git'],
    typecheck: {
      enabled: true,
    },
  },
});
