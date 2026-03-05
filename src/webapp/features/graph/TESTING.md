# Graph View Performance Testing

This document explains how to test the graph view with mock data for performance testing.

## Quick Start

To enable mock data for the graph view:

1. Create or edit `.env.local` in the `src/webapp` directory:

   ```bash
   NEXT_PUBLIC_USE_MOCK_GRAPH_DATA=true
   ```

2. Restart your development server:

   ```bash
   npm run dev
   ```

3. Navigate to `/graph` to see the mock graph data

4. To disable mock data, remove the environment variable or set it to `false`

## Available Presets

The mock data generator includes several presets for different testing scenarios:

### Small (100 nodes, 2% edge density)

- **Use case**: Quick testing, debugging
- **Nodes**: 100
- **Approximate edges**: ~200
- **Performance**: Very fast

### Medium (500 nodes, 1% edge density)

- **Use case**: Moderate testing
- **Nodes**: 500
- **Approximate edges**: ~2,500
- **Performance**: Fast

### Large (2,000 nodes, 0.5% edge density) - **DEFAULT**

- **Use case**: Performance testing
- **Nodes**: 2,000
- **Approximate edges**: ~20,000
- **Performance**: Moderate

### Extra Large (5,000 nodes, 0.2% edge density)

- **Use case**: Stress testing
- **Nodes**: 5,000
- **Approximate edges**: ~50,000
- **Performance**: Slow, tests limits

### Dense Small (200 nodes, 5% edge density)

- **Use case**: Complex visualization testing
- **Nodes**: 200
- **Approximate edges**: ~2,000
- **Performance**: Fast but visually complex

## Changing Presets

To change which preset is used, edit `src/webapp/api-client/clients/QueryClient.ts`:

```typescript
// Find this line in getGraphData():
const mockData = generateMockGraphData(MOCK_GRAPH_PRESETS.large);

// Change 'large' to any of: small, medium, large, extraLarge, denseSmall
const mockData = generateMockGraphData(MOCK_GRAPH_PRESETS.extraLarge);
```

## Custom Configuration

You can also generate custom mock data by calling `generateMockGraphData` directly:

```typescript
const customData = generateMockGraphData({
  nodeCount: 3000,
  edgeDensity: 0.003,
  typeDistribution: {
    USER: 0.3, // 30% users
    URL: 0.4, // 40% URLs
    COLLECTION: 0.2, // 20% collections
    NOTE: 0.1, // 10% notes
  },
});
```

## Generated Data Structure

The mock data generator creates realistic test data:

### Nodes

- **USER**: Mock profiles with handles, avatars, follower counts
- **URL**: Mock articles, videos, books, research papers with metadata
- **COLLECTION**: Mock collections with card counts and access types
- **NOTE**: Mock notes with text and parent URL references

### Edges

The generator creates valid edge types based on node combinations:

- `USER_FOLLOWS_USER`: User to user follows
- `USER_FOLLOWS_COLLECTION`: User to collection follows
- `USER_AUTHORED_URL`: User authorship of URLs
- `NOTE_REFERENCES_URL`: Notes referencing URLs
- `COLLECTION_CONTAINS_URL`: Collections containing URLs
- `URL_CONNECTS_URL`: URL to URL connections

## Performance Benchmarks

Expected performance on a modern machine:

| Preset      | Nodes | Edges   | Initial Load | Zoom/Pan | FPS   |
| ----------- | ----- | ------- | ------------ | -------- | ----- |
| Small       | 100   | ~200    | < 1s         | Instant  | 60    |
| Medium      | 500   | ~2,500  | ~2s          | Fast     | 60    |
| Large       | 2,000 | ~20,000 | ~5s          | Smooth   | 45-60 |
| Extra Large | 5,000 | ~50,000 | ~15s         | Moderate | 30-45 |
| Dense Small | 200   | ~2,000  | ~2s          | Smooth   | 50-60 |

## Troubleshooting

### Graph not loading

- Check that the environment variable is set correctly
- Restart your dev server after changing `.env.local`
- Check browser console for errors

### Performance issues

- Try a smaller preset
- Reduce edge density
- Check browser DevTools Performance tab

### Mock data not appearing

- Ensure `NEXT_PUBLIC_USE_MOCK_GRAPH_DATA=true` is set
- Check that the variable is prefixed with `NEXT_PUBLIC_` (required for Next.js)
- Clear browser cache and reload

## Production Usage

**IMPORTANT**: Mock data is disabled in production by default. The environment variable only affects local development when you explicitly set it.

Never deploy with `NEXT_PUBLIC_USE_MOCK_GRAPH_DATA=true` in your production environment variables.
