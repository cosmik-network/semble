import { Card, Container, Group, Skeleton, Stack } from '@mantine/core';
import classes from './ApiKeysContainer.module.css';

export default function ApiKeysContainerSkeleton() {
  return (
    <Container p="xs" size="xs">
      <Stack gap="xl">
        <Group justify="space-between" align="flex-start">
          <Stack gap={4}>
            <Skeleton height={14} width={72} radius="sm" />
            <Skeleton height={12} width={210} radius="sm" />
          </Stack>
          <Skeleton height={36} width={110} radius="xl" />
        </Group>
        <Stack gap={0} className={classes.groupedCards}>
          {[1, 2, 3].map((i) => (
            <Card key={i} bg="var(--mantine-color-gray-light)" p="md">
              <Group justify="space-between" wrap="nowrap" align="flex-start">
                <Stack gap={4}>
                  <Skeleton height={14} width={130} radius="sm" />
                  <Skeleton height={12} width={190} radius="sm" />
                  <Skeleton height={10} width={150} radius="sm" />
                </Stack>
                <Skeleton height={22} width={22} radius="xl" />
              </Group>
            </Card>
          ))}
        </Stack>
      </Stack>
    </Container>
  );
}
