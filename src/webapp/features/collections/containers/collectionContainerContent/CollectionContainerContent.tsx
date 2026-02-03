'use client';

import { useNavbarContext } from '@/providers/navbar';
import useCollection from '../../lib/queries/useCollection';
import { Fragment, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CardSortField, SortOrder, UrlType } from '@semble/types';
import { Anchor, Box, Button, Grid, Stack, Text } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import AddCardDrawer from '@/features/cards/components/addCardDrawer/AddCardDrawer';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';
import { useSearchParams } from 'next/navigation';

interface Props {
  rkey: string;
  handle: string;
  sortBy?: CardSortField;
  sortOrder?: SortOrder;
}

const sortOrderMap: Record<CardSortField, SortOrder> = {
  [CardSortField.UPDATED_AT]: SortOrder.DESC,
  [CardSortField.CREATED_AT]: SortOrder.ASC,
  [CardSortField.LIBRARY_COUNT]: SortOrder.DESC,
};

export default function CollectionContainerContent(props: Props) {
  const { desktopOpened } = useNavbarContext();
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const { user } = useAuth();

  const searchParams = useSearchParams();
  const selectedUrlType = searchParams.get('type') as UrlType;

  const sortBy =
    (searchParams.get('sort') as CardSortField) ?? CardSortField.UPDATED_AT;

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCollection({
      rkey: props.rkey,
      handle: props.handle,
      sortBy: sortBy,
      sortOrder: sortOrderMap[sortBy],
      urlType: selectedUrlType,
    });

  const firstPage = data.pages[0];
  const allCards = data.pages.flatMap((page) => page.urlCards ?? []);

  return (
    <Fragment>
      {allCards.length > 0 ? (
        <InfiniteScroll
          dataLength={allCards.length}
          hasMore={!!hasNextPage}
          isInitialLoading={isPending}
          isLoading={isFetchingNextPage}
          loadMore={fetchNextPage}
        >
          <Grid gutter="xs">
            {allCards.map((card) => (
              <Grid.Col
                key={card.id}
                span={{
                  base: 12,
                  xs: desktopOpened ? 12 : 6,
                  sm: desktopOpened ? 6 : 4,
                  md: 4,
                  lg: 3,
                }}
              >
                <UrlCard
                  id={card.id}
                  url={card.url}
                  uri={card.uri}
                  cardContent={card.cardContent}
                  authorHandle={firstPage.author.handle}
                  cardAuthor={firstPage.author}
                  note={card.note}
                  urlLibraryCount={card.urlLibraryCount}
                  urlIsInLibrary={card.urlInLibrary}
                  currentCollection={firstPage}
                  viaCardId={card.id}
                />
              </Grid.Col>
            ))}
          </Grid>
        </InfiniteScroll>
      ) : (
        <Stack align="center" gap="xs">
          <Text fz="h3" fw={600} c="gray">
            No {selectedUrlType} cards
          </Text>
          {!selectedUrlType && firstPage.author.handle == user?.handle && (
            <Stack align="center" gap={'xs'}>
              <Button
                variant="light"
                color="gray"
                size="md"
                rightSection={<FiPlus size={22} />}
                onClick={() => setShowAddDrawer(true)}
              >
                Add your first card
              </Button>
              <Text ta={'center'} fw={500} c={'gray'}>
                Need inspiration?{' '}
                <Anchor component={Link} href={'/explore'} fw={500} c={'grape'}>
                  Explore cards from the community
                </Anchor>
              </Text>
            </Stack>
          )}
        </Stack>
      )}

      <Box>
        {user && (
          <AddCardDrawer
            isOpen={showAddDrawer}
            onClose={() => setShowAddDrawer(false)}
            selectedCollection={{
              id: firstPage.id,
              name: firstPage.name,
              cardCount: allCards.length,
            }}
          />
        )}
      </Box>
    </Fragment>
  );
}
