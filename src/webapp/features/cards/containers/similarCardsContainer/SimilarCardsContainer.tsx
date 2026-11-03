'use client';

import useSimilarCards from '@/features/semble/lib/queries/useSimilarCards';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Group, Stack } from '@mantine/core';
import SimilarUrlCard from '@/features/semble/components/similarUrlCard/SimilarUrlCard';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { BiLink } from 'react-icons/bi';
import { CardFilters } from '@/features/cards/components/cardFilters/CardFilters';
import { useSearchParams, usePathname } from 'next/navigation';
import { UrlType } from '@semble/types';
import { CardSaveSource } from '@/features/analytics/types';
import { useRef } from 'react';
import useListDepth from '@/features/analytics/useListDepth';
import { ListDepth } from '@/features/analytics/pageVisit';
import { trackSembleListDepth } from '@/features/semble/lib/analytics';
import { trackCollectionListDepth } from '@/features/collections/lib/analytics';

/** The page visit that list depth is reported against */
type DepthVisit =
  | { page: 'semble_page'; url: string }
  | { page: 'collection_page'; rkey: string };

function reportDepth(visit: DepthVisit, depth: ListDepth) {
  if (visit.page === 'semble_page') {
    trackSembleListDepth(visit.url, 'similar', depth);
  } else {
    trackCollectionListDepth(visit.rkey, 'similar', depth);
  }
}

interface Props {
  url: string;
  semblePageUrl?: string;
  depthVisit?: DepthVisit;
}

export default function SimilarCardsContainer(props: Props) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedUrlType = searchParams.get('type') as UrlType;

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPending } =
    useSimilarCards({ url: props.url, urlType: selectedUrlType });

  const allSimilarUrls = data?.pages.flatMap((page) => page.urls ?? []) ?? [];

  const { depthVisit } = props;
  const listRef = useRef<HTMLDivElement>(null);
  useListDepth({
    containerRef: listRef,
    itemsLoaded: allSimilarUrls.length,
    pagesLoaded: data?.pages.length ?? 0,
    hasMore: !!hasNextPage,
    urlType: selectedUrlType ?? undefined,
    onReport: depthVisit && ((depth) => reportDepth(depthVisit, depth)),
  });

  return (
    <Stack gap={'xs'} align="center">
      <Group justify="space-between" w={'100%'} maw={600}>
        <CardFilters.Root>
          <CardFilters.ViewToggle />
          <CardFilters.TypeFilter />
        </CardFilters.Root>
      </Group>
      <InfiniteScroll
        dataLength={allSimilarUrls.length}
        hasMore={!!hasNextPage}
        isInitialLoading={isPending}
        isLoading={isFetchingNextPage}
        loadMore={fetchNextPage}
      >
        {allSimilarUrls.length === 0 ? (
          <EmptyState
            message={`No similar ${selectedUrlType ? `${selectedUrlType} ` : ''}cards found`}
            icon={BiLink}
          />
        ) : (
          <Grid ref={listRef} gap="sm" mx={'auto'} maw={600} w={'100%'}>
            {allSimilarUrls.map((urlView, index) => (
              <Grid.Col
                key={urlView.url}
                data-analytics-position={index + 1}
                data-analytics-url-type={selectedUrlType ?? undefined}
                span={12}
                style={{
                  contentVisibility: 'auto',
                  containIntrinsicSize: 'auto 300px',
                }}
              >
                <SimilarUrlCard
                  urlView={urlView}
                  semblePageUrl={props.semblePageUrl}
                  analyticsContext={{
                    saveSource: CardSaveSource.SIMILAR_CARDS,
                    activeFilters: {
                      urlType: selectedUrlType,
                    },
                    pagePath: pathname,
                    listPosition: index + 1,
                  }}
                />
              </Grid.Col>
            ))}
          </Grid>
        )}
      </InfiniteScroll>
    </Stack>
  );
}
