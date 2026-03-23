import { useQueries } from '@tanstack/react-query';
import { useState, useEffect, useRef } from 'react';
import { graphKeys } from '../graphKeys';
import { getGraphDataPage } from '../dal';
import type {
  ProcessedGraphData,
  ExtendedGraphNode,
  ExtendedGraphEdge,
} from '../../types';
import { calculateNodeSize, getNodeColor } from '../utils/nodeStyles';
import type { GetGraphDataResponse } from '@semble/types';

/**
 * Hook to fetch and process graph data with incremental loading
 * Automatically loads data in pages and progressively renders
 * Calculates connection counts, node sizes, and colors for all loaded data
 */
export default function useGraphData() {
  const [pagesToLoad, setPagesToLoad] = useState<number[]>([1]);
  const [totalPages, setTotalPages] = useState<number | null>(null);

  // Store processed data in state for incremental updates
  const [processedData, setProcessedData] = useState<ProcessedGraphData>({
    nodes: [],
    links: [],
  });

  // Track which pages we've already processed to avoid reprocessing
  const processedPagesRef = useRef<Set<number>>(new Set());

  // Maintain stable node references (important for smooth graph transitions)
  const nodeMapRef = useRef<Map<string, ExtendedGraphNode>>(new Map());

  // Fetch pages in parallel (React Query will dedupe and cache)
  const queries = useQueries({
    queries: pagesToLoad.map((page) => ({
      queryKey: graphKeys.page(page),
      queryFn: () => getGraphDataPage(page),
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    })),
  });

  // Incrementally merge new pages as they complete
  useEffect(() => {
    const successfulQueries = queries.filter((q) => q.isSuccess && q.data);
    if (successfulQueries.length === 0) return;

    // Find pages we haven't processed yet
    const newPages: { page: number; data: GetGraphDataResponse }[] = [];
    successfulQueries.forEach((q, idx) => {
      const page = pagesToLoad[idx];
      if (!processedPagesRef.current.has(page)) {
        newPages.push({ page, data: q.data as GetGraphDataResponse });
      }
    });

    // Update pagination metadata and queue next page
    const latestData = successfulQueries[successfulQueries.length - 1]
      .data as GetGraphDataResponse;

    if (latestData?.pagination) {
      setTotalPages(latestData.pagination.totalPages);

      // Queue next page if available
      if (
        latestData.pagination.hasMore &&
        !pagesToLoad.includes(latestData.pagination.currentPage + 1)
      ) {
        setPagesToLoad((prev) => [
          ...prev,
          latestData.pagination.currentPage + 1,
        ]);
      }
    }

    // If no new pages, nothing to merge
    if (newPages.length === 0) return;

    // Mark pages as processed
    newPages.forEach(({ page }) => processedPagesRef.current.add(page));

    // Incrementally merge new data
    setProcessedData((prevData) => {
      // Extract new nodes and edges from newly loaded pages
      const newNodes = newPages.flatMap(({ data }) => data.nodes);
      const newEdges = newPages.flatMap(({ data }) => data.edges);

      // Add new nodes to map (preserving existing node references)
      newNodes.forEach((node) => {
        if (!nodeMapRef.current.has(node.id)) {
          // Create new extended node with timestamp for fade-in animation
          const extendedNode: ExtendedGraphNode = {
            ...node,
            connectionCount: 0,
            val: 0,
            color: getNodeColor(node.type),
            // Track when node was added for smooth fade-in
            __addedAt: Date.now(),
          };
          nodeMapRef.current.set(node.id, extendedNode);
        }
      });

      // Combine all edges (previous + new)
      const allEdges = [...prevData.links, ...newEdges];

      // Recalculate connection counts for ALL nodes (new edges affect existing nodes)
      const connectionCounts: Record<string, number> = {};
      allEdges.forEach((edge) => {
        // Handle both string IDs and object references (ForceGraph2D mutates edges)
        const sourceId =
          typeof edge.source === 'string'
            ? edge.source
            : (edge.source as ExtendedGraphNode).id;
        const targetId =
          typeof edge.target === 'string'
            ? edge.target
            : (edge.target as ExtendedGraphNode).id;

        connectionCounts[sourceId] = (connectionCounts[sourceId] || 0) + 1;
        connectionCounts[targetId] = (connectionCounts[targetId] || 0) + 1;
      });

      // Update connection counts on existing node objects (mutate in place)
      nodeMapRef.current.forEach((node) => {
        const connectionCount = connectionCounts[node.id] || 0;
        node.connectionCount = connectionCount;
        node.val = calculateNodeSize(connectionCount);
        // color stays the same
      });

      // Get all nodes as array (stable references for existing nodes)
      const allNodes = Array.from(nodeMapRef.current.values());

      // Create a set of valid node IDs for edge validation
      const validNodeIds = new Set(allNodes.map((n) => n.id));

      // Process edges (add value for thickness if needed)
      // Filter out edges that reference non-existent nodes
      const processedEdges: ExtendedGraphEdge[] = allEdges
        .filter((edge) => {
          const sourceId =
            typeof edge.source === 'string'
              ? edge.source
              : (edge.source as ExtendedGraphNode).id;
          const targetId =
            typeof edge.target === 'string'
              ? edge.target
              : (edge.target as ExtendedGraphNode).id;
          return validNodeIds.has(sourceId) && validNodeIds.has(targetId);
        })
        .map((edge) => ({
          ...edge,
          value: 1, // Default thickness, can be customized based on edge type
        }));

      return {
        nodes: allNodes,
        links: processedEdges,
      };
    });
  }, [queries, pagesToLoad]);

  // Aggregate query state
  const isLoading = queries.some((q) => q.isLoading);
  const isError = queries.some((q) => q.isError);
  const error = queries.find((q) => q.error)?.error;

  // Calculate overall loading progress
  const loadedPages = queries.filter((q) => q.isSuccess).length;
  const loadingProgress =
    totalPages && totalPages > 0 ? (loadedPages / totalPages) * 100 : 0;

  return {
    data: processedData,
    isLoading,
    isError,
    error,
    loadingProgress,
    loadedPages,
    totalPages,
    isComplete: totalPages !== null && loadedPages >= totalPages,
  };
}
