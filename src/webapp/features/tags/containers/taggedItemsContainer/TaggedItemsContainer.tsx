'use client';

import { TaggedItemType, GetTaggedItemsResponse } from '@semble/types';
import { Grid, Group, Stack, Text } from '@mantine/core';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import CollectionCard from '@/features/collections/components/collectionCard/CollectionCard';
import ProfileConnectionItem from '@/features/connections/components/profileConnectionItem/ProfileConnectionItem';
import useTaggedItems from '../../lib/queries/useTaggedItems';
import { TagFilters } from '../../components/tagFilters/TagFilters';
import {
  CardSaveAnalyticsContext,
  CardSaveSource,
} from '@/features/analytics/types';
import { usePathname } from 'next/navigation';

type TaggedCard = NonNullable<GetTaggedItemsResponse['cards']>[number];
type TaggedConnection = NonNullable<
  GetTaggedItemsResponse['connections']
>[number];
type TaggedCollection = NonNullable<
  GetTaggedItemsResponse['collections']
>[number];

interface Props {
  tag: string;
  itemType?: TaggedItemType;
  handleOrDid?: string;
}

export default function TaggedItemsContainer(props: Props) {
  const pathname = usePathname();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useTaggedItems({
      tag: props.tag,
      itemType: props.itemType,
      user: props.handleOrDid,
    });

  const analyticsContext: CardSaveAnalyticsContext = {
    saveSource: CardSaveSource.SEARCH_RESULTS,
    activeFilters: { searchQuery: `#${props.tag}` },
    pagePath: pathname,
  };

  const renderCard = (card: TaggedCard) => (
    <UrlCard
      id={card.id}
      url={card.url}
      uri={card.uri}
      note={card.note}
      cardAuthor={card.author}
      cardContent={card.cardContent}
      urlLibraryCount={card.urlLibraryCount}
      urlIsInLibrary={card.urlInLibrary}
      urlConnectionCount={card.urlConnectionCount ?? 0}
      urlIsConnected={card.urlIsConnected}
      authorHandle={card.author.handle}
      showAuthor
      viaCardId={card.id}
      analyticsContext={analyticsContext}
    />
  );

  const renderConnection = (connection: TaggedConnection) => (
    <ProfileConnectionItem
      connection={connection}
      curator={connection.connection.curator}
    />
  );

  const renderCollection = (collection: TaggedCollection) => (
    <CollectionCard collection={collection} showAuthor />
  );

  const items = data?.pages.flatMap((page) => page.items ?? []) ?? [];
  const cards = data?.pages.flatMap((page) => page.cards ?? []) ?? [];
  const connections =
    data?.pages.flatMap((page) => page.connections ?? []) ?? [];
  const collections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const count =
    items.length + cards.length + connections.length + collections.length;

  const filters = (
    <Group gap={'xs'} justify="space-between" wrap="nowrap">
      <Text c="gray" fw={500} lineClamp={1}>
        {props.handleOrDid
          ? `Tagged by @${props.handleOrDid}`
          : 'Everything tagged'}{' '}
        #{props.tag}
      </Text>
      <TagFilters.Root>
        <TagFilters.ItemTypeFilter />
        <TagFilters.ProfileFilter />
        <TagFilters.Actions />
      </TagFilters.Root>
    </Group>
  );

  if (!isPending && count === 0) {
    return (
      <Stack gap="md">
        {filters}
        <Text c="gray" ta="center" py="xl" fw={500}>
          Nothing tagged #{props.tag} yet
        </Text>
      </Stack>
    );
  }

  return (
    <Stack gap="md">
      {filters}
      <InfiniteScroll
        dataLength={count}
        hasMore={!!hasNextPage}
        isInitialLoading={isPending}
        isLoading={isFetchingNextPage}
        loadMore={fetchNextPage}
      >
        {!props.itemType && (
          <Stack gap="xs">
            {items
              .filter(
                (item) => item.type !== 'collection' || item.collection.uri,
              )
              .map((item) =>
                item.type === 'card' ? (
                  <div key={`card-${item.card.id}`}>
                    {renderCard(item.card)}
                  </div>
                ) : item.type === 'connection' ? (
                  <div key={`connection-${item.connection.connection.id}`}>
                    {renderConnection(item.connection)}
                  </div>
                ) : (
                  <div key={`collection-${item.collection.id}`}>
                    {renderCollection(item.collection)}
                  </div>
                ),
              )}
          </Stack>
        )}

        {props.itemType === 'card' && (
          <Grid gap="xs">
            {cards.map((card) => (
              <Grid.Col key={card.id} span={{ base: 12, xs: 6 }}>
                {renderCard(card)}
              </Grid.Col>
            ))}
          </Grid>
        )}

        {props.itemType === 'connection' && (
          <Stack gap="xs">
            {connections.map((connection) => (
              <div key={connection.connection.id}>
                {renderConnection(connection)}
              </div>
            ))}
          </Stack>
        )}

        {props.itemType === 'collection' && (
          <Grid gap="xs">
            {collections
              .filter((collection) => collection.uri)
              .map((collection) => (
                <Grid.Col key={collection.id} span={{ base: 12, xs: 6 }}>
                  {renderCollection(collection)}
                </Grid.Col>
              ))}
          </Grid>
        )}
      </InfiniteScroll>
    </Stack>
  );
}
