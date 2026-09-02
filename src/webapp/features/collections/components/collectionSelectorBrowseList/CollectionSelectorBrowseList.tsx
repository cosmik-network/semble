import { Fragment } from 'react';
import { Divider, Stack, Text } from '@mantine/core';
import CollectionSelectorItemList from '../collectionSelectorItemList/CollectionSelectorItemList';
import { Collection } from '@semble/types';
import EmptyState from '@/components/contentDisplay/emptyState/EmptyState';

interface Props {
  selectedCollections: Collection[];
  unselectedCollections: Collection[];
  onChange: (checked: boolean, item: Collection) => void;
  emptyMessage: string;
}

export default function CollectionSelectorBrowseList(props: Props) {
  const hasSelectedCollections = props.selectedCollections.length > 0;

  return (
    <Stack gap={'xxs'}>
      {hasSelectedCollections && (
        <Fragment>
          <Text fw={600} fz={'sm'} c={'gray'}>
            Selected Collections ({props.selectedCollections.length})
          </Text>
          <CollectionSelectorItemList
            collections={props.selectedCollections}
            selectedCollections={props.selectedCollections}
            onChange={props.onChange}
          />
          {props.unselectedCollections.length > 0 && (
            <Divider variant="dashed" my="xs" />
          )}
        </Fragment>
      )}

      {props.unselectedCollections.length > 0 ? (
        <CollectionSelectorItemList
          collections={props.unselectedCollections}
          selectedCollections={props.selectedCollections}
          onChange={props.onChange}
        />
      ) : (
        !hasSelectedCollections && <EmptyState message={props.emptyMessage} />
      )}
    </Stack>
  );
}
