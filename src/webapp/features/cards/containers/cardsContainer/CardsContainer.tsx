'use client';

import { Button, Container, Group, Select, Stack } from '@mantine/core';
import { Suspense, useState } from 'react';
import { SortOrder, CardSortField } from '@semble/types';
import CardsContainerContent from '../cardsContainerContent/CardsContainerContent';
import CardsContainerContentSkeleton from '../cardsContainerContent/Skeleton.CardsContainerContent';
import { BsFillGridFill, BsListTask } from 'react-icons/bs';
import { useUserSettings } from '@/features/settings/lib/queries/useUserSettings';

interface Props {
  handle: string;
}

type SortOption = 'newest' | 'oldest' | 'most-popular';

export default function CardsContainer(props: Props) {
  const { settings, updateSetting } = useUserSettings();
  const [sortOption, setSortOption] = useState<SortOption>('newest');

  const getSortParams = (option: SortOption) => {
    switch (option) {
      case 'newest':
        return { sortBy: CardSortField.UPDATED_AT, sortOrder: SortOrder.DESC };
      case 'oldest':
        return { sortBy: CardSortField.UPDATED_AT, sortOrder: SortOrder.ASC };
      case 'most-popular':
        return {
          sortBy: CardSortField.LIBRARY_COUNT,
          sortOrder: SortOrder.DESC,
        };
      default:
        return { sortBy: CardSortField.UPDATED_AT, sortOrder: SortOrder.DESC };
    }
  };

  const { sortBy, sortOrder } = getSortParams(sortOption);

  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group gap={'xs'} justify="space-between">
          <Select
            allowDeselect={false}
            variant="filled"
            size="sm"
            value={sortOption}
            onChange={(value) => setSortOption(value as SortOption)}
            data={[
              { value: 'newest', label: 'Newest' },
              { value: 'oldest', label: 'Oldest' },
              { value: 'most-popular', label: 'Most Popular' },
            ]}
          />
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
            sortBy={sortBy}
            sortOrder={sortOrder}
          />
        </Suspense>
      </Stack>
    </Container>
  );
}
