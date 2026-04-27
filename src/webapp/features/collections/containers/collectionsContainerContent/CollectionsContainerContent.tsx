'use client';

import { Container, Stack, SimpleGrid } from '@mantine/core';
import useCollections from '../../lib/queries/useCollections';
import CollectionCard from '../../components/collectionCard/CollectionCard';
import CreateCollectionDrawer from '../../components/createCollectionDrawer/CreateCollectionDrawer';
import { Fragment, useState } from 'react';
import ProfileEmptyTab from '@/features/profile/components/profileEmptyTab/ProfileEmptyTab';
import { BiCollection } from 'react-icons/bi';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { CollectionSortField } from '@semble/types';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
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

  const { settings } = useUserSettings();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const collections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  if (collections.length === 0) {
    return (
      <Container px="xs" py={'xl'} size="xl">
        <ProfileEmptyTab message="No collections" icon={BiCollection} />
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
                : { base: 1, sm: 2, lg: 4 }
            }
            spacing="xs"
          >
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
