'use client';

import { Container, Group, Stack } from '@mantine/core';
import AtmosphereConfCollectionsContainerContent from '../atmosphereConfCollectionsContainerContent/AtmosphereConfCollectionsContainerContent';
import { CollectionFilters } from '../../components/collectionFilters/CollectionFilters';

export default function AtmosphereConfCollectionsContainer() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <Group gap={'xs'}>
          <CollectionFilters.Root>
            <CollectionFilters.SortSelect />
            <CollectionFilters.ViewToggle />
          </CollectionFilters.Root>
        </Group>

        <AtmosphereConfCollectionsContainerContent />
      </Stack>
    </Container>
  );
}
