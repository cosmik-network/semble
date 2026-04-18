'use client';

import useProfile from '@/features/profile/lib/queries/useProfile';
import { Avatar, Badge, Card, Group, Stack, Text } from '@mantine/core';
import { sanitizeText } from '@/lib/utils/text';
import RichTextRenderer from '@/components/contentDisplay/richTextRenderer/RichTextRenderer';
import { isBotAccount } from '@/features/platforms/bluesky/lib/utils/account';
import BotLabel from '@/features/profile/components/botLabel/BotLabel';

interface Props {
  handle: string;
}

export default function SembleProfileCardContent(props: Props) {
  const { data: profile } = useProfile({ didOrHandle: props.handle });

  return (
    <Card p={0} h={'100%'}>
      <Stack gap={'xxs'}>
        <Group gap={'xs'} wrap="nowrap">
          <Avatar
            src={profile.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
            alt={`${profile.handle}'s avatar`}
          />

          <Stack gap={0}>
            <Group gap={'xs'} wrap="nowrap">
              <Text fw={600} c={'bright'} lineClamp={1}>
                {sanitizeText(profile.name) || profile.handle}
              </Text>
              {isBotAccount(profile) && <BotLabel />}
            </Group>
            <Text fw={600} c={'gray'} lineClamp={1}>
              @{profile.handle}
            </Text>
          </Stack>
        </Group>

        <Group gap="xs">
          {profile.followsYou && (
            <Badge variant="light" color="gray">
              Follows you
            </Badge>
          )}
        </Group>

        {profile.description && <RichTextRenderer text={profile.description} />}
      </Stack>
    </Card>
  );
}
