import { defineConfig } from 'vite';

// Bundles the command-line simulator into one Node file (dist-sim/cli.js), so that the
// TypeScript sources and their extensionless imports run without any extra dependency.
export default defineConfig({
  build: {
    ssr: 'tools/sim/cli.ts',
    outDir: 'dist-sim',
    emptyOutDir: true,
    target: 'node22',
    minify: false,
  },
});
