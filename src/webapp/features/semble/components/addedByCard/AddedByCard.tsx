import { GetLibrariesForUrlResponse } from '@/api-client';
import { getRelativeTime } from '@/lib/utils/time';
import { Avatar, Card, Group, Stack, Text } from '@mantine/core';
import Link from 'next/link';
import { isMarginUri } from '@/lib/utils/margin';
import MarginLogo from '@/components/MarginLogo';

interface Props {
  item: GetLibrariesForUrlResponse['libraries'][0];
}

export default function AddedByCard(props: Props) {
  const time = getRelativeTime(props.item.card.createdAt);
  const isMargin = isMarginUri(props.item.card.uri);
  const marginUrl = isMargin
    ? `https://margin.at/profile/${props.item.card.author.id}`
    : null;

  return (
    <Card
      withBorder
      radius={'lg'}
      p={'sm'}
      component={Link}
      href={`/profile/${props.item.user.handle}`}
      h={'100%'}
    >
      <Group gap={'xs'} justify="space-between">
        <Group gap={'xs'}>
          <Avatar
            src={props.item.card.author.avatarUrl?.replace(
              'avatar',
              'avatar_thumbnail',
            )}
            alt={`${props.item.card.author.handle}'s avatar`}
          />

          <Stack gap={0}>
            <Group gap={'xs'}>
              <Text fw={600} c={'bright'}>
                {props.item.card.author.name}
              </Text>
              {isMargin && (
                <MarginLogo
                  size={16}
                  marginUrl={marginUrl}
                  tooltipText="View profile on Margin"
                />
              )}
            </Group>
            <Text fw={600} c={'gray'}>
              @{props.item.card.author.handle}
            </Text>
          </Stack>
        </Group>

        <Text c={'gray'}>Added {time}</Text>
      </Group>
    </Card>
  );
}
