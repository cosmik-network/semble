import {
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
import useCollectionSearch from '../../lib/queries/useCollectionSearch';
import useMyCollections from '../../lib/queries/useMyCollections';
import CollectionSelectorError from '../collectionSelector/Error.CollectionSelector';
import CreateCollectionDrawer from '../createCollectionDrawer/CreateCollectionDrawer';
import InfiniteScroll from '@/components/contentDisplay/infiniteScroll/InfiniteScroll';
import { Collection } from '@semble/types';
import CollectionListScrollArea, {
  COLLECTION_PANEL_HEIGHT,
} from '../collectionSelector/CollectionListScrollArea';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';

interface Props {
  selectedCollections: Collection[];
  onSelectedCollectionsChange: (collectionIds: Collection[]) => void;
}

export default function CollectionSelectorMyCollections(props: Props) {
  const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useMyCollections();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const searchedCollections = useCollectionSearch({ query: debouncedSearch });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []).filter((c) => c.id) ??
    [];

  const searchResults =
    searchedCollections.data?.pages.flatMap((page) => page.collections ?? []) ??
    [];

  const hasCollections = allCollections.length > 0;

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

  if (error) {
    return <CollectionSelectorError />;
  }

  const isSearching = !!search && searchedCollections.isPending;

  const isEmpty = search
    ? !!searchedCollections.data && searchResults.length === 0
    : !hasCollections;

  const createButton = (search || !hasCollections) && (
    <Button
      variant="light"
      color="gray"
      leftSection={<FiPlus size={22} />}
      onClick={() => setIsDrawerOpen(true)}
    >
      {search ? `Create new collection "${search}"` : 'Create new collection'}
    </Button>
  );

  return (
    <Fragment>
      <Stack gap="xl">
        <Stack gap={'sm'} h={COLLECTION_PANEL_HEIGHT}>
          <TextInput
            placeholder="Search or create a collection"
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

          {isSearching || isEmpty ? (
            <Stack justify="center" style={{ flex: 1 }}>
              {isSearching ? (
                <Stack align="center" gap="xs">
                  <Text fw={500} c="gray">
                    Searching collections...
                  </Text>
                  <Loader color="gray" />
                </Stack>
              ) : (
                <EmptyState
                  message={
                    search
                      ? `No results found for "${search}"`
                      : 'No collections'
                  }
                  button={createButton || undefined}
                />
              )}
            </Stack>
          ) : (
            <CollectionListScrollArea>
              <Stack gap="xxs">
                {createButton}

                {search ? (
                  <InfiniteScroll
                    dataLength={searchResults.length}
                    hasMore={!!searchedCollections.hasNextPage}
                    isInitialLoading={false}
                    isLoading={searchedCollections.isFetchingNextPage}
                    loadMore={() => searchedCollections.fetchNextPage()}
                    hideEndIndicator
                  >
                    <CollectionSelectorItemList
                      collections={searchResults}
                      selectedCollections={props.selectedCollections}
                      onChange={handleCollectionChange}
                    />
                  </InfiniteScroll>
                ) : (
                  <InfiniteScroll
                    dataLength={allCollections.length}
                    hasMore={!!hasNextPage}
                    isInitialLoading={false}
                    isLoading={isFetchingNextPage}
                    loadMore={() => fetchNextPage()}
                    hideEndIndicator
                  >
                    <CollectionSelectorBrowseList
                      selectedCollections={props.selectedCollections}
                      unselectedCollections={unselectedCollections}
                      onChange={handleCollectionChange}
                      emptyMessage="No collections available"
                    />
                  </InfiniteScroll>
                )}
              </Stack>
            </CollectionListScrollArea>
          )}
        </Stack>
      </Stack>

      <CreateCollectionDrawer
        key={search}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialName={search}
        onCreate={(collection) => {
          setSearch('');
          handleCollectionChange(true, collection);
        }}
      />
    </Fragment>
  );
}
