import { Avatar, Stack, Text } from '@mantine/core';
import Link from 'next/link';
import { createServerSembleClient } from '@/services/server.apiClient';
import { verifySessionOnServer } from '@/lib/auth/dal.server';

export default async function AccountSummary() {
  await verifySessionOnServer({ redirectOnFail: true });

  const client = await createServerSembleClient();
  const profile = await client.getMyProfile();

  return (
    <Stack gap={'xs'} align="center">
      <Avatar
        component={Link}
        href={`/profile/${profile.handle}`}
        src={profile.avatarUrl?.replace('avatar', 'avatar_thumbnail')}
        alt={`${profile.name}'s' avatar`}
        size={'xl'}
        radius={'lg'}
      />
      <Stack gap={0} align="center">
        <Text fw={600} fz={'h3'} c={'bright'}>
          {profile.name}
        </Text>
        <Text fw={500} fz={'h4'} c={'gray'}>
          @{profile.handle}
        </Text>
      </Stack>
    </Stack>
  );
}
