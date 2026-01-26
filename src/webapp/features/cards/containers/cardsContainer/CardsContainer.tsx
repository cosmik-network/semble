'use client';

import { Button, Container, Stack } from '@mantine/core';
import { Suspense } from 'react';
import CardsContainerContent from '../cardsContainerContent/CardsContainerContent';
import CardsContainerContentSkeleton from '../cardsContainerContent/Skeleton.CardsContainerContent';
import { CardFilters } from '@/features/cards/components/cardFilters/CardFilters';
import Link from 'next/link';
import { IoSearch } from 'react-icons/io5';

interface Props {
  handle: string;
}

export default function CardsContainer(props: Props) {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <CardFilters.Root>
          <CardFilters.SortSelect />
          <CardFilters.TypeFilter />
          <CardFilters.ViewToggle />
          <Button
            component={Link}
            href={`/search/cards?handle:${props.handle}`}
            variant="light"
            color="gray"
            rightSection={<IoSearch />}
          >
            Search
          </Button>
        </CardFilters.Root>

        <Suspense fallback={<CardsContainerContentSkeleton />}>
          <CardsContainerContent handle={props.handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
