import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts', 'src/scripts/**/*.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false, // Keep readable for debugging
  target: 'node18',
});
