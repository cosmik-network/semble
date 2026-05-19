import { Card, Container, Group, Skeleton, Stack } from '@mantine/core';

export default function DataSyncContainerSkeleton() {
  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Skeleton height={14} width={84} radius="sm" />
            <Skeleton height={12} width={240} radius="sm" />
          </Stack>
          <Skeleton height={36} width={120} radius="xl" />
        </Group>
        <Card bg="var(--mantine-color-gray-light)" radius="lg" p="md">
          <Stack gap="sm">
            <Skeleton height={18} width={70} radius="xl" />
            <Skeleton height={12} width={260} radius="sm" />
            <Skeleton height={10} width={140} radius="sm" />
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
}
