import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { User } from '@semble/types';
import { Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@mantine/core';
import ProfileTabs from './ProfileTabs';
import { profileKeys } from '../../lib/profileKeys';

const HANDLE = 'elena.kowalski';

const mockProfile: User = {
  id: 'did:plc:abc123def456',
  name: 'Elena Kowalski',
  handle: HANDLE,
  avatarUrl: 'https://i.pravatar.cc/150?u=elena',
  followerCount: 342,
  followingCount: 89,
  urlCardCount: 58,
  collectionCount: 6,
  connectionCount: 12,
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
    queryClient.setQueryData(
      profileKeys.profile(profile.handle, true),
      profile,
    );
  }, [queryClient, profile]);

  return <>{children}</>;
}

const meta: Meta<typeof ProfileTabs> = {
  title: 'Features/Profile/ProfileTabs',
  component: ProfileTabs,
  parameters: {
    nextjs: {
      navigation: {
        pathname: `/profile/${HANDLE}`,
      },
    },
  },
  decorators: [
    // Stories override the seeded profile through the `profile` parameter.
    (Story, context) => (
      <QueryCacheSeed
        profile={(context.parameters.profile as User) ?? mockProfile}
      >
        <Suspense fallback={<Skeleton h={42} />}>
          <Story />
        </Suspense>
      </QueryCacheSeed>
    ),
  ],
  args: {
    handle: HANDLE,
  },
};

export default meta;

type Story = StoryObj<typeof ProfileTabs>;

/** Tab bar on the Activity tab (default view). */
export const ActivityTab: Story = {};

/** Tab bar with the Cards tab active. */
export const CardsTab: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: `/profile/${HANDLE}/cards`,
      },
    },
  },
};

/** Tab bar with the Collections tab active. */
export const CollectionsTab: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: `/profile/${HANDLE}/collections`,
      },
    },
  },
};

/** Tab bar with the Connections tab active. */
export const ConnectionsTab: Story = {
  parameters: {
    nextjs: {
      navigation: {
        pathname: `/profile/${HANDLE}/connections`,
      },
    },
  },
};

/** A profile with nothing in it yet — zeroes render rather than disappearing. */
export const ZeroCounts: Story = {
  parameters: {
    profile: {
      ...mockProfile,
      urlCardCount: 0,
      collectionCount: 0,
      connectionCount: 0,
    },
  },
};
