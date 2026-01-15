import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import { Grid, GridCol, Group, Skeleton, Stack } from '@mantine/core';

export default function SembleSimilarCardsContainerSkeleton() {
  return (
    <Stack align="center">
      <Group justify="space-between" w={'100%'} maw={600}>
        <Group gap={'xs'} justify="space-between">
          <Skeleton w={113} h={36} radius={'xl'} />
          <Skeleton w={84} h={36} radius={'xl'} />
        </Group>
      </Group>
      <Grid gutter="sm" mx={'auto'} maw={600}>
        {/* not necessary to check if navbar is open */}
        {Array.from({ length: 8 }).map((_, i) => (
          <GridCol key={i} span={12}>
            <UrlCardSkeleton />
          </GridCol>
        ))}
      </Grid>
    </Stack>
  );
}
