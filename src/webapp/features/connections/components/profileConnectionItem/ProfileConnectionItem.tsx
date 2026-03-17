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
} from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { MdOutlinePsychologyAlt, MdEdit, MdDelete } from 'react-icons/md';
import { useAuth } from '@/hooks/useAuth';
import { HiDotsHorizontal } from 'react-icons/hi';
import { useState } from 'react';
import { getRelativeTime } from '@/lib/utils/time';
import {
  BiMessageSquareDetail,
  BiHelpCircle,
  BiRightArrowAlt,
  BiLink,
  BiCheckCircle,
  BiXCircle,
} from 'react-icons/bi';
import { PiNewspaperClipping } from 'react-icons/pi';
import { IoArrowDown, IoArrowForward } from 'react-icons/io5';
import DeleteConnectionModal from '../deleteConnectionModal/DeleteConnectionModal';
import styles from './ProfileConnectionItem.module.css';

const CONNECTION_TYPE_CONFIG: Record<
  string,
  { label: string; icon: React.ComponentType }
> = {
  SUPPORTS: { label: 'Supports', icon: BiCheckCircle },
  OPPOSES: { label: 'Opposes', icon: BiXCircle },
  ADDRESSES: { label: 'Addresses', icon: BiMessageSquareDetail },
  HELPFUL: { label: 'Helpful', icon: BiHelpCircle },
  LEADS_TO: { label: 'Leads to', icon: BiRightArrowAlt },
  RELATED: { label: 'Related', icon: BiLink },
  SUPPLEMENT: { label: 'Supplement', icon: PiNewspaperClipping },
  EXPLAINER: { label: 'Explainer', icon: MdOutlinePsychologyAlt },
};

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
                <Avatar src={props.curator.avatarUrl} size={'sm'} />
                <Text>
                  <Text c={'bright'} fw={500} span>
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
                        const config =
                          CONNECTION_TYPE_CONFIG[
                            props.connection.connection.type
                          ];
                        const Icon = config.icon;
                        return (
                          <Stack align="center" gap={'xs'}>
                            <ActionIcon
                              color="gray"
                              variant="light"
                              radius={'xl'}
                              hiddenFrom="sm"
                            >
                              <IoArrowDown size={18} />
                            </ActionIcon>

                            <ActionIcon
                              color="gray"
                              variant="light"
                              radius={'xl'}
                              visibleFrom="sm"
                            >
                              <IoArrowForward />
                            </ActionIcon>

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
