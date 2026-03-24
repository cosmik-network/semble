import type {
  GraphNode as APIGraphNode,
  GraphEdge as APIGraphEdge,
  UrlMetadata,
  Collection,
} from '@/api-client';

/**
 * Extended graph node type with UI-specific properties
 * Extends the API type with force-graph visual properties
 */
export interface ExtendedGraphNode extends APIGraphNode {
  // Visual properties
  val?: number; // Size of the node (calculated from connection count)
  color?: string; // Node color (based on type)
  connectionCount?: number; // Number of connections (calculated)

  // Positioning (managed by force-graph)
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
  fx?: number;
  fy?: number;

  // Animation properties
  __addedAt?: number; // Timestamp when node was added (for fade-in animation)
}

/**
 * Extended graph edge type
 * Extends the API type with force-graph properties
 */
export interface ExtendedGraphEdge
  extends Omit<APIGraphEdge, 'source' | 'target'> {
  source: string | ExtendedGraphNode;
  target: string | ExtendedGraphNode;
  value?: number; // Line thickness
}

/**
 * Processed graph data ready for visualization
 */
export interface ProcessedGraphData {
  nodes: ExtendedGraphNode[];
  links: ExtendedGraphEdge[];
}

/**
 * Popup position for anchoring to screen coordinates
 */
export interface PopupPosition {
  x: number;
  y: number;
}

/**
 * Node popup props
 */
export interface NodePopupProps {
  node: ExtendedGraphNode;
  position: PopupPosition;
  onClose: () => void;
  onNavigate: (nodeId: string) => void;
}

/**
 * Combined URL data for graph node popups
 */
export interface GraphNodeUrlData {
  metadata?: UrlMetadata;
  collections: Collection[];
}

/**
 * Error information for graph node async fetching
 */
export interface GraphNodeError {
  message: string;
  type: 'user' | 'collection' | 'url';
}
