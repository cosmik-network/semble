'use client';

import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import { Avatar, Stack, Text } from '@mantine/core';
import Link from 'next/link';

export default function AccountSummary() {
  const { data: profile } = useMyProfile();

  return (
    <Stack gap={'xs'} align="center">
      <Avatar
        component={Link}
        href={`/profile/${profile.handle}`}
        src={profile.avatarUrl}
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
