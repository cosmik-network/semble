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
}

export interface IGraphQueryRepository {
  /**
   * Get all nodes and edges for the global graph visualization
   * Returns the complete graph structure with all relationships
   */
  getGraphData(): Promise<GraphDataDTO>;
}
