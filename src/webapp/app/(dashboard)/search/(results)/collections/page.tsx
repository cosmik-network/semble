import CollectionSearchResultsContainer from '@/features/search/containers/collectionSearchResultsContainer/CollectionSearchResultsContainer';
import CollectionSearchResultsContainerSkeleton from '@/features/search/containers/collectionSearchResultsContainer/Skeleton.CollectionSearchResultsContainer';
import { CollectionAccessType, UrlType } from '@semble/types';
import { Suspense } from 'react';

interface Props {
  searchParams: Promise<{
    query: string;
    handle?: string;
    accessType?: CollectionAccessType;
  }>;
}

export default async function Page(props: Props) {
  const { query, handle, accessType } = await props.searchParams;

  return (
    <Suspense
      fallback={<CollectionSearchResultsContainerSkeleton />}
      key={query + handle + accessType}
    >
      <CollectionSearchResultsContainer
        query={query}
        handle={handle}
        accessType={accessType}
      />
    </Suspense>
  );
}
