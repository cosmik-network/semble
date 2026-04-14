'use client';

import { useNavbarContext } from '@/providers/navbar';
import useCollection from '../../lib/queries/useCollection';
import { Fragment, useState } from 'react';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import { useAuth } from '@/hooks/useAuth';
import { CardSortField, UrlType } from '@semble/types';
import {
  Anchor,
  Box,
  Button,
  Divider,
  Grid,
  Group,
  Stack,
  Text,
} from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import AddCardDrawer from '@/features/cards/components/addCardDrawer/AddCardDrawer';

import { FiPlus } from 'react-icons/fi';
import { useSearchParams, usePathname } from 'next/navigation';
import { CardSaveSource } from '@/features/analytics/types';
import { getCardsSortParams } from '@/features/cards/lib/utils';

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionContainerContent(props: Props) {
  const pathname = usePathname();
  const { desktopOpened } = useNavbarContext();
  const { settings } = useUserSettings();
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
      sortOrder: getCardsSortParams(sortBy).sortOrder,
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
          <Grid gap={settings.cardView === 'list' ? 0 : 'xs'}>
            {allCards.map((card, index) => (
              <Fragment key={card.id}>
                {settings.cardView === 'list' && index > 0 && (
                  <Grid.Col span={12}>
                    <Divider />
                  </Grid.Col>
                )}
                <Grid.Col
                  span={{
                    base: 12,
                    xs:
                      settings.cardView !== 'grid'
                        ? 12
                        : desktopOpened
                          ? 12
                          : 6,
                    sm:
                      settings.cardView !== 'grid' ? 12 : desktopOpened ? 6 : 4,
                    md: settings.cardView !== 'grid' ? 12 : 4,
                    lg: settings.cardView !== 'grid' ? 12 : 3,
                  }}
                >
                  <UrlCard
                    id={card.id}
                    url={card.url}
                    uri={card.uri}
                    cardContent={card.cardContent}
                    authorHandle={card.author.handle}
                    cardAuthor={card.author}
                    note={card.note}
                    urlLibraryCount={card.urlLibraryCount}
                    urlIsInLibrary={card.urlInLibrary}
                    urlConnectionCount={card.urlConnectionCount ?? 0}
                    currentCollection={firstPage}
                    viaCardId={card.id}
                    showAuthor={props.handle !== card.author.handle}
                    analyticsContext={{
                      saveSource: CardSaveSource.COLLECTION,
                      activeFilters: {
                        urlType: selectedUrlType,
                        sort: sortBy,
                      },
                      pagePath: pathname,
                    }}
                  />
                </Grid.Col>
              </Fragment>
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
                <Anchor href={'/explore'} fw={500} c={'grape'}>
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
            selectedCollection={data.pages[0]}
          />
        )}
      </Box>
    </Fragment>
  );
}
