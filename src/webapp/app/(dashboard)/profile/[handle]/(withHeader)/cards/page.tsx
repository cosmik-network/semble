import CardsContainer from '@/features/cards/containers/cardsContainer/CardsContainer';
import { Group, Button, Container } from '@mantine/core';
import Link from 'next/link';
import { IoSearch } from 'react-icons/io5';
import {
  CardFiltersRoot,
  CardFiltersSortSelect,
  CardFiltersViewToggle,
  CardFiltersTypeFilter,
} from '@/features/cards/components/cardFilters/CardFilters';
import { CardSortField, UrlType } from '@semble/types';
import { Fragment } from 'react';

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ sort?: string; type?: string }>;
}

export default async function Page(props: Props) {
  const [{ handle }, { sort, type }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const resolvedSort = (sort as CardSortField) ?? CardSortField.UPDATED_AT;
  const resolvedType = (type as UrlType) ?? null;

  const suspenseKey = `${resolvedSort}-${resolvedType}`;

  return (
    <Fragment>
      <Container p={0} size="xl">
        <Group justify="space-between" gap="xs" px="xs" pt="xs">
          <CardFiltersRoot>
            <CardFiltersSortSelect />
            <CardFiltersViewToggle />
            <CardFiltersTypeFilter />
          </CardFiltersRoot>
          <Button
            component={Link}
            href={`/search/cards?handle=${handle}`}
            variant="light"
            color="gray"
            rightSection={<IoSearch />}
          >
            Search
          </Button>
        </Group>
      </Container>
      <CardsContainer handle={handle} key={suspenseKey} />
    </Fragment>
  );
}
