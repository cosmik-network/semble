'use client';

import { useState } from 'react';
import { Box, Switch, Stack, Text, ActionIcon, Group } from '@mantine/core';
import { IoChevronBack, IoChevronForward } from 'react-icons/io5';
import styles from './GraphFilterPanel.module.css';

// All possible node and edge types in the graph
const NODE_TYPES = ['USER', 'COLLECTION', 'URL', 'NOTE'] as const;
const EDGE_TYPES = [
  'USER_FOLLOWS_USER',
  'USER_FOLLOWS_COLLECTION',
  'USER_AUTHORED_URL',
  'NOTE_REFERENCES_URL',
  'COLLECTION_CONTAINS_URL',
  'URL_CONNECTS_URL',
] as const;

type NodeType = (typeof NODE_TYPES)[number];
type EdgeType = (typeof EDGE_TYPES)[number];

interface GraphFilterPanelProps {
  visibleNodeTypes: Set<NodeType>;
  visibleEdgeTypes: Set<EdgeType>;
  onNodeTypeToggle: (type: NodeType) => void;
  onEdgeTypeToggle: (type: EdgeType) => void;
  hiddenNodeTypeControls?: Set<NodeType>;
}

// Human-readable labels for types
const NODE_TYPE_LABELS: Record<NodeType, string> = {
  USER: 'Users',
  COLLECTION: 'Collections',
  URL: 'URLs',
  NOTE: 'Notes',
};

const EDGE_TYPE_LABELS: Record<EdgeType, string> = {
  USER_FOLLOWS_USER: 'User → User',
  USER_FOLLOWS_COLLECTION: 'User → Collection',
  USER_AUTHORED_URL: 'User → URL',
  NOTE_REFERENCES_URL: 'Note → URL',
  COLLECTION_CONTAINS_URL: 'Collection → URL',
  URL_CONNECTS_URL: 'URL → URL',
};

export default function GraphFilterPanel({
  visibleNodeTypes,
  visibleEdgeTypes,
  onNodeTypeToggle,
  onEdgeTypeToggle,
  hiddenNodeTypeControls = new Set(),
}: GraphFilterPanelProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <Box className={`${styles.panel} ${isCollapsed ? styles.collapsed : ''}`}>
      {/* Collapse/Expand Button */}
      <ActionIcon
        className={styles.toggleButton}
        onClick={() => setIsCollapsed(!isCollapsed)}
        variant="subtle"
        size="sm"
        aria-label={isCollapsed ? 'Expand panel' : 'Collapse panel'}
      >
        {isCollapsed ? (
          <IoChevronBack size={16} />
        ) : (
          <IoChevronForward size={16} />
        )}
      </ActionIcon>

      {/* Panel Content */}
      {!isCollapsed && (
        <Stack gap="md" className={styles.content}>
          <Text size="sm" fw={600} c="dimmed">
            Graph Filters
          </Text>

          {/* Node Type Filters */}
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
              Node Types
            </Text>
            {NODE_TYPES.filter((type) => !hiddenNodeTypeControls.has(type)).map(
              (type) => (
                <Group key={type} justify="space-between" gap="xs">
                  <Text size="sm">{NODE_TYPE_LABELS[type]}</Text>
                  <Switch
                    checked={visibleNodeTypes.has(type)}
                    onChange={() => onNodeTypeToggle(type)}
                    size="sm"
                  />
                </Group>
              ),
            )}
          </Stack>

          {/* Edge Type Filters */}
          <Stack gap="xs">
            <Text size="xs" fw={600} c="dimmed" tt="uppercase">
              Edge Types
            </Text>
            {EDGE_TYPES.map((type) => (
              <Group key={type} justify="space-between" gap="xs">
                <Text size="sm">{EDGE_TYPE_LABELS[type]}</Text>
                <Switch
                  checked={visibleEdgeTypes.has(type)}
                  onChange={() => onEdgeTypeToggle(type)}
                  size="sm"
                />
              </Group>
            ))}
          </Stack>
        </Stack>
      )}
    </Box>
  );
}
