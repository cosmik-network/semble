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

interface Props {
  identifier: string;
  profileName: string;
  handle: string;
}

export default function FollowingCollectionsContainer({
  identifier,
  profileName,
  handle,
}: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useFollowingCollections({ identifier });

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];
  const collectionCount = allCollections.length;

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
        <Stack gap={0}>
          <Title order={2}>{profileName}</Title>
          <Text c="gray" size="lg">
            {collectionCount} Collection Following
          </Text>
        </Stack>

        {allCollections.length === 0 ? (
          <Center>
            <Text fz="h3" fw={600} c="gray">
              Not following any collections yet
            </Text>
          </Center>
        ) : (
          <InfiniteScroll
            dataLength={allCollections.length}
            hasMore={!!hasNextPage}
            isInitialLoading={isPending}
            isLoading={isFetchingNextPage}
            loadMore={fetchNextPage}
          >
            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
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
