'use client';

import { usePathname } from 'next/navigation';
import { FaRegNoteSticky } from 'react-icons/fa6';
import { CardSortField } from '@semble/types';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import SembleEmptyTab from '@/features/semble/components/sembleEmptyTab/SembleEmptyTab';
import { CardSaveSource } from '@/features/analytics/types';
import useSearchCards from '../../lib/queries/useSearchCards';
import { CardFilterState } from '../../components/cardFilters/CardFilters';
import UrlViewGrid from '../../components/urlViewGrid/UrlViewGrid';
import { dedupeUrlViews } from '../../lib/utils';
import ExploreCardsContainerError from '../exploreCardsContainer/Error.ExploreCardsContainer';
import ExploreCardsSearchContentSkeleton from './Skeleton.ExploreCardsSearchContent';

const PAGE_SIZE = 20;

interface Props {
  searchQuery: string;
  filters: CardFilterState;
}

export default function ExploreCardsSearchContent(props: Props) {
  const pathname = usePathname();

  const sortBy = props.filters.sort ?? CardSortField.UPDATED_AT;

  const {
    data,
    isPending,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useSearchCards({
    searchQuery: props.searchQuery,
    limit: PAGE_SIZE,
    sortBy,
    urlType: props.filters.type,
  });

  if (error) {
    return <ExploreCardsContainerError />;
  }

  if (isPending) {
    return <ExploreCardsSearchContentSkeleton />;
  }

  const allUrls = dedupeUrlViews(
    data?.pages.flatMap((page) => page.urls ?? []) ?? [],
  );

  if (allUrls.length === 0) {
    return (
      <SembleEmptyTab
        message={`No cards match “${props.searchQuery}”`}
        icon={FaRegNoteSticky}
      />
    );
  }

  return (
    <InfiniteScroll
      dataLength={allUrls.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <UrlViewGrid
        urls={allUrls}
        analyticsContext={{
          saveSource: CardSaveSource.SEARCH_RESULTS,
          activeFilters: {
            searchQuery: props.searchQuery,
            urlType: props.filters.type,
            sort: sortBy,
          },
          pagePath: pathname,
        }}
      />
    </InfiniteScroll>
  );
}
