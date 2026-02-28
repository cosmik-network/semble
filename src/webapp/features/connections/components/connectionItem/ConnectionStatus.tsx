import {
  Anchor,
  Avatar,
  Card,
  Group,
  Spoiler,
  Stack,
  Text,
  Badge,
} from '@mantine/core';
import { ConnectionForUrl, User } from '@semble/types';
import Link from 'next/link';
import styles from './ConnectionStatus.module.css';
import { getRelativeTime } from '@/lib/utils/time';
import { sanitizeText } from '@/lib/utils/text';

interface Props {
  connection: ConnectionForUrl['connection'];
  direction: 'forward' | 'backward';
}

export default function ConnectionStatus(props: Props) {
  const time = getRelativeTime(props.connection.createdAt.toString());
  const relativeCreatedDate = time === 'now' ? `Now` : time;

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
  );
}
