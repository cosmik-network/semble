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
  Image,
} from '@mantine/core';
import { ConnectionForUrl, User, UrlView } from '@semble/types';
import Link from 'next/link';
import styles from './ConnectionStatus.module.css';
import { getRelativeTime } from '@/lib/utils/time';
import { sanitizeText, truncateText } from '@/lib/utils/text';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { HiDotsVertical } from 'react-icons/hi';
import { MdEdit, MdDelete, MdOutlinePsychologyAlt } from 'react-icons/md';
import useDeleteConnection from '../../lib/mutations/useDeleteConnection';
import { notifications } from '@mantine/notifications';
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

const CONNECTION_TYPE_CONFIG: Record<
  ConnectionType,
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
  connection: ConnectionForUrl['connection'];
  direction: 'forward' | 'backward';
  sourceUrl: string;
  targetUrl: UrlView;
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

  const renderConnectionText = () => {
    const curator = props.connection.curator;
    const connectionType = props.connection.type;

    const CardButton = ({
      url,
      title,
      imageUrl,
    }: {
      url: string;
      title?: string;
      imageUrl?: string;
    }) => (
      <Button
        component={Link}
        href={`/semble/${encodeURIComponent(url)}`}
        variant="outline"
        color="gray.3"
        bg="gray.2"
        c={'gray.7'}
        size="compact-sm"
        radius={'md'}
        leftSection={
          imageUrl ? (
            <Image
              src={imageUrl}
              alt=""
              w={16}
              h={16}
              fit="cover"
              radius={'sm'}
            />
          ) : (
            <Avatar size={18} radius={'sm'} />
          )
        }
      >
        {truncateText(title || 'Card', 15)}
      </Button>
    );

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
        <Group
          gap={4}
          wrap="nowrap"
          component="span"
          display="inline-flex"
          style={{ verticalAlign: 'middle' }}
        >
          <Text span>connected</Text>
          {props.direction === 'forward' ? (
            <>
              <CardButton
                url={props.sourceUrl}
                title="This card"
                imageUrl={undefined}
              />
              <Text span>→</Text>
              <CardButton
                url={props.targetUrl.url}
                title={props.targetUrl.metadata.title}
                imageUrl={props.targetUrl.metadata.imageUrl}
              />
            </>
          ) : (
            <>
              <CardButton
                url={props.targetUrl.url}
                title={props.targetUrl.metadata.title}
                imageUrl={props.targetUrl.metadata.imageUrl}
              />
              <Text span>→</Text>
              <CardButton
                url={props.sourceUrl}
                title="This card"
                imageUrl={undefined}
              />
            </>
          )}
        </Group>
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
          {props.connection.type &&
            (() => {
              const config = CONNECTION_TYPE_CONFIG[props.connection.type];
              const Icon = config.icon;
              return (
                <Badge
                  size="sm"
                  variant="light"
                  color="green"
                  leftSection={<Icon />}
                >
                  {config.label}
                </Badge>
              );
            })()}
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
