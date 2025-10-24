import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'workers/feed-worker': 'src/workers/feed-worker.ts',
    'workers/search-worker': 'src/workers/search-worker.ts',
  },
  outDir: 'dist',
  target: 'node18',
  format: ['cjs'],
  clean: true,
  sourcemap: true,
  // Bundle workspace dependencies
  noExternal: ['@semble/types'],
});
