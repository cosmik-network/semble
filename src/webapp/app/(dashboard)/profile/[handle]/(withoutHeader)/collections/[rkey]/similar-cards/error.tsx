'use client';

import SembleSimilarCardsContainerError from '@/features/semble/containers/sembleSimilarCardsContainer/Error.SembleSimilarCardsContainer';
import { Container } from '@mantine/core';

export default function Error() {
  return (
    <Container size="xl" p="xs">
      <SembleSimilarCardsContainerError />
    </Container>
  );
}
