import { useNavbarContext } from '@/providers/navbar';
import useCollection from '../../lib/queries/useCollection';
import { Fragment, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { CardSortField, SortOrder } from '@semble/types';
import { Anchor, Box, Button, Grid, Stack, Text } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import AddCardDrawer from '@/features/cards/components/addCardDrawer/AddCardDrawer';
import Link from 'next/link';
import { FiPlus } from 'react-icons/fi';

interface Props {
  rkey: string;
  handle: string;
  sortBy: CardSortField;
  sortOrder: SortOrder;
}

export default function CollectionContainerContent(props: Props) {
  const { desktopOpened } = useNavbarContext();
  const [showAddDrawer, setShowAddDrawer] = useState(false);
  const { user } = useAuth();

  const { data, isPending, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useCollection({
      rkey: props.rkey,
      handle: props.handle,
      sortBy: props.sortBy,
      sortOrder: props.sortOrder,
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
          <Grid gutter="md">
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
                  cardContent={card.cardContent}
                  authorHandle={firstPage.author.handle}
                  cardAuthor={firstPage.author}
                  note={card.note}
                  urlLibraryCount={card.urlLibraryCount}
                  urlIsInLibrary={card.urlInLibrary}
                  currentCollection={firstPage}
                />
              </Grid.Col>
            ))}
          </Grid>
        </InfiniteScroll>
      ) : (
        <Stack align="center" gap="xs">
          <Text fz="h3" fw={600} c="gray">
            No cards
          </Text>
          {firstPage.author.handle == user?.handle && (
            <Button
              variant="light"
              color="gray"
              size="md"
              rightSection={<FiPlus size={22} />}
              onClick={() => setShowAddDrawer(true)}
            >
              Add your first card
            </Button>
          )}
          <Text ta={'center'} fw={500} c={'gray'}>
            Need inspiration?{' '}
            <Anchor component={Link} href={'/explore'} fw={500} c={'grape'}>
              Explore cards from the community
            </Anchor>
          </Text>
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
