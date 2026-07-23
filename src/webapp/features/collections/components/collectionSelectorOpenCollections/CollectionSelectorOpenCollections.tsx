import {
  Alert,
  Button,
  CloseButton,
  Stack,
  TextInput,
  Text,
  Loader,
} from '@mantine/core';
import { IoSearch } from 'react-icons/io5';
import CollectionSelectorItemList from '../collectionSelectorItemList/CollectionSelectorItemList';
import CollectionSelectorBrowseList from '../collectionSelectorBrowseList/CollectionSelectorBrowseList';
import { Fragment, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useDebouncedValue } from '@mantine/hooks';
import CollectionSelectorError from '../collectionSelector/Error.CollectionSelector';
import CreateCollectionDrawer from '../createCollectionDrawer/CreateCollectionDrawer';
import useSearchCollections from '../../lib/queries/useSearchCollections';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Collection, CollectionAccessType } from '@semble/types';
import useOpenCollectionsWithContributor from '../../lib/queries/useOpenCollectionsWithContributor';
import { useAuth } from '@/hooks/useAuth';
import CollectionListScrollArea, {
  COLLECTION_PANEL_HEIGHT,
} from '../collectionSelector/CollectionListScrollArea';

interface Props {
  selectedCollections: Collection[];
  onSelectedCollectionsChange: (collectionIds: Collection[]) => void;
}

export default function CollectionSelectorOpenCollections(props: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);

  // Get collections the current user has contributed to
  const userContributedCollections = useOpenCollectionsWithContributor({
    identifier: user?.id || '',
  });

  // Use contributed collections by default, fall back to searched collections when searching
  const userCollections =
    userContributedCollections.data?.pages.flatMap(
      (page) => page.collections ?? [],
    ) ?? [];

  // Get all open collections (for fallback when user has no contributed collections, or when searching)
  const searchedCollections = useSearchCollections({
    searchText: debouncedSearch,
    accessType: CollectionAccessType.OPEN,
    enabled:
      !!search ||
      (userContributedCollections.isFetched && userCollections.length === 0),
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const searchResults =
    searchedCollections.data?.pages.flatMap((page) => page.collections ?? []) ??
    [];

  // If searching, show search results; otherwise show user's contributed collections
  // If user has no contributed collections, show global open collections as fallback
  const allCollections = search
    ? searchResults
    : userCollections.length > 0
      ? userCollections
      : searchResults;

  // Query backing the currently displayed list, used for pagination
  const listQuery = search
    ? searchedCollections
    : userCollections.length > 0
      ? userContributedCollections
      : searchedCollections;

  const hasCollections = allCollections.length > 0;

  // filter out selected from all to avoid duplication
  const unselectedCollections = allCollections.filter(
    (c) => !props.selectedCollections.some((sel) => sel.id === c.id),
  );

  const handleCollectionChange = (checked: boolean, item: Collection) => {
    if (checked) {
      if (!props.selectedCollections.some((col) => col.id === item.id)) {
        props.onSelectedCollectionsChange([...props.selectedCollections, item]);
      }
    } else {
      props.onSelectedCollectionsChange(
        props.selectedCollections.filter((col) => col.id !== item.id),
      );
    }
  };

  // Loading state of the query backing the displayed list. Covers the
  // fallback case where contributed collections are empty and global open
  // collections are still being fetched.
  const isLoading = listQuery.isPending;

  if (searchedCollections.error || userContributedCollections.error) {
    return <CollectionSelectorError />;
  }

  return (
    <Fragment>
      <Stack gap="xl">
        <Stack gap={'sm'} h={COLLECTION_PANEL_HEIGHT}>
          <TextInput
            placeholder="Search for open collections"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            size="md"
            variant="filled"
            id="search"
            leftSection={<IoSearch size={22} />}
            rightSection={
              <CloseButton
                aria-label="Clear input"
                onClick={() => setSearch('')}
                style={{ display: search ? undefined : 'none' }}
              />
            }
          />

          <CollectionListScrollArea>
            <Stack gap="xxs">
              <Button
                variant="light"
                color="grape"
                radius="md"
                leftSection={<FiPlus size={22} />}
                onClick={() => setIsDrawerOpen(true)}
              >
                {search
                  ? `Create new collection "${search}"`
                  : 'Create new open collection'}
              </Button>

              {search ? (
                <Stack gap={'xxs'}>
                  {isLoading && (
                    <Stack align="center">
                      <Text fw={500} c="gray">
                        Searching open collections...
                      </Text>
                      <Loader color="gray" />
                    </Stack>
                  )}

                  {!isLoading && !hasCollections ? (
                    <Alert
                      color="gray"
                      title={`No results found for "${search}"`}
                    />
                  ) : (
                    !isLoading && (
                      <InfiniteScroll
                        dataLength={allCollections.length}
                        hasMore={!!listQuery.hasNextPage}
                        isInitialLoading={isLoading}
                        isLoading={listQuery.isFetchingNextPage}
                        loadMore={() => listQuery.fetchNextPage()}
                        hideEndIndicator
                      >
                        <CollectionSelectorItemList
                          collections={allCollections}
                          selectedCollections={props.selectedCollections}
                          onChange={handleCollectionChange}
                        />
                      </InfiniteScroll>
                    )
                  )}
                </Stack>
              ) : isLoading ? (
                <Stack align="center" gap="xs">
                  <Loader color="gray" />
                </Stack>
              ) : hasCollections ? (
                <InfiniteScroll
                  dataLength={allCollections.length}
                  hasMore={!!listQuery.hasNextPage}
                  isInitialLoading={false}
                  isLoading={listQuery.isFetchingNextPage}
                  loadMore={() => listQuery.fetchNextPage()}
                  hideEndIndicator
                >
                  <CollectionSelectorBrowseList
                    selectedCollections={props.selectedCollections}
                    unselectedCollections={unselectedCollections}
                    onChange={handleCollectionChange}
                    emptyMessage="No open collections available"
                  />
                </InfiniteScroll>
              ) : (
                <Stack align="center" gap="xs">
                  <Text fz="lg" fw={600} c="gray">
                    No open collections
                  </Text>
                </Stack>
              )}
            </Stack>
          </CollectionListScrollArea>
        </Stack>
      </Stack>

      <CreateCollectionDrawer
        key={search}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialName={search}
        initialAccessType={CollectionAccessType.OPEN}
        onCreate={(collection) => {
          setSearch('');
          handleCollectionChange(true, collection);
        }}
      />
    </Fragment>
  );
}
