import type { ConnectionWithSourceAndTarget, User } from '@semble/types';
import {
  Stack,
  Card,
  Group,
  Text,
  Badge,
  Divider,
  Box,
  Grid,
  Avatar,
} from '@mantine/core';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { MdArrowDownward, MdOutlinePsychologyAlt } from 'react-icons/md';
import { upperFirst, useMediaQuery } from '@mantine/hooks';
import { useAuth } from '@/hooks/useAuth';
import { ActionIcon, Menu, Modal, Button, Spoiler } from '@mantine/core';
import { HiDotsHorizontal, HiDotsVertical } from 'react-icons/hi';
import { MdEdit, MdDelete } from 'react-icons/md';
import useDeleteConnection from '../../lib/mutations/useDeleteConnection';
import { notifications } from '@mantine/notifications';
import { Fragment, useState } from 'react';
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
import { ConnectionType } from '@semble/types';
import { BsThreeDots } from 'react-icons/bs';
import {
  IoArrowDown,
  IoArrowDownCircleSharp,
  IoArrowForward,
  IoArrowForwardCircle,
} from 'react-icons/io5';

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
  const deleteConnection = useDeleteConnection();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const sourceUrlView = props.connection.source;
  const targetUrlView = props.connection.target;

  const isOwner = user && user.id === props.curator.id;

  const matches = useMediaQuery('(min-width: 576px)');

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
    <Card radius={'lg'} p={'xs'} bg={'gray.1'}>
      <Stack gap={'xs'}>
        <Group justify="space-between" align="start">
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
                <Text fs={'italic'} c={'dimmed'}>
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
          <Grid.Col span={{ base: 12, xs: 5 }}>
            <UrlCard
              id={sourceUrlView.url}
              url={sourceUrlView.url}
              cardContent={sourceUrlView.metadata}
              urlLibraryCount={sourceUrlView.urlLibraryCount}
              urlIsInLibrary={sourceUrlView.urlInLibrary ?? false}
            />
          </Grid.Col>

          {/* Connection Metadata */}
          <Grid.Col span={{ base: 12, xs: 2 }}>
            <Card p={0} radius={'md'} bg={'transparent'}>
              <Group justify="center" wrap="nowrap" align="center">
                <Stack gap={0} align="center">
                  <Group gap={'xs'} wrap="wrap">
                    {props.connection.connection.type &&
                      (() => {
                        const config =
                          CONNECTION_TYPE_CONFIG[
                            props.connection.connection.type
                          ];
                        const Icon = config.icon;
                        return (
                          <Stack align="center" gap={'xs'}>
                            {/*<Text>→</Text>
                            <Text>↓</Text>*/}

                            {matches && (
                              <ActionIcon
                                color="gray"
                                variant="light"
                                radius={'xl'}
                              >
                                <IoArrowForward />
                              </ActionIcon>
                            )}

                            <Badge
                              size="md"
                              color="green"
                              variant="light"
                              leftSection={<Icon />}
                            >
                              {config.label}
                            </Badge>
                            {!matches && (
                              <ActionIcon
                                color="gray"
                                variant="light"
                                radius={'xl'}
                              >
                                <IoArrowDown size={18} />
                              </ActionIcon>
                            )}
                          </Stack>
                        );
                      })()}
                  </Group>

                  {/*<Text mt={'sm'} fz={'sm'} fw={600} c={'gray'}>
                  {relativeCreatedDate}
                </Text>*/}
                </Stack>
              </Group>
            </Card>
          </Grid.Col>
          {/* Target URL */}
          <Grid.Col span={{ base: 12, xs: 5 }}>
            <UrlCard
              id={targetUrlView.url}
              url={targetUrlView.url}
              cardContent={targetUrlView.metadata}
              urlLibraryCount={targetUrlView.urlLibraryCount}
              urlIsInLibrary={targetUrlView.urlInLibrary ?? false}
            />
          </Grid.Col>
        </Grid>
      </Stack>

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
    </Card>
  );
}
