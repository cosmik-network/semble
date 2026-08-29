'use client';

import { usePathname } from 'next/navigation';
import UrlCard from '@/features/cards/components/urlCard/UrlCard';
import { CardSaveSource } from '@/features/analytics/types';
import useTaggedItems from '../../lib/queries/useTaggedItems';
import TaggedItemsLayout from '../../components/taggedItemsLayout/TaggedItemsLayout';

interface Props {
  tag: string;
  handleOrDid?: string;
}

export default function TaggedCardsContainer(props: Props) {
  const pathname = usePathname();
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useTaggedItems({
      tag: props.tag,
      itemType: 'card',
      user: props.handleOrDid,
    });

  const cards = data.pages.flatMap((page) => page.cards ?? []);

  return (
    <TaggedItemsLayout
      tag={props.tag}
      handleOrDid={props.handleOrDid}
      count={cards.length}
      hasMore={!!hasNextPage}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
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
    </TaggedItemsLayout>
  );
}
