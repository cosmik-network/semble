import {
  Card,
  Stack,
  Group,
  Text,
  Button,
  Badge,
  Avatar,
  ActionIcon,
  Title,
  Box,
  Divider,
} from '@mantine/core';
import { IoClose, IoOpenOutline, IoWarningOutline } from 'react-icons/io5';
import type { NodePopupProps } from '../../types';
import {
  getNodeMantineColor,
  getNodeTypeLabel,
} from '../../lib/utils/nodeStyles';
import styles from './NodePopup.module.css';
import useGraphNodeUser from '../../lib/queries/useGraphNodeUser';
import useGraphNodeCollection from '../../lib/queries/useGraphNodeCollection';
import useGraphNodeUrl from '../../lib/queries/useGraphNodeUrl';

/**
 * Detailed popup shown when a node is clicked
 * Shows type-specific content with async data and navigation options
 */
export default function NodePopupDetail({
  node,
  position,
  onClose,
  onNavigate,
}: NodePopupProps) {
  // Fetch async data based on node type (will be cached from preview)
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

  const handleNavigate = () => {
    onNavigate(node.id);
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <Card
      shadow="xl"
      radius="lg"
      padding="md"
      withBorder
      className={styles.detail}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        transform: 'translateY(-50%)',
        zIndex: 1001,
        width: 400,
        maxWidth: 'calc(100vw - 40px)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <Group justify="space-between" mb="sm" wrap="nowrap">
        <Badge color={getNodeMantineColor(node.type)} variant="light" size="lg">
          {getNodeTypeLabel(node.type)}
        </Badge>
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={handleClose}
          size="sm"
        >
          <IoClose size={16} />
        </ActionIcon>
      </Group>

      <Stack gap="md">
        {/* Type-specific content */}
        {node.type === 'USER' && (
          <>
            <Group gap="sm" wrap="nowrap">
              <Avatar
                src={userData.data?.avatarUrl || node.metadata.avatarUrl}
                alt={node.label}
                size="lg"
                radius="md"
              />
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Title order={4} lineClamp={1}>
                  {userData.data?.name || node.metadata.name || node.label}
                </Title>
                <Text size="sm" c="dimmed" lineClamp={1}>
                  @{node.metadata.handle}
                </Text>
              </Box>
              {userData.isError && (
                <Badge size="xs" color="red" variant="light">
                  <IoWarningOutline size={12} />
                </Badge>
              )}
            </Group>

            {(userData.data?.description || node.metadata.description) && (
              <Text size="sm" lineClamp={4}>
                {userData.data?.description || node.metadata.description}
              </Text>
            )}

            <Group gap="md">
              <Box>
                <Text size="xs" c="dimmed">
                  Followers
                </Text>
                <Text size="sm" fw={600}>
                  {userData.data?.followerCount ||
                    node.metadata.followerCount ||
                    0}
                </Text>
              </Box>
              <Box>
                <Text size="xs" c="dimmed">
                  Following
                </Text>
                <Text size="sm" fw={600}>
                  {userData.data?.followingCount ||
                    node.metadata.followingCount ||
                    0}
                </Text>
              </Box>
            </Group>
          </>
        )}

        {node.type === 'URL' && (
          <>
            <Group gap="xs" align="flex-start">
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Title order={4} lineClamp={2}>
                  {urlData.metadata?.title || node.metadata.title || node.label}
                </Title>
                {(urlData.metadata?.author || node.metadata.author) && (
                  <Text size="xs" c="dimmed" mt="xs">
                    by {urlData.metadata?.author || node.metadata.author}
                  </Text>
                )}
              </Box>
              {(urlData.metadataError || urlData.collectionsError) && (
                <Badge size="xs" color="red" variant="light">
                  <IoWarningOutline size={12} />
                </Badge>
              )}
            </Group>

            {(urlData.metadata?.description || node.metadata.description) && (
              <Text size="sm" lineClamp={4}>
                {urlData.metadata?.description || node.metadata.description}
              </Text>
            )}

            {(urlData.metadata?.siteName || node.metadata.siteName) && (
              <Text size="xs" c="dimmed">
                {urlData.metadata?.siteName || node.metadata.siteName}
              </Text>
            )}

            <Group gap="md">
              <Box>
                <Text size="xs" c="dimmed">
                  In Libraries
                </Text>
                <Text size="sm" fw={600}>
                  {node.metadata.libraryCount || 0}
                </Text>
              </Box>
            </Group>

            {/* Collections containing this URL */}
            {urlData.collections.length > 0 && (
              <>
                <Divider />
                <Box>
                  <Text size="sm" fw={600} mb="xs">
                    In {urlData.collections.length} collection
                    {urlData.collections.length !== 1 ? 's' : ''}
                  </Text>
                  <Stack gap="xs">
                    {urlData.collections.slice(0, 3).map((collection) => (
                      <Group key={collection.id} gap="xs" wrap="nowrap">
                        <Badge size="xs" variant="dot" color="blue">
                          Collection
                        </Badge>
                        <Text size="xs" lineClamp={1} style={{ flex: 1 }}>
                          {collection.name}
                        </Text>
                      </Group>
                    ))}
                    {urlData.collections.length > 3 && (
                      <Text size="xs" c="dimmed">
                        +{urlData.collections.length - 3} more
                      </Text>
                    )}
                  </Stack>
                </Box>
              </>
            )}
          </>
        )}

        {node.type === 'COLLECTION' && (
          <>
            <Group gap="xs" align="flex-start">
              <Box style={{ flex: 1, minWidth: 0 }}>
                <Title order={4} lineClamp={2}>
                  {collectionData.data?.name || node.label}
                </Title>
                {(collectionData.data?.author?.name ||
                  node.metadata.authorName) && (
                  <Text size="xs" c="dimmed" mt="xs">
                    by{' '}
                    {collectionData.data?.author?.name ||
                      node.metadata.authorName}
                  </Text>
                )}
              </Box>
              {collectionData.isError && (
                <Badge size="xs" color="red" variant="light">
                  <IoWarningOutline size={12} />
                </Badge>
              )}
            </Group>

            {(collectionData.data?.description ||
              node.metadata.description) && (
              <Text size="sm" lineClamp={4}>
                {collectionData.data?.description || node.metadata.description}
              </Text>
            )}

            <Group gap="md">
              <Box>
                <Text size="xs" c="dimmed">
                  Cards
                </Text>
                <Text size="sm" fw={600}>
                  {collectionData.data?.cardCount ||
                    node.metadata.cardCount ||
                    0}
                </Text>
              </Box>
              {(collectionData.data?.followerCount !== undefined ||
                node.metadata.followerCount !== undefined) && (
                <Box>
                  <Text size="xs" c="dimmed">
                    Followers
                  </Text>
                  <Text size="sm" fw={600}>
                    {collectionData.data?.followerCount ??
                      node.metadata.followerCount ??
                      0}
                  </Text>
                </Box>
              )}
            </Group>

            {(collectionData.data?.accessType || node.metadata.accessType) && (
              <Badge variant="outline" size="sm">
                {collectionData.data?.accessType || node.metadata.accessType}
              </Badge>
            )}
          </>
        )}

        {node.type === 'NOTE' && (
          <>
            <Box>
              <Title order={4} mb="xs">
                Note
              </Title>
              <Text size="sm" lineClamp={4}>
                {node.metadata.text || node.label}
              </Text>
            </Box>
            {node.metadata.authorName && (
              <Text size="xs" c="dimmed">
                by {node.metadata.authorName}
              </Text>
            )}
          </>
        )}

        {/* Connection count */}
        {node.connectionCount !== undefined && node.connectionCount > 0 && (
          <Text size="xs" c="dimmed">
            {node.connectionCount} connection
            {node.connectionCount !== 1 ? 's' : ''}
          </Text>
        )}

        {/* Actions */}
        <Group gap="xs">
          <Button
            onClick={handleNavigate}
            leftSection={<IoOpenOutline size={16} />}
            fullWidth
            variant="light"
          >
            View Details
          </Button>
          <Button onClick={handleClose} variant="subtle" color="gray">
            Close
          </Button>
        </Group>
      </Stack>

      {/* Arrow pointer */}
      <div className={styles.arrow} />
    </Card>
  );
}
