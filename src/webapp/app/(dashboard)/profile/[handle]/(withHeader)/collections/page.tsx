import CollectionsContainer from '@/features/collections/containers/collectionsContainer/CollectionsContainer';
import { Group, Button } from '@mantine/core';
import Link from 'next/link';
import { IoSearch } from 'react-icons/io5';
import {
  CollectionFiltersRoot,
  CollectionFiltersSortSelect,
  CollectionFiltersViewToggle,
} from '@/features/collections/components/collectionFilters/CollectionFilters';
import { Fragment } from 'react';
import { CollectionSortField } from '@semble/types';

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ collectionSort?: string }>;
}

export default async function Page(props: Props) {
  const [{ handle }, { collectionSort }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const sort =
    (collectionSort as CollectionSortField) ?? CollectionSortField.UPDATED_AT;

  return (
    <Fragment>
      <Group justify="space-between" gap="xs" px="xs" pt="xs">
        <CollectionFiltersRoot>
          <CollectionFiltersSortSelect />
          <CollectionFiltersViewToggle />
        </CollectionFiltersRoot>
        <Button
          component={Link}
          href={`/search/collections?handle=${handle}`}
          variant="light"
          color="gray"
          rightSection={<IoSearch />}
        >
          Search
        </Button>
      </Group>
      <CollectionsContainer handle={handle} key={sort} />
    </Fragment>
  );
}
