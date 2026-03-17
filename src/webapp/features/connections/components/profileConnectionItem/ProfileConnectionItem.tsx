import type { ConnectionWithSourceAndTarget, User } from '@semble/types';
import {
  Stack,
  Card,
  Group,
  Text,
  Badge,
  Box,
  Grid,
  Avatar,
  ActionIcon,
  Menu,
  Spoiler,
  ThemeIcon,
} from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { MdEdit } from 'react-icons/md';
import { useAuth } from '@/hooks/useAuth';
import { HiDotsHorizontal } from 'react-icons/hi';
import { useState } from 'react';
import { getRelativeTime } from '@/lib/utils/time';
import { IoArrowDown, IoArrowForward } from 'react-icons/io5';
import DeleteConnectionModal from '../deleteConnectionModal/DeleteConnectionModal';
import styles from './ProfileConnectionItem.module.css';
import { CONNECTION_TYPES } from '../../const/connectionTypes';
import Link from 'next/link';
import { BsTrash2Fill } from 'react-icons/bs';

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

  const time = getRelativeTime(
    props.connection.connection.createdAt.toString(),
  );
  const relativeCreatedDate = time === 'now' ? `Now` : time;

  return (
    <>
      <Card radius={'lg'} p={'xs'} className={styles.root}>
        <Stack gap={'xs'}>
          <Group justify="space-between" align="center">
            <Stack gap={'xs'}>
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
                <Text>
                  <Text
                    c={'bright'}
                    fw={500}
                    component={Link}
                    href={`/profile/${props.curator.handle}`}
                    span
                  >
                    {props.curator.name}
                  </Text>
                  <Text c={'gray'} span>
                    {' · '}
                  </Text>
                  <Text c={'gray'} span>
                    {relativeCreatedDate}{' '}
                  </Text>
                </Text>
              </Group>
              {props.connection.connection.note && (
                <Spoiler
                  showLabel={'Read more'}
                  hideLabel={'See less'}
                  maxHeight={60}
                >
                  <Text fw={500} fs={'italic'} c={'gray'}>
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
                      <HiDotsHorizontal />
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
                      leftSection={<BsTrash2Fill size={16} />}
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

          <Grid gutter={'xs'} align="center">
            {/* Source URL */}
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <UrlCard
                id={sourceUrlView.url}
                url={sourceUrlView.url}
                cardContent={sourceUrlView.metadata}
                urlLibraryCount={sourceUrlView.urlLibraryCount}
                urlIsInLibrary={sourceUrlView.urlInLibrary ?? false}
                urlConnectionCount={sourceUrlView.urlConnectionCount ?? 0}
              />
            </Grid.Col>

            {/* Connection Metadata */}
            <Grid.Col span={{ base: 12, sm: 2 }}>
              <Card p={0} radius={'md'} bg={'transparent'}>
                <Group justify="center" wrap="nowrap" align="center">
                  <Stack gap={0} align="center">
                    {props.connection.connection.type &&
                      (() => {
                        const config = CONNECTION_TYPES.find(
                          (t) => t.value === props.connection.connection.type,
                        );
                        if (!config) return null;
                        const Icon = config.icon;
                        return (
                          <Stack align="center" gap={'xs'}>
                            <ThemeIcon
                              color="gray"
                              variant="light"
                              radius={'xl'}
                              hiddenFrom="sm"
                            >
                              <IoArrowDown size={18} />
                            </ThemeIcon>

                            <ThemeIcon
                              color="gray"
                              variant="light"
                              radius={'xl'}
                              visibleFrom="sm"
                            >
                              <IoArrowForward />
                            </ThemeIcon>

                            <Badge
                              size="md"
                              color="green"
                              variant="light"
                              leftSection={<Icon />}
                            >
                              {config.label}
                            </Badge>
                          </Stack>
                        );
                      })()}
                  </Stack>
                </Group>
              </Card>
            </Grid.Col>

            {/* Target URL */}
            <Grid.Col span={{ base: 12, sm: 5 }}>
              <UrlCard
                id={targetUrlView.url}
                url={targetUrlView.url}
                cardContent={targetUrlView.metadata}
                urlLibraryCount={targetUrlView.urlLibraryCount}
                urlIsInLibrary={targetUrlView.urlInLibrary ?? false}
                urlConnectionCount={targetUrlView.urlConnectionCount ?? 0}
              />
            </Grid.Col>
          </Grid>
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
