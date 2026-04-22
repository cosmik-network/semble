'use client';

import SembleCollectionsContainerError from '@/features/semble/containers/sembleCollectionsContainer/Error.SembleCollectionsContainer';
import { Container } from '@mantine/core';

export default function Error() {
  return (
    <Container p="xs" size="xl">
      <SembleCollectionsContainerError />
    </Container>
  );
}
