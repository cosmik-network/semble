'use client';

import { Group, Anchor, Text } from '@mantine/core';
import { ReactNode, useState } from 'react';
import { useSuspenseQuery } from '@tanstack/react-query';
import { profileKeys } from '../../lib/profileKeys';
import { getProfile } from '../../lib/dal';
import StatDrawer from '@/components/statDrawer/StatDrawer';
import FollowersContainer from '@/features/follows/containers/followersContainer/FollowersContainer';
import FollowersContainerSkeleton from '@/features/follows/containers/followersContainer/Skeleton.FollowersContainer';
import FollowingContainer from '@/features/follows/containers/followingContainer/FollowingContainer';
import FollowingContainerSkeleton from '@/features/follows/containers/followingContainer/Skeleton.FollowingContainer';
import FollowingCollectionsContainer from '@/features/follows/containers/followingCollectionsContainer/FollowingCollectionsContainer';
import FollowingCollectionsContainerSkeleton from '@/features/follows/containers/followingCollectionsContainer/Skeleton.FollowingCollectionsContainer';

interface Props {
  handle: string;
  initialFollowerCount: number;
  initialFollowingCount: number;
  initialFollowedCollectionsCount: number;
}

interface StatProps {
  count: number;
  label: string;
  title: string;
  skeleton: ReactNode;
  errorMessage: string;
  children: ReactNode;
}

function FollowStat(props: StatProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Anchor
        component="button"
        onClick={() => setIsOpen(true)}
        underline="never"
      >
        <Text fw={500} c={'bright'} span>
          {props.count}
        </Text>
        <Text fw={500} c={'gray'} span>
          {' '}
          {props.label}
        </Text>
      </Anchor>
      <StatDrawer
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={props.title}
        skeleton={props.skeleton}
        errorMessage={props.errorMessage}
      >
        {props.children}
      </StatDrawer>
    </>
  );
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
      <FollowStat
        count={followerCount}
        label={followerCount === 1 ? 'Follower' : 'Followers'}
        title="Followers"
        skeleton={<FollowersContainerSkeleton />}
        errorMessage="Could not load followers"
      >
        <FollowersContainer handle={props.handle} />
      </FollowStat>
      <FollowStat
        count={followingCount}
        label="Following"
        title="Following"
        skeleton={<FollowingContainerSkeleton />}
        errorMessage="Could not load following"
      >
        <FollowingContainer handle={props.handle} />
      </FollowStat>
      <FollowStat
        count={followedCollectionsCount}
        label="Collections Following"
        title="Collections Following"
        skeleton={<FollowingCollectionsContainerSkeleton />}
        errorMessage="Could not load followed collections"
      >
        <FollowingCollectionsContainer handle={props.handle} />
      </FollowStat>
    </Group>
  );
}
