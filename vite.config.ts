import { defineConfig } from 'vitest/config';

// VITE_BASE is "/" for local dev and a custom domain, and "/<repo>/" for a
// GitHub Pages project site (set by the deploy workflow).
export default defineConfig({
  base: process.env['VITE_BASE'] ?? '/',
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
});
