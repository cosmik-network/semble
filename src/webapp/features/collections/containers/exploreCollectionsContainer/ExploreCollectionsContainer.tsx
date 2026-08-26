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
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  // Debounce typing, but clear instantly — otherwise the CloseButton leaves
  // search results on screen for another 300ms.
  const activeQuery = search.trim() === '' ? '' : debouncedSearch.trim();
  const isSearching = activeQuery.length > 0;

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
              {isSearching && (
                <>
                  <CollectionFilters.SortSelect />
                  <CollectionFilters.SortOrderSelect />
                  <CollectionFilters.AccessTypeSelect />
                  <CollectionFilters.AuthorSelect />
                </>
              )}
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
              // Disabled with no seeds, and so pending forever; that's a
              // result, not a load.
              !seedUrls || (seedUrls.length > 0 && recommended.isPending)
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
