'use client';

import SembleAddedByContainerError from '@/features/semble/containers/sembleAddedByContainer/Error.SembleAddedByContainer';
import { Container } from '@mantine/core';

export default function Error() {
  return (
    <Container p="xs" size="xl">
      <SembleAddedByContainerError />
    </Container>
  );
}
