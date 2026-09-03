'use client';

import { Container } from '@mantine/core';
import ErrorState from '@/components/contentDisplay/errorState/ErrorState';

export default function Error() {
  return (
    <Container p="xs" size="xl">
      <ErrorState message="Could not load followers" />
    </Container>
  );
}
