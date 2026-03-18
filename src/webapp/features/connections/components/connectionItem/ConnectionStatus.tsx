import {
  Avatar,
  Card,
  Group,
  Spoiler,
  Stack,
  Text,
  Badge,
  ActionIcon,
  Menu,
  Box,
} from '@mantine/core';
import { ConnectionWithSourceAndTarget, UrlView } from '@semble/types';
import Link from 'next/link';
import styles from './ConnectionStatus.module.css';
import { getRelativeTime } from '@/lib/utils/time';
import { sanitizeText } from '@/lib/utils/text';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { BsThreeDots } from 'react-icons/bs';
import { MdEdit } from 'react-icons/md';
import DeleteConnectionModal from '../deleteConnectionModal/DeleteConnectionModal';
import CardChip from '@/features/cards/components/cardChip/CardChip';
import { BsTrash2Fill } from 'react-icons/bs';
import { CONNECTION_TYPES } from '../../const/connectionTypes';

interface Props {
  connection: ConnectionWithSourceAndTarget['connection'];
  source: UrlView;
  target: UrlView;
  onEdit?: () => void;
}

export default function ConnectionStatus(props: Props) {
  const { user } = useAuth();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const time = getRelativeTime(props.connection.createdAt.toString());
  const relativeCreatedDate = time === 'now' ? `Now` : time;

  const isOwner = user && user.id === props.connection.curator.id;

  const connectionTypeConfig = props.connection.type
    ? (CONNECTION_TYPES.find((t) => t.value === props.connection.type) ?? null)
    : null;

  const renderConnectionText = () => {
    const curator = props.connection.curator;

    return (
      <Text component="div" fw={500}>
        <Group gap={5} wrap="wrap" align="center">
          <Text
            component={Link}
            href={`/profile/${curator.handle}`}
            fw={600}
            c={'bright'}
          >
            {sanitizeText(curator.name)}
          </Text>
          <Text>connected</Text>
          <CardChip
            url={props.source.url}
            title={props.source.metadata.title}
            imageUrl={props.source.metadata.imageUrl}
          />
          <Text>→</Text>
          <CardChip
            url={props.target.url}
            title={props.target.metadata.title}
            imageUrl={props.target.metadata.imageUrl}
          />
        </Group>
      </Text>
    );
  };

  return (
    <>
      <Card p={0} className={styles.root} radius={'lg'}>
        <Stack gap={'xs'} p={'xs'}>
          {/* Header row: avatar + connection text */}
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
          </Group>

          {/* Note */}
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

          {/* Bottom bar: badge left, time + actions right */}
          <Group justify="space-between" align="center" wrap="nowrap">
            <Box>
              {connectionTypeConfig &&
                (() => {
                  const Icon = connectionTypeConfig.icon;
                  return (
                    <Badge
                      size="sm"
                      variant="light"
                      color="green"
                      leftSection={<Icon />}
                    >
                      {connectionTypeConfig.label}
                    </Badge>
                  );
                })()}
            </Box>

            <Group gap={'xs'} align="center" wrap="nowrap">
              <Text fz={'sm'} fw={600} c={'gray'}>
                {relativeCreatedDate}
              </Text>

              {isOwner && props.onEdit && (
                <Menu shadow="md" width={200} position="bottom-end">
                  <Menu.Target>
                    <ActionIcon
                      variant="light"
                      color={'gray'}
                      radius={'xl'}
                      size={'md'}
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
              )}
            </Group>
          </Group>
        </Stack>
      </Card>

      <DeleteConnectionModal
        isOpen={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        connectionId={props.connection.id}
      />
    </>
  );
}
