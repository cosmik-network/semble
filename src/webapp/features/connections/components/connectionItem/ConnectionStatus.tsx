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
  Box,
  Button,
  Image,
} from '@mantine/core';
import { ConnectionWithSourceAndTarget, User, UrlView } from '@semble/types';
import Link from 'next/link';
import styles from './ConnectionStatus.module.css';
import { getRelativeTime } from '@/lib/utils/time';
import { sanitizeText, truncateText } from '@/lib/utils/text';
import { useAuth } from '@/hooks/useAuth';
import { useState } from 'react';
import { HiDotsVertical } from 'react-icons/hi';
import { MdEdit, MdDelete } from 'react-icons/md';
import DeleteConnectionModal from '../deleteConnectionModal/DeleteConnectionModal';

interface Props {
  connection: ConnectionWithSourceAndTarget['connection'];
  source: UrlView;
  target: UrlView;
  direction: 'forward' | 'backward';
  onEdit?: () => void;
}

export default function ConnectionStatus(props: Props) {
  const { user } = useAuth();
  const [deleteModalOpened, setDeleteModalOpened] = useState(false);

  const time = getRelativeTime(props.connection.createdAt.toString());
  const relativeCreatedDate = time === 'now' ? `Now` : time;

  const isOwner = user && user.id === props.connection.curator.id;

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
      href={`/url?id=${encodeURIComponent(url)}`}
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
      {truncateText(title || 'Card', 10)}
    </Button>
  );

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
          {props.direction === 'forward' ? (
            <>
              <CardButton
                url={props.source.url}
                title={props.source.metadata.title}
                imageUrl={props.source.metadata.imageUrl}
              />
              <Text>→</Text>
              <CardButton
                url={props.target.url}
                title={props.target.metadata.title}
                imageUrl={props.target.metadata.imageUrl}
              />
            </>
          ) : (
            <>
              <CardButton
                url={props.target.url}
                title={props.target.metadata.title}
                imageUrl={props.target.metadata.imageUrl}
              />
              <Text>→</Text>
              <CardButton
                url={props.source.url}
                title={props.source.metadata.title}
                imageUrl={props.source.metadata.imageUrl}
              />
            </>
          )}
          <Text fz={'sm'} fw={600} c={'gray'} mt={4}>
            {relativeCreatedDate}
          </Text>
        </Group>
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

          {props.connection.type && (
            <Badge size="sm" variant="light" color="green" mt={'xs'}>
              {props.connection.type.toLowerCase().replace('_', ' ')}
            </Badge>
          )}

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

      <DeleteConnectionModal
        isOpen={deleteModalOpened}
        onClose={() => setDeleteModalOpened(false)}
        connectionId={props.connection.id}
      />
    </>
  );
}
