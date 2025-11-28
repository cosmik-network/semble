'use client';

import { Container, Select, Stack } from '@mantine/core';
import { Suspense, useState } from 'react';
import { SortOrder } from '@semble/types';
import CardsContainerContent from '../cardsContainerContent/CardsContainerContent';
import CardsContainerContentSkeleton from '../cardsContainerContent/Skeleton.CardsContainerContent';

interface Props {
  handle: string;
}

export default function CardsContainer(props: Props) {
  const [sortOrder, setSortOrder] = useState<SortOrder>(SortOrder.DESC);

  return (
    <Container p="xs" size="xl">
      <Stack>
        <Select
          allowDeselect={false}
          mr={'auto'}
          size="sm"
          label="Sort by"
          value={sortOrder}
          onChange={(value) => setSortOrder(value as SortOrder)}
          data={[
            { value: SortOrder.DESC, label: 'Newest' },
            { value: SortOrder.ASC, label: 'Oldest' },
          ]}
        />
        <Suspense fallback={<CardsContainerContentSkeleton />}>
          <CardsContainerContent handle={props.handle} sortOrder={sortOrder} />
        </Suspense>
      </Stack>
    </Container>
  );
}
