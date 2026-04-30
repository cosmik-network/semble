import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { User } from '@semble/types';
import { Suspense, useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Skeleton as MantineSkeleton } from '@mantine/core';
import ProfileMenu from './ProfileMenu';
import { profileKeys } from '../../lib/profileKeys';
import { AuthContext, type AuthContextType } from '@/hooks/useAuth';

const mockProfile: User = {
  id: 'did:plc:abc123def456',
  name: 'Elena Kowalski',
  handle: 'elena.kowalski',
  avatarUrl: 'https://i.pravatar.cc/150?u=elena',
};

const mockAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: true,
  isLoading: false,
  refreshAuth: async () => {},
  logout: async () => {},
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
    queryClient.setQueryData(profileKeys.mine(), profile);
  }, [queryClient, profile]);

  return <>{children}</>;
}

const meta: Meta<typeof ProfileMenu> = {
  title: 'Features/Profile/ProfileMenu',
  component: ProfileMenu,
  decorators: [
    (Story) => (
      <AuthContext.Provider value={mockAuthContext}>
        <QueryCacheSeed profile={mockProfile}>
          <Suspense
            fallback={<MantineSkeleton w={38} h={38} radius="md" ml={4} />}
          >
            <div style={{ maxWidth: 280 }}>
              <Story />
            </div>
          </Suspense>
        </QueryCacheSeed>
      </AuthContext.Provider>
    ),
  ],
};

export default meta;

type Story = StoryObj<typeof ProfileMenu>;

/** Collapsed menu trigger shown in the navbar footer. Click to open. */
export const Default: Story = {};

/** Bot accounts show the robot icon next to the name. */
export const BotAccount: Story = {
  decorators: [
    (Story) => (
      <AuthContext.Provider value={mockAuthContext}>
        <QueryCacheSeed
          profile={{
            ...mockProfile,
            id: 'did:plc:bot999',
            name: 'Semble Bot',
            handle: 'bot.semble',
            avatarUrl: 'https://i.pravatar.cc/150?u=bot',
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
          <Suspense
            fallback={<MantineSkeleton w={38} h={38} radius="md" ml={4} />}
          >
            <div style={{ maxWidth: 280 }}>
              <Story />
            </div>
          </Suspense>
        </QueryCacheSeed>
      </AuthContext.Provider>
    ),
  ],
};

/** Skeleton shown while the profile data is loading. */
export const Skeleton: Story = {
  render: () => <MantineSkeleton w={38} h={38} radius="md" ml={4} />,
};
