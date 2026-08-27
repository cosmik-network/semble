'use client';

import useProfileSearch from '../../lib/queries/useProfileSearch';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Center, Grid, Stack } from '@mantine/core';
import ProfileSearchResultsContainerError from './Error.ProfileSearchResultsContainer';
import SearchProfileCard from '../../components/profileCard/SearchProfileCard';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';
import { BiSearch } from 'react-icons/bi';
import SearchQueryAlert from '../../components/searchQueryAlert/SearchQueryAlert';

interface Props {
  query: string;
}

export default function ProfileSearchResultsContainer(props: Props) {
  if (!props.query) {
    return <SearchQueryAlert query={props.query} />;
  }

  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isPending,
  } = useProfileSearch({ query: props.query });

  const allProfiles = data.pages.flatMap((page) => page.actors ?? []);

  return (
    <Stack gap="md">
      <SearchQueryAlert query={props.query} count={allProfiles.length} />

      {error ? (
        <ProfileSearchResultsContainerError />
      ) : !isPending && allProfiles.length === 0 ? (
        <Center py="xl">
          <EmptyState
            icon={BiSearch}
            message="No profiles found"
            description="Try a different search term"
          />
        </Center>
      ) : (
        <InfiniteScroll
          dataLength={allProfiles.length}
          hasMore={!!hasNextPage}
          isInitialLoading={isPending}
          isLoading={isFetchingNextPage}
          loadMore={fetchNextPage}
        >
          <Grid gap="xs">
            {allProfiles.map((profile) => (
              <Grid.Col key={profile.did} span={12}>
                <SearchProfileCard profile={profile} />
              </Grid.Col>
            ))}
          </Grid>
        </InfiniteScroll>
      )}
    </Stack>
  );
}
