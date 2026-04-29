import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { CollectionAccessType, CardSortField, SortOrder } from '@semble/types';
import type { Collection, GetCollectionPageResponse } from '@semble/types';
import CollectionCard from './CollectionCard';
import { collectionKeys } from '../../lib/collectionKeys';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

const baseAuthor = {
  id: 'did:plc:abc123def456',
  name: 'Elena Kowalski',
  handle: 'elena.kowalski',
  avatarUrl: 'https://i.pravatar.cc/150?u=elena',
  description: 'Researcher & collector of interesting things.',
  followerCount: 342,
  followingCount: 89,
};

const baseCollection: Collection = {
  id: 'col-001',
  uri: 'at://did:plc:abc123def456/app.semble.collection/3juzt2xkr5c2a',
  name: 'Design Systems Reference',
  author: baseAuthor,
  description:
    'A curated set of resources on building scalable design systems, component libraries, and style guides.',
  accessType: CollectionAccessType.CLOSED,
  cardCount: 18,
  createdAt: '2024-11-02T10:30:00.000Z',
  updatedAt: '2025-06-14T08:45:00.000Z',
  isFollowing: false,
  followerCount: 27,
};

const mockUrlCards = [
  {
    id: 'card-1',
    cardContent: {
      url: 'https://designsystems.com/guide',
      title: 'Design Systems Handbook',
      description: 'A comprehensive guide to building design systems.',
      imageUrl: 'https://picsum.photos/seed/ds1/400/225',
    },
  },
  {
    id: 'card-2',
    cardContent: {
      url: 'https://component.gallery',
      title: 'Component Gallery',
      description: 'Collection of component design examples.',
      imageUrl: 'https://picsum.photos/seed/ds2/400/225',
    },
  },
  {
    id: 'card-3',
    cardContent: {
      url: 'https://tokens.studio',
      title: 'Design Tokens Studio',
      description: 'Manage your design tokens.',
      imageUrl: 'https://picsum.photos/seed/ds3/400/225',
    },
  },
  {
    id: 'card-4',
    cardContent: {
      url: 'https://storybook.js.org',
      title: 'Storybook',
      description: 'UI component explorer for frontend developers.',
      imageUrl: 'https://picsum.photos/seed/ds4/400/225',
    },
  },
];

function buildMockCollectionPage(
  collection: Collection,
): GetCollectionPageResponse {
  const cards = mockUrlCards.slice(0, Math.min(collection.cardCount, 4));
  return {
    ...collection,
    urlCards: cards as unknown as GetCollectionPageResponse['urlCards'],
    pagination: {
      currentPage: 1,
      totalPages: 1,
      totalCount: cards.length,
      hasMore: false,
      limit: 4,
    },
    sorting: {
      sortBy: CardSortField.CREATED_AT,
      sortOrder: SortOrder.DESC,
    },
  };
}

function getRecordKey(uri: string) {
  return uri.split('/').pop() ?? '';
}

/**
 * Decorator that seeds the TanStack Query cache with mock collection page data
 * so that CollectionCardPreview renders without making real API calls.
 */
function QueryCacheSeed({
  collection,
  children,
}: {
  collection: Collection;
  children: React.ReactNode;
}) {
  const queryClient = useQueryClient();
  const rkey = getRecordKey(collection.uri!!);

  useEffect(() => {
    const queryKey = collectionKeys.infinite(rkey, 4);

    queryClient.setQueryData(queryKey, {
      pages: [buildMockCollectionPage(collection)],
      pageParams: [1],
    });
  }, [queryClient, rkey, collection]);

  return <>{children}</>;
}

const meta: Meta<typeof CollectionCard> = {
  title: 'Features/Collections/CollectionCard',
  component: CollectionCard,
  decorators: [
    (Story, context) => (
      <QueryCacheSeed collection={context.args.collection}>
        <Story />
      </QueryCacheSeed>
    ),
  ],
  args: {
    collection: baseCollection,
  },
};

export default meta;

type Story = StoryObj<typeof CollectionCard>;

export const Default: Story = {};

export const OpenCollection: Story = {
  args: {
    collection: {
      ...baseCollection,
      id: 'col-002',
      name: 'Open Source Toolbox',
      description: 'Community-maintained list of open-source dev tools.',
      accessType: CollectionAccessType.OPEN,
      cardCount: 42,
      followerCount: 156,
    },
  },
};

export const WithAuthor: Story = {
  args: {
    showAuthor: true,
    collection: {
      ...baseCollection,
      id: 'col-003',
      name: 'Typography Deep Dives',
      description: 'Articles and references about type design and web fonts.',
      cardCount: 9,
    },
  },
};

export const NoDescription: Story = {
  args: {
    collection: {
      ...baseCollection,
      id: 'col-004',
      name: 'Unsorted Bookmarks',
      description: undefined,
      cardCount: 5,
    },
  },
};

export const ManyCards: Story = {
  args: {
    collection: {
      ...baseCollection,
      id: 'col-005',
      name: 'Frontend Ecosystem Archive',
      description:
        'Exhaustive collection of frameworks, libraries, patterns, and everything frontend.',
      cardCount: 1234,
      followerCount: 891,
    },
  },
};

export const SingleCard: Story = {
  args: {
    collection: {
      ...baseCollection,
      id: 'col-006',
      name: 'Getting Started',
      description: 'Just one card so far.',
      cardCount: 1,
      followerCount: 0,
    },
  },
};

export const Empty: Story = {
  args: {
    collection: {
      ...baseCollection,
      id: 'col-007',
      name: 'New Collection',
      description: '',
      cardCount: 0,
      followerCount: 0,
    },
  },
};
