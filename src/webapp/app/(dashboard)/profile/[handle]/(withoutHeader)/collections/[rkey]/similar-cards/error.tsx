'use client';

import SimilarCardsContainerError from '@/features/cards/containers/similarCardsContainer/Error.SimilarCardsContainer';
import { Container } from '@mantine/core';

export default function Error() {
  return (
    <Container size="xl" p="xs">
      <SimilarCardsContainerError />
    </Container>
  );
}
