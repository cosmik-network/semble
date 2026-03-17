import type { ConnectionWithSourceAndTarget, User } from '@semble/types';
import { Stack, Card, Group, Text, Badge, Divider, Box } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { MdArrowDownward } from 'react-icons/md';
import { upperFirst } from '@mantine/hooks';
import { useAuth } from '@/hooks/useAuth';
import { ActionIcon, Menu, Spoiler } from '@mantine/core';
import { HiDotsVertical } from 'react-icons/hi';
import { MdEdit, MdDelete } from 'react-icons/md';
import { useState } from 'react';
import { getRelativeTime } from '@/lib/utils/time';
import DeleteConnectionModal from '../deleteConnectionModal/DeleteConnectionModal';

interface Props {
  connection: ConnectionWithSourceAndTarget;
  curator: User;
  onEdit?: () => void;
}

export default function ProfileConnectionItem(props: Props) {
  const { user } = useAuth();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const sourceUrlView = props.connection.source;
  const targetUrlView = props.connection.target;

  const isOwner = user && user.id === props.curator.id;

  const formatConnectionType = (type: string) => {
    return type
      .toLowerCase()
      .split('_')
      .map((word) => upperFirst(word))
      .join(' ');
  };

  const time = getRelativeTime(
    props.connection.connection.createdAt.toString(),
  );
  const relativeCreatedDate = time === 'now' ? `Now` : time;

  return (
    <>
      <Stack gap={'xs'} align="stretch">
        {/* Source URL */}
        <UrlCard
          id={sourceUrlView.url}
          url={sourceUrlView.url}
          cardContent={sourceUrlView.metadata}
          urlLibraryCount={sourceUrlView.urlLibraryCount}
          urlIsInLibrary={sourceUrlView.urlInLibrary ?? false}
          urlConnectionCount={sourceUrlView.urlConnectionCount ?? 0}
        />

        {/* Connection Metadata */}
        <Card p={'xs'} radius={'md'} bg={'dark.6'}>
          <Group justify="space-between" wrap="nowrap" align="start">
            <Stack gap={4} style={{ flex: 1 }}>
              <Group gap={'xs'} wrap="wrap">
                <MdArrowDownward size={20} />
                {props.connection.connection.type && (
                  <Badge size="md" variant="light" color="blue">
                    {formatConnectionType(props.connection.connection.type)}
                  </Badge>
                )}
                <Text fz={'sm'} fw={600} c={'gray'}>
                  {relativeCreatedDate}
                </Text>
              </Group>
              {props.connection.connection.note && (
                <Spoiler
                  showLabel={'Read more'}
                  hideLabel={'See less'}
                  maxHeight={60}
                >
                  <Text fw={500} fs={'italic'} c={'dimmed'} fz={'sm'}>
                    {props.connection.connection.note}
                  </Text>
                </Spoiler>
              )}
            </Stack>
            {isOwner && props.onEdit && (
              <Box>
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon variant="subtle" color="gray" size="lg">
                      <HiDotsVertical size={18} />
                    </ActionIcon>
                  </Menu.Target>
                  <Menu.Dropdown>
                    <Menu.Item
                      leftSection={<MdEdit size={16} />}
                      onClick={props.onEdit}
                    >
                      Edit
                    </Menu.Item>
                    <Menu.Item
                      leftSection={<MdDelete size={16} />}
                      color="red"
                      onClick={() => setDeleteModalOpened(true)}
                    >
                      Delete
                    </Menu.Item>
                  </Menu.Dropdown>
                </Menu>
              </Box>
            )}
          </Group>
        </Card>

        {/* Target URL */}
        <UrlCard
          id={targetUrlView.url}
          url={targetUrlView.url}
          cardContent={targetUrlView.metadata}
          urlLibraryCount={targetUrlView.urlLibraryCount}
          urlIsInLibrary={targetUrlView.urlInLibrary ?? false}
          urlConnectionCount={targetUrlView.urlConnectionCount ?? 0}
        />
      </Stack>

      <DeleteConnectionModal
        isOpen={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        connectionId={props.connection.connection.id}
      />
    </>
  );
}
