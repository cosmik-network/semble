// DTOs for graph visualization
export interface GraphNodeDTO {
  id: string; // Unique identifier for the node
  type: 'USER' | 'URL' | 'COLLECTION' | 'NOTE';
  label: string; // Display name/title
  metadata: Record<string, any>; // Type-specific data (handle, url, description, etc.)
}

export interface GraphEdgeDTO {
  id: string; // Unique identifier for the edge
  source: string; // Source node ID
  target: string; // Target node ID
  type:
    | 'USER_FOLLOWS_USER'
    | 'USER_FOLLOWS_COLLECTION'
    | 'USER_AUTHORED_URL'
    | 'NOTE_REFERENCES_URL'
    | 'COLLECTION_CONTAINS_URL'
    | 'URL_CONNECTS_URL';
  metadata?: Record<string, any>; // Optional edge data (connection type, added date, etc.)
}

export interface GraphDataDTO {
  nodes: GraphNodeDTO[];
  edges: GraphEdgeDTO[];
  totalNodeCount: number;
}

export interface IGraphQueryRepository {
  /**
   * Get nodes and edges for the global graph visualization with pagination support
   * Returns paginated graph data with total count for calculating pagination metadata
   *
   * @param page - Page number (1-indexed, defaults to 1)
   * @param limit - Number of nodes per page (defaults to 300)
   */
  getGraphData(page?: number, limit?: number): Promise<GraphDataDTO>;
}
