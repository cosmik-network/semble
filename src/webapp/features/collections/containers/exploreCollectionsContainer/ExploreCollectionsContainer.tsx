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
import useRecommendedCards from '@/features/cards/lib/queries/useRecommendedCards';
import useSeedUrls from '@/features/explore/lib/queries/useSeedUrls';
import useRecommendedCollections from '../../lib/queries/useRecommendedCollections';
import {
  CollectionFilters,
  CollectionFilterState,
} from '../../components/collectionFilters/CollectionFilters';
import ExploreCollectionsBrowseContent from '../exploreCollectionsBrowseContent/ExploreCollectionsBrowseContent';
import ExploreCollectionsRecommendedContent from '../exploreCollectionsRecommendedContent/ExploreCollectionsRecommendedContent';

const SEED_LIMIT = 10;

export default function ExploreCollectionsContainer() {
  const [filters, setFilters] = useState<CollectionFilterState>({});
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  // Debounce typing, but clear instantly — otherwise the CloseButton leaves
  // search results on screen for another 300ms.
  const activeQuery = search.trim() === '' ? '' : debouncedSearch.trim();
  const isSearching = activeQuery.length > 0;

  // Recommendations are seeded from the reader's recommended card URLs, the
  // same way the explore shelf seeds them. Empty `queries` lets the server
  // derive them: from the library and bio when signed in, from recent global
  // feed activity otherwise.
  const { data: seedData, isPending: isSeedPending } = useRecommendedCards({
    queries: [],
    limit: SEED_LIMIT,
  });

  // Falls back to network seeds when the reader's library yields none, so an
  // empty library still gets recommendations.
  const seeds = useSeedUrls({
    candidates: (seedData?.pages[0]?.urls ?? []).map((u) => u.url),
    isPending: isSeedPending,
  });

  const recommended = useRecommendedCollections({ urls: seeds.urls });

  // Seeds stay frozen, but the server re-jitters the ranking per request, so a
  // plain refetch returns a different set drawn from the same seeds.
  const isRefreshing = !recommended.isPending && recommended.isFetching;

  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group justify="space-between" gap="xs">
          <Group gap="xs">
            {/* Sort, access and author only appear alongside search: the
                recommendation endpoint accepts none of them, so showing them
                over the recommended list would be controls that quietly do
                nothing. */}
            <CollectionFilters.Root
              width={280}
              value={filters}
              onChange={setFilters}
            >
              {isSearching && <CollectionFilters.SortSelect />}
              {isSearching && <CollectionFilters.SortOrderSelect />}
              {isSearching && <CollectionFilters.AccessTypeSelect />}
              {isSearching && <CollectionFilters.AuthorSelect />}
              <CollectionFilters.ViewToggle />
            </CollectionFilters.Root>

            {!isSearching && (
              <Tooltip label="Get new recommendations">
                <ActionIcon
                  variant="light"
                  color="gray"
                  size="lg"
                  radius="xl"
                  loading={isRefreshing}
                  onClick={() => recommended.refetch()}
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

        {!isSearching ? (
          <ExploreCollectionsRecommendedContent
            collections={recommended.data?.collections ?? []}
            isPending={
              // The query stays disabled — and so "pending" — when even the
              // network had no seeds to offer; that's an empty result, not a
              // load, so don't leave the skeleton up forever.
              seeds.isPending ||
              (seeds.urls.length > 0 && recommended.isPending)
            }
            isRefreshing={isRefreshing}
            error={recommended.error}
          />
        ) : (
          <ExploreCollectionsBrowseContent
            searchText={activeQuery}
            filters={filters}
          />
        )}
      </Stack>
    </Container>
  );
}
