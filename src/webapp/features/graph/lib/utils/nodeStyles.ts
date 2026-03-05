import type { ExtendedGraphNode } from '../../types';

/**
 * Brand color mapping for different node types
 * Using the Mantine theme colors defined in theme.tsx
 */
export const NODE_COLORS = {
  USER: '#ff6400', // tangerine[6]
  COLLECTION: '#00a8e8', // blue[6]
  URL: '#78716c', // stone[5]
  NOTE: '#bf00d1', // grape[5]
} as const;

/**
 * Secondary colors for gradients and highlights
 */
export const NODE_COLORS_SECONDARY = {
  USER: '#ff8033', // lighter tangerine
  COLLECTION: '#33b8f0', // lighter blue
  URL: '#9f9692', // lighter stone
  NOTE: '#d933e0', // lighter grape
} as const;

/**
 * Node sizing configuration
 */
export const NODE_SIZE = {
  MIN: 3,
  MAX: 12,
  DEFAULT: 5,
  // Multiplier for connection count (Obsidian-style hub detection)
  CONNECTION_MULTIPLIER: 0.8,
} as const;

/**
 * Get the primary color for a node based on its type
 */
export function getNodeColor(type: ExtendedGraphNode['type']): string {
  return NODE_COLORS[type];
}

/**
 * Get the secondary color for gradients
 */
export function getNodeSecondaryColor(type: ExtendedGraphNode['type']): string {
  return NODE_COLORS_SECONDARY[type];
}

/**
 * Calculate node size based on connection count
 * More connected nodes are larger (Obsidian-style)
 */
export function calculateNodeSize(connectionCount: number): number {
  const size =
    NODE_SIZE.DEFAULT + connectionCount * NODE_SIZE.CONNECTION_MULTIPLIER;
  return Math.min(NODE_SIZE.MAX, Math.max(NODE_SIZE.MIN, size));
}

/**
 * Get a display-friendly label for node type
 */
export function getNodeTypeLabel(type: ExtendedGraphNode['type']): string {
  const labels: Record<ExtendedGraphNode['type'], string> = {
    USER: 'User',
    COLLECTION: 'Collection',
    URL: 'URL',
    NOTE: 'Note',
  };
  return labels[type];
}

/**
 * Get Mantine color name for Badge components
 */
export function getNodeMantineColor(type: ExtendedGraphNode['type']): string {
  const colorMap: Record<ExtendedGraphNode['type'], string> = {
    USER: 'tangerine',
    COLLECTION: 'blue',
    URL: 'stone',
    NOTE: 'grape',
  };
  return colorMap[type];
}
