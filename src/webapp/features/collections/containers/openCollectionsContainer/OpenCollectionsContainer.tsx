'use client';

import { Container, Group, Stack } from '@mantine/core';
import OpenCollectionsContainerContent from '../openCollectionsContainerContent/OpenCollectionsContainerContent';
import { CollectionFilters } from '../../components/collectionFilters/CollectionFilters';

export default function OpenCollectionsContainer() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group gap={'xs'}>
          <CollectionFilters.Root>
            <CollectionFilters.SortSelect />
            <CollectionFilters.ViewToggle />
          </CollectionFilters.Root>
        </Group>

        <OpenCollectionsContainerContent />
      </Stack>
    </Container>
  );
}
