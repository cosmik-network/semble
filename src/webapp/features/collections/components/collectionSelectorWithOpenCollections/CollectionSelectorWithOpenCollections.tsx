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
  Tabs,
} from '@mantine/core';
import { Fragment, useState } from 'react';
import { useDebouncedValue } from '@mantine/hooks';
import useMyCollections from '../../lib/queries/useMyCollections';
import useCollectionSearch from '../../lib/queries/useCollectionSearch';
import CollectionSelectorItemList from '../collectionSelectorItemList/CollectionSelectorItemList';
import CreateCollectionDrawer from '@/features/collections/components/createCollectionDrawer/CreateCollectionDrawer';
import CollectionSelectorError from '../collectionSelector/Error.CollectionSelector';
import { FiPlus, FiLock, FiUnlock } from 'react-icons/fi';
import { IoSearch } from 'react-icons/io5';
import { useAuth } from '@/hooks/useAuth';
import { useFeatureFlags } from '@/lib/clientFeatureFlags';
import useSearchCollections from '../../lib/queries/useSearchCollections';
import useOpenCollectionsWithContributor from '../../lib/queries/useOpenCollectionsWithContributor';
import { CollectionAccessType } from '@semble/types';

interface SelectableCollectionItem {
  id: string;
  name: string;
  cardCount: number;
}

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

export default function CollectionSelectorWithOpenCollections(props: Props) {
  const { data: featureFlags } = useFeatureFlags();
  const { user } = useAuth();
  const { data, error } = useMyCollections();
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch] = useDebouncedValue(search, 200);
  const searchedCollections = useCollectionSearch({ query: debouncedSearch });
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Open collections search
  const [openSearch, setOpenSearch] = useState<string>('');
  const [debouncedOpenSearch] = useDebouncedValue(openSearch, 200);
  const searchedOpenCollections = useSearchCollections({
    searchText: debouncedOpenSearch,
    accessType: CollectionAccessType.OPEN,
  });

  // Get recently contributed open collections
  const recentOpenCollections = useOpenCollectionsWithContributor({
    identifier: user?.handle || '',
    enabled: !!user?.handle && featureFlags?.openCollections,
  });

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

  // Open collections
  const allOpenCollections =
    searchedOpenCollections.data?.pages.flatMap(
      (page) => page.collections ?? [],
    ) ?? [];
  const recentOpenCollectionsList =
    recentOpenCollections.data?.pages.flatMap(
      (page) => page.collections ?? [],
    ) ?? [];
  const unselectedOpenCollections = allOpenCollections.filter(
    (c) => !props.selectedCollections.some((sel) => sel.id === c.id),
  );

  // If feature flag is not enabled, use the original component behavior
  if (!featureFlags?.openCollections) {
    return (
      <Fragment>
        <FocusTrap.InitialFocus />
        <Stack gap="xl">
          <Stack>
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

            <ScrollArea.Autosize mah={215} type="auto">
              <Stack gap="xs">
                {search ? (
                  <>
                    {searchedCollections.isLoading ? (
                      <Stack align="center" gap={'xs'}>
                        <Loader color={'gray'} />
                        <Text fw={600} c={'gray'}>
                          Searching...
                        </Text>
                      </Stack>
                    ) : searchedCollections.data?.collections.length === 0 ? (
                      <Text>No collections found</Text>
                    ) : (
                      <CollectionSelectorItemList
                        collections={
                          searchedCollections.data?.collections ?? []
                        }
                        selectedCollections={props.selectedCollections}
                        onChange={handleCollectionChange}
                      />
                    )}
                  </>
                ) : (
                  <>
                    {hasSelectedCollections && (
                      <Stack gap={'xs'}>
                        <Text fw={600}>Selected</Text>
                        <CollectionSelectorItemList
                          collections={props.selectedCollections}
                          selectedCollections={props.selectedCollections}
                          onChange={handleCollectionChange}
                        />
                      </Stack>
                    )}

                    {hasSelectedCollections && hasCollections && <Divider />}

                    {hasCollections ? (
                      <Stack gap={'xs'}>
                        <Text fw={600}>Collections</Text>
                        <CollectionSelectorItemList
                          collections={unselectedCollections}
                          selectedCollections={props.selectedCollections}
                          onChange={handleCollectionChange}
                        />
                      </Stack>
                    ) : (
                      !hasSelectedCollections && (
                        <Alert color="gray">
                          You don't have any collections yet. Create your first
                          one!
                        </Alert>
                      )
                    )}
                  </>
                )}
              </Stack>
            </ScrollArea.Autosize>
          </Stack>

          <Stack gap={'xs'}>
            <Button
              variant="light"
              color="gray"
              fullWidth
              size="md"
              leftSection={<FiPlus />}
              onClick={() => setIsDrawerOpen(true)}
            >
              Create new collection
            </Button>
            <Group gap={'xs'} grow>
              <Button
                type="button"
                variant="light"
                color="gray"
                size="md"
                onClick={props.onCancel}
                loading={props.isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="md"
                onClick={props.onSave}
                loading={props.isSaving}
              >
                Save
              </Button>
            </Group>
          </Stack>
        </Stack>

        <CreateCollectionDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          onSuccess={(collectionId, collectionName) => {
            handleCollectionChange(true, {
              id: collectionId,
              name: collectionName,
              cardCount: 0,
            });
            setIsDrawerOpen(false);
          }}
        />
      </Fragment>
    );
  }

  // Enhanced version with tabs for open collections
  return (
    <Fragment>
      <FocusTrap.InitialFocus />
      <Tabs defaultValue="my-collections">
        <Tabs.List>
          <Tabs.Tab value="my-collections" leftSection={<FiLock size={14} />}>
            My Collections
          </Tabs.Tab>
          <Tabs.Tab
            value="open-collections"
            leftSection={<FiUnlock size={14} />}
          >
            Open Collections
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="my-collections" pt="md">
          <Stack gap="xl">
            <Stack>
              <TextInput
                placeholder="Search my collections"
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

              <ScrollArea.Autosize mah={215} type="auto">
                <Stack gap="xs">
                  {search ? (
                    <>
                      {searchedCollections.isLoading ? (
                        <Stack align="center" gap={'xs'}>
                          <Loader color={'gray'} />
                          <Text fw={600} c={'gray'}>
                            Searching...
                          </Text>
                        </Stack>
                      ) : searchedCollections.data?.collections.length === 0 ? (
                        <Text>No collections found</Text>
                      ) : (
                        <CollectionSelectorItemList
                          collections={
                            searchedCollections.data?.collections ?? []
                          }
                          selectedCollections={props.selectedCollections}
                          onChange={handleCollectionChange}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {hasSelectedCollections && (
                        <Stack gap={'xs'}>
                          <Text fw={600}>Selected</Text>
                          <CollectionSelectorItemList
                            collections={props.selectedCollections}
                            selectedCollections={props.selectedCollections}
                            onChange={handleCollectionChange}
                          />
                        </Stack>
                      )}

                      {hasSelectedCollections && hasCollections && <Divider />}

                      {hasCollections ? (
                        <Stack gap={'xs'}>
                          <Text fw={600}>Collections</Text>
                          <CollectionSelectorItemList
                            collections={unselectedCollections}
                            selectedCollections={props.selectedCollections}
                            onChange={handleCollectionChange}
                          />
                        </Stack>
                      ) : (
                        !hasSelectedCollections && (
                          <Alert color="gray">
                            You don't have any collections yet. Create your
                            first one!
                          </Alert>
                        )
                      )}
                    </>
                  )}
                </Stack>
              </ScrollArea.Autosize>
            </Stack>

            <Stack gap={'xs'}>
              <Button
                variant="light"
                color="gray"
                fullWidth
                size="md"
                leftSection={<FiPlus />}
                onClick={() => setIsDrawerOpen(true)}
              >
                Create new collection
              </Button>
              <Group gap={'xs'} grow>
                <Button
                  type="button"
                  variant="light"
                  color="gray"
                  size="md"
                  onClick={props.onCancel}
                  loading={props.isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  onClick={props.onSave}
                  loading={props.isSaving}
                >
                  Save
                </Button>
              </Group>
            </Stack>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="open-collections" pt="md">
          <Stack gap="xl">
            <Stack>
              <TextInput
                placeholder="Search open collections"
                value={openSearch}
                onChange={(e) => setOpenSearch(e.currentTarget.value)}
                size="md"
                variant="filled"
                id="open-search"
                leftSection={<IoSearch size={22} />}
                rightSection={
                  <CloseButton
                    aria-label="Clear input"
                    onClick={() => setOpenSearch('')}
                    style={{ display: openSearch ? undefined : 'none' }}
                  />
                }
              />

              <ScrollArea.Autosize mah={215} type="auto">
                <Stack gap="xs">
                  {openSearch ? (
                    <>
                      {searchedOpenCollections.isLoading ? (
                        <Stack align="center" gap={'xs'}>
                          <Loader color={'gray'} />
                          <Text fw={600} c={'gray'}>
                            Searching open collections...
                          </Text>
                        </Stack>
                      ) : unselectedOpenCollections.length === 0 ? (
                        <Text>No open collections found</Text>
                      ) : (
                        <CollectionSelectorItemList
                          collections={unselectedOpenCollections}
                          selectedCollections={props.selectedCollections}
                          onChange={handleCollectionChange}
                        />
                      )}
                    </>
                  ) : (
                    <>
                      {hasSelectedCollections && (
                        <Stack gap={'xs'}>
                          <Text fw={600}>Selected</Text>
                          <CollectionSelectorItemList
                            collections={props.selectedCollections.filter(
                              (c) =>
                                allOpenCollections.some(
                                  (oc) => oc.id === c.id,
                                ) ||
                                recentOpenCollectionsList.some(
                                  (rc) => rc.id === c.id,
                                ),
                            )}
                            selectedCollections={props.selectedCollections}
                            onChange={handleCollectionChange}
                          />
                        </Stack>
                      )}

                      {recentOpenCollectionsList.length > 0 ? (
                        <Stack gap={'xs'}>
                          <Text fw={600}>Recently Contributed To</Text>
                          <CollectionSelectorItemList
                            collections={recentOpenCollectionsList.filter(
                              (c) =>
                                !props.selectedCollections.some(
                                  (sel) => sel.id === c.id,
                                ),
                            )}
                            selectedCollections={props.selectedCollections}
                            onChange={handleCollectionChange}
                          />
                        </Stack>
                      ) : (
                        !openSearch && (
                          <Alert color="gray">
                            Search for open collections to contribute to
                          </Alert>
                        )
                      )}
                    </>
                  )}
                </Stack>
              </ScrollArea.Autosize>
            </Stack>

            <Stack gap={'xs'}>
              <Group gap={'xs'} grow>
                <Button
                  type="button"
                  variant="light"
                  color="gray"
                  size="md"
                  onClick={props.onCancel}
                  loading={props.isSaving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="md"
                  onClick={props.onSave}
                  loading={props.isSaving}
                >
                  Save
                </Button>
              </Group>
            </Stack>
          </Stack>
        </Tabs.Panel>
      </Tabs>

      <CreateCollectionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSuccess={(collectionId, collectionName) => {
          handleCollectionChange(true, {
            id: collectionId,
            name: collectionName,
            cardCount: 0,
          });
          setIsDrawerOpen(false);
        }}
      />
    </Fragment>
  );
}
