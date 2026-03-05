import { useSuspenseQuery } from '@tanstack/react-query';
import { useMemo } from 'react';
import { graphKeys } from '../graphKeys';
import { getGraphData } from '../dal';
import type {
  ProcessedGraphData,
  ExtendedGraphNode,
  ExtendedGraphEdge,
} from '../../types';
import { calculateNodeSize, getNodeColor } from '../utils/nodeStyles';

/**
 * Hook to fetch and process graph data
 * Automatically calculates connection counts, node sizes, and colors
 */
export default function useGraphData() {
  // Fetch raw data from backend
  const query = useSuspenseQuery({
    queryKey: graphKeys.data(),
    queryFn: getGraphData,
    staleTime: 5 * 60 * 1000, // 5 minutes (graph data doesn't change frequently)
    refetchOnWindowFocus: false, // Don't refetch on focus (expensive operation)
  });

  // Process the data to add visual properties
  const processedData: ProcessedGraphData | undefined = useMemo(() => {
    if (!query.data) return undefined;

    // Step 1: Calculate connection counts
    const connectionCounts: Record<string, number> = {};
    query.data.edges.forEach((edge) => {
      const sourceId =
        typeof edge.source === 'string' ? edge.source : edge.source;
      const targetId =
        typeof edge.target === 'string' ? edge.target : edge.target;

      connectionCounts[sourceId] = (connectionCounts[sourceId] || 0) + 1;
      connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
    });

    // Step 2: Process nodes with visual properties
    const processedNodes: ExtendedGraphNode[] = query.data.nodes.map((node) => {
      const connectionCount = connectionCounts[node.id] || 0;
      const nodeSize = calculateNodeSize(connectionCount);
      const nodeColor = getNodeColor(node.type);

      return {
        ...node,
        connectionCount,
        val: nodeSize,
        color: nodeColor,
      };
    });

    // Create a set of valid node IDs for edge validation
    const validNodeIds = new Set(processedNodes.map((node) => node.id));

    // Step 3: Process edges (add value for thickness if needed)
    // Filter out edges that reference non-existent nodes
    const processedEdges: ExtendedGraphEdge[] = query.data.edges
      .filter((edge) => {
        const sourceId =
          typeof edge.source === 'string' ? edge.source : edge.source;
        const targetId =
          typeof edge.target === 'string' ? edge.target : edge.target;
        return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
      })
      .map((edge) => ({
        ...edge,
        value: 1, // Default thickness, can be customized based on edge type
      }));

    return {
      nodes: processedNodes,
      links: processedEdges,
    };
  }, [query.data]);

  return {
    ...query,
    data: processedData,
  };
}
