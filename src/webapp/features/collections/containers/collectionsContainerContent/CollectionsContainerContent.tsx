import { Container, Stack, SimpleGrid } from '@mantine/core';
import useCollections from '../../lib/queries/useCollections';
import CollectionCard from '../../components/collectionCard/CollectionCard';
import CreateCollectionDrawer from '../../components/createCollectionDrawer/CreateCollectionDrawer';
import { Fragment, useState } from 'react';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';
import { BiCollection } from 'react-icons/bi';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { CollectionSortField } from '@semble/types';

interface Props {
  handle: string;
  sortBy?: CollectionSortField;
  query?: string;
}

export default function CollectionsContainerContent(props: Props) {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCollections({
      didOrHandle: props.handle,
      sortBy: props.sortBy,
      query: props.query,
    });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const collections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (collections.length === 0) {
    return (
      <Container px="xs" py={'xl'} size="xl">
        <ProfileEmptyTab
          message={
            props.query
              ? `No collections found for "${props.query}"`
              : 'No collections'
          }
          icon={BiCollection}
        />
      </Container>
    );
  }

  return (
    <Fragment>
      <Stack>
        <InfiniteScroll
          dataLength={collections.length}
          hasMore={!!hasNextPage}
          isInitialLoading={false}
          isLoading={isFetchingNextPage}
          loadMore={fetchNextPage}
        >
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="xs">
            {collections.map((collection) => (
              <CollectionCard key={collection.id} collection={collection} />
            ))}
          </SimpleGrid>
        </InfiniteScroll>
      </Stack>

      <CreateCollectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </Fragment>
  );
}
