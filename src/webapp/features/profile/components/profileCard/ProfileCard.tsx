import { Avatar, Badge, Group, Stack, Text } from '@mantine/core';
import { User } from '@semble/types';
import { sanitizeText } from '@/lib/utils/text';
import { getRelativeTime } from '@/lib/utils/time';
import { ReactNode } from 'react';
import { LinkCard } from '@/components/link/MantineLink';

interface Props {
  profile: User;
  children?: ReactNode;
  addedAt?: string;
}

export default function ProfileCard(props: Props) {
  const time = props.addedAt ? getRelativeTime(props.addedAt) : null;

  return (
    <LinkCard
      withBorder
      radius={'lg'}
      p={'sm'}
      href={`/profile/${props.profile.handle}`}
      h={'100%'}
    >
      <Stack gap={'xxs'}>
        <Group
          gap={'xs'}
          wrap="nowrap"
          justify="space-between"
          align="flex-start"
        >
          <Group gap={'xs'} wrap="nowrap">
            <Avatar
              src={props.profile.avatarUrl?.replace(
                'avatar',
                'avatar_thumbnail',
              )}
              alt={`${props.profile.handle}'s avatar`}
            />

            <Stack gap={0}>
              <Text fw={600} c={'bright'} lineClamp={1}>
                {sanitizeText(props.profile.name) || props.profile.handle}
              </Text>
              <Text fw={600} c={'gray'} lineClamp={1}>
                @{props.profile.handle}
              </Text>
            </Stack>
          </Group>

          {time && (
            <Text c={'gray'} fz={'sm'}>
              {time}
            </Text>
          )}
        </Group>

        <Group gap="xs">
          {props.profile.followsYou && (
            <Badge variant="light" color="gray">
              Follows you
            </Badge>
          )}
          {props.children}
        </Group>

        {props.profile.description && (
          <Text size="sm" lineClamp={2}>
            {props.profile.description}
          </Text>
        )}
      </Stack>
    </LinkCard>
  );
}
