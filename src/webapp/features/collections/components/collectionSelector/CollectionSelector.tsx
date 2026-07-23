'use client';

import { Suspense, useState } from 'react';
import {
  Stack,
  Button,
  Group,
  FocusTrap,
  Tabs,
  ThemeIcon,
  Scroller,
  Loader,
  Text,
  Tooltip,
  ActionIcon,
} from '@mantine/core';
import CollectionSelectorMyCollections from '../collectionSelectorMyCollections/CollectionSelectorMyCollections';
import CollectionSelectorOpenCollections from '../collectionSelectorOpenCollections/CollectionSelectorOpenCollections';
import classes from './TabItem.module.css';
import { Collection } from '@semble/types';
import { FaSeedling } from 'react-icons/fa6';
import { BsTrash2Fill } from 'react-icons/bs';
import { COLLECTION_PANEL_HEIGHT } from './CollectionListScrollArea';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
  onSave: (e: React.FormEvent) => void;
  isSaving?: boolean;
  onDeleteCard?: () => void;
  isDeletingCard?: boolean;
  selectedCollections: Collection[];
  onSelectedCollectionsChange: (collectionIds: Collection[]) => void;
}

export default function CollectionSelector(props: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <Stack gap={'xl'}>
      <FocusTrap.InitialFocus />
      <Tabs defaultValue={'myCollections'} keepMounted={false}>
        <Tabs.List grow mb={'xs'} style={{ flexWrap: 'nowrap' }}>
          {/* Stretched so tabs grow to fill the row when there is room,
              while still scrolling horizontally on overflow */}
          <Scroller
            styles={{
              root: { flex: 1, minWidth: 0 },
              content: { minWidth: '100%' },
            }}
          >
            <Tabs.Tab classNames={classes} value="myCollections">
              My Collections
            </Tabs.Tab>
            <Tabs.Tab
              classNames={classes}
              leftSection={
                <ThemeIcon
                  variant="light"
                  radius={'xl'}
                  size={'xs'}
                  color="green"
                >
                  <FaSeedling size={8} />
                </ThemeIcon>
              }
              value="openCollections"
            >
              Open Collections
            </Tabs.Tab>
          </Scroller>
        </Tabs.List>

        <Tabs.Panel value="myCollections">
          <Suspense
            fallback={
              <Stack
                align="center"
                justify="center"
                h={COLLECTION_PANEL_HEIGHT}
              >
                <Loader color="gray" />
              </Stack>
            }
          >
            <CollectionSelectorMyCollections
              selectedCollections={props.selectedCollections}
              onSelectedCollectionsChange={props.onSelectedCollectionsChange}
            />
          </Suspense>
        </Tabs.Panel>

        <Tabs.Panel value="openCollections">
          <Suspense
            fallback={
              <Stack
                align="center"
                justify="center"
                h={COLLECTION_PANEL_HEIGHT}
              >
                <Loader color="gray" />
              </Stack>
            }
          >
            <CollectionSelectorOpenCollections
              selectedCollections={props.selectedCollections}
              onSelectedCollectionsChange={props.onSelectedCollectionsChange}
            />
          </Suspense>
        </Tabs.Panel>
      </Tabs>

      {/* Action Buttons */}
      {showDeleteConfirm ? (
        <Group justify="space-between" gap="xs" wrap="nowrap">
          <Text fw={500} c="red">
            Delete card?
          </Text>
          <Group gap="xs" wrap="nowrap">
            <Button
              variant="light"
              color="gray"
              size="md"
              disabled={props.isDeletingCard}
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              color="red"
              size="md"
              onClick={props.onDeleteCard}
              loading={props.isDeletingCard}
            >
              Delete
            </Button>
          </Group>
        </Group>
      ) : (
        <Group gap="xs" wrap="nowrap">
          {props.onDeleteCard && (
            <Tooltip label="Delete card">
              <ActionIcon
                size={42}
                radius="xl"
                variant="light"
                color="red"
                aria-label="Delete card"
                disabled={props.isSaving}
                onClick={() => setShowDeleteConfirm(true)}
              >
                <BsTrash2Fill size={16} />
              </ActionIcon>
            </Tooltip>
          )}
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
            style={{ flex: 1 }}
            loading={props.isSaving}
            onClick={(e) => {
              props.onSave(e);
            }}
          >
            Save
          </Button>
        </Group>
      )}
    </Stack>
  );
}
