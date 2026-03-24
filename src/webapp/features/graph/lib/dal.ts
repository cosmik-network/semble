import { cache } from 'react';
import { createSembleClient } from '@/services/client.apiClient';
import { verifySessionOnClient } from '@/lib/auth/dal';

/**
 * Fetch a specific page of graph data from the backend
 * Returns nodes and edges for the specified page with pagination metadata
 *
 * @param page - Page number (1-indexed, defaults to 1)
 * @param limit - Number of nodes per page (defaults to 300)
 */
export const getGraphDataPage = cache(
  async (page: number = 1, limit: number = 300) => {
    // Verify authentication - graph data is personalized
    const session = await verifySessionOnClient({ redirectOnFail: true });
    if (!session) throw new Error('No session found');

    const client = createSembleClient();
    const response = await client.getGraphData({ page, limit });

    return response;
  },
);

/**
 * Fetch all graph data from the backend (deprecated - use getGraphDataPage for better performance)
 * Returns all nodes and edges for the current user's knowledge graph
 *
 * @deprecated Use getGraphDataPage instead for incremental loading
 */
export const getGraphData = cache(async () => {
  // For backward compatibility, fetch page 1 with a large limit
  return getGraphDataPage(1, 10000);
});

/**
 * Fetch URL-centric sub-graph with depth-based traversal
 * Returns all nodes and edges within N hops of the target URL
 *
 * @param url - Target URL to center the sub-graph around
 * @param depth - Number of edge hops to traverse (1-5, defaults to 1)
 */
export const getUrlGraphData = cache(async (url: string, depth: number = 1) => {
  // Verify authentication - graph data is personalized
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');

  const client = createSembleClient();
  const response = await client.getUrlGraphData({ url, depth });

  return response;
});
