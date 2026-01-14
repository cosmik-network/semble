'use client';

import { Button, Container, Group, Select, Stack } from '@mantine/core';
import { Suspense, useState } from 'react';
import CardsContainerContent from '../cardsContainerContent/CardsContainerContent';
import CardsContainerContentSkeleton from '../cardsContainerContent/Skeleton.CardsContainerContent';
import { BsFillGridFill, BsListTask } from 'react-icons/bs';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';
import CardsFilters from '../../components/cardsFilters/CardsFilters';
import { CardSortField, SortOrder } from '@semble/types';

interface Props {
  handle: string;
}

export default function CardsContainer(props: Props) {
  const { settings, updateSetting } = useUserSettings();
  const [sortField, setSortField] = useState<CardSortField>(
    CardSortField.UPDATED_AT,
  );
  const sortOrderMap: Record<CardSortField, SortOrder> = {
    [CardSortField.UPDATED_AT]: SortOrder.DESC,
    [CardSortField.CREATED_AT]: SortOrder.ASC,
    [CardSortField.LIBRARY_COUNT]: SortOrder.DESC,
  };

  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group gap={'xs'} justify="space-between">
          <CardsFilters value={sortField} onChange={setSortField} />

          <Button
            variant="light"
            color="gray"
            leftSection={
              settings.cardView === 'grid' ? <BsFillGridFill /> : <BsListTask />
            }
            onClick={() =>
              updateSetting(
                'cardView',
                settings.cardView === 'grid' ? 'list' : 'grid',
              )
            }
          >
            {settings.cardView === 'grid' ? 'Grid' : 'List'}
          </Button>
        </Group>
        <Suspense fallback={<CardsContainerContentSkeleton />}>
          <CardsContainerContent
            handle={props.handle}
            sortBy={sortField}
            sortOrder={sortOrderMap[sortField]}
          />
        </Suspense>
      </Stack>
    </Container>
  );
}
