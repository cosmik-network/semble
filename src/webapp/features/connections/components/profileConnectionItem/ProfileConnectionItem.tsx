import type { ConnectionWithSourceAndTarget, User } from '@semble/types';
import { Stack, Card, Group, Text, Badge, Divider, Box } from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { MdArrowDownward } from 'react-icons/md';
import { upperFirst } from '@mantine/hooks';
import { useAuth } from '@/hooks/useAuth';
import { ActionIcon, Menu, Modal, Button, Spoiler } from '@mantine/core';
import { HiDotsVertical } from 'react-icons/hi';
import { MdEdit, MdDelete } from 'react-icons/md';
import useDeleteConnection from '../../lib/mutations/useDeleteConnection';
import { notifications } from '@mantine/notifications';
import { useState } from 'react';
import { getRelativeTime } from '@/lib/utils/time';

interface Props {
  connection: ConnectionWithSourceAndTarget;
  curator: User;
  onEdit?: () => void;
}

export default function ProfileConnectionItem(props: Props) {
  const { user } = useAuth();
  const deleteConnection = useDeleteConnection();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const sourceUrlView = props.connection.source;
  const targetUrlView = props.connection.target;

  const isOwner = user && user.id === props.curator.id;

  const handleDelete = () => {
    deleteConnection.mutate(
      { connectionId: props.connection.connection.id },
      {
        onSuccess: () => {
          notifications.show({
            message: 'Connection deleted successfully',
            color: 'green',
          });
          setDeleteModalOpened(false);
        },
        onError: () => {
          notifications.show({
            message: 'Could not delete connection.',
            color: 'red',
          });
        },
      },
    );
  };

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
      <Group gap={'0'} align="center" wrap="nowrap">
        {/* Source URL */}
        <Box style={{ flex: 1 }}>
          <UrlCard
            id={sourceUrlView.url}
            url={sourceUrlView.url}
            cardContent={sourceUrlView.metadata}
            urlLibraryCount={sourceUrlView.urlLibraryCount}
            urlIsInLibrary={sourceUrlView.urlInLibrary ?? false}
          />
        </Box>

        <Divider orientation="horizontal" w={20} variant="dashed" size="sm" />

        {/* Connection Metadata */}
        <Card p={'xs'} radius={'md'} w={100}>
          <Group justify="space-between" wrap="nowrap" align="center">
            <Stack gap={0} align="center">
              <Group gap={'xs'} wrap="wrap">
                {props.connection.connection.type && (
                  <Badge size="md" variant="light" color="pink">
                    {formatConnectionType(props.connection.connection.type)}
                  </Badge>
                )}
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
              {/*<Text mt={'sm'} fz={'sm'} fw={600} c={'gray'}>
                {relativeCreatedDate}
              </Text>*/}
            </Stack>
            {/*{isOwner && props.onEdit && (
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
            )}*/}
          </Group>
        </Card>

        <Divider orientation="horizontal" variant="dashed" w={20} size="sm" />

        {/* Target URL */}
        <Box style={{ flex: 1 }}>
          <UrlCard
            id={targetUrlView.url}
            url={targetUrlView.url}
            cardContent={targetUrlView.metadata}
            urlLibraryCount={targetUrlView.urlLibraryCount}
            urlIsInLibrary={targetUrlView.urlInLibrary ?? false}
          />
        </Box>
      </Group>

      <Modal
        opened={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        title="Delete Connection"
        centered
      >
        <Stack gap="md">
          <Text>Are you sure you want to delete this connection?</Text>
          <Group justify="flex-end" gap="xs">
            <Button
              variant="light"
              color="gray"
              onClick={() => setDeleteModalOpened(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              onClick={handleDelete}
              loading={deleteConnection.isPending}
            >
              Delete
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
