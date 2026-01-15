'use client';

import { Container, Stack } from '@mantine/core';
import { Suspense } from 'react';
import CardsContainerContent from '../cardsContainerContent/CardsContainerContent';
import CardsContainerContentSkeleton from '../cardsContainerContent/Skeleton.CardsContainerContent';
import CardFilters from '@/features/cards/components/cardFilters/CardFilters';
import CardSortSelect from '@/features/cards/components/cardFilters/CardSortSelect';
import CardTypeFilter from '@/features/cards/components/cardFilters/CardTypeFilter';
import CardViewToggle from '@/features/cards/components/cardFilters/CardViewToggle';

export default function CardsContainer({ handle }: { handle: string }) {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <CardFilters>
          <CardSortSelect />
          <CardTypeFilter />
          <CardViewToggle />
        </CardFilters>

        <Suspense fallback={<CardsContainerContentSkeleton />}>
          <CardsContainerContent handle={handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
