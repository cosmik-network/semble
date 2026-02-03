import React, { Fragment } from 'react';
import CollectionSelectorItem from '../collectionSelectorItem/CollectionSelectorItem';
import { Stack } from '@mantine/core';

interface Collection {
  id: string;
  name: string;
  cardCount: number;
}

interface Props {
  collections: Collection[];
  selectedCollections: Collection[];
  onChange: (checked: boolean, item: Collection) => void;
}

export default function CollectionSelectorItemList(props: Props) {
  return (
    <Stack gap={'xs'}>
      {props.collections.map((c) => (
        <CollectionSelectorItem
          key={c.id}
          name={c.name}
          cardCount={c.cardCount}
          value={c.id}
          checked={!!props.selectedCollections.find((col) => col.id === c.id)}
          onChange={(checked) => props.onChange(checked, c)}
        />
      ))}
    </Stack>
  );
}
