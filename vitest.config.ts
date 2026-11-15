import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    maxWorkers: 2,
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
