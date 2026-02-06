'use client';

import { Container, Group, Select, Stack } from '@mantine/core';
import { CollectionSortField } from '@semble/types';
import { useState } from 'react';
import OpenCollectionsContainerContent from '../openCollectionsContainerContent/OpenCollectionsContainerContent';

export default function OpenCollectionsContainer() {
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
        </Group>

        <OpenCollectionsContainerContent sortBy={sortBy} />
      </Stack>
    </Container>
  );
}
