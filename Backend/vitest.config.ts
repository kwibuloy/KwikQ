import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // DB integration tests share one database; run files one at a time.
    fileParallelism: false,
  },
});
