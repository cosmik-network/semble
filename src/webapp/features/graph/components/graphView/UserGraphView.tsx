'use client';

import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { Box, LoadingOverlay } from '@mantine/core';
import useUserGraphData from '../../lib/queries/useUserGraphData';
import type {
  ExtendedGraphNode,
  ExtendedGraphEdge,
  PopupPosition,
} from '../../types';
import {
  getNodeColor,
  getNodeSecondaryColor,
  NODE_SIZE,
} from '../../lib/utils/nodeStyles';
import {
  PHYSICS_CONFIG,
  VISUAL_CONFIG,
  INTERACTION_CONFIG,
} from '../../lib/utils/graphConfig';
import NodePopupPreview from '../nodePopups/NodePopupPreview';
import NodePopupDetail from '../nodePopups/NodePopupDetail';
import GraphFilterPanel from './GraphFilterPanel';
import { useRouter } from 'next/navigation';
import styles from './GraphView.module.css';

// Dynamically import ForceGraph2D to avoid SSR issues
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), {
  ssr: false,
  loading: () => (
    <Box pos="relative" h="100vh" w="100%">
      <LoadingOverlay visible />
    </Box>
  ),
});

// Type definitions for filters
type NodeType = 'USER' | 'COLLECTION' | 'URL' | 'NOTE';
type EdgeType =
  | 'USER_FOLLOWS_USER'
  | 'USER_FOLLOWS_COLLECTION'
  | 'USER_AUTHORED_URL'
  | 'NOTE_REFERENCES_URL'
  | 'COLLECTION_CONTAINS_URL'
  | 'URL_CONNECTS_URL';

interface UserGraphViewProps {
  identifier: string;
}

export default function UserGraphView({ identifier }: UserGraphViewProps) {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const graphRef = useRef<any>(undefined);

  // State for dual popup system
  const [hoverNode, setHoverNode] = useState<ExtendedGraphNode | null>(null);
  const [pinnedNode, setPinnedNode] = useState<ExtendedGraphNode | null>(null);
  const [previewPos, setPreviewPos] = useState<PopupPosition>({ x: 0, y: 0 });
  const [detailPos, setDetailPos] = useState<PopupPosition>({ x: 0, y: 0 });

  // State for graph filters (USER hidden by default in user graph view)
  const [visibleNodeTypes, setVisibleNodeTypes] = useState<Set<NodeType>>(
    new Set(['COLLECTION', 'URL', 'NOTE'] as NodeType[]),
  );
  const [visibleEdgeTypes, setVisibleEdgeTypes] = useState<Set<EdgeType>>(
    new Set([
      'USER_FOLLOWS_USER',
      'USER_FOLLOWS_COLLECTION',
      'USER_AUTHORED_URL',
      'NOTE_REFERENCES_URL',
      'COLLECTION_CONTAINS_URL',
      'URL_CONNECTS_URL',
    ] as EdgeType[]),
  );

  // Fetch and process graph data for the specific user
  const { data: graphData } = useUserGraphData(identifier);

  // Filter graph data based on visible types
  const filteredGraphData = useMemo(() => {
    if (!graphData) return null;

    // Filter nodes by visible types
    const filteredNodes = graphData.nodes.filter((node) =>
      visibleNodeTypes.has(node.type as NodeType),
    );

    // Create a set of visible node IDs for efficient lookup
    const visibleNodeIds = new Set(filteredNodes.map((node) => node.id));

    // Filter edges by visible edge types AND ensure both endpoints are visible
    const filteredLinks = graphData.links.filter((edge) => {
      // Check if edge type is visible
      if (!visibleEdgeTypes.has(edge.type as EdgeType)) return false;

      // Get source and target IDs (handles both string and object references)
      const sourceId =
        typeof edge.source === 'string'
          ? edge.source
          : (edge.source as ExtendedGraphNode).id;
      const targetId =
        typeof edge.target === 'string'
          ? edge.target
          : (edge.target as ExtendedGraphNode).id;

      // Only include edge if both nodes are visible
      return visibleNodeIds.has(sourceId) && visibleNodeIds.has(targetId);
    });

    return {
      nodes: filteredNodes,
      links: filteredLinks,
    };
  }, [graphData, visibleNodeTypes, visibleEdgeTypes]);

  // Toggle handlers for filter panel
  const handleNodeTypeToggle = useCallback((type: NodeType) => {
    setVisibleNodeTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  const handleEdgeTypeToggle = useCallback((type: EdgeType) => {
    setVisibleEdgeTypes((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  }, []);

  // Track previous node count to detect new nodes and trigger smooth transitions
  const prevNodeCountRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Detect when new nodes are added and gently reheat simulation
  useEffect(() => {
    if (!filteredGraphData || !graphRef.current) return;

    const currentNodeCount = filteredGraphData.nodes.length;
    const hasNewNodes = currentNodeCount > prevNodeCountRef.current;

    if (hasNewNodes && prevNodeCountRef.current > 0) {
      // Gently reheat the simulation for smooth repositioning
      // Lower alpha = gentler movement
      graphRef.current.d3ReheatSimulation();
      graphRef.current.d3Force('charge')?.strength(-30); // Softer repulsion during transition

      // Restore normal force after animation completes
      setTimeout(() => {
        if (graphRef.current?.d3Force) {
          graphRef.current.d3Force('charge')?.strength(-60);
        }
      }, 1000);
    }

    prevNodeCountRef.current = currentNodeCount;
  }, [filteredGraphData]);

  // Animation loop to continuously re-render for fade-in effect
  useEffect(() => {
    if (!graphData) return;

    const animate = () => {
      // Check if any nodes are still fading in (added within last 800ms)
      const now = Date.now();
      const hasFadingNodes = graphData.nodes.some(
        (node) => node.__addedAt && now - node.__addedAt < 800,
      );

      if (hasFadingNodes && graphRef.current) {
        // Trigger a re-render by calling refresh
        graphRef.current._destructor?.(); // Force canvas redraw
      }

      if (hasFadingNodes) {
        animationFrameRef.current = requestAnimationFrame(animate);
      } else {
        animationFrameRef.current = null;
      }
    };

    // Start animation if we have new nodes
    if (!animationFrameRef.current) {
      const now = Date.now();
      const hasNewNodes = graphData.nodes.some(
        (node) => node.__addedAt && now - node.__addedAt < 800,
      );
      if (hasNewNodes) {
        animationFrameRef.current = requestAnimationFrame(animate);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [graphData]);

  // Handle node hover (preview popup)
  const handleNodeHover = useCallback(
    (node: any) => {
      const typedNode = node as ExtendedGraphNode | null;
      if (
        typedNode &&
        !pinnedNode &&
        typedNode.x !== undefined &&
        typedNode.y !== undefined
      ) {
        setHoverNode(typedNode);
        // Calculate screen coordinates for the node
        if (graphRef.current) {
          const screenPos = graphRef.current.graph2ScreenCoords(
            typedNode.x,
            typedNode.y,
          );
          setPreviewPos({ x: screenPos.x + 15, y: screenPos.y - 10 });
        }
      } else if (!pinnedNode) {
        setHoverNode(null);
      }
    },
    [pinnedNode],
  );

  // Handle node click (detail popup)
  const handleNodeClick = useCallback((node: any) => {
    const typedNode = node as ExtendedGraphNode;
    setPinnedNode(typedNode);
    setHoverNode(null); // Hide preview when pinning detail

    // Convert graph coordinates to screen coordinates
    if (
      graphRef.current &&
      typedNode.x !== undefined &&
      typedNode.y !== undefined
    ) {
      const screenPos = graphRef.current.graph2ScreenCoords(
        typedNode.x,
        typedNode.y,
      );
      // Offset to the right of the node
      setDetailPos({ x: screenPos.x + 20, y: screenPos.y });
    }
  }, []);

  // Handle background click (close detail popup)
  const handleBackgroundClick = useCallback(() => {
    setPinnedNode(null);
  }, []);

  // Update detail popup position during zoom/pan
  const handleZoomPan = useCallback(() => {
    if (
      pinnedNode &&
      graphRef.current &&
      pinnedNode.x !== undefined &&
      pinnedNode.y !== undefined
    ) {
      const screenPos = graphRef.current.graph2ScreenCoords(
        pinnedNode.x,
        pinnedNode.y,
      );
      setDetailPos({ x: screenPos.x + 20, y: screenPos.y });
    }
  }, [pinnedNode]);

  // Handle navigation from popups
  const handleNavigate = useCallback(
    (nodeId: string) => {
      const node = filteredGraphData?.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      let route: string;
      switch (node.type) {
        case 'USER':
          route = `/profile/${node.metadata.handle}`;
          break;
        case 'COLLECTION':
          route = `/collections/${node.metadata.handle}/${node.metadata.rkey}`;
          break;
        case 'URL':
          route = `/url?id=${encodeURIComponent(node.metadata.url)}`;
          break;
        case 'NOTE':
          route = `/url?id=${encodeURIComponent(node.metadata.parentUrl)}`;
          break;
        default:
          return;
      }

      router.push(route);
    },
    [filteredGraphData, router],
  );

  // Close detail popup
  const handleCloseDetail = useCallback(() => {
    setPinnedNode(null);
  }, []);

  // Custom node canvas renderer
  const nodeCanvasObject = useCallback(
    (nodeData: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = nodeData as ExtendedGraphNode;
      if (node.x === undefined || node.y === undefined) return;

      const size =
        (node.val || NODE_SIZE.DEFAULT) * (1 / Math.sqrt(globalScale));
      const isSelected = node === pinnedNode || node === hoverNode;

      // Calculate opacity for fade-in animation (800ms duration)
      let opacity = 1;
      if (node.__addedAt) {
        const age = Date.now() - node.__addedAt;
        const fadeDuration = 800; // ms
        if (age < fadeDuration) {
          // Ease-in opacity from 0 to 1
          opacity = Math.min(1, age / fadeDuration);
          // Ease-out cubic for smoother animation
          opacity = 1 - Math.pow(1 - opacity, 3);
        }
      }

      // Save context state for opacity
      ctx.save();
      ctx.globalAlpha = opacity;

      // Create gradient for node fill
      const gradient = ctx.createRadialGradient(
        node.x,
        node.y,
        0,
        node.x,
        node.y,
        size * 1.5,
      );
      const primaryColor = getNodeColor(node.type);
      const secondaryColor = getNodeSecondaryColor(node.type);
      gradient.addColorStop(0, primaryColor);
      gradient.addColorStop(
        1,
        isSelected ? VISUAL_CONFIG.node.shadowColor : secondaryColor,
      );

      // Draw node circle
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Add glow effect for selected nodes
      if (isSelected) {
        ctx.shadowColor = VISUAL_CONFIG.node.shadowColor;
        ctx.shadowBlur = VISUAL_CONFIG.node.shadowBlurSelected;
      }

      // Draw border
      ctx.strokeStyle = VISUAL_CONFIG.node.borderColor;
      ctx.lineWidth = isSelected
        ? VISUAL_CONFIG.node.borderWidthSelected
        : VISUAL_CONFIG.node.borderWidth;
      ctx.stroke();

      // Reset shadow
      ctx.shadowBlur = VISUAL_CONFIG.node.shadowBlur;

      // Draw connection count badge for highly connected nodes
      if (node.connectionCount && node.connectionCount >= 5) {
        const badgeSize = 4 / globalScale;
        ctx.beginPath();
        ctx.arc(node.x + size, node.y - size, badgeSize, 0, 2 * Math.PI);
        ctx.fillStyle = VISUAL_CONFIG.node.shadowColor;
        ctx.fill();
      }

      // Restore context state (opacity)
      ctx.restore();
    },
    [pinnedNode, hoverNode],
  );

  // Custom node pointer area for better hit detection
  const nodePointerAreaPaint = useCallback(
    (nodeData: any, color: string, ctx: CanvasRenderingContext2D) => {
      const node = nodeData as ExtendedGraphNode;
      if (node.x === undefined || node.y === undefined) return;

      const size =
        (node.val || NODE_SIZE.DEFAULT) * INTERACTION_CONFIG.hitAreaMultiplier;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, size, 0, 2 * Math.PI);
      ctx.fill();
    },
    [],
  );

  if (!filteredGraphData) {
    return (
      <Box pos="relative" h="100vh" w="100%">
        <LoadingOverlay visible />
      </Box>
    );
  }

  return (
    <Box pos="relative" h="calc(100vh - 60px)" w="100%" className={styles.root}>
      {/* Filter Panel */}
      <GraphFilterPanel
        visibleNodeTypes={visibleNodeTypes}
        visibleEdgeTypes={visibleEdgeTypes}
        onNodeTypeToggle={handleNodeTypeToggle}
        onEdgeTypeToggle={handleEdgeTypeToggle}
        hiddenNodeTypeControls={new Set(['USER'] as NodeType[])}
      />

      <ForceGraph2D
        ref={graphRef}
        graphData={filteredGraphData}
        nodeCanvasObject={nodeCanvasObject}
        nodePointerAreaPaint={nodePointerAreaPaint}
        onNodeHover={handleNodeHover}
        onNodeClick={handleNodeClick}
        onBackgroundClick={handleBackgroundClick}
        onZoom={handleZoomPan}
        onEngineTick={handleZoomPan}
        backgroundColor={VISUAL_CONFIG.backgroundColor}
        linkColor={() => VISUAL_CONFIG.link.color}
        linkWidth={() => VISUAL_CONFIG.link.width}
        linkDirectionalArrowLength={VISUAL_CONFIG.arrow.length}
        linkDirectionalArrowRelPos={VISUAL_CONFIG.arrow.relativePosition}
        warmupTicks={PHYSICS_CONFIG.warmupTicks}
        cooldownTicks={PHYSICS_CONFIG.cooldownTicks}
        d3AlphaDecay={PHYSICS_CONFIG.d3AlphaDecay}
        d3VelocityDecay={PHYSICS_CONFIG.d3VelocityDecay}
        enableNodeDrag={INTERACTION_CONFIG.enableNodeDrag}
        enableZoomInteraction={INTERACTION_CONFIG.enableZoom}
        enablePanInteraction={INTERACTION_CONFIG.enablePan}
        minZoom={INTERACTION_CONFIG.minZoom}
        maxZoom={INTERACTION_CONFIG.maxZoom}
      />

      {/* Hover preview popup */}
      {hoverNode && !pinnedNode && (
        <NodePopupPreview node={hoverNode} position={previewPos} />
      )}

      {/* Click detail popup */}
      {pinnedNode && (
        <NodePopupDetail
          node={pinnedNode}
          position={detailPos}
          onClose={handleCloseDetail}
          onNavigate={handleNavigate}
        />
      )}
    </Box>
  );
}
