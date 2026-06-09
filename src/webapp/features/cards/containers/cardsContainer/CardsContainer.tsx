'use client';

import { CloseButton, Container, Group, Stack, TextInput } from '@mantine/core';
import { Suspense, useState } from 'react';
import CardsContainerContent from '../cardsContainerContent/CardsContainerContent';
import CardsContainerContentSkeleton from '../cardsContainerContent/Skeleton.CardsContainerContent';
import {
  CardFiltersRoot,
  CardFiltersSortSelect,
  CardFiltersViewToggle,
  CardFiltersTypeFilter,
  CardFiltersUncollectedToggle,
} from '../../components/cardFilters/CardFilters';
import { IoSearch } from 'react-icons/io5';
import { useDebouncedValue } from '@mantine/hooks';
import { useSearchParams } from 'next/navigation';

interface Props {
  handle: string;
}

export default function CardsContainer(props: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  const searchParams = useSearchParams();
  const suspenseKey = `${searchParams.get('sort')}-${searchParams.get('type')}-${searchParams.get('uncollected')}`;

  return (
    <Container p={0} size={'xl'}>
      <Group justify="space-between" gap="xs" px="xs" pt="xs">
        <CardFiltersRoot>
          <CardFiltersSortSelect />
          <CardFiltersViewToggle />
          <CardFiltersTypeFilter />
          <CardFiltersUncollectedToggle />
        </CardFiltersRoot>
        <TextInput
          variant="filled"
          placeholder="Search..."
          leftSection={<IoSearch />}
          rightSection={
            <CloseButton
              aria-label="Clear input"
              onClick={() => setSearch('')}
              style={{ display: search ? undefined : 'none' }}
            />
          }
          radius={'xl'}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={160}
        />
      </Group>

      <Container p="xs" size="xl">
        <Stack>
          <Suspense key={suspenseKey} fallback={<CardsContainerContentSkeleton />}>
            <CardsContainerContent
              handle={props.handle}
              query={debouncedSearch || undefined}
            />
          </Suspense>
        </Stack>
      </Container>
    </Container>
  );
}
