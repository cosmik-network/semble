'use client';

import {
  ActionIcon,
  CloseButton,
  Container,
  Group,
  Stack,
  TextInput,
  Tooltip,
} from '@mantine/core';
import { useDebouncedValue } from '@mantine/hooks';
import { useState } from 'react';
import { BiRefresh } from 'react-icons/bi';
import { IoSearch } from 'react-icons/io5';
import {
  CardFilters,
  CardFilterState,
} from '../../components/cardFilters/CardFilters';
import { clearStoredQueries } from '../../lib/utils/recommendedQueriesStorage';
import ExploreCardsRecommendedContent from '../exploreCardsRecommendedContent/ExploreCardsRecommendedContent';
import ExploreCardsSearchContent from '../exploreCardsSearchContent/ExploreCardsSearchContent';

export default function ExploreCardsContainer() {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);
  const [filters, setFilters] = useState<CardFilterState>({});
  const [refreshNonce, setRefreshNonce] = useState(0);

  const handleRefresh = () => {
    // Drop the pinned seed queries so the next request derives a new set, and
    // move the query key off the cached one so it actually goes out.
    clearStoredQueries();
    setRefreshNonce((n) => n + 1);
  };

  // Debounce typing, but clear instantly — otherwise the CloseButton leaves
  // search results on screen for another 300ms.
  const activeQuery = search.trim() === '' ? '' : debouncedSearch.trim();
  const isSearching = activeQuery.length > 0;

  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group justify="space-between" gap="xs">
          <Group gap="xs">
            {/* Sort only appears alongside search: the recommendation endpoint
                ranks its own results, so a sort control over the recommended
                list would quietly do nothing. */}
            <CardFilters.Root value={filters} onChange={setFilters}>
              {isSearching && <CardFilters.SortSelect />}
              <CardFilters.TypeFilter />
              <CardFilters.ViewToggle />
            </CardFilters.Root>

            {!isSearching && (
              <Tooltip label="Get new recommendations">
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="lg"
                  radius="xl"
                  onClick={handleRefresh}
                  aria-label="Refresh recommendations"
                >
                  <BiRefresh size={18} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>

          <TextInput
            variant="filled"
            placeholder="Search..."
            leftSection={<IoSearch />}
            rightSection={
              <CloseButton
                aria-label="Clear input"
                onClick={() => setSearch('')}
                style={{ display: search ? undefined : 'none' }}
              />
            }
            radius={'xl'}
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            w={200}
          />
        </Group>

        {isSearching ? (
          <ExploreCardsSearchContent
            searchQuery={activeQuery}
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
