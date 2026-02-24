import { ProfileView } from '@/api-client';
import { Avatar, Badge, Card, Group, Stack, Text } from '@mantine/core';
import Link from 'next/link';

interface Props {
  profile: ProfileView;
}

export default function SearchProfileCard(props: Props) {
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
            src={props.profile.avatar?.replace('avatar', 'avatar_thumbnail')}
            alt={`${props.profile.handle}'s avatar`}
          />

          <Stack gap={0}>
            <Text fw={600} c={'bright'} lineClamp={1}>
              {props.profile.displayName || props.profile.handle}
            </Text>
            <Text fw={600} c={'gray'} lineClamp={1}>
              @{props.profile.handle}
            </Text>
          </Stack>
        </Group>

        {props.profile.viewer?.followedBy && (
          <Badge variant="light" color="gray">
            Follows you
          </Badge>
        )}

        {props.profile.description && (
          <Text size="sm" lineClamp={2}>
            {props.profile.description}
          </Text>
        )}
      </Stack>
    </Card>
  );
}
