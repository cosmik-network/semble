import { Card, Container, Group, Skeleton, Stack } from '@mantine/core';
import classes from './ApiKeysContainer.module.css';

export default function ApiKeysContainerSkeleton() {
  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={8} py={4}>
            <Skeleton h={16} w={72} radius="sm" />
            <Skeleton h={14} w={260} radius="sm" />
          </Stack>
          <Skeleton h={36} w={110} radius="xl" />
        </Group>
        <Stack gap={0} className={classes.groupedCards}>
          {[1, 2, 3].map((i) => (
            <Card key={i} bg="var(--mantine-color-gray-light)" p="md">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={10} py={4}>
                  <Skeleton h={14} w={130} radius="sm" />
                  <Skeleton h={12} w={190} radius="sm" />
                  <Skeleton h={12} w={150} radius="sm" />
                </Stack>
                <Group gap="xs" wrap="nowrap">
                  <Skeleton h={28} w={28} radius="xl" />
                  <Skeleton h={28} w={28} radius="xl" />
                </Group>
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
