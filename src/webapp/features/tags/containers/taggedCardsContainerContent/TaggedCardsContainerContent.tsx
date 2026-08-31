'use client';

import { Center, Stack } from '@mantine/core';
import { BiHash } from 'react-icons/bi';
import { usePathname } from 'next/navigation';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { CardSaveSource } from '@/features/analytics/types';
import useTaggedItems from '../../lib/queries/useTaggedItems';

interface Props {
  tag: string;
  handleOrDid?: string;
}

export default function TaggedCardsContainerContent(props: Props) {
  const pathname = usePathname();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTaggedItems({
      tag: props.tag,
      itemType: 'card',
      user: props.handleOrDid,
    });

  const cards = data.pages.flatMap((page) => page.cards ?? []);

  if (cards.length === 0) {
    return (
      <Center py="xl">
        <EmptyState
          icon={BiHash}
          message={`No cards tagged #${props.tag} here`}
          description={
            props.handleOrDid
              ? 'Try clearing the profile filter'
              : 'Try another tab'
          }
        />
      </Center>
    );
  }

  return (
    <InfiniteScroll
      dataLength={cards.length}
      hasMore={!!hasNextPage}
      isInitialLoading={false}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <Stack gap="xs">
        {cards.map((card) => (
          <UrlCard
            key={card.id}
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
            viaCardId={card.id}
            showAuthor
            analyticsContext={{
              saveSource: CardSaveSource.SEARCH_RESULTS,
              activeFilters: { searchQuery: `#${props.tag}` },
              pagePath: pathname,
            }}
          />
        ))}
      </Stack>
    </InfiniteScroll>
  );
}
