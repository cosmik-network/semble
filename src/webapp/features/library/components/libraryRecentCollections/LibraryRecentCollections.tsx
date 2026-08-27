'use client';

import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import CollectionCardSkeleton from '@/features/collections/components/collectionCard/Skeleton.CollectionCard';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';
import useMyCollections from '@/features/collections/lib/queries/useMyCollections';
import useOpenCollectionsWithContributor from '@/features/collections/lib/queries/useOpenCollectionsWithContributor';
import useFollowingCollections from '@/features/follows/lib/queries/useFollowingCollections';
import useMyProfile from '@/features/profile/lib/queries/useMyProfile';
import {
  Stack,
  Button,
  Text,
  SimpleGrid,
  Group,
  Title,
  ActionIcon,
} from '@mantine/core';
import { Suspense, useState } from 'react';
import { BiCollection } from 'react-icons/bi';
import { FiPlus } from 'react-icons/fi';
import { UserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { useSettings } from '@/providers/settings';
import { LinkButton } from '@/components/link/MantineLink';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';

type CollectionFilter = 'mine' | 'following' | 'contributed';

function CollectionsListSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xs">
      {Array.from({ length: 3 }).map((_, i) => (
        <CollectionCardSkeleton key={i} />
      ))}
    </SimpleGrid>
  );
}

function MyCollectionsList({
  onCreateCollection,
  settings,
}: {
  onCreateCollection: () => void;
  settings: UserSettings;
}) {
  const { data: collectionsData } = useMyCollections({ limit: 3 });
  const collections =
    collectionsData.pages.flatMap((page) => page.collections) ?? [];

  if (collections.length === 0) {
    return (
      <EmptyState
        icon={BiCollection}
        message="No collections"
        button={
          <Button
            onClick={onCreateCollection}
            variant="light"
            color="gray"
            size="md"
            rightSection={<FiPlus size={22} />}
          >
            Create your first collection
          </Button>
        }
      />
    );
  }

  return (
    <SimpleGrid
      cols={
        settings.collectionView !== 'grid'
          ? { base: 1 }
          : { base: 1, sm: 2, lg: 3 }
      }
      spacing="xs"
    >
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </SimpleGrid>
  );
}

function FollowingCollectionsList({
  identifier,
  settings,
}: {
  identifier: string;
  settings: UserSettings;
}) {
  const { data: collectionsData } = useFollowingCollections({
    identifier,
    limit: 3,
  });
  const collections =
    collectionsData.pages.flatMap((page) => page.collections) ?? [];

  if (collections.length === 0) {
    return (
      <EmptyState icon={BiCollection} message="Not following any collections" />
    );
  }

  return (
    <SimpleGrid
      cols={
        settings.collectionView !== 'grid'
          ? { base: 1 }
          : { base: 1, sm: 2, lg: 3 }
      }
      spacing="xs"
    >
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </SimpleGrid>
  );
}

function ContributedCollectionsList({
  identifier,
  settings,
}: {
  identifier: string;
  settings: UserSettings;
}) {
  const { data: collectionsData } = useOpenCollectionsWithContributor({
    identifier,
    limit: 3,
  });
  const collections =
    collectionsData.pages.flatMap((page) => page.collections) ?? [];

  if (collections.length === 0) {
    return (
      <EmptyState icon={BiCollection} message="No collections contributed to" />
    );
  }

  return (
    <SimpleGrid
      cols={
        settings.collectionView !== 'grid'
          ? { base: 1 }
          : { base: 1, sm: 2, lg: 3 }
      }
      spacing="xs"
    >
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </SimpleGrid>
  );
}

export default function LibraryRecentCollections() {
  const { settings } = useSettings();
  const [showCollectionDrawer, setShowCollectionDrawer] = useState(false);
  const [filter, setFilter] = useState<CollectionFilter>('mine');
  const { data: profile } = useMyProfile();

  const viewAllHref = {
    mine: `/profile/${profile.handle}/collections`,
    following: `/profile/${profile.handle}/network/collections-following`,
    contributed: `/profile/${profile.handle}/network/contributed-to`,
  }[filter];

  return (
    <Stack>
      <Group justify="space-between">
        <Group gap="xs">
          <BiCollection size={22} />
          <Title order={2}>Collections</Title>
        </Group>
        <Group gap="xs">
          <ActionIcon
            variant="light"
            color="blue"
            size={38}
            radius={'xl'}
            onClick={() => setShowCollectionDrawer(true)}
            aria-label="Create collection"
          >
            <FiPlus size={18} />
          </ActionIcon>
          <LinkButton variant="light" color="blue" href={viewAllHref}>
            View all
          </LinkButton>
        </Group>
      </Group>

      <Group gap={'xs'}>
        <Button
          variant={filter === 'mine' ? 'filled' : 'light'}
          color="gray"
          size="xs"
          radius={'md'}
          onClick={() => setFilter('mine')}
        >
          My Collections
        </Button>
        <Button
          variant={filter === 'following' ? 'filled' : 'light'}
          color="gray"
          size="xs"
          radius={'md'}
          onClick={() => setFilter('following')}
        >
          Following
        </Button>
        <Button
          variant={filter === 'contributed' ? 'filled' : 'light'}
          color="gray"
          size="xs"
          radius={'md'}
          onClick={() => setFilter('contributed')}
        >
          Contributed to
        </Button>
      </Group>

      <Suspense fallback={<CollectionsListSkeleton />}>
        {filter === 'mine' && (
          <MyCollectionsList
            onCreateCollection={() => setShowCollectionDrawer(true)}
            settings={settings}
          />
        )}
        {filter === 'following' && (
          <FollowingCollectionsList
            identifier={profile.handle}
            settings={settings}
          />
        )}
        {filter === 'contributed' && (
          <ContributedCollectionsList
            identifier={profile.handle}
            settings={settings}
          />
        )}
      </Suspense>

      <CreateCollectionDrawer
        isOpen={showCollectionDrawer}
        onClose={() => setShowCollectionDrawer(false)}
      />
    </Stack>
  );
}
