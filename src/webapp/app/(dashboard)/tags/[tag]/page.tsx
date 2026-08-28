import TaggedItemsContainer from '@/features/tags/containers/taggedItemsContainer/TaggedItemsContainer';
import CardSearchResultsContainerSkeleton from '@/features/search/containers/cardSearchResultsContainer/Skeleton.CardSearchresultsContainerSkeleton';
import { TaggedItemType } from '@semble/types';
import { Suspense } from 'react';

interface Props {
  params: Promise<{ tag: string }>;
  searchParams: Promise<{
    itemType?: TaggedItemType;
    handle?: string;
  }>;
}

export default async function Page(props: Props) {
  const { tag } = await props.params;
  const { itemType, handle } = await props.searchParams;
  const decoded = decodeURIComponent(tag).toLowerCase();

  return (
    <Suspense
      fallback={<CardSearchResultsContainerSkeleton />}
      key={`${decoded}|${itemType ?? ''}|${handle ?? ''}`}
    >
      <TaggedItemsContainer
        tag={decoded}
        itemType={itemType}
        handleOrDid={handle}
      />
    </Suspense>
  );
}
