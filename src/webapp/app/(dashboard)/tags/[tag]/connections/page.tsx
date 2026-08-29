import TaggedConnectionsContainer from '@/features/tags/containers/taggedConnectionsContainer/TaggedConnectionsContainer';
import CardSearchResultsContainerSkeleton from '@/features/search/containers/cardSearchResultsContainer/Skeleton.CardSearchresultsContainerSkeleton';
import { Suspense } from 'react';

interface Props {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{ handle?: string }>;
}

export default async function Page(props: Props) {
  const { tag } = await props.params;
  const { handle } = await props.searchParams;
  const decoded = decodeURIComponent(tag).toLowerCase();

  return (
    <Suspense
      fallback={<CardSearchResultsContainerSkeleton />}
      key={`${decoded}|${handle ?? ''}`}
    >
      <TaggedConnectionsContainer tag={decoded} handleOrDid={handle} />
    </Suspense>
  );
}
