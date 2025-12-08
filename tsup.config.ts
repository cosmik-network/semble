import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    'workers/feed-worker': 'src/workers/feed-worker.ts',
    'workers/search-worker': 'src/workers/search-worker.ts',
    'workers/firehose-worker': 'src/workers/firehose-worker.ts',
  },
  outDir: 'dist',
  target: 'node18',
  format: ['cjs'],
  clean: true,
  sourcemap: true,
  // Bundle workspace dependencies
  noExternal: ['@semble/types'],
  // Enable type checking
  // This will make tsup type-check all files including workspace packages
  tsconfig: './tsconfig.json',
  // Add watch exclusions to prevent continuous rebuilds
  ignoreWatch: [
    'dist/**',
    'node_modules/**',
    '**/*.test.ts',
    '**/*.spec.ts',
    'src/webapp/**',
    'src/types/**',
    'src/packages/**'
  ],
});
