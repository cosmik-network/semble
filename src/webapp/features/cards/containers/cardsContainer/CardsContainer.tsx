'use client';

import { Container, Stack } from '@mantine/core';
import { Suspense } from 'react';
import CardsContainerContent from '../cardsContainerContent/CardsContainerContent';
import CardsContainerContentSkeleton from '../cardsContainerContent/Skeleton.CardsContainerContent';
import { CardFilters } from '@/features/cards/components/cardFilters/CardFilters';

export default function CardsContainer({ handle }: { handle: string }) {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <CardFilters.Root>
          <CardFilters.SortSelect />
          <CardFilters.TypeFilter />
          <CardFilters.ViewToggle />
        </CardFilters.Root>

        <Suspense fallback={<CardsContainerContentSkeleton />}>
          <CardsContainerContent handle={handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
