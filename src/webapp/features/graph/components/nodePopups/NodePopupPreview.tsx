import { Card, Group, Text, Badge, Stack } from '@mantine/core';
import { IoWarningOutline } from 'react-icons/io5';
import type { ExtendedGraphNode, PopupPosition } from '../../types';
import {
  getNodeMantineColor,
  getNodeTypeLabel,
} from '../../lib/utils/nodeStyles';
import styles from './NodePopup.module.css';
import useGraphNodeUser from '../../lib/queries/useGraphNodeUser';
import useGraphNodeCollection from '../../lib/queries/useGraphNodeCollection';
import useGraphNodeUrl from '../../lib/queries/useGraphNodeUrl';

interface Props {
  node: ExtendedGraphNode;
  position: PopupPosition;
}

/**
 * Lightweight preview popup shown on hover
 * Displays basic node information with progressive async data loading
 */
export default function NodePopupPreview({ node, position }: Props) {
  // Fetch async data based on node type
  const userData = useGraphNodeUser({
    handle: node.type === 'USER' ? node.metadata.handle : undefined,
    enabled: node.type === 'USER',
  });

  const collectionData = useGraphNodeCollection({
    handle: node.type === 'COLLECTION' ? node.metadata.handle : undefined,
    rkey: node.type === 'COLLECTION' ? node.metadata.rkey : undefined,
    enabled: node.type === 'COLLECTION',
  });

  const urlData = useGraphNodeUrl({
    url: node.type === 'URL' ? node.metadata.url : undefined,
    enabled: node.type === 'URL',
  });

  // Determine if there's any error to show
  const hasError = userData.isError || collectionData.isError || urlData.error;

  return (
    <Card
      shadow="md"
      radius="md"
      padding="xs"
      className={styles.preview}
      style={{
        position: 'fixed',
        left: position.x + 10,
        top: position.y + 10,
        zIndex: 1000,
        pointerEvents: 'none', // Don't interfere with mouse events
        maxWidth: 300,
      }}
    >
      <Stack gap="xs">
        <Group gap="xs" wrap="nowrap">
          <Badge
            color={getNodeMantineColor(node.type)}
            size="sm"
            variant="light"
          >
            {getNodeTypeLabel(node.type)}
          </Badge>
          <Text size="sm" fw={600} lineClamp={1} style={{ flex: 1 }}>
            {node.label}
          </Text>
          {hasError && (
            <Badge size="xs" color="red" variant="light">
              <IoWarningOutline size={12} />
            </Badge>
          )}
        </Group>

        {/* USER: Show description */}
        {node.type === 'USER' && userData.data?.description && (
          <Text size="xs" c="dimmed" lineClamp={2}>
            {userData.data.description}
          </Text>
        )}

        {/* COLLECTION: Show description and follower count */}
        {node.type === 'COLLECTION' && (
          <>
            {collectionData.data?.description && (
              <Text size="xs" c="dimmed" lineClamp={2}>
                {collectionData.data.description}
              </Text>
            )}
            {collectionData.data?.followerCount !== undefined && (
              <Text size="xs" c="dimmed">
                {collectionData.data.followerCount} follower
                {collectionData.data.followerCount !== 1 ? 's' : ''}
              </Text>
            )}
          </>
        )}

        {/* URL: Show library count and collection count */}
        {node.type === 'URL' && (
          <>
            {node.metadata.libraryCount !== undefined &&
              node.metadata.libraryCount > 0 && (
                <Text size="xs" c="dimmed">
                  In {node.metadata.libraryCount} librar
                  {node.metadata.libraryCount !== 1 ? 'ies' : 'y'}
                </Text>
              )}
            {urlData.collections.length > 0 && (
              <Text size="xs" c="dimmed">
                In {urlData.collections.length} collection
                {urlData.collections.length !== 1 ? 's' : ''}
              </Text>
            )}
          </>
        )}

        {/* Connection count (always shown if available) */}
        {node.connectionCount !== undefined && node.connectionCount > 0 && (
          <Text size="xs" c="dimmed">
            {node.connectionCount} connection
            {node.connectionCount !== 1 ? 's' : ''}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
