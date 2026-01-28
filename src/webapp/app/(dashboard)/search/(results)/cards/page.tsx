import CardSearchResultsContainer from '@/features/search/containers/cardSearchResultsContainer/CardSearchResultsContainer';
import CardSearchResultsContainerSkeleton from '@/features/search/containers/cardSearchResultsContainer/Skeleton.CardSearchresultsContainerSkeleton';
import { UrlType } from '@semble/types';
import { Suspense } from 'react';

interface Props {
  searchParams: Promise<{
    query: string;
    handle?: string;
    urlType?: UrlType;
  }>;
}

export default async function Page(props: Props) {
  const { query, handle, urlType } = await props.searchParams;

  return (
    <Suspense
      fallback={<CardSearchResultsContainerSkeleton />}
      key={query + handle + urlType}
    >
      <CardSearchResultsContainer
        query={query}
        handle={handle}
        urlType={urlType}
      />
    </Suspense>
  );
}
