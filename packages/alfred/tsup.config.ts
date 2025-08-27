import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/*.ts'],
  format: ['esm'],
  dts: false, // Alfred doesn't need type definitions
  clean: true,
  splitting: false,
  sourcemap: false,
  minify: false,
  target: 'node18',
  // Keep shebang for executable scripts
  banner: {
    js: '#!/usr/bin/env node',
  },
});
