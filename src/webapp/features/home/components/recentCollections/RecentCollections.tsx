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
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { LinkButton } from '@/components/link/MantineLink';

type CollectionFilter = 'mine' | 'following' | 'contributed';

function CollectionsListSkeleton() {
  return (
    <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
      {Array.from({ length: 4 }).map((_, i) => (
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
  settings: ReturnType<typeof useUserSettings>['settings'];
}) {
  const { data: collectionsData } = useMyCollections({ limit: 4 });
  const collections =
    collectionsData.pages.flatMap((page) => page.collections) ?? [];

  if (collections.length === 0) {
    return (
      <Stack align="center" gap="xs">
        <Text fz="h3" fw={600} c="gray">
          No collections
        </Text>
        <Button
          onClick={onCreateCollection}
          variant="light"
          color="gray"
          size="md"
          rightSection={<FiPlus size={22} />}
        >
          Create your first collection
        </Button>
      </Stack>
    );
  }

  return (
    <SimpleGrid
      cols={
        settings.collectionView !== 'grid'
          ? { base: 1 }
          : { base: 1, sm: 2, lg: 4 }
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
  settings: ReturnType<typeof useUserSettings>['settings'];
}) {
  const { data: collectionsData } = useFollowingCollections({
    identifier,
    limit: 4,
  });
  const collections =
    collectionsData.pages.flatMap((page) => page.collections) ?? [];

  if (collections.length === 0) {
    return (
      <Stack align="center" gap="xs">
        <Text fz="h3" fw={600} c="gray">
          Not following any collections
        </Text>
      </Stack>
    );
  }

  return (
    <SimpleGrid
      cols={
        settings.collectionView !== 'grid'
          ? { base: 1 }
          : { base: 1, sm: 2, lg: 4 }
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
  settings: ReturnType<typeof useUserSettings>['settings'];
}) {
  const { data: collectionsData } = useOpenCollectionsWithContributor({
    identifier,
    limit: 4,
  });
  const collections =
    collectionsData.pages.flatMap((page) => page.collections) ?? [];

  if (collections.length === 0) {
    return (
      <Stack align="center" gap="xs">
        <Text fz="h3" fw={600} c="gray">
          No collections contributed to
        </Text>
      </Stack>
    );
  }

  return (
    <SimpleGrid
      cols={
        settings.collectionView !== 'grid'
          ? { base: 1 }
          : { base: 1, sm: 2, lg: 4 }
      }
      spacing="xs"
    >
      {collections.map((collection) => (
        <CollectionCard key={collection.id} collection={collection} />
      ))}
    </SimpleGrid>
  );
}

export default function RecentCollections() {
  const { settings } = useUserSettings();
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
          {filter === 'mine' && (
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
          )}
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
          onClick={() => setFilter('mine')}
        >
          Mine
        </Button>
        <Button
          variant={filter === 'following' ? 'filled' : 'light'}
          color="gray"
          size="xs"
          onClick={() => setFilter('following')}
        >
          Following
        </Button>
        <Button
          variant={filter === 'contributed' ? 'filled' : 'light'}
          color="gray"
          size="xs"
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
