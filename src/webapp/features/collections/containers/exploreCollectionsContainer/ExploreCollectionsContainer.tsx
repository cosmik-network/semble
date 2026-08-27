'use client';

import { Container, Group, Stack } from '@mantine/core';
import { useState } from 'react';
import ExploreSearchInput from '@/features/explore/components/exploreSearchInput/ExploreSearchInput';
import RefreshButton from '@/features/explore/components/refreshButton/RefreshButton';
import useExploreSearch from '@/features/explore/lib/useExploreSearch';
import useExploreSeedUrls from '@/features/explore/lib/queries/useExploreSeedUrls';
import useRecommendedCollections from '../../lib/queries/useRecommendedCollections';
import {
  CollectionFilters,
  CollectionFilterState,
} from '../../components/collectionFilters/CollectionFilters';
import ExploreCollectionsBrowseContent from '../exploreCollectionsBrowseContent/ExploreCollectionsBrowseContent';
import ExploreCollectionsRecommendedContent from '../exploreCollectionsRecommendedContent/ExploreCollectionsRecommendedContent';

export default function ExploreCollectionsContainer() {
  const [filters, setFilters] = useState<CollectionFilterState>({});
  const search = useExploreSearch();

  // The same seeds the explore shelf recommends from, so this page opens on
  // the set the reader was just looking at.
  const seedUrls = useExploreSeedUrls();
  const recommended = useRecommendedCollections({ urls: seedUrls });

  // Seeds stay frozen, but the server re-jitters the ranking per request, so a
  // plain refetch returns a different set drawn from the same seeds.
  const isRefreshing = !recommended.isPending && recommended.isFetching;

  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group justify="space-between" gap="xs">
          <Group gap="xs">
            {/* Sort, access and author only appear alongside search: the
                recommendation endpoint accepts none of them. */}
            <CollectionFilters.Root
              width={280}
              value={filters}
              onChange={setFilters}
            >
              {search.isSearching && (
                <>
                  <CollectionFilters.SortSelect />
                  <CollectionFilters.SortOrderSelect />
                  <CollectionFilters.AccessTypeSelect />
                  <CollectionFilters.AuthorSelect />
                </>
              )}
              <CollectionFilters.ViewToggle />
            </CollectionFilters.Root>

            {!search.isSearching && (
              <RefreshButton
                onRefresh={() => recommended.refetch()}
                isRefreshing={isRefreshing}
                label="Get new recommendations"
                color="gray"
                size="lg"
              />
            )}
          </Group>

          <ExploreSearchInput value={search.value} onChange={search.setValue} />
        </Group>

        {!search.isSearching ? (
          <ExploreCollectionsRecommendedContent
            collections={recommended.data?.collections ?? []}
            isPending={recommended.isPending}
            isRefreshing={isRefreshing}
            error={recommended.error}
          />
        ) : (
          <ExploreCollectionsBrowseContent
            searchText={search.query}
            filters={filters}
          />
        )}
      </Stack>
    </Container>
  );
}
