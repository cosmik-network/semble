'use client';

import { Container, Stack, Text, Center, SimpleGrid } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import useOpenCollectionsWithContributor from '@/features/collections/lib/queries/useOpenCollectionsWithContributor';

interface Props {
  handle: string;
}

export default function ContributedToCollectionsContainer(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useOpenCollectionsWithContributor({ identifier: props.handle });

  const { settings } = useUserSettings();
  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  return (
    <Container p="xs" size="xl">
      <Stack>
        {allCollections.length === 0 ? (
          <Center>
            <Text fz="h3" fw={600} c="gray">
              No contributions to open collections... yet
            </Text>
          </Center>
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
                  : { base: 1, sm: 2, lg: 4 }
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
