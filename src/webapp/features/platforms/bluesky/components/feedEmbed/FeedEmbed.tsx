'use client';

import { AppBskyFeedDefs } from '@atproto/api';
import { Avatar, Card, Group, Stack, Text } from '@mantine/core';

import { getFeedLink } from '../../lib/utils/link';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

interface Props {
  feed: AppBskyFeedDefs.GeneratorView;
}

export default function FeedEmbed(props: Props) {
  const { settings } = useUserSettings();

  if (settings.cardView === 'grid') {
    return (
      <Card p={'xs'} withBorder>
        <Group gap={'xs'} wrap="nowrap">
          {props.feed.avatar && (
            <Avatar
              src={props.feed.avatar?.replace('avatar', 'avatar_thumbnail')}
              alt={props.feed.displayName}
            />
          )}

          <Stack gap={0}>
            <Text fz={'sm'} fw={500} c={'bright'} lineClamp={1}>
              {props.feed.displayName}
            </Text>
            <Text fz={'sm'} fw={500} c={'gray'} lineClamp={1} span>
              Feed by @{props.feed.creator.handle}
            </Text>
          </Stack>
        </Group>
      </Card>
    );
  }

  return (
    <Card
      p={'xs'}
      component="a"
      href={getFeedLink(props.feed)}
      target="_blank"
      withBorder
    >
      <Group gap={'xs'} wrap="nowrap">
        {props.feed.avatar && (
          <Avatar
            src={props.feed.avatar?.replace('avatar', 'avatar_thumbnail')}
            alt={props.feed.displayName}
          />
        )}

        <Stack gap={0}>
          <Text fz={'sm'} fw={500} c={'bright'} lineClamp={1}>
            {props.feed.displayName}
          </Text>
          <Text fz={'sm'} fw={500} c={'gray'} lineClamp={1} span>
            Feed by @{props.feed.creator.handle}
          </Text>
        </Stack>
      </Group>
    </Card>
  );
}
