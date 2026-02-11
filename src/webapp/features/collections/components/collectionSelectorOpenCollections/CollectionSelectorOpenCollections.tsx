import {
  Alert,
  Button,
  CloseButton,
  Divider,
  ScrollArea,
  Stack,
  TextInput,
  Text,
  Loader,
} from '@mantine/core';
import { IoSearch } from 'react-icons/io5';
import CollectionSelectorItemList from '../collectionSelectorItemList/CollectionSelectorItemList';
import { Fragment, useState } from 'react';
import { FiPlus } from 'react-icons/fi';
import { useDebouncedValue } from '@mantine/hooks';
import CollectionSelectorError from '../collectionSelector/Error.CollectionSelector';
import CreateCollectionDrawer from '../createCollectionDrawer/CreateCollectionDrawer';
import useSearchCollections from '../../lib/queries/useSearchCollections';
import { Collection, CollectionAccessType } from '@semble/types';

interface Props {
  selectedCollections: Collection[];
  onSelectedCollectionsChange: (collectionIds: Collection[]) => void;
}

export default function CollectionSelectorOpenCollections(props: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);

  // note: this returns all open collections by default
  const searchedCollections = useSearchCollections({
    searchText: debouncedSearch,
    accessType: CollectionAccessType.OPEN,
  });

  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const allCollections =
    searchedCollections.data?.pages.flatMap((page) => page.collections ?? []) ??
    [];

  const hasCollections = allCollections.length > 0;
  const hasSelectedCollections = props.selectedCollections.length > 0;

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

  if (searchedCollections.error) {
    return <CollectionSelectorError />;
  }

  return (
    <Fragment>
      <Stack gap="xl">
        <Stack gap={'sm'}>
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

          <ScrollArea.Autosize mah={195} type="auto">
            <Stack gap="xs">
              {search ? (
                <Stack gap={'xs'}>
                  <Button
                    variant="light"
                    color="grape"
                    radius="md"
                    leftSection={<FiPlus size={22} />}
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    Create new collection "{search}"
                  </Button>

                  {searchedCollections.isPending && (
                    <Stack align="center">
                      <Text fw={500} c="gray">
                        Searching open collections...
                      </Text>
                      <Loader color="gray" />
                    </Stack>
                  )}

                  {!hasCollections ? (
                    <Alert
                      color="gray"
                      title={`No results found for "${search}"`}
                    />
                  ) : (
                    <CollectionSelectorItemList
                      collections={allCollections.filter(
                        (c) =>
                          !props.selectedCollections.some(
                            (sel) => sel.id === c.id,
                          ),
                      )}
                      selectedCollections={props.selectedCollections}
                      onChange={handleCollectionChange}
                    />
                  )}
                </Stack>
              ) : searchedCollections.isPending ? (
                <Stack align="center" gap="xs">
                  <Text fw={500} c="gray">
                    Loading open collections...
                  </Text>
                  <Loader color="gray" />
                </Stack>
              ) : hasCollections ? (
                <Stack gap={'xs'}>
                  <Button
                    variant="light"
                    color="grape"
                    radius="md"
                    leftSection={<FiPlus size={22} />}
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    Create new open collection
                  </Button>

                  {/* selected collections */}
                  {hasSelectedCollections && (
                    <Fragment>
                      <Text fw={600} fz={'sm'} c={'gray'}>
                        Selected Collections ({props.selectedCollections.length}
                        )
                      </Text>
                      <CollectionSelectorItemList
                        collections={props.selectedCollections}
                        selectedCollections={props.selectedCollections}
                        onChange={handleCollectionChange}
                      />
                      {unselectedCollections.length > 0 && (
                        <Divider variant="dashed" my="xs" />
                      )}
                    </Fragment>
                  )}

                  {/* remaining collections */}
                  {unselectedCollections.length > 0 ? (
                    <CollectionSelectorItemList
                      collections={unselectedCollections}
                      selectedCollections={props.selectedCollections}
                      onChange={handleCollectionChange}
                    />
                  ) : (
                    !hasSelectedCollections && (
                      <Alert
                        color="gray"
                        title="No open collections available"
                      />
                    )
                  )}
                </Stack>
              ) : (
                <Stack align="center" gap="xs">
                  <Text fz="lg" fw={600} c="gray">
                    No open collections
                  </Text>
                </Stack>
              )}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>
      </Stack>

      <CreateCollectionDrawer
        key={search}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialName={search}
        initialAccessType={CollectionAccessType.OPEN}
        onCreate={() => {
          setSearch('');
        }}
      />
    </Fragment>
  );
}
