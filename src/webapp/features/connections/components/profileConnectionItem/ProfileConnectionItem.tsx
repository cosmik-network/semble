import type { ConnectionWithSourceAndTarget, User } from '@semble/types';
import Link from 'next/link';
import {
  Stack,
  Card,
  Group,
  Text,
  Box,
  Avatar,
  ActionIcon,
  Menu,
  Spoiler,
} from '@mantine/core';
import { MdEdit } from 'react-icons/md';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { getRelativeTime } from '@/lib/utils/time';
import DeleteConnectionModal from '../deleteConnectionModal/DeleteConnectionModal';
import ConnectionCard from '../connectionCard/ConnectionCard';
import styles from './ProfileConnectionItem.module.css';
import { BsThreeDots, BsTrash2Fill } from 'react-icons/bs';

interface Props {
  connection: ConnectionWithSourceAndTarget;
  curator: User;
  activityStatusText?: string;
  onEdit?: () => void;
}

export default function ProfileConnectionItem(props: Props) {
  const { user } = useAuth();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const isOwner = user && user.id === props.curator.id;

  const time = getRelativeTime(
    props.connection.connection.createdAt.toString(),
  );
  const relativeCreatedDate = time === 'now' ? `Now` : time;

  return (
    <>
      <Card radius={'lg'} p={'xs'} className={styles.root} withBorder>
        <Stack gap={'xs'}>
          <Group justify="space-between" align="center" grow>
            <Stack gap={'xs'}>
              <Group justify="space-between" align="center">
                <Group gap={'xs'}>
                  <Avatar
                    component={Link}
                    href={`/profile/${props.curator.handle}`}
                    src={props.curator.avatarUrl?.replace(
                      'avatar',
                      'avatar_thumbnail',
                    )}
                    alt={`${props.curator.name}'s avatar`}
                    size={'sm'}
                  />
                  <Text fw={500}>
                    <Text
                      c={'bright'}
                      fw={600}
                      component={Link}
                      href={`/profile/${props.curator.handle}`}
                      span
                    >
                      {props.curator.name}
                    </Text>
                    {props.activityStatusText && (
                      <Text span> {props.activityStatusText}</Text>
                    )}
                    <Text c={'gray'} fw={600} span>
                      {' · '}
                    </Text>
                    <Text fz={'sm'} fw={600} c={'gray'} span>
                      {relativeCreatedDate}{' '}
                    </Text>
                  </Text>
                </Group>
                {isOwner && props.onEdit && (
                  <Box>
                    <Menu shadow="md" width={200} position="bottom-end">
                      <Menu.Target>
                        <ActionIcon
                          variant="subtle"
                          color={'gray'}
                          radius={'xl'}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <BsThreeDots size={18} />
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
                          leftSection={<BsTrash2Fill />}
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

              {props.connection.connection.note && (
                <Spoiler
                  showLabel={'Read more'}
                  hideLabel={'See less'}
                  maxHeight={50}
                >
                  <Text fw={500} fs={'italic'} c={'gray'}>
                    {props.connection.connection.note}
                  </Text>
                </Spoiler>
              )}
            </Stack>
          </Group>

          <ConnectionCard connection={props.connection} withoutBorder />
        </Stack>
      </Card>

      <DeleteConnectionModal
        isOpen={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        connectionId={props.connection.connection.id}
      />
    </>
  );
}
