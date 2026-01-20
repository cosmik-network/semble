'use client';

import useProfileSearch from '../../lib/queries/useProfileSearch';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid } from '@mantine/core';
import ProfileSearchResultsContainerError from './Error.ProfileSearchResultsContainer';
import ProfileCard from '../../components/profileCard/ProfileCard';
import SearchEmptyResults from '../../components/searchEmptyResults/SearchEmptyResults';

interface Props {
  query: string;
}

export default function ProfileSearchResultsContainer(props: Props) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useProfileSearch({ query: props.query });

  const allProfiles = data?.pages.flatMap((page) => page.actors ?? []) ?? [];

  if (error) {
    return <ProfileSearchResultsContainerError />;
  }

  if (!isPending && allProfiles.length === 0) {
    return <SearchEmptyResults query={props.query} type="profiles" />;
  }

  return (
    <InfiniteScroll
      dataLength={allProfiles.length}
      hasMore={!!hasNextPage}
      isInitialLoading={isPending}
      isLoading={isFetchingNextPage}
      loadMore={fetchNextPage}
    >
      <Grid gutter="xs">
        {allProfiles.map((profile) => (
          <Grid.Col key={profile.did} span={12}>
            <ProfileCard profile={profile} />
          </Grid.Col>
        ))}
      </Grid>
    </InfiniteScroll>
  );
}
