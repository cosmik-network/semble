import ProfileSearchResultsContainer from '@/features/search/containers/profileSearchResultsContainer/ProfileSearchResultsContainer';
import ProfileSearchResultsContainerSkeleton from '@/features/search/containers/profileSearchResultsContainer/Skeleton.ProfileSearchResultsContainer';
import { Suspense } from 'react';

interface Props {
  searchParams: Promise<{
    query: string;
  }>;
}

export default async function Page(props: Props) {
  const { query } = await props.searchParams;

  return (
    <Suspense fallback={<ProfileSearchResultsContainerSkeleton />} key={query}>
      <ProfileSearchResultsContainer query={query} />
    </Suspense>
  );
}
