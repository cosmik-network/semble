import CollectionContainer from '@/features/collections/containers/collectionContainer/CollectionContainer';
import { Group } from '@mantine/core';
import {
  CardFiltersRoot,
  CardFiltersSortSelect,
  CardFiltersViewToggle,
  CardFiltersTypeFilter,
} from '@/features/cards/components/cardFilters/CardFilters';
import { CardSortField, UrlType } from '@semble/types';
import { Fragment } from 'react';

interface Props {
  params: Promise<{ rkey: string; handle: string }>;
  searchParams: Promise<{ sort?: string; type?: string }>;
}

export default async function Page(props: Props) {
  const [{ rkey, handle }, { sort, type }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const resolvedSort = (sort as CardSortField) ?? CardSortField.UPDATED_AT;
  const resolvedType = (type as UrlType) ?? null;

  const suspenseKey = `${resolvedSort}-${resolvedType}`;

  return (
    <Fragment>
      <Group justify="space-between" gap="xs" px="xs" pt="xs">
        <CardFiltersRoot>
          <CardFiltersSortSelect />
          <CardFiltersViewToggle />
          <CardFiltersTypeFilter />
        </CardFiltersRoot>
      </Group>
      <CollectionContainer handle={handle} rkey={rkey} key={suspenseKey} />
    </Fragment>
  );
}
