import type { GetGraphDataResponse, GraphNode, GraphEdge } from '@semble/types';

/**
 * Configuration for mock graph data generation
 */
interface MockGraphConfig {
  nodeCount: number;
  edgeDensity: number; // 0-1, percentage of possible edges to create
  typeDistribution?: {
    USER?: number;
    URL?: number;
    COLLECTION?: number;
    NOTE?: number;
  };
}

/**
 * Generate random mock graph data for performance testing
 *
 * @param config Configuration for data generation
 * @returns Mock graph data with nodes and edges
 *
 * @example
 * // Generate 1000 nodes with moderate edge density
 * const mockData = generateMockGraphData({ nodeCount: 1000, edgeDensity: 0.01 });
 *
 * // Generate 5000 nodes with custom type distribution
 * const mockData = generateMockGraphData({
 *   nodeCount: 5000,
 *   edgeDensity: 0.005,
 *   typeDistribution: { USER: 0.2, URL: 0.5, COLLECTION: 0.2, NOTE: 0.1 }
 * });
 */
export function generateMockGraphData(
  config: MockGraphConfig,
): GetGraphDataResponse {
  const {
    nodeCount,
    edgeDensity,
    typeDistribution = { USER: 0.25, URL: 0.4, COLLECTION: 0.2, NOTE: 0.15 },
  } = config;

  // Generate nodes
  const nodes: GraphNode[] = [];
  const nodeTypes: Array<GraphNode['type']> = [
    'USER',
    'URL',
    'COLLECTION',
    'NOTE',
  ];

  for (let i = 0; i < nodeCount; i++) {
    // Determine node type based on distribution
    const rand = Math.random();
    let cumulativeProb = 0;
    let type: GraphNode['type'] = 'URL';

    for (const [nodeType, prob] of Object.entries(typeDistribution)) {
      cumulativeProb += prob;
      if (rand <= cumulativeProb) {
        type = nodeType as GraphNode['type'];
        break;
      }
    }

    nodes.push(generateNode(i, type));
  }

  // Generate edges
  const edges: GraphEdge[] = [];
  const edgeTypes: Array<GraphEdge['type']> = [
    'USER_FOLLOWS_USER',
    'USER_FOLLOWS_COLLECTION',
    'USER_AUTHORED_URL',
    'NOTE_REFERENCES_URL',
    'COLLECTION_CONTAINS_URL',
    'URL_CONNECTS_URL',
  ];

  // Calculate how many edges to create
  const maxPossibleEdges = nodeCount * (nodeCount - 1);
  const targetEdgeCount = Math.floor(maxPossibleEdges * edgeDensity);

  let edgeId = 0;
  for (let i = 0; i < targetEdgeCount; i++) {
    // Pick two random nodes
    const sourceIdx = Math.floor(Math.random() * nodeCount);
    let targetIdx = Math.floor(Math.random() * nodeCount);

    // Ensure source and target are different
    while (targetIdx === sourceIdx) {
      targetIdx = Math.floor(Math.random() * nodeCount);
    }

    const sourceNode = nodes[sourceIdx];
    const targetNode = nodes[targetIdx];

    // Determine appropriate edge type based on node types
    const edgeType = getAppropriateEdgeType(sourceNode.type, targetNode.type);
    if (!edgeType) continue; // Skip if no valid edge type for this combination

    edges.push({
      id: `edge-${edgeId++}`,
      source: sourceNode.id,
      target: targetNode.id,
      type: edgeType,
      metadata: {},
    });
  }

  console.log(
    `Generated mock graph data: ${nodes.length} nodes, ${edges.length} edges`,
  );

  // Return with pagination metadata (mock assumes single page with all data)
  return {
    nodes,
    edges,
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: nodes.length,
      hasMore: false,
      limit: nodes.length,
    },
  };
}

/**
 * Generate a single node with realistic mock data
 */
function generateNode(index: number, type: GraphNode['type']): GraphNode {
  const id = `${type.toLowerCase()}-${index}`;

  switch (type) {
    case 'USER':
      return {
        id,
        type,
        label: `User ${index}`,
        metadata: {
          handle: `user${index}.bsky.social`,
          name: `User ${index}`,
          avatarUrl: `https://picsum.photos/seed/${index}/200/200`,
          description: `This is a mock user profile for testing. User ${index}.`,
          followerCount: Math.floor(Math.random() * 1000),
          followingCount: Math.floor(Math.random() * 500),
        },
      };

    case 'URL':
      const urlTypes = ['article', 'video', 'book', 'research', 'link'];
      const urlType = urlTypes[Math.floor(Math.random() * urlTypes.length)];
      return {
        id,
        type,
        label: `${urlType.charAt(0).toUpperCase() + urlType.slice(1)} ${index}`,
        metadata: {
          url: `https://example.com/${urlType}/${index}`,
          title: `Interesting ${urlType} about topic ${index}`,
          description: `This is a mock ${urlType} for performance testing. Content ${index}.`,
          author: `Author ${Math.floor(Math.random() * 100)}`,
          siteName: 'Example.com',
          libraryCount: Math.floor(Math.random() * 50),
          urlType,
        },
      };

    case 'COLLECTION':
      const accessTypes = ['OPEN', 'CLOSED'];
      const accessType =
        accessTypes[Math.floor(Math.random() * accessTypes.length)];
      return {
        id,
        type,
        label: `Collection ${index}`,
        metadata: {
          name: `Collection ${index}`,
          description: `A curated collection of resources about topic ${index}`,
          handle: `user${Math.floor(Math.random() * 50)}.bsky.social`,
          rkey: `collection${index}`,
          authorName: `User ${Math.floor(Math.random() * 50)}`,
          cardCount: Math.floor(Math.random() * 100),
          followerCount: Math.floor(Math.random() * 200),
          accessType,
        },
      };

    case 'NOTE':
      return {
        id,
        type,
        label: `Note ${index}`,
        metadata: {
          text: `This is a note with thoughts and insights about resource ${index}. Mock content for testing.`,
          authorName: `User ${Math.floor(Math.random() * 50)}`,
          parentUrl: `https://example.com/article/${Math.floor(Math.random() * 1000)}`,
        },
      };

    default:
      return {
        id,
        type: 'URL',
        label: `Node ${index}`,
        metadata: {},
      };
  }
}

/**
 * Determine appropriate edge type based on source and target node types
 */
function getAppropriateEdgeType(
  sourceType: GraphNode['type'],
  targetType: GraphNode['type'],
): GraphEdge['type'] | null {
  // Define valid edge type combinations
  const validCombinations: Record<string, GraphEdge['type']> = {
    'USER-USER': 'USER_FOLLOWS_USER',
    'USER-COLLECTION': 'USER_FOLLOWS_COLLECTION',
    'USER-URL': 'USER_AUTHORED_URL',
    'NOTE-URL': 'NOTE_REFERENCES_URL',
    'COLLECTION-URL': 'COLLECTION_CONTAINS_URL',
    'URL-URL': 'URL_CONNECTS_URL',
  };

  const key = `${sourceType}-${targetType}`;
  return validCombinations[key] || null;
}

/**
 * Preset configurations for common testing scenarios
 */
export const MOCK_GRAPH_PRESETS = {
  // Small graph for quick testing
  small: {
    nodeCount: 100,
    edgeDensity: 0.02,
  },
  // Medium graph for moderate testing
  medium: {
    nodeCount: 500,
    edgeDensity: 0.01,
  },
  // Large graph for performance testing
  large: {
    nodeCount: 2000,
    edgeDensity: 0.005,
  },
  // Extra large graph for stress testing
  extraLarge: {
    nodeCount: 5000,
    edgeDensity: 0.002,
  },
  // Dense small graph for complex visualization
  denseSmall: {
    nodeCount: 200,
    edgeDensity: 0.05,
  },
} as const;
