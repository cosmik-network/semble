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
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import CreateCollectionDrawer from '../createCollectionDrawer/CreateCollectionDrawer';
import useSearchCollections from '../../lib/queries/useSearchCollections';
import { Collection, CollectionAccessType } from '@semble/types';
import useOpenCollectionsWithContributor from '../../lib/queries/useOpenCollectionsWithContributor';
import { useAuth } from '@/hooks/useAuth';
import CollectionListScrollArea, {
  COLLECTION_PANEL_HEIGHT,
} from '../collectionSelector/CollectionListScrollArea';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';

interface Props {
  selectedCollections: Collection[];
  onSelectedCollectionsChange: (collectionIds: Collection[]) => void;
}

export default function CollectionSelectorOpenCollections(props: Props) {
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);

  const userContributedCollections = useOpenCollectionsWithContributor({
    identifier: user?.id || '',
  });

  const userCollections =
    userContributedCollections.data?.pages.flatMap(
      (page) => page.collections ?? [],
    ) ?? [];

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

  const allCollections = search
    ? searchResults
    : userCollections.length > 0
      ? userCollections
      : searchResults;

  const listQuery = search
    ? searchedCollections
    : userCollections.length > 0
      ? userContributedCollections
      : searchedCollections;

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

  const isLoading = listQuery.isPending || search !== debouncedSearch;

  if (searchedCollections.error || userContributedCollections.error) {
    return <ErrorState message="Could not load collections" />;
  }

  const isEmpty = !isLoading && !hasCollections;

  const createButton = (search || !hasCollections) && (
    <Button
      variant="light"
      color="gray"
      leftSection={<FiPlus size={22} />}
      onClick={() => setIsDrawerOpen(true)}
    >
      {search
        ? `Create new collection "${search}"`
        : 'Create new open collection'}
    </Button>
  );

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

          {isLoading || isEmpty ? (
            <Stack justify="center" style={{ flex: 1 }}>
              {isLoading ? (
                <Stack align="center" gap="xs">
                  {search && (
                    <Text fw={500} c="gray">
                      Searching open collections...
                    </Text>
                  )}
                  <Loader color="gray" />
                </Stack>
              ) : (
                <EmptyState
                  message={
                    search
                      ? `No results found for "${search}"`
                      : 'No open collections'
                  }
                  button={createButton || undefined}
                />
              )}
            </Stack>
          ) : (
            <CollectionListScrollArea
              onBottomReached={() => {
                if (listQuery.hasNextPage && !listQuery.isFetchingNextPage)
                  listQuery.fetchNextPage();
              }}
              isLoadingMore={listQuery.isFetchingNextPage}
            >
              <Stack gap="xxs">
                {createButton}

                {search ? (
                  <CollectionSelectorItemList
                    collections={allCollections}
                    selectedCollections={props.selectedCollections}
                    onChange={handleCollectionChange}
                  />
                ) : (
                  <CollectionSelectorBrowseList
                    selectedCollections={props.selectedCollections}
                    unselectedCollections={unselectedCollections}
                    onChange={handleCollectionChange}
                    emptyMessage="No open collections available"
                  />
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
        initialAccessType={CollectionAccessType.OPEN}
        onCreate={(collection) => {
          setSearch('');
          handleCollectionChange(true, collection);
        }}
      />
    </Fragment>
  );
}
