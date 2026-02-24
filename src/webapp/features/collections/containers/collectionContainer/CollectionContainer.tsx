'use client';

import { Container, Group, Stack } from '@mantine/core';
import { Suspense } from 'react';
import CollectionContainerContent from '../collectionContainerContent/CollectionContainerContent';
import CollectionContainerContentSkeleton from '../collectionContainerContent/Skeleton.CollectionContainerContent';
import { CardFilters } from '@/features/cards/components/cardFilters/CardFilters';

interface Props {
  rkey: string;
  handle: string;
}

export default function CollectionContainer(props: Props) {
  return (
    <Container p="xs" size="xl">
      <Stack gap={'lg'}>
        <Group justify="space-between" gap={'xs'}>
          <CardFilters.Root>
            <CardFilters.SortSelect />
            <CardFilters.ViewToggle />
            <CardFilters.TypeFilter />
          </CardFilters.Root>
        </Group>

        <Suspense fallback={<CollectionContainerContentSkeleton />}>
          <CollectionContainerContent rkey={props.rkey} handle={props.handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
