import React, { Fragment } from 'react';
import CollectionSelectorItem from '../collectionSelectorItem/CollectionSelectorItem';

interface Collection {
  id: string;
  name: string;
  cardCount: number;
  uri?: string;
  author?: {
    handle: string;
  };
}

interface Props {
  collections: Collection[];
  selectedCollections: Collection[];
  onChange: (checked: boolean, item: Collection) => void;
  collectionsWithCard?: Collection[];
}

export default function CollectionSelectorItemList(props: Props) {
  if (props.collectionsWithCard) {
    return (
      <Fragment>
        {props.collections.map((c) => {
          const isDisabled = props.collectionsWithCard?.some(
            (col) => col.id === c.id,
          );

          return (
            <CollectionSelectorItem
              key={c.id}
              name={c.name}
              cardCount={c.cardCount}
              value={c.id}
              checked={
                !!props.selectedCollections.find((col) => col.id === c.id)
              }
              onChange={(checked) => props.onChange(checked, c)}
              disabled={isDisabled}
              uri={c.uri}
              authorHandle={c.author?.handle}
            />
          );
        })}
      </Fragment>
    );
  }

  return (
    <Fragment>
      {props.collections.map((c) => (
        <CollectionSelectorItem
          key={c.id}
          name={c.name}
          cardCount={c.cardCount}
          value={c.id}
          checked={!!props.selectedCollections.find((col) => col.id === c.id)}
          onChange={(checked) => props.onChange(checked, c)}
          uri={c.uri}
          authorHandle={c.author?.handle}
        />
      ))}
    </Fragment>
  );
}
