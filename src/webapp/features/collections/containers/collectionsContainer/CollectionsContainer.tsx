'use client';

import {
  Container,
  Stack,
  Select,
  TextInput,
  Group,
  CloseButton,
} from '@mantine/core';
import { Suspense, useState } from 'react';
import { CollectionSortField } from '@semble/types';
import CollectionsContainerContent from '../collectionsContainerContent/CollectionsContainerContent';
import CollectionsContainerContentSkeleton from '../collectionsContainerContent/Skeleton.collectionsContainerContent';
import { useDebouncedValue } from '@mantine/hooks';
import { IoSearch } from 'react-icons/io5';

interface Props {
  handle: string;
}

export default function CollectionsContainer(props: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 200);
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
          <TextInput
            placeholder={'Search for collections'}
            value={search}
            variant="filled"
            onChange={(e) => setSearch(e.currentTarget.value)}
            leftSection={<IoSearch />}
            rightSection={
              <CloseButton
                aria-label="Clear input"
                onClick={() => setSearch('')}
                style={{ display: search ? undefined : 'none' }}
              />
            }
            size="sm"
          />
        </Group>
        <Suspense fallback={<CollectionsContainerContentSkeleton />}>
          <CollectionsContainerContent
            handle={props.handle}
            sortBy={sortBy}
            query={debouncedSearch}
          />
        </Suspense>
      </Stack>
    </Container>
  );
}
