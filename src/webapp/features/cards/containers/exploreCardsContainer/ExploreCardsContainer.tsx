'use client';

import { Container, Group, Stack } from '@mantine/core';
import { useState } from 'react';
import ExploreSearchInput from '@/features/explore/components/exploreSearchInput/ExploreSearchInput';
import RefreshButton from '@/features/explore/components/refreshButton/RefreshButton';
import useExploreSearch from '@/features/explore/lib/useExploreSearch';
import {
  CardFilters,
  CardFilterState,
} from '../../components/cardFilters/CardFilters';
import { clearStoredQueries } from '../../lib/utils/recommendedQueriesStorage';
import ExploreCardsRecommendedContent from '../exploreCardsRecommendedContent/ExploreCardsRecommendedContent';
import ExploreCardsSearchContent from '../exploreCardsSearchContent/ExploreCardsSearchContent';

export default function ExploreCardsContainer() {
  const search = useExploreSearch();
  const [filters, setFilters] = useState<CardFilterState>({});
  const [refreshNonce, setRefreshNonce] = useState(0);

  const handleRefresh = () => {
    // Drop the pinned seed queries so the next request derives a new set, and
    // move the query key off the cached one so it actually goes out.
    clearStoredQueries();
    setRefreshNonce((n) => n + 1);
  };

  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group justify="space-between" gap="xs">
          <Group gap="xs">
            {/* Sort only appears alongside search: the recommendation endpoint
                ranks its own results, so a sort control over the recommended
                list would quietly do nothing. */}
            <CardFilters.Root value={filters} onChange={setFilters}>
              {search.isSearching && <CardFilters.SortSelect />}
              <CardFilters.TypeFilter />
              <CardFilters.ViewToggle />
            </CardFilters.Root>

            {!search.isSearching && (
              <RefreshButton
                onRefresh={handleRefresh}
                label="Get new recommendations"
                color="gray"
                size="lg"
              />
            )}
          </Group>

          <ExploreSearchInput value={search.value} onChange={search.setValue} />
        </Group>

        {search.isSearching ? (
          <ExploreCardsSearchContent
            searchQuery={search.query}
            filters={filters}
          />
        ) : (
          <ExploreCardsRecommendedContent
            nonce={refreshNonce}
            urlType={filters.type}
          />
        )}
      </Stack>
    </Container>
  );
}
