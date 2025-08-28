import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    'search-repos': 'src/search-repos.ts',
    'test-auth': 'src/test-auth.ts',
    'clear-cache': 'src/clear-cache.ts',
  },
  format: ['esm'],
  dts: false, // Alfred doesn't need type definitions
  clean: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  target: 'node18',
});
