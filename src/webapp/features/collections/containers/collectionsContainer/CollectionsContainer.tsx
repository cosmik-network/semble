'use client';

import { Container, Stack, Group, Button } from '@mantine/core';
import { Suspense } from 'react';
import CollectionsContainerContent from '../collectionsContainerContent/CollectionsContainerContent';
import CollectionsContainerContentSkeleton from '../collectionsContainerContent/Skeleton.collectionsContainerContent';
import { IoSearch } from 'react-icons/io5';
import Link from 'next/link';
import { CollectionFilters } from '../../components/collectionFilters/CollectionFilters';

interface Props {
  handle: string;
}

export default function CollectionsContainer(props: Props) {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group justify="space-between" gap={'xs'}>
          <CollectionFilters.Root>
            <CollectionFilters.SortSelect />
            <CollectionFilters.ViewToggle />
          </CollectionFilters.Root>
          <Button
            component={Link}
            href={`/search/collections?handle=${props.handle}`}
            variant="light"
            color="gray"
            rightSection={<IoSearch />}
          >
            Search
          </Button>
        </Group>
        <Suspense fallback={<CollectionsContainerContentSkeleton />}>
          <CollectionsContainerContent handle={props.handle} />
        </Suspense>
      </Stack>
    </Container>
  );
}
