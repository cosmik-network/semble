'use client';

import { Container, Stack, Skeleton } from '@mantine/core';

export default function AppearanceContainerSkeleton() {
  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <Skeleton w={'100%'} h={36} />
        <Skeleton w={'100%'} h={36} />
        <Skeleton w={'100%'} h={36} />
      </Stack>
    </Container>
  );
}
