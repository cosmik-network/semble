import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { User } from '@semble/types';
import { Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Text } from '@mantine/core';
import ProfileHoverCard from './ProfileHoverCard';
import { profileKeys } from '../../lib/profileKeys';

const HANDLE = 'elena.kowalski';

const mockProfile: User = {
  id: 'did:plc:abc123def456',
  name: 'Elena Kowalski',
  handle: HANDLE,
  avatarUrl: 'https://i.pravatar.cc/150?u=elena',
  description: 'Researcher & collector of interesting things on the web.',
  followerCount: 342,
  followingCount: 89,
  followedCollectionsCount: 17,
  urlCardCount: 58,
  collectionCount: 6,
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

const meta: Meta<typeof ProfileHoverCard> = {
  title: 'Features/Profile/ProfileHoverCard',
  component: ProfileHoverCard,
  decorators: [
    (Story) => (
      <QueryCacheSeed profile={mockProfile}>
        <Suspense>
          <Story />
        </Suspense>
      </QueryCacheSeed>
    ),
  ],
  args: {
    didOrHandle: HANDLE,
    children: <Text style={{ cursor: 'pointer' }}>@{HANDLE}</Text>,
  },
};

export default meta;

type Story = StoryObj<typeof ProfileHoverCard>;

/** Hover over the handle to see the profile card dropdown. */
export const Default: Story = {};

/** Bot account label is shown next to the name. */
export const BotAccount: Story = {
  args: {
    didOrHandle: 'bot.semble',
    children: <Text style={{ cursor: 'pointer' }}>@bot.semble</Text>,
  },
  decorators: [
    (Story) => (
      <QueryCacheSeed
        profile={{
          ...mockProfile,
          id: 'did:plc:bot999',
          name: 'Semble Bot',
          handle: 'bot.semble',
          avatarUrl: 'https://i.pravatar.cc/150?u=bot',
          description: 'An automated bot that curates content.',
          labels: [
            {
              val: 'bot',
              src: 'did:plc:bot999',
              uri: 'did:plc:bot999',
              cts: '2024-01-01T00:00:00.000Z',
            },
          ],
        }}
      >
        <Suspense>
          <Story />
        </Suspense>
      </QueryCacheSeed>
    ),
  ],
};

/** Profile with no description. */
export const NoDescription: Story = {
  args: {
    didOrHandle: 'minimal.user',
    children: <Text style={{ cursor: 'pointer' }}>@minimal.user</Text>,
  },
  decorators: [
    (Story) => (
      <QueryCacheSeed
        profile={{
          ...mockProfile,
          handle: 'minimal.user',
          description: undefined,
        }}
      >
        <Suspense>
          <Story />
        </Suspense>
      </QueryCacheSeed>
    ),
  ],
};
