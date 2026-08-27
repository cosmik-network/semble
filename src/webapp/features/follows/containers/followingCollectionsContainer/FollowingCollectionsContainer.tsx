'use client';

import {
  Container,
  Stack,
  Text,
  Center,
  SimpleGrid,
  Title,
} from '@mantine/core';
import useFollowingCollections from '../../lib/queries/useFollowingCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { useSettings } from '@/providers/settings';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { BiCollection } from 'react-icons/bi';

interface Props {
  handle: string;
}

export default function FollowingCollectionsContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useFollowingCollections({ identifier: props.handle });

  const { settings } = useSettings();
  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (isPending) {
    return (
      <Container p="xs" size="xl">
        <Center>
          <Text c="gray">Loading...</Text>
        </Center>
      </Container>
    );
  }

  return (
    <Container p="xs" size="xl">
      <Stack>
        {allCollections.length === 0 ? (
          <EmptyState
            icon={BiCollection}
            message="Not following any collections... yet"
          />
        ) : (
          <InfiniteScroll
            dataLength={allCollections.length}
            hasMore={!!hasNextPage}
            isInitialLoading={isPending}
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
                />
              ))}
            </SimpleGrid>
          </InfiniteScroll>
        )}
      </Stack>
    </Container>
  );
}
