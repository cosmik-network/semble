'use client';

import { Container, Stack, Select } from '@mantine/core';
import { Suspense, useState } from 'react';
import { CollectionSortField } from '@semble/types';
import CollectionsContainerContent from '../collectionsContainerContent/CollectionsContainerContent';
import CollectionsContainerContentSkeleton from '../collectionsContainerContent/Skeleton.collectionsContainerContent';

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
        <Select
          allowDeselect={false}
          mr={'auto'}
          size="sm"
          label="Sort by"
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
        <Suspense fallback={<CollectionsContainerContentSkeleton />}>
          <CollectionsContainerContent handle={props.handle} sortBy={sortBy} />
        </Suspense>
      </Stack>
    </Container>
  );
}
