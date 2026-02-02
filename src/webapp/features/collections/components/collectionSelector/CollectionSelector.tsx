'use client';

import {
  ScrollArea,
  Stack,
  TextInput,
  Text,
  Alert,
  Loader,
  CloseButton,
  Button,
  Group,
  Divider,
  FocusTrap,
} from '@mantine/core';
import { Fragment, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import useMyCollections from '../../lib/queries/useMyCollections';
import useCollectionSearch from '../../lib/queries/useCollectionSearch';
import CollectionSelectorItemList from '../collectionSelectorItemList/CollectionSelectorItemList';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';
import CollectionSelectorError from './Error.CollectionSelector';
import { FiPlus } from 'react-icons/fi';
import { IoSearch } from 'react-icons/io5';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  onSave: (e: React.FormEvent) => void;
  isSaving?: boolean;
  selectedCollections: SelectableCollectionItem[];
  onSelectedCollectionsChange: (
    collectionIds: SelectableCollectionItem[],
  ) => void;
}

export default function CollectionSelector(props: Props) {
  const { data, error } = useMyCollections();
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const searchedCollections = useCollectionSearch({ query: debouncedSearch });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const handleCollectionChange = (
    checked: boolean,
    item: SelectableCollectionItem,
  ) => {
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

  const allCollections =
    data?.pages.flatMap((page) => page.collections ?? []) ?? [];

  const hasCollections = allCollections.length > 0;
  const hasSelectedCollections = props.selectedCollections.length > 0;

  // filter out selected from all to avoid duplication
  const unselectedCollections = allCollections.filter(
    (c) => !props.selectedCollections.some((sel) => sel.id === c.id),
  );

  return (
    <Fragment>
      <FocusTrap.InitialFocus />
      <Stack gap="xl">
        <Stack gap={'sm'}>
          <TextInput
            placeholder="Search for collections"
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

          <ScrollArea.Autosize mah={218} type="auto">
            <Stack gap="xs">
              {search ? (
                <Fragment>
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
                        Searching collections...
                      </Text>
                      <Loader color="gray" />
                    </Stack>
                  )}

                  {searchedCollections.data &&
                    (searchedCollections.data.collections.length === 0 ? (
                      <Alert
                        color="gray"
                        title={`No results found for "${search}"`}
                      />
                    ) : (
                      <CollectionSelectorItemList
                        collections={searchedCollections.data.collections}
                        selectedCollections={props.selectedCollections}
                        onChange={handleCollectionChange}
                      />
                    ))}
                </Fragment>
              ) : hasCollections ? (
                <Fragment>
                  <Button
                    variant="light"
                    color="grape"
                    radius="md"
                    leftSection={<FiPlus size={22} />}
                    onClick={() => setIsDrawerOpen(true)}
                  >
                    Create new collection
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
                      {unselectedCollections.length > 0 && <Divider my="xs" />}
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
                      <Alert color="gray" title="No collections available" />
                    )
                  )}
                </Fragment>
              ) : (
                <Stack align="center" gap="xs">
                  <Text fz="lg" fw={600} c="gray">
                    No collections
                  </Text>
                  <Button
                    onClick={() => setIsDrawerOpen(true)}
                    variant="light"
                    color="gray"
                    rightSection={<FiPlus size={22} />}
                  >
                    Create a collection
                  </Button>
                </Stack>
              )}
            </Stack>
          </ScrollArea.Autosize>
        </Stack>

        {/* Action Buttons */}
        <Group justify="space-between" gap="xs" grow>
          <Button
            variant="light"
            color="gray"
            size="md"
            onClick={() => props.onCancel()}
          >
            Cancel
          </Button>

          <Button
            size="md"
            loading={props.isSaving}
            onClick={(e) => {
              props.onSave(e);
            }}
          >
            Save
          </Button>
        </Group>
      </Stack>

      <CreateCollectionDrawer
        key={search}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        initialName={search}
        onCreate={(newCollection) => {
          props.onSelectedCollectionsChange([
            ...props.selectedCollections,
            newCollection,
          ]);
          setSearch('');
        }}
      />
    </Fragment>
  );
}
