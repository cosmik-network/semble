import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs'],
  dts: {
    resolve: ['@semble/contract', '@semble/types'],
  },
  clean: true,
  sourcemap: true,
  noExternal: ['@semble/contract', '@semble/types'],
});
