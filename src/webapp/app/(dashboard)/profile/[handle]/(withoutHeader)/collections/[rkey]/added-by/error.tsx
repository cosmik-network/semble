'use client';

import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import { Container } from '@mantine/core';

export default function Error() {
  return (
    <Container p="xs" size="xl">
      <ErrorState message="Could not load libraries" />
    </Container>
  );
}
