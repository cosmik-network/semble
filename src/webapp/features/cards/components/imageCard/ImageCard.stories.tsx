import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CollectionAccessType } from '@semble/types';
import type { Collection } from '@semble/types';
import ImageCard from './ImageCard';
import { AuthContext } from '@/hooks/useAuth';
import type { AuthContextType } from '@/hooks/useAuth';

const mockAuthUser = {
  id: 'did:plc:mock123',
  name: 'Test User',
  handle: 'test.user',
  avatarUrl: 'https://i.pravatar.cc/150?u=testuser',
};

const mockAuthValue: AuthContextType = {
  user: mockAuthUser as any,
  isAuthenticated: true,
  isLoading: false,
  refreshAuth: async () => {},
  logout: async () => {},
};

const cardAuthor = {
  id: 'did:plc:author456',
  name: 'Jane Researcher',
  handle: 'jane.researcher',
  avatarUrl: 'https://i.pravatar.cc/150?u=jane',
  description: 'Science writer and open-access advocate.',
  followerCount: 214,
  followingCount: 63,
};

const baseCollection: Collection = {
  id: 'col-story-001',
  uri: 'at://did:plc:colauthor789/app.semble.collection/3juzt2xkr5c2a',
  name: 'Photography Inspiration',
  author: {
    id: 'did:plc:colauthor789',
    name: 'Alex Curator',
    handle: 'alex.curator',
    avatarUrl: 'https://i.pravatar.cc/150?u=alex',
  },
  description: 'A curated collection of inspiring photography.',
  accessType: CollectionAccessType.CLOSED,
  cardCount: 18,
  createdAt: '2024-09-15T12:00:00.000Z',
  updatedAt: '2025-06-20T09:30:00.000Z',
  isFollowing: false,
  followerCount: 31,
};

const baseCardContent = {
  url: 'https://example.com/photo-1',
  title: 'Golden Hour Over the Mountains',
  description: 'A breathtaking landscape captured during golden hour.',
  imageUrl: 'https://picsum.photos/seed/imagecard1/800/600',
  siteName: 'Unsplash',
  type: 'article',
  retrievedAt: '2025-06-01T10:00:00.000Z',
};

const meta: Meta<typeof ImageCard> = {
  title: 'Features/Cards/ImageCard',
  component: ImageCard,
  decorators: [
    (Story) => (
      <AuthContext.Provider value={mockAuthValue}>
        <div style={{ maxWidth: 360 }}>
          <Story />
        </div>
      </AuthContext.Provider>
    ),
  ],
  args: {
    id: 'card-img-001',
    cardContent: baseCardContent,
    urlLibraryCount: 5,
    urlIsInLibrary: false,
    urlConnectionCount: 2,
    urlIsConnected: false,
  },
};

export default meta;

type Story = StoryObj<typeof ImageCard>;

export const Default: Story = {};

export const LongTitle: Story = {
  args: {
    id: 'card-img-longtitle',
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/photo-long-title',
      title:
        'An Incredibly Long Title That Should Be Truncated After Two Lines Because It Contains Way Too Much Text For a Card Header',
      imageUrl: 'https://picsum.photos/seed/imagecard-long/800/600',
    },
  },
};

export const InLibrary: Story = {
  args: {
    id: 'card-img-library',
    urlIsInLibrary: true,
    urlLibraryCount: 42,
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/photo-library',
      title: 'Misty Forest Path',
      imageUrl: 'https://picsum.photos/seed/imagecard2/800/1000',
      siteName: 'Pexels',
    },
  },
};

export const Connected: Story = {
  args: {
    id: 'card-img-connected',
    urlIsConnected: true,
    urlConnectionCount: 8,
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/photo-connected',
      title: 'Urban Architecture at Night',
      imageUrl: 'https://picsum.photos/seed/imagecard3/800/500',
      siteName: 'Flickr',
    },
  },
};

export const WithNote: Story = {
  args: {
    id: 'card-img-note',
    note: {
      id: 'note-img-001',
      text: 'Love the composition in this shot. The leading lines draw you right into the frame.',
    },
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/photo-noted',
      title: 'Desert Dunes at Sunset',
      imageUrl: 'https://picsum.photos/seed/imagecard4/800/600',
    },
  },
};

export const WithCollection: Story = {
  args: {
    id: 'card-img-collection',
    currentCollection: baseCollection,
    cardAuthor: cardAuthor,
    authorHandle: cardAuthor.handle,
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/photo-collection',
      title: 'Coastal Cliffs of Ireland',
      imageUrl: 'https://picsum.photos/seed/imagecard5/800/550',
      siteName: 'National Geographic',
    },
  },
};

export const HighCounts: Story = {
  args: {
    id: 'card-img-highcounts',
    urlLibraryCount: 1523,
    urlIsInLibrary: true,
    urlConnectionCount: 347,
    urlIsConnected: true,
    cardAuthor: cardAuthor,
    authorHandle: cardAuthor.handle,
    note: {
      id: 'note-img-002',
      text: 'One of the most shared images on the platform. The colors are unreal.',
    },
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/photo-viral',
      title: 'Aurora Borealis Over Iceland',
      imageUrl: 'https://picsum.photos/seed/imagecard6/800/600',
      siteName: 'Earth Porn',
    },
  },
};

export const WideImage: Story = {
  args: {
    id: 'card-img-wide',
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/photo-panoramic',
      title: 'Panoramic View of the Grand Canyon',
      imageUrl: 'https://picsum.photos/seed/imagecard7/1200/400',
      siteName: 'Panoramics',
    },
  },
};

export const TallImage: Story = {
  args: {
    id: 'card-img-tall',
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/photo-portrait',
      title: 'Narrow Alley in Venice',
      imageUrl: 'https://picsum.photos/seed/imagecard8/400/900',
      siteName: 'Travel Blog',
    },
  },
};
