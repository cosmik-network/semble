import { Grid, Group, Skeleton, Stack } from '@mantine/core';

export default function SembleConnectionsContainerSkeleton() {
  return (
    <Stack gap={'md'} align="center">
      <Group justify="space-between" w={'100%'} maw={600}>
        <Skeleton height={28} width={120} />
        <Skeleton height={36} width={160} />
      </Group>
      <Grid gutter="sm" mx={'auto'} maw={600} w={'100%'}>
        {[...Array(3)].map((_, i) => (
          <Grid.Col key={i} span={12}>
            <Stack gap={'xs'}>
              <Skeleton height={80} radius={'lg'} />
              <Skeleton height={200} radius={'lg'} />
            </Stack>
          </Grid.Col>
        ))}
      </Grid>
    </Stack>
  );
}
