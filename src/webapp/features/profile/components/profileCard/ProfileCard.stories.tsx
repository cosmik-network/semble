import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import type { User } from '@semble/types';
import { Badge } from '@mantine/core';
import ProfileCard from './ProfileCard';
import ProfileCardSkeleton from './Skeleton.ProfileCard';

const baseProfile: User = {
  id: 'did:plc:abc123def456',
  name: 'Elena Kowalski',
  handle: 'elena.kowalski',
  avatarUrl: 'https://i.pravatar.cc/150?u=elena',
  description: 'Researcher & collector of interesting things on the web.',
  followerCount: 342,
  followingCount: 89,
  followsYou: false,
};

const meta: Meta<typeof ProfileCard> = {
  title: 'Features/Profile/ProfileCard',
  component: ProfileCard,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 360 }}>
        <Story />
      </div>
    ),
  ],
  args: {
    profile: baseProfile,
  },
};

export default meta;

type Story = StoryObj<typeof ProfileCard>;

/** Default profile card with avatar, name, handle and description. */
export const Default: Story = {};

/** Card showing when the profile was added, rendered as relative time. */
export const WithAddedAt: Story = {
  args: {
    addedAt: new Date(Date.now() - 1000 * 60 * 60 * 3).toISOString(), // 3 hours ago
  },
};

/** Badge shown when the profile follows the current user. */
export const FollowsYou: Story = {
  args: {
    profile: {
      ...baseProfile,
      followsYou: true,
    },
  },
};

/** Bot accounts display the robot icon label next to the name. */
export const BotAccount: Story = {
  args: {
    profile: {
      ...baseProfile,
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
    },
  },
};

/** Long descriptions are clamped to two lines. */
export const LongDescription: Story = {
  args: {
    profile: {
      ...baseProfile,
      description:
        'Frontend engineer by day, avid reader by night. I collect links about design systems, web performance, accessibility, TypeScript patterns, and anything else that makes the web a better place. Always happy to discuss tech, books, or coffee.',
    },
  },
};

/** Card with no avatar falls back to the Mantine Avatar placeholder. */
export const NoAvatar: Story = {
  args: {
    profile: {
      ...baseProfile,
      avatarUrl: undefined,
    },
  },
};

/** Additional content (e.g. a badge) can be passed as children. */
export const WithChildren: Story = {
  args: {
    children: (
      <Badge variant="light" color="blue">
        Mutual
      </Badge>
    ),
  },
};

export const Skeleton: Story = {
  render: () => <ProfileCardSkeleton />,
};
