'use client';

import { Card, Group, Stack, Text } from '@mantine/core';
import { useAuth } from '@/hooks/useAuth';
import { LinkAvatar } from '@/components/link/MantineLink';
import { isBotAccount } from '@/features/platforms/bluesky/lib/utils/account';
import BotLabel from '@/features/profile/components/botLabel/BotLabel';
import AccountSummarySkeleton from './Skeleton.AccountSummary';
import GuestAccountSummary from './GuestAccountSummary';
import classes from './AccountSummary.module.css';

export default function AccountSummary() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <AccountSummarySkeleton />;
  if (!user) return <GuestAccountSummary />;

  return (
    <Card p={'sm'} radius={'lg'} classNames={{ root: classes.root }}>
      <Group gap={'xs'}>
        <LinkAvatar
          href={`/profile/${user.handle}`}
          src={user.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
          alt={`${user.name}'s avatar`}
          size={'lg'}
          radius={'md'}
        />
        <Stack gap={'xs'}>
          <Stack gap={0}>
            <Group gap={'xs'} wrap="nowrap">
              <Text fw={600} fz={'lg'} c={'bright'}>
                {user.name}
              </Text>
              {isBotAccount(user) && <BotLabel />}
            </Group>

            <Text fw={600} fz={'lg'} c={'gray'}>
              @{user.handle}
            </Text>
          </Stack>
        </Stack>
      </Group>
    </Card>
  );
}
