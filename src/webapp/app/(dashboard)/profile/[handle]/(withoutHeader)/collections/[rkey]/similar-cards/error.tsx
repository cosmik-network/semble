'use client';

import ErrorState from '@/components/contentDisplay/errorState/ErrorState';
import { Container } from '@mantine/core';

export default function Error() {
  return (
    <Container size="xl" p="xs">
      <ErrorState message="Could not load similar cards" />
    </Container>
  );
}
