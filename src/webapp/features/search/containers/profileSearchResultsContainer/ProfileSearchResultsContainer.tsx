'use client';

import useProfileSearch from '../../lib/queries/useProfileSearch';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Grid, Stack } from '@mantine/core';
import ProfileSearchResultsContainerError from './Error.ProfileSearchResultsContainer';
import ProfileCard from '../../components/profileCard/ProfileCard';
import SearchEmptyResults from '../../components/searchEmptyResults/SearchEmptyResults';
import SearchQueryAlert from '../../components/searchQueryAlert/SearchQueryAlert';

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

  return (
    <Stack gap="md">
      <SearchQueryAlert query={props.query} />

      {error ? (
        <ProfileSearchResultsContainerError />
      ) : !isPending && allProfiles.length === 0 ? (
        <SearchEmptyResults query={props.query} type="profiles" />
      ) : (
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
      )}
    </Stack>
  );
}
