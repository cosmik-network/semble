'use client';

import { Container, Stack, Select, Group, Button } from '@mantine/core';
import { Suspense, useState } from 'react';
import { CollectionSortField } from '@semble/types';
import CollectionsContainerContent from '../collectionsContainerContent/CollectionsContainerContent';
import CollectionsContainerContentSkeleton from '../collectionsContainerContent/Skeleton.collectionsContainerContent';
import { IoSearch } from 'react-icons/io5';
import Link from 'next/link';

interface Props {
  handle: string;
}

export default function CollectionsContainer(props: Props) {
  const [sortBy, setSortBy] = useState<CollectionSortField>(
    CollectionSortField.UPDATED_AT,
  );

  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group align="end" gap={'xs'}>
          <Select
            w={140}
            allowDeselect={false}
            mr={'auto'}
            size="sm"
            variant="filled"
            value={sortBy}
            onChange={(value) => setSortBy(value as CollectionSortField)}
            data={[
              {
                value: CollectionSortField.UPDATED_AT,
                label: 'Last updated',
              },
              { value: CollectionSortField.CARD_COUNT, label: 'Card count' },
            ]}
          />
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
          <CollectionsContainerContent handle={props.handle} sortBy={sortBy} />
        </Suspense>
      </Stack>
    </Container>
  );
}
