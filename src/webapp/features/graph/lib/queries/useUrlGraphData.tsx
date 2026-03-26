import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { graphKeys } from '../graphKeys';
import { apiClient } from '@/api-client/ApiClient';
import type {
  ProcessedGraphData,
  ExtendedGraphNode,
  ExtendedGraphEdge,
} from '../../types';
import { calculateNodeSize, getNodeColor } from '../utils/nodeStyles';

/**
 * Hook to fetch and process URL-centric sub-graph data with depth-based traversal
 * Fetches all nodes and edges within N hops of the target URL
 * Calculates connection counts, node sizes, and colors for all nodes
 */
export default function useUrlGraphData(url: string, depth: number = 1) {
  // Fetch URL sub-graph data
  const query = useQuery({
    queryKey: graphKeys.url(url, depth),
    queryFn: () => apiClient.getUrlGraphData({ url, depth }),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnWindowFocus: false,
    enabled: !!url, // Only fetch if URL is provided
  });

  // Process the graph data
  const processedData = useMemo((): ProcessedGraphData => {
    if (!query.data) {
      return { nodes: [], links: [] };
    }

    const { nodes, edges } = query.data;

    // Deduplicate nodes by ID (defensive - server should already dedupe)
    const nodeMap = new Map<string, ExtendedGraphNode>();

    // Calculate connection counts for all nodes
    const connectionCounts: Record<string, number> = {};
    edges.forEach((edge) => {
      connectionCounts[edge.source] = (connectionCounts[edge.source] || 0) + 1;
      connectionCounts[edge.target] = (connectionCounts[edge.target] || 0) + 1;
    });

    // Process nodes: deduplicate, add connection count, size, and color
    nodes.forEach((node) => {
      if (!nodeMap.has(node.id)) {
        const connectionCount = connectionCounts[node.id] || 0;

        nodeMap.set(node.id, {
          ...node,
          connectionCount,
          val: calculateNodeSize(connectionCount),
          color: getNodeColor(node.type),
          // Track when node was added for smooth fade-in animation
          __addedAt: Date.now(),
        });
      }
    });

    const processedNodes = Array.from(nodeMap.values());

    // Create a set of valid node IDs for edge validation
    const validNodeIds = new Set(processedNodes.map((n) => n.id));

    // Process edges: filter out invalid edges and add visual properties
    const processedEdges: ExtendedGraphEdge[] = edges
      .filter((edge) => {
        return validNodeIds.has(edge.source) && validNodeIds.has(edge.target);
      })
      .map((edge) => ({
        ...edge,
        value: 1, // Default thickness
      }));

    return {
      nodes: processedNodes,
      links: processedEdges,
    };
  }, [query.data]);

  return {
    data: processedData,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error,
    isSuccess: query.isSuccess,
  };
}
