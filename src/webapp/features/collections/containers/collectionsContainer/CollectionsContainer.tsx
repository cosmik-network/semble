'use client';

import { CloseButton, Container, Group, Stack, TextInput } from '@mantine/core';
import { Suspense, useState } from 'react';
import CollectionsContainerContent from '../collectionsContainerContent/CollectionsContainerContent';
import CollectionsContainerContentSkeleton from '../collectionsContainerContent/Skeleton.collectionsContainerContent';
import { CollectionFilters } from '../../components/collectionFilters/CollectionFilters';
import { IoSearch } from 'react-icons/io5';
import { useDebouncedValue } from '@mantine/hooks';

interface Props {
  handle: string;
}

export default function CollectionsContainer(props: Props) {
  const [search, setSearch] = useState('');
  const [debouncedSearch] = useDebouncedValue(search, 300);

  return (
    <Container p={0} size={'xl'}>
      <Group justify="space-between" gap="xs" px="xs" pt="xs">
        <CollectionFilters.Root>
          <CollectionFilters.SortSelect />
          <CollectionFilters.ViewToggle />
        </CollectionFilters.Root>
        <TextInput
          variant="filled"
          placeholder="Search..."
          leftSection={<IoSearch />}
          rightSection={
            <CloseButton
              aria-label="Clear input"
              onClick={() => setSearch('')}
              style={{ display: search ? undefined : 'none' }}
            />
          }
          radius={'xl'}
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={160}
        />
      </Group>

      <Container p="xs" size="xl">
        <Stack>
          <Suspense fallback={<CollectionsContainerContentSkeleton />}>
            <CollectionsContainerContent
              handle={props.handle}
              query={debouncedSearch || undefined}
            />
          </Suspense>
        </Stack>
      </Container>
    </Container>
  );
}
