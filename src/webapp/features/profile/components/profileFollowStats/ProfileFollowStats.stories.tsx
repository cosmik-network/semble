import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { User } from '@semble/types';
import { Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import ProfileFollowStats from './ProfileFollowStats';
import FollowStatsSkeleton from './Skeleton.FollowStats';
import { profileKeys } from '../../lib/profileKeys';

const HANDLE = 'elena.kowalski';

const mockProfile: User = {
  id: 'did:plc:abc123def456',
  name: 'Elena Kowalski',
  handle: HANDLE,
  avatarUrl: 'https://i.pravatar.cc/150?u=elena',
  followerCount: 342,
  followingCount: 89,
  followedCollectionsCount: 17,
};

function QueryCacheSeed({
  profile,
  children,
}: {
  profile: User;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();

  useEffect(() => {
    queryClient.setQueryData(profileKeys.profile(profile.handle), profile);
  }, [queryClient, profile]);

  return <>{children}</>;
}

const meta: Meta<typeof ProfileFollowStats> = {
  title: 'Features/Profile/ProfileFollowStats',
  component: ProfileFollowStats,
  decorators: [
    (Story) => (
      <QueryCacheSeed profile={mockProfile}>
        <Suspense fallback={<FollowStatsSkeleton />}>
          <Story />
        </Suspense>
      </QueryCacheSeed>
    ),
  ],
  args: {
    handle: HANDLE,
    initialFollowerCount: mockProfile.followerCount!,
    initialFollowingCount: mockProfile.followingCount!,
    initialFollowedCollectionsCount: mockProfile.followedCollectionsCount!,
  },
};

export default meta;

type Story = StoryObj<typeof ProfileFollowStats>;

/** Follow statistics row with follower, following and collections counts. */
export const Default: Story = {};

/** Singular "Follower" label when count is exactly one. */
export const SingleFollower: Story = {
  args: {
    handle: HANDLE,
    initialFollowerCount: 1,
    initialFollowingCount: 0,
    initialFollowedCollectionsCount: 0,
  },
  decorators: [
    (Story) => (
      <QueryCacheSeed
        profile={{ ...mockProfile, followerCount: 1, followingCount: 0, followedCollectionsCount: 0 }}
      >
        <Suspense fallback={<FollowStatsSkeleton />}>
          <Story />
        </Suspense>
      </QueryCacheSeed>
    ),
  ],
};

/** Skeleton placeholder shown while data loads. */
export const Skeleton: Story = {
  render: () => <FollowStatsSkeleton />,
};
