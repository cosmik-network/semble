'use client';

import { Button, Container, Group, Stack } from '@mantine/core';
import { Suspense } from 'react';
import CardsContainerContent from '../cardsContainerContent/CardsContainerContent';
import CardsContainerContentSkeleton from '../cardsContainerContent/Skeleton.CardsContainerContent';
import CardsFilters from '../../components/cardsFilters/CardsFilters';

export default function CardsContainer({ handle }: { handle: string }) {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <CardsFilters />

        <Suspense fallback={<CardsContainerContentSkeleton />}>
          <CardsContainerContent handle={handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
