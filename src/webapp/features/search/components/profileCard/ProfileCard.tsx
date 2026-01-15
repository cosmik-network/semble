import { ProfileView } from '@/api-client';
import { Avatar, Card, Group, Stack, Text } from '@mantine/core';
import Link from 'next/link';

interface Props {
  profile: ProfileView;
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
      <Group gap={'xs'} justify="space-between">
        <Group gap={'xs'}>
          <Avatar
            src={props.profile.avatar?.replace('avatar', 'avatar_thumbnail')}
            alt={`${props.profile.handle}'s avatar`}
          />

          <Stack gap={0}>
            <Text fw={600} c={'bright'}>
              {props.profile.displayName || props.profile.handle}
            </Text>
            <Text fw={600} c={'gray'}>
              @{props.profile.handle}
            </Text>
            {props.profile.description && (
              <Text size="sm" c={'dimmed'} lineClamp={2}>
                {props.profile.description}
              </Text>
            )}
          </Stack>
        </Group>
      </Group>
    </Card>
  );
}
