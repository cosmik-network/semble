import {
  Anchor,
  Avatar,
  Card,
  Group,
  Spoiler,
  Stack,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Modal,
  Button,
  Box,
} from '@mantine/core';
import { ConnectionWithSourceAndTarget, User } from '@semble/types';
import Link from 'next/link';
import styles from './ConnectionStatus.module.css';
import { getRelativeTime } from '@/lib/utils/time';
import { sanitizeText } from '@/lib/utils/text';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { HiDotsVertical } from 'react-icons/hi';
import { MdEdit, MdDelete } from 'react-icons/md';
import useDeleteConnection from '../../lib/mutations/useDeleteConnection';
import { notifications } from '@mantine/notifications';
import { BsCheck, BsExclamation } from 'react-icons/bs';

interface Props {
  connection: ConnectionWithSourceAndTarget['connection'];
  direction: 'forward' | 'backward';
  onEdit?: () => void;
}

export default function ConnectionStatus(props: Props) {
  const { user } = useAuth();
  const deleteConnection = useDeleteConnection();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const time = getRelativeTime(props.connection.createdAt.toString());
  const relativeCreatedDate = time === 'now' ? `Now` : time;

  const isOwner = user && user.id === props.connection.curator.id;

  const handleDelete = () => {
    deleteConnection.mutate(
      { connectionId: props.connection.id },
      {
        onSuccess: () => {
          notifications.show({
            message: 'Connection deleted',
            position: 'top-center',
            color: 'green',
            icon: <BsCheck />,
          });
          setDeleteModalOpened(false);
        },
        onError: () => {
          notifications.show({
            message: 'Could not delete connection',
            color: 'red',
            title: 'Error',
            position: 'top-center',
            loading: false,
            autoClose: false,
            withCloseButton: true,
            icon: <BsExclamation />,
          });
        },
      },
    );
  };

  const renderConnectionText = () => {
    const curator = props.connection.curator;
    const connectionType = props.connection.type;

    return (
      <Text component="div" fw={500}>
        <Text
          component={Link}
          href={`/profile/${curator.handle}`}
          fw={600}
          c={'bright'}
        >
          {sanitizeText(curator.name)}
        </Text>{' '}
        <Text span>
          {props.direction === 'forward' ? 'connected to' : 'connected from'}
        </Text>
        {connectionType && (
          <Badge
            size="sm"
            variant="light"
            color="blue"
            ml={'xs'}
            style={{ textTransform: 'capitalize' }}
          >
            {connectionType.toLowerCase().replace('_', ' ')}
          </Badge>
        )}
        <Text fz={'sm'} fw={600} c={'gray'} span display={'block'}>
          {relativeCreatedDate}
        </Text>
      </Text>
    );
  };

  return (
    <>
      <Card p={0} className={styles.root} radius={'lg'}>
        <Stack gap={'xs'} p={'xs'}>
          <Group gap={'xs'} wrap="nowrap" align="center">
            <Avatar
              component={Link}
              href={`/profile/${props.connection.curator.handle}`}
              src={props.connection.curator.avatarUrl?.replace(
                'avatar',
                'avatar_thumbnail',
              )}
              alt={`${props.connection.curator.name}'s avatar`}
            />
            {renderConnectionText()}
            {isOwner && props.onEdit && (
              <Box ml="auto">
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
          {props.connection.note && (
            <Spoiler
              showLabel={'Read more'}
              hideLabel={'See less'}
              maxHeight={100}
            >
              <Text fw={500} fs={'italic'} c={'gray'}>
                {props.connection.note}
              </Text>
            </Spoiler>
          )}
        </Stack>
      </Card>

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
