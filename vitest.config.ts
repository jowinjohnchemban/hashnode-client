import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: { __PKG_VERSION__: JSON.stringify('0.0.0-test') },
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      // The CLI is a process entry point, covered by test/integration/mcp-stdio.test.ts.
      exclude: ['src/cli.ts'],
      reporter: ['text', 'lcov'],
      thresholds: { statements: 95, branches: 90, functions: 95, lines: 95 },
    },
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['test/unit/**/*.test.ts'],
        },
      },
      {
        extends: true,
        test: {
          // Hits the real Hashnode API. Run with `pnpm test:integration`.
          name: 'integration',
          include: ['test/integration/**/*.test.ts'],
          testTimeout: 30_000,
          retry: 1,
        },
      },
    ],
  },
});
