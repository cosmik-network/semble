import CollectionSearchResultsContainer from '@/features/search/containers/collectionSearchResultsContainer/CollectionSearchResultsContainer';
import CollectionSearchResultsContainerSkeleton from '@/features/search/containers/collectionSearchResultsContainer/Skeleton.CollectionSearchResultsContainer';
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
  const { query } = await props.searchParams;

  return (
    <Suspense
      fallback={<CollectionSearchResultsContainerSkeleton />}
      key={query}
    >
      <CollectionSearchResultsContainer query={query} />
    </Suspense>
  );
}
