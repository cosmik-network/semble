'use client';

import { Container, Stack, SimpleGrid } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { FollowSource } from '@/features/analytics/types';
import { useSettings } from '@/providers/settings';
import useOpenCollectionsWithContributor from '@/features/collections/lib/queries/useOpenCollectionsWithContributor';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { BiCollection } from 'react-icons/bi';

interface Props {
  handle: string;
}

export default function ContributedToCollectionsContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useOpenCollectionsWithContributor({ identifier: props.handle });

  const { settings } = useSettings();
  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  return (
    <Container p="xs" size="xl">
      <Stack>
        {allCollections.length === 0 ? (
          <EmptyState
            icon={BiCollection}
            message="No contributions to open collections... yet"
          />
        ) : (
          <InfiniteScroll
            dataLength={allCollections.length}
            hasMore={!!hasNextPage}
            isInitialLoading={false}
            isLoading={isFetchingNextPage}
            loadMore={fetchNextPage}
          >
            <SimpleGrid
              cols={
                settings.collectionView !== 'grid'
                  ? { base: 1 }
                  : { base: 1, sm: 2, lg: 3 }
              }
              spacing="xs"
            >
              {allCollections.map((collection) => (
                <CollectionCard
                  key={collection.id}
                  collection={collection}
                  showAuthor
                  followSource={FollowSource.PROFILE_NETWORK}
                />
              ))}
            </SimpleGrid>
          </InfiniteScroll>
        )}
      </Stack>
    </Container>
  );
}
