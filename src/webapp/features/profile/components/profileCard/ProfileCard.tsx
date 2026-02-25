import { Avatar, Badge, Card, Group, Stack, Text } from '@mantine/core';
import { User } from '@semble/types';
import Link from 'next/link';
import { sanitizeText } from '@/lib/utils/text';
import { ReactNode } from 'react';

interface Props {
  profile: User;
  children?: ReactNode;
}

export default function ProfileCard(props: Props) {
  return (
    <Card
      withBorder
      radius={'lg'}
      p={'sm'}
      component={Link}
      href={`/profile/${props.profile.handle}`}
      h={'100%'}
    >
      <Stack gap={'xs'}>
        <Group gap={'xs'} wrap="nowrap">
          <Avatar
            src={props.profile.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
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
    </Card>
  );
}
