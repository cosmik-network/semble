'use client';

import { Suspense } from 'react';
import { Stack, Button, Group, FocusTrap, Tabs } from '@mantine/core';
import CollectionSelectorMyCollections from '../collectionSelectorMyCollections/CollectionSelectorMyCollections';
import CollectionSelectorOpenCollections from '../collectionSelectorOpenCollections/CollectionSelectorOpenCollections';
import classes from './TabItem.module.css';
import { Collection } from '@semble/types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  onSave: (e: React.FormEvent) => void;
  isSaving?: boolean;
  selectedCollections: Collection[];
  onSelectedCollectionsChange: (collectionIds: Collection[]) => void;
}

export default function CollectionSelector(props: Props) {
  return (
    <Stack gap={'xl'}>
      <FocusTrap.InitialFocus />
      <Tabs defaultValue={'myCollections'}>
        <Tabs.List grow mb={'xs'}>
          <Tabs.Tab classNames={classes} value="myCollections">
            My Collections
          </Tabs.Tab>
          <Tabs.Tab classNames={classes} value="openCollections">
            Open Collections
          </Tabs.Tab>
        </Tabs.List>
        <Tabs.Panel value="myCollections">
          <Suspense>
            <CollectionSelectorMyCollections
              selectedCollections={props.selectedCollections}
              onSelectedCollectionsChange={props.onSelectedCollectionsChange}
            />
          </Suspense>
        </Tabs.Panel>

        <Tabs.Panel value="openCollections">
          <Suspense>
            <CollectionSelectorOpenCollections
              selectedCollections={props.selectedCollections}
              onSelectedCollectionsChange={props.onSelectedCollectionsChange}
            />
          </Suspense>
        </Tabs.Panel>
      </Tabs>

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
  );
}
