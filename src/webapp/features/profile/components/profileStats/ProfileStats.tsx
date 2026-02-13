'use client';

import { Group, Badge, Skeleton } from '@mantine/core';
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
      <Badge
        component={Link}
        href={`/profile/${handle}/followers`}
        variant="light"
        color="gray"
        size="lg"
        style={{ cursor: 'pointer' }}
      >
        {followersCount.count} Follower{followersCount.count !== 1 ? 's' : ''}
      </Badge>
      <Badge
        component={Link}
        href={`/profile/${handle}/following`}
        variant="light"
        color="gray"
        size="lg"
        style={{ cursor: 'pointer' }}
      >
        {followingCount.count} Following
      </Badge>
      <Badge
        component={Link}
        href={`/profile/${handle}/following-collections`}
        variant="light"
        color="gray"
        size="lg"
        style={{ cursor: 'pointer' }}
      >
        {followingCollectionsCount.count} Collection Following
      </Badge>
      {!isOwnProfile && (
        <FollowButton
          targetId={identifier}
          targetType="USER"
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
