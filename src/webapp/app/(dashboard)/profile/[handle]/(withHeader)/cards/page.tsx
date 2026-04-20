import CardsContainer from '@/features/cards/containers/cardsContainer/CardsContainer';
import { Group, Container } from '@mantine/core';
import { IoSearch } from 'react-icons/io5';
import {
  CardFiltersRoot,
  CardFiltersSortSelect,
  CardFiltersViewToggle,
  CardFiltersTypeFilter,
  CardFiltersUncollectedToggle,
} from '@/features/cards/components/cardFilters/CardFilters';
import { CardSortField, UrlType } from '@semble/types';
import { Fragment } from 'react';
import { LinkButton } from '@/components/link/MantineLink';

interface Props {
  params: Promise<{ handle: string }>;
  searchParams: Promise<{ sort?: string; type?: string; uncollected?: string }>;
}

export default async function Page(props: Props) {
  const [{ handle }, { sort, type, uncollected }] = await Promise.all([
    props.params,
    props.searchParams,
  ]);

  const resolvedSort = (sort as CardSortField) ?? CardSortField.UPDATED_AT;
  const resolvedType = (type as UrlType) ?? null;
  const resolvedUncollected = uncollected === 'true';

  const suspenseKey = `${resolvedSort}-${resolvedType}-${resolvedUncollected}`;

  return (
    <Fragment>
      <Container p={0} size="xl">
        <Group justify="space-between" gap="xs" px="xs" pt="xs">
          <CardFiltersRoot>
            <CardFiltersSortSelect />
            <CardFiltersViewToggle />
            <CardFiltersTypeFilter />
            <CardFiltersUncollectedToggle />
          </CardFiltersRoot>
          <LinkButton
            href={`/search/cards?handle=${handle}`}
            variant="light"
            color="gray"
            rightSection={<IoSearch />}
          >
            Search
          </LinkButton>
        </Group>
      </Container>
      <CardsContainer handle={handle} key={suspenseKey} />
    </Fragment>
  );
}
