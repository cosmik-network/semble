import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CollectionAccessType } from '@semble/types';
import type { Collection } from '@semble/types';
import UrlCard from './UrlCard';
import UrlCardSkeleton from './Skeleton.UrlCard';
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

const collectionAuthor = {
  id: 'did:plc:colauthor789',
  name: 'Alex Curator',
  handle: 'alex.curator',
  avatarUrl: 'https://i.pravatar.cc/150?u=alex',
};

const baseCollection: Collection = {
  id: 'col-story-001',
  uri: 'at://did:plc:colauthor789/app.semble.collection/3juzt2xkr5c2a',
  name: 'Web Development Resources',
  author: collectionAuthor,
  description: 'A curated set of useful web development articles and tools.',
  accessType: CollectionAccessType.CLOSED,
  cardCount: 24,
  createdAt: '2024-09-15T12:00:00.000Z',
  updatedAt: '2025-06-20T09:30:00.000Z',
  isFollowing: false,
  followerCount: 42,
};

const baseCardContent = {
  url: 'https://example.com/understanding-design-tokens',
  title: 'Understanding Design Tokens: A Practical Guide',
  description:
    'Design tokens are the atoms of a design system — small, named entities that store visual-design decisions such as color, typography, and spacing.',
  imageUrl: 'https://picsum.photos/seed/urlcard1/400/225',
  siteName: 'Example Blog',
  type: 'article',
  retrievedAt: '2025-06-01T10:00:00.000Z',
};

const meta: Meta<typeof UrlCard> = {
  title: 'Features/Cards/UrlCard',
  component: UrlCard,
  decorators: [
    (Story) => (
      <AuthContext.Provider value={mockAuthValue}>
        <div style={{ maxWidth: 400 }}>
          <Story />
        </div>
      </AuthContext.Provider>
    ),
  ],
  args: {
    id: 'card-default-001',
    url: 'https://example.com/understanding-design-tokens',
    uri: 'at://did:plc:author456/app.semble.card/3k1abc',
    cardContent: baseCardContent,
    urlLibraryCount: 5,
    urlIsInLibrary: false,
    urlConnectionCount: 2,
    urlIsConnected: false,
    showAuthor: false,
  },
};

export default meta;

type Story = StoryObj<typeof UrlCard>;

export const Default: Story = {};

export const WithContributor: Story = {
  args: {
    id: 'card-author-002',
    showAuthor: true,
    cardAuthor: cardAuthor,
    authorHandle: cardAuthor.handle,
  },
};

export const WithNote: Story = {
  args: {
    id: 'card-note-003',
    note: {
      id: 'note-001',
      text: 'This is an excellent primer on design tokens. Highly recommend reading the section on naming conventions — it changed how I structure my own token files.',
    },
  },
};

export const InLibrary: Story = {
  args: {
    id: 'card-library-004',
    urlIsInLibrary: true,
    urlLibraryCount: 37,
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/state-of-css-2025',
      title: 'State of CSS 2025 Survey Results',
      description:
        'An overview of the most popular CSS features, frameworks, and tools according to thousands of developers worldwide.',
      imageUrl: 'https://picsum.photos/seed/urlcard2/400/225',
      siteName: 'State of CSS',
    },
  },
};

export const Connected: Story = {
  args: {
    id: 'card-connected-005',
    urlIsConnected: true,
    urlConnectionCount: 12,
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/react-server-components',
      title: 'React Server Components Explained',
      description:
        'A deep dive into how React Server Components work under the hood, when to use them, and common pitfalls to avoid.',
      imageUrl: 'https://picsum.photos/seed/urlcard3/400/225',
      siteName: 'React Blog',
    },
  },
};

export const WithCollection: Story = {
  args: {
    id: 'card-collection-006',
    currentCollection: baseCollection,
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/responsive-layout-patterns',
      title: 'Modern Responsive Layout Patterns',
      description:
        'Move beyond media queries. Learn how to build truly fluid layouts using CSS Grid, Container Queries, and clamp().',
      imageUrl: 'https://picsum.photos/seed/urlcard4/400/225',
      siteName: 'CSS Tricks',
    },
  },
};

export const HighCounts: Story = {
  args: {
    id: 'card-highcounts-007',
    urlLibraryCount: 2847,
    urlIsInLibrary: true,
    urlConnectionCount: 593,
    urlIsConnected: true,
    showAuthor: true,
    cardAuthor: cardAuthor,
    authorHandle: cardAuthor.handle,
    cardContent: {
      ...baseCardContent,
      url: 'https://example.com/attention-is-all-you-need',
      title: 'Attention Is All You Need',
      description:
        'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks that include an encoder and a decoder.',
      imageUrl: 'https://picsum.photos/seed/urlcard5/400/225',
      siteName: 'arXiv',
      author: 'Vaswani et al.',
    },
    note: {
      id: 'note-002',
      text: 'The foundational transformer paper. Still worth re-reading every few months.',
    },
  },
};

export const Skeleton: Story = {
  render: () => <UrlCardSkeleton />,
};
