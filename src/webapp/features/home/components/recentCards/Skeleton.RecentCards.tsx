import UrlCardSkeleton from '@/features/cards/components/urlCard/Skeleton.UrlCard';
import { Stack, Group, Title, Skeleton, Grid, GridCol } from '@mantine/core';
import { FaRegNoteSticky } from 'react-icons/fa6';

export default function RecentCardsSkeleton() {
  return (
    <Stack>
      <Group justify="space-between">
        <Group gap="xs">
          <FaRegNoteSticky size={22} />
          <Title order={2}>Cards</Title>
        </Group>
        <Skeleton w={87} h={36} radius={'xl'} />
      </Group>

      <Grid gutter="md">
        {Array.from({ length: 8 }).map((_, i) => (
          <GridCol key={i} span={{ base: 12, xs: 6, sm: 4, lg: 3 }}>
            <UrlCardSkeleton />
          </GridCol>
        ))}
      </Grid>
    </Stack>
  );
}
