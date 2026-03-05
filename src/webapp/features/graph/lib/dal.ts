import { cache } from 'react';
import { createSembleClient } from '@/services/client.apiClient';
import { verifySessionOnClient } from '@/lib/auth/dal';

/**
 * Fetch graph data from the backend
 * Returns all nodes and edges for the current user's knowledge graph
 */
export const getGraphData = cache(async () => {
  // Verify authentication - graph data is personalized
  const session = await verifySessionOnClient({ redirectOnFail: true });
  if (!session) throw new Error('No session found');

  const client = createSembleClient();
  const response = await client.getGraphData();

  return response;
});
