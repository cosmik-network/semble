'use client';

import { Container, Stack, SimpleGrid } from '@mantine/core';
import useCollections from '../../lib/queries/useCollections';
import CollectionCard from '../../components/collectionCard/CollectionCard';
import { FollowSource } from '@/features/analytics/types';
import CreateCollectionDrawer from '../../components/createCollectionDrawer/CreateCollectionDrawer';
import { Fragment, useState } from 'react';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { BiCollection } from 'react-icons/bi';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { CollectionSortField } from '@semble/types';
import { useSettings } from '@/providers/settings';
import { useSearchParams } from 'next/navigation';

interface Props {
  handle: string;
  query?: string;
}

export default function CollectionsContainerContent(props: Props) {
  const searchParams = useSearchParams();
  const sortBy =
    (searchParams.get('collectionSort') as CollectionSortField) ??
    CollectionSortField.UPDATED_AT;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCollections({
      didOrHandle: props.handle,
      sortBy,
      query: props.query,
    });

  const { settings } = useSettings();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const collections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (collections.length === 0) {
    return (
      <Container px="xs" py={'xl'} size="xl">
        <EmptyState message="No collections" icon={BiCollection} />
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
          <SimpleGrid
            cols={
              settings.collectionView !== 'grid'
                ? { base: 1 }
                : { base: 1, sm: 2, lg: 3 }
            }
            spacing="xs"
          >
            {collections.map((collection) => (
              <CollectionCard
                key={collection.id}
                collection={collection}
                followSource={FollowSource.PROFILE_PAGE}
              />
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
