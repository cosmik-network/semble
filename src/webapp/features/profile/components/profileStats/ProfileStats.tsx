'use client';

import { Group, Badge, Skeleton, Anchor, Text } from '@mantine/core';
import { Suspense } from 'react';
import useFollowersCount from '@/features/follows/lib/queries/useFollowersCount';
import useFollowingCount from '@/features/follows/lib/queries/useFollowingCount';
import useFollowingCollectionsCount from '@/features/follows/lib/queries/useFollowingCollectionsCount';
import FollowButton from '@/features/follows/components/followButton/FollowButton';
import useMyProfile from '../../lib/queries/useMyProfile';
import Link from 'next/link';

interface Props {
  identifier: string; // DID or handle
  handle: string; // For building links
  isFollowing?: boolean; // Whether the current user follows this profile
}

function ProfileStatsContent({ identifier, handle, isFollowing }: Props) {
  const { data: followersCount } = useFollowersCount({ identifier });
  const { data: followingCount } = useFollowingCount({ identifier });
  const { data: followingCollectionsCount } = useFollowingCollectionsCount({
    identifier,
  });
  const { data: myProfile } = useMyProfile();

  const isOwnProfile = myProfile?.id === identifier;

  return (
    <Group gap="sm">
      <Anchor
        component={Link}
        href={`/profile/${handle}/followers`}
        underline="never"
      >
        <Text fw={500} c={'bright'} span>
          {followersCount.count}
        </Text>
        <Text fw={500} c={'gray'} span>
          {' Follower'}
          {followersCount.count !== 1 ? 's' : ''}
        </Text>
      </Anchor>

      <Anchor
        component={Link}
        href={`/profile/${handle}/following`}
        underline="never"
      >
        <Text fw={500} c={'bright'} span>
          {followingCount.count}
        </Text>
        <Text fw={500} c={'gray'} span>
          {' Following'}
        </Text>
      </Anchor>

      <Anchor
        component={Link}
        href={`/profile/${handle}/following-collections`}
        underline="never"
      >
        <Text fw={500} c={'bright'} span>
          {followingCollectionsCount.count}
        </Text>
        <Text fw={500} c={'gray'} span>
          {' Followed Collections'}
        </Text>
      </Anchor>

      {!isOwnProfile && (
        <FollowButton
          targetId={identifier}
          targetType="USER"
          targetHandle={handle}
          initialIsFollowing={isFollowing}
        />
      )}
    </Group>
  );
}

export default function ProfileStats({
  identifier,
  handle,
  isFollowing,
}: Props) {
  return (
    <Suspense
      fallback={
        <Group gap="sm">
          <Skeleton height={28} width={100} radius="sm" />
          <Skeleton height={28} width={100} radius="sm" />
          <Skeleton height={28} width={120} radius="sm" />
        </Group>
      }
    >
      <ProfileStatsContent
        identifier={identifier}
        handle={handle}
        isFollowing={isFollowing}
      />
    </Suspense>
  );
}
