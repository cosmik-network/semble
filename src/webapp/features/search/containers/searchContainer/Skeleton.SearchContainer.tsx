import { Container, Stack, Skeleton, Group } from '@mantine/core';

export default function SearchContainerSkeleton() {
  return (
    <Container p="xs" size="xl">
      <Stack gap="lg">
        <Group gap="xs">
          <Skeleton flex={1} h={36} />
          <Skeleton w={80} h={36} />
        </Group>
      </Stack>
    </Container>
  );
}
