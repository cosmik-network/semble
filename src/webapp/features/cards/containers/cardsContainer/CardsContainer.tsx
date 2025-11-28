'use client';

import { Container, Select, Stack } from '@mantine/core';
import { Suspense, useState } from 'react';
import { SortOrder, CardSortField } from '@semble/types';
import CardsContainerContent from '../cardsContainerContent/CardsContainerContent';
import CardsContainerContentSkeleton from '../cardsContainerContent/Skeleton.CardsContainerContent';

interface Props {
  handle: string;
}

type SortOption = 'newest' | 'oldest' | 'most-popular';

export default function CardsContainer(props: Props) {
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
        <Select
          allowDeselect={false}
          mr={'auto'}
          size="sm"
          label="Sort by"
          value={sortOption}
          onChange={(value) => setSortOption(value as SortOption)}
          data={[
            { value: 'newest', label: 'Newest' },
            { value: 'oldest', label: 'Oldest' },
            { value: 'most-popular', label: 'Most Popular' },
          ]}
        />
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
