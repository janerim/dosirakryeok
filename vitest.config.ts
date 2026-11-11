import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['db/**/*.test.ts', 'lib/**/*.test.ts'],
  },
  resolve: {
    alias: { '@': __dirname },
  },
});
