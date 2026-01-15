import { User } from '@/api-client/ApiClient';
import { Avatar, Card, Group, Spoiler, Stack, Text } from '@mantine/core';
import { getRelativeTime } from '@/lib/utils/time';
import Link from 'next/link';

interface Props {
  id: string;
  note: string;
  createdAt: string;
  author: User;
}

export default function NoteCard(props: Props) {
  const time = getRelativeTime(props.createdAt);
  const relativeCreateDate = time === 'just now' ? `${time}` : `${time} ago`;

  return (
    <Card p={'sm'} radius={'lg'} h={'100%'} withBorder>
      <Stack justify="space-between" h={'100%'}>
        <Spoiler showLabel={'Read more'} hideLabel={'See less'} maxHeight={200}>
          <Text fs={'italic'}>{props.note}</Text>
        </Spoiler>

        <Group gap={'xs'}>
          <Avatar
            component={Link}
            href={`/profile/${props.author.handle}`}
            src={props.author.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
            alt={`${props.author.handle}'s avatar`}
            size={'sm'}
          />

          <Text>
            <Text
              component={Link}
              href={`/profile/${props.author.handle}`}
              c={'bright'}
              fw={500}
              span
            >
              {props.author.name}
            </Text>
            <Text c={'gray'} span>
              {' · '}
            </Text>
            <Text c={'gray'} span>
              {relativeCreateDate}{' '}
            </Text>
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
