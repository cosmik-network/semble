'use client';

import { Container, Stack } from '@mantine/core';
import AtmosphereConfCollectionsContainerContent from '../atmosphereConfCollectionsContainerContent/AtmosphereConfCollectionsContainerContent';

export default function AtmosphereConfCollectionsContainer() {
  return (
    <Container p="xs" size="xl">
      <Stack>
        <AtmosphereConfCollectionsContainerContent />
      </Stack>
    </Container>
  );
}
