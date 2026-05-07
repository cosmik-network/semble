import { Card, Group, Stack, Text } from '@mantine/core';
import { createServerSembleClient } from '@/services/server.apiClient';
import { verifySessionOnServer } from '@/lib/auth/dal.server';
import { LinkAvatar } from '@/components/link/MantineLink';
import { isBotAccount } from '@/features/platforms/bluesky/lib/utils/account';
import BotLabel from '@/features/profile/components/botLabel/BotLabel';
import classes from './AccountSummary.module.css';

export default async function AccountSummary() {
  await verifySessionOnServer({ redirectOnFail: true });

  const client = await createServerSembleClient();
  const profile = await client.getMyProfile();

  return (
    <Card p={'sm'} radius={'lg'} classNames={{ root: classes.root }}>
      <Group gap={'xs'}>
        <LinkAvatar
          href={`/profile/${profile.handle}`}
          src={profile.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
          alt={`${profile.name}'s avatar`}
          size={'lg'}
          radius={'md'}
        />
        <Stack gap={'xs'}>
          <Stack gap={0}>
            <Group gap={'xs'} wrap="nowrap">
              <Text fw={600} fz={'lg'} c={'bright'}>
                {profile.name}
              </Text>
              {isBotAccount(profile) && <BotLabel />}
            </Group>

            <Text fw={600} fz={'lg'} c={'gray'}>
              @{profile.handle}
            </Text>
          </Stack>
        </Stack>
      </Group>
    </Card>
  );
}
