'use client';

import { Group, Anchor, Text } from '@mantine/core';
import Link from 'next/link';
import { useSuspenseQuery } from '@tanstack/react-query';
import { profileKeys } from '../../lib/profileKeys';
import { getProfile } from '../../lib/dal';

interface Props {
  handle: string;
  initialFollowerCount: number;
  initialFollowingCount: number;
  initialFollowedCollectionsCount: number;
}

export default function ProfileFollowStats(props: Props) {
  const { data } = useSuspenseQuery({
    queryKey: profileKeys.profile(props.handle),
    queryFn: () => getProfile(props.handle),
  });

  const followerCount = data.followerCount ?? props.initialFollowerCount;
  const followingCount = data.followingCount ?? props.initialFollowingCount;
  const followedCollectionsCount =
    data.followedCollectionsCount ?? props.initialFollowedCollectionsCount;

  return (
    <Group gap="sm">
      <Anchor
        component={Link}
        href={`/profile/${props.handle}/community`}
        underline="never"
      >
        <Text fw={500} c={'bright'} span>
          {followerCount}
        </Text>
        <Text fw={500} c={'gray'} span>
          {' Follower'}
          {followerCount !== 1 ? 's' : ''}
        </Text>
      </Anchor>

      <Anchor
        component={Link}
        href={`/profile/${props.handle}/community/following`}
        underline="never"
      >
        <Text fw={500} c={'bright'} span>
          {followingCount}
        </Text>
        <Text fw={500} c={'gray'} span>
          {' Following'}
        </Text>
      </Anchor>

      <Anchor
        component={Link}
        href={`/profile/${props.handle}/community/collections-following`}
        underline="never"
      >
        <Text fw={500} c={'bright'} span>
          {followedCollectionsCount}
        </Text>
        <Text fw={500} c={'gray'} span>
          {' Collections Following'}
        </Text>
      </Anchor>
    </Group>
  );
}
