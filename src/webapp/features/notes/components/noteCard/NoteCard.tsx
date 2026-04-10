import { User } from '@/api-client/ApiClient';
import { Card, Group, Spoiler, Stack, Text } from '@mantine/core';
import { getRelativeTime } from '@/lib/utils/time';
import { LinkAvatar, LinkText } from '@/components/link/MantineLink';

interface Props {
  id: string;
  note: string;
  createdAt: string;
  author: User;
}

export default function NoteCard(props: Props) {
  const time = getRelativeTime(props.createdAt);

  return (
    <Card p={'sm'} radius={'lg'} h={'100%'} withBorder>
      <Stack justify="space-between" h={'100%'}>
        <Spoiler showLabel={'Read more'} hideLabel={'See less'} maxHeight={200}>
          <Text fs={'italic'}>{props.note}</Text>
        </Spoiler>

        <Group gap={'xs'}>
          <LinkAvatar
            href={`/profile/${props.author.handle}`}
            src={props.author.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
            alt={`${props.author.handle}'s avatar`}
            size={'sm'}
          />

          <Text>
            <LinkText
              href={`/profile/${props.author.handle}`}
              c={'bright'}
              fw={500}
              span
            >
              {props.author.name}
            </LinkText>
            <Text c={'gray'} span>
              {' · '}
            </Text>
            <Text c={'gray'} span>
              {time}{' '}
            </Text>
          </Text>
        </Group>
      </Stack>
    </Card>
  );
}
